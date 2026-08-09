import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { agentQuery, candidatesQuery, feedQuery, runsQuery } from "@/lib/spectra-queries";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Evaluator Console — Spectra" },
      {
        name: "description",
        content:
          "Spectra's evaluator console: agent status, current-run candidates, classifications, structured rejection reasons and the final POST / DON'T POST outcome.",
      },
      { property: "og:title", content: "Evaluator Console — Spectra" },
      {
        property: "og:description",
        content: "Concise transparency into Spectra's autonomous editorial decisions.",
      },
    ],
  }),
  component: Console,
});

const gradeColor: Record<string, string> = {
  Exceptional: "var(--gold)",
  Strong: "var(--cyan)",
  Medium: "var(--indigo)",
  Low: "var(--muted-foreground)",
};

function Console() {
  const { data: agent } = useQuery(agentQuery);
  const { data: runs } = useQuery(runsQuery);
  const { data: posts } = useQuery(feedQuery);
  const [openRun, setOpenRun] = useState<string | null>(null);
  const activeRun = openRun ?? runs?.[0]?.id ?? null;
  const { data: candidates } = useQuery(candidatesQuery(activeRun));
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);

  const runTestCycle = async () => {
    setTesting(true);
    try {
      await fetch("/api/public/hooks/agent-cycle", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "dev",
        },
        body: "{}",
      });
      await queryClient.invalidateQueries({ queryKey: ["spectra"] });
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <header className="mb-10">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-accent">Evaluator console</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Decision telemetry</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Concise, structured reasoning only — no raw chain-of-thought. Run diagnostics are temporary;
          published posts persist forever.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Agent ID", value: agent?.id?.slice(0, 8) ?? "—" },
          { label: "Status", value: agent ? "running" : "not initialized" },
          { label: "Published", value: String(posts?.length ?? 0) },
        ].map((s) => (
          <div key={s.label} className="glass-panel p-5">
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-muted-foreground">
              {s.label}
            </p>
            <p className="instrument-numerals mt-3 text-lg text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={runTestCycle}
          disabled={testing}
          className="mt-6 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-accent disabled:opacity-50"
        >
          {testing ? "Simulating cycle…" : "Dev-only: simulate one autonomous cycle"}
        </button>
      )}

      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl font-semibold">Recent runs</h2>
        <div className="space-y-3">
          {(runs ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
          )}
          {(runs ?? []).map((run) => (
            <button
              key={run.id}
              onClick={() => setOpenRun(run.id)}
              className="glass-panel block w-full p-5 text-left transition-colors"
              style={
                run.id === activeRun
                  ? { borderColor: "color-mix(in oklab, var(--cyan) 35%, transparent)" }
                  : undefined
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="instrument-numerals text-xs text-muted-foreground">
                  {new Date(run.started_at).toUTCString()}
                </span>
                <span
                  className="rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em]"
                  style={{
                    borderColor:
                      run.outcome === "POST"
                        ? "color-mix(in oklab, var(--gold) 50%, transparent)"
                        : "var(--color-border)",
                    color: run.outcome === "POST" ? "var(--gold)" : "var(--muted-foreground)",
                  }}
                >
                  {run.outcome ?? run.status}
                </span>
              </div>
              {run.selected_topic && (
                <p className="mt-3 text-sm text-foreground">Selected: {run.selected_topic}</p>
              )}
              {run.selected_angle && (
                <p className="mt-1 text-xs text-muted-foreground">Angle: {run.selected_angle}</p>
              )}
              {run.notes && <p className="mt-2 text-sm text-muted-foreground">{run.notes}</p>}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl font-semibold">Candidates &amp; classification</h2>
        <div className="space-y-2">
          {(candidates ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No candidate data for this run.</p>
          )}
          {(candidates ?? []).map((c) => (
            <div key={c.id} className="glass-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <a
                  href={c.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-xl text-sm text-foreground transition-colors hover:text-accent"
                >
                  {c.title}
                </a>
                <span
                  className="shrink-0 text-[0.68rem] uppercase tracking-[0.18em]"
                  style={{ color: gradeColor[c.classification ?? "Low"] }}
                >
                  {c.classification} · {c.decision}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{c.reason}</p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground/70">{c.source_type}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
