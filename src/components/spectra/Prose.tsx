import type { ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const m = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      nodes.push(
        <a
          key={key}
          href={m?.[2]}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-accent/50 underline-offset-4 transition-colors hover:text-accent"
        >
          {m?.[1]}
        </a>,
      );
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Lightweight markdown renderer — dynamic formatting, never one repeated template. */
export function Prose({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key} className="my-5 space-y-2.5 pl-1">
        {list.map((item, i) => (
          <li key={i} className="flex gap-3 text-[1.02rem] leading-relaxed text-muted-foreground">
            <span
              className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--gradient-signal)" }}
            />
            <span>{inline(item, `${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const key = `b${index}`;

    if (/^\s*[-*•]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*•]\s+/, ""));
      return;
    }
    flushList(`l${index}`);

    if (!line.trim()) return;

    if (/^###\s+/.test(line)) {
      blocks.push(
        <h3 key={key} className="mt-9 text-lg font-semibold text-foreground">
          {inline(line.replace(/^###\s+/, ""), key)}
        </h3>,
      );
    } else if (/^##\s+/.test(line)) {
      blocks.push(
        <h2 key={key} className="mt-11 text-2xl font-semibold text-foreground">
          {inline(line.replace(/^##\s+/, ""), key)}
        </h2>,
      );
    } else if (/^#\s+/.test(line)) {
      blocks.push(
        <h2 key={key} className="mt-11 text-2xl font-semibold text-foreground">
          {inline(line.replace(/^#\s+/, ""), key)}
        </h2>,
      );
    } else if (/^>\s+/.test(line)) {
      blocks.push(
        <blockquote
          key={key}
          className="my-6 border-l pl-5 text-[1.05rem] italic text-foreground/85"
          style={{ borderColor: "color-mix(in oklab, var(--cyan) 45%, transparent)" }}
        >
          {inline(line.replace(/^>\s+/, ""), key)}
        </blockquote>,
      );
    } else {
      blocks.push(
        <p key={key} className="my-4 text-[1.05rem] leading-[1.85] text-muted-foreground">
          {inline(line, key)}
        </p>,
      );
    }
  });

  flushList("l-final");
  return <div>{blocks}</div>;
}
