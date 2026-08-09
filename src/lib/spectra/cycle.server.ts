import { generateText } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { discover, type Candidate } from "./discovery.server";
import {
  CYCLE_HOURS,
  DYNAMIC_FORMAT,
  MIN_PUBLISH_GAP_HOURS,
  PERSONA,
  SPECTRA_MODEL,
  gateway,
} from "./persona.server";

export type CycleResult = {
  runId: string | null;
  outcome: "published" | "dont_post" | "skipped" | "failed";
  detail: string;
};

function jsonFrom(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? raw;
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("Model returned no JSON");
  return JSON.parse(body.slice(start, end + 1));
}

async function ask(system: string, prompt: string): Promise<string> {
  const { text } = await generateText({
    model: gateway()(SPECTRA_MODEL),
    system,
    prompt,
    maxRetries: 2,
  });
  return text;
}

export async function getOrCreateAgent() {
  const { data: existing } = await supabaseAdmin
    .from("agents")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return existing ?? null;
}

/** Initialization — exactly once. Repeated calls never duplicate or reset. */
export async function initAgent() {
  const existing = await getOrCreateAgent();
  if (existing) return { agent: existing, created: false };

  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from("agents")
    .insert({
      name: "Spectra",
      status: "running",
      initialized_at: now.toISOString(),
      next_run_at: new Date(now.getTime() + CYCLE_HOURS * 3_600_000).toISOString(),
      config: {
        concept: "Evidence-First AI Explorer",
        cycleHours: CYCLE_HOURS,
        minPublishGapHours: MIN_PUBLISH_GAP_HOURS,
      },
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { agent: data, created: true };
}

type Classified = {
  index: number;
  classification: "Low" | "Medium" | "Strong" | "Exceptional";
  reason: string;
};

/** One full autonomous OODA execution. */
export async function runCycle(force = false): Promise<CycleResult> {
  const agent = await getOrCreateAgent();
  if (!agent) return { runId: null, outcome: "skipped", detail: "Agent not initialized" };

  // Run lock — an overlapping scheduler call must never double-process.
  const { data: active } = await supabaseAdmin
    .from("runs")
    .select("id, started_at")
    .eq("status", "running")
    .gt("started_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .limit(1)
    .maybeSingle();
  if (active) return { runId: active.id, outcome: "skipped", detail: "Another run is in progress" };

  const { data: run, error: runError } = await supabaseAdmin
    .from("runs")
    .insert({ agent_id: agent.id, status: "running" })
    .select("*")
    .single();
  if (runError || !run) throw new Error(runError?.message ?? "Could not start run");

  // Temporary run data is cleared each new run; published posts are untouched.
  await supabaseAdmin.from("runs").delete().neq("id", run.id).lt(
    "started_at",
    new Date(Date.now() - 14 * 24 * 3_600_000).toISOString(),
  );

  const finish = async (
    outcome: CycleResult["outcome"],
    detail: string,
    extra: Record<string, unknown> = {},
  ): Promise<CycleResult> => {
    await supabaseAdmin
      .from("runs")
      .update({
        status: outcome === "failed" ? "failed" : "complete",
        outcome: outcome === "published" ? "POST" : outcome === "failed" ? "FAILED" : "DON'T POST",
        notes: detail,
        finished_at: new Date().toISOString(),
        ...extra,
      })
      .eq("id", run.id);
    await supabaseAdmin
      .from("agents")
      .update({
        status: "running",
        last_run_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + CYCLE_HOURS * 3_600_000).toISOString(),
      })
      .eq("id", agent.id);
    return { runId: run.id, outcome, detail };
  };

  try {
    // OBSERVE
    const candidates = await discover();
    if (candidates.length === 0) {
      return finish("dont_post", "No live candidates could be retrieved this cycle.");
    }

    // Memory — recent published work informs this decision.
    const { data: recent } = await supabaseAdmin
      .from("posts")
      .select("title, topic_fingerprint, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(15);

    const recentList = (recent ?? [])
      .map((p, i) => `${i + 1}. ${p.title} (${p.topic_fingerprint ?? ""})`)
      .join("\n") || "None yet — this would be the first post.";

    // ORIENT + DECIDE
    const classifyRaw = await ask(
      PERSONA,
      `Classify each discovered candidate for editorial value. Weigh freshness, Spectra relevance, significance, audience usefulness, evidence quality, source credibility, repetition risk against recent posts, hype/speculation risk, and novelty.

RECENTLY PUBLISHED (do not repeat these topics or angles):
${recentList}

CANDIDATES:
${candidates
  .map(
    (c, i) =>
      `[${i}] ${c.title}\nsource: ${c.sourceName} (${c.sourceType})\npublished: ${c.publishedAt ?? "unknown"}\nsummary: ${c.summary || "(none)"}\nurl: ${c.url}`,
  )
  .join("\n\n")}

Return ONLY JSON: {"candidates":[{"index":0,"classification":"Low|Medium|Strong|Exceptional","reason":"one concise structured reason, e.g. 'Rejected — too repetitive; overlaps a recent post'"}]}
Be strict. Low = reject, Medium = usually reject or hold, Strong = eligible, Exceptional = highest priority. Marketing, rumor, thin evidence and repetition must not be graded Strong.`,
    );

    const classified = (jsonFrom(classifyRaw) as { candidates?: Classified[] }).candidates ?? [];
    const byIndex = new Map(classified.map((c) => [c.index, c]));

    const order = { Exceptional: 0, Strong: 1, Medium: 2, Low: 3 } as const;
    const ranked = candidates
      .map((c, i) => ({
        candidate: c,
        verdict: byIndex.get(i) ?? {
          index: i,
          classification: "Low" as const,
          reason: "Rejected — not classified as valuable this cycle.",
        },
      }))
      .sort((a, b) => order[a.verdict.classification] - order[b.verdict.classification]);

    const winner = ranked.find(
      (r) => r.verdict.classification === "Exceptional" || r.verdict.classification === "Strong",
    );

    await supabaseAdmin.from("run_candidates").insert(
      ranked.map((r) => ({
        run_id: run.id,
        title: r.candidate.title,
        url: r.candidate.url,
        source_type: `${r.candidate.sourceName} · ${r.candidate.sourceType}`,
        published_at: r.candidate.publishedAt,
        summary: r.candidate.summary.slice(0, 600),
        classification: r.verdict.classification,
        decision: winner && winner.candidate.url === r.candidate.url ? "selected" : "rejected",
        reason: r.verdict.reason,
      })),
    );

    if (!winner) {
      return finish(
        "dont_post",
        "DON'T POST — only Low/Medium candidates surfaced; nothing met the evidence and significance bar.",
      );
    }

    // Minimum publishing gap (a wake-up never forces a post).
    if (!force && agent.last_published_at) {
      const gapHours = (Date.now() - new Date(agent.last_published_at).getTime()) / 3_600_000;
      if (gapHours < MIN_PUBLISH_GAP_HOURS) {
        return finish(
          "dont_post",
          `Held — a strong candidate was found but the ${MIN_PUBLISH_GAP_HOURS}h minimum publishing gap has not elapsed (${gapHours.toFixed(1)}h).`,
          { selected_topic: winner.candidate.title },
        );
      }
    }

    // PLAN → WRITE → CRITIQUE → VERIFY
    const c = winner.candidate;
    const writeRaw = await ask(
      `${PERSONA}\n\n${DYNAMIC_FORMAT}`,
      `You selected this candidate (${winner.verdict.classification}): 

TITLE: ${c.title}
SOURCE: ${c.sourceName} (${c.sourceType})
PUBLISHED: ${c.publishedAt ?? "unknown"}
URL: ${c.url}
SOURCE MATERIAL: ${c.summary || "(headline only — stay strictly within what the headline supports and say so plainly)"}

REJECTED ALTERNATIVES (for your rationale):
${ranked
  .filter((r) => r !== winner)
  .slice(0, 6)
  .map((r) => `- ${r.candidate.title} — ${r.verdict.classification}: ${r.verdict.reason}`)
  .join("\n")}

RECENTLY PUBLISHED (do not repeat structure, hooks or angle):
${recentList}

Internally generate 3–5 possible angles, then write with the strongest one.
Editorial flow: Hook → Context → Core insight → Evidence → Clear explanation → Spectra's interpretation → Why it matters → Dynamic ending.
Then self-critique and rewrite once. Then run one final verification pass: if a central claim is not supported by the source material above, soften or remove it. Never invent facts, quotes, statistics, events or URLs.

Return ONLY JSON:
{
  "title": "specific, non-generic headline",
  "archetype": "short update | explainer | research interpretation | product-business breakdown | insight",
  "length": "Short | Medium | Extended",
  "angle": "the selected angle in one line",
  "fingerprint": "3-6 lowercase keywords describing the topic",
  "text": "the full post in markdown, dynamically formatted, no repeated template",
  "rationale": "why this topic matters and why it was chosen over the alternatives, 2-4 sentences"
}`,
    );

    const post = jsonFrom(writeRaw) as {
      title?: string;
      archetype?: string;
      length?: string;
      angle?: string;
      fingerprint?: string;
      text?: string;
      rationale?: string;
    };

    if (!post.title || !post.text || !post.rationale) {
      return finish("failed", "Run rejected — malformed model output; nothing was persisted.");
    }

    const { error: insertError } = await supabaseAdmin.from("posts").insert({
      agent_id: agent.id,
      run_id: run.id,
      title: post.title,
      text: post.text,
      rationale: post.rationale,
      archetype: post.archetype ?? null,
      length_choice: post.length ?? null,
      topic_fingerprint: post.fingerprint ?? null,
      sources: [
        {
          title: c.title,
          url: c.url,
          publisher: c.sourceName,
          type: c.sourceType,
          publishedAt: c.publishedAt,
        },
      ],
    });

    if (insertError) {
      // A write failure is treated as NOT published.
      return finish("failed", `Publication write failed — treated as not published: ${insertError.message}`);
    }

    await supabaseAdmin
      .from("agents")
      .update({ last_published_at: new Date().toISOString() })
      .eq("id", agent.id);

    return finish("published", `Published "${post.title}".`, {
      selected_topic: c.title,
      selected_angle: post.angle ?? null,
      length_choice: post.length ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    return finish("failed", `Run failed safely — existing posts untouched. ${message}`);
  }
}
