import { Link } from "@tanstack/react-router";
import type { PostRow } from "@/lib/spectra-queries";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function excerpt(text: string) {
  return text
    .replace(/[#*`>]/g, "")
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 2)
    .join(" ")
    .slice(0, 210);
}

export function PostCard({ post, index }: { post: PostRow; index: number }) {
  const sources = post.sources ?? [];

  return (
    <article
      className="glass-panel lift-card enter-stagger group p-6 sm:p-8"
      style={{ animationDelay: `${Math.min(index, 8) * 90}ms` }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
        {post.archetype && (
          <span
            className="rounded-full border px-2.5 py-1"
            style={{ borderColor: "color-mix(in oklab, var(--violet) 40%, transparent)" }}
          >
            {post.archetype}
          </span>
        )}
        <span className="instrument-numerals normal-case tracking-normal">
          {timeAgo(post.created_at)}
        </span>
      </div>

      <h2 className="text-balance text-2xl font-semibold leading-snug text-foreground sm:text-[1.7rem]">
        <Link to="/post/$postId" params={{ postId: post.id }} className="transition-colors group-hover:text-accent">
          {post.title}
        </Link>
      </h2>

      <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">{excerpt(post.text)}…</p>

      <div
        className="mt-6 rounded-xl border p-4"
        style={{
          borderColor: "color-mix(in oklab, var(--indigo) 22%, transparent)",
          background: "color-mix(in oklab, var(--indigo) 7%, transparent)",
        }}
      >
        <p className="mb-1.5 text-[0.68rem] uppercase tracking-[0.22em] text-accent">
          Why Spectra chose this
        </p>
        <p className="text-sm leading-relaxed text-foreground/85">{post.rationale}</p>
      </div>

      {sources.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {sources.slice(0, 3).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
            >
              {s.publisher ?? "source"}
            </a>
          ))}
        </div>
      )}

      <Link
        to="/post/$postId"
        params={{ postId: post.id }}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground"
      >
        <span className="signal-text">Read the full post</span>
        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </Link>
    </article>
  );
}
