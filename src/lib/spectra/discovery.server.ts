export type Candidate = {
  title: string;
  url: string;
  summary: string;
  sourceName: string;
  sourceType: "primary" | "research" | "publication" | "community";
  publishedAt: string | null;
};

type Feed = {
  url: string;
  name: string;
  type: Candidate["sourceType"];
};

// Real, live, public feeds only. Nothing here is synthetic.
const FEEDS: Feed[] = [
  { url: "https://openai.com/news/rss.xml", name: "OpenAI", type: "primary" },
  { url: "https://deepmind.google/blog/rss.xml", name: "Google DeepMind", type: "primary" },
  { url: "https://blog.google/technology/ai/rss/", name: "Google AI Blog", type: "primary" },
  { url: "https://huggingface.co/blog/feed.xml", name: "Hugging Face", type: "primary" },
  { url: "https://export.arxiv.org/rss/cs.AI", name: "arXiv cs.AI", type: "research" },
  { url: "https://export.arxiv.org/rss/cs.LG", name: "arXiv cs.LG", type: "research" },
  {
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    name: "TechCrunch AI",
    type: "publication",
  },
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", name: "The Verge AI", type: "publication" },
  { url: "https://hnrss.org/newest?q=AI&points=120", name: "Hacker News", type: "community" },
];

function decode(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m?.[1] ? decode(m[1]) : null;
}

function link(block: string): string | null {
  const plain = tag(block, "link");
  if (plain && plain.startsWith("http")) return plain;
  const href = block.match(/<link[^>]*href="([^"]+)"/i);
  return href?.[1] ?? null;
}

function parseFeed(xml: string, feed: Feed): Candidate[] {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  const out: Candidate[] = [];
  for (const block of blocks.slice(0, 8)) {
    const title = tag(block, "title");
    const url = link(block);
    if (!title || !url) continue;
    const summaryRaw =
      tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content") ?? "";
    const dateRaw = tag(block, "pubDate") ?? tag(block, "updated") ?? tag(block, "published");
    let publishedAt: string | null = null;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    out.push({
      title,
      url,
      summary: summaryRaw.slice(0, 900),
      sourceName: feed.name,
      sourceType: feed.type,
      publishedAt,
    });
  }
  return out;
}

/** OBSERVE — broad live discovery across primary, research, publication and community sources. */
export async function discover(): Promise<Candidate[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "user-agent": "SpectraAgent/1.0 (+autonomous AI explorer)" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`${feed.name}: ${res.status}`);
      return parseFeed(await res.text(), feed);
    }),
  );

  const all: Candidate[] = [];
  for (const r of results) if (r.status === "fulfilled") all.push(...r.value);

  // ORIENT — normalize, dedupe by URL and by near-identical title.
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const priority: Record<Candidate["sourceType"], number> = {
    primary: 0,
    research: 1,
    publication: 2,
    community: 3,
  };
  const deduped = all
    .sort((a, b) => priority[a.sourceType] - priority[b.sourceType])
    .filter((c) => {
      const t = c.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 60);
      if (seenUrl.has(c.url) || seenTitle.has(t)) return false;
      seenUrl.add(c.url);
      seenTitle.add(t);
      return true;
    });

  // Freshness-weighted selection, keeping a mix of source types. ~5-10 candidates.
  const scored = deduped
    .map((c) => {
      const ageHours = c.publishedAt
        ? (Date.now() - new Date(c.publishedAt).getTime()) / 3_600_000
        : 96;
      return { c, score: priority[c.sourceType] * 12 + Math.min(ageHours, 240) };
    })
    .sort((a, b) => a.score - b.score);

  return scored.slice(0, 9).map((s) => s.c);
}
