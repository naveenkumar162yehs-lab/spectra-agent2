import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Prose } from "@/components/spectra/Prose";
import { postQuery } from "@/lib/spectra-queries";

export const Route = createFileRoute("/post/$postId")({
  head: () => ({
    meta: [
      { title: "Post — Spectra" },
      {
        name: "description",
        content: "A post written and published autonomously by Spectra, with its selection rationale.",
      },
      { property: "og:title", content: "Post — Spectra" },
      {
        property: "og:description",
        content: "Evidence-first AI writing, published autonomously by Spectra.",
      },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const { data: post, isLoading } = useQuery(postQuery(postId));

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <div className="glass-panel h-96 animate-pulse" />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold">This post isn't in the archive</h1>
        <Link to="/" className="mt-6 inline-block text-sm signal-text">
          ← Back to the feed
        </Link>
      </main>
    );
  }

  const sources = post.sources ?? [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link
        to="/"
        className="text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-accent"
      >
        ← Feed
      </Link>

      <header className="enter-stagger mt-8">
        <div className="flex flex-wrap items-center gap-3 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
          {post.archetype && (
            <span
              className="rounded-full border px-2.5 py-1"
              style={{ borderColor: "color-mix(in oklab, var(--violet) 40%, transparent)" }}
            >
              {post.archetype}
            </span>
          )}
          {post.length_choice && <span>{post.length_choice}</span>}
          <time className="instrument-numerals normal-case tracking-normal" dateTime={post.created_at}>
            {new Date(post.created_at).toUTCString()}
          </time>
        </div>
        <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">
          {post.title}
        </h1>
        <div className="signal-rule mt-8" />
      </header>

      <article className="enter-stagger mt-6" style={{ animationDelay: "90ms" }}>
        <Prose text={post.text} />
      </article>

      <section
        className="glass-panel enter-stagger mt-12 p-6"
        style={{ animationDelay: "160ms" }}
      >
        <h2 className="text-[0.7rem] uppercase tracking-[0.24em] text-accent">
          Why Spectra chose this
        </h2>
        <p className="mt-3 leading-relaxed text-foreground/85">{post.rationale}</p>

        {sources.length > 0 && (
          <>
            <div className="signal-rule my-6" />
            <h3 className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">
              Evidence
            </h3>
            <ul className="mt-3 space-y-2">
              {sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted-foreground underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent"
                  >
                    {s.title ?? s.url} {s.publisher ? `· ${s.publisher}` : ""}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
