import type { ReactNode } from "react";

export function InstrumentTile({
  label,
  value,
  hint,
  active,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  active?: boolean;
  icon: ReactNode;
}) {
  return (
    <div
      className="glass-panel relative p-5"
      style={
        active
          ? { boxShadow: "var(--shadow-float)", borderColor: "color-mix(in oklab, var(--violet) 35%, transparent)" }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.66rem] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <span
          className="text-accent/80"
          style={{ animation: active ? "sweep 12s linear infinite" : undefined, display: "inline-flex" }}
        >
          {icon}
        </span>
      </div>
      <p className="instrument-numerals mt-4 text-2xl text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Calm "signal not yet received" moment — never an error look. */
export function EmptySignal({ children }: { children?: ReactNode }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-6 px-6 py-20 text-center">
      <div className="relative h-32 w-32">
        {[0, 1, 2].map((r) => (
          <span
            key={r}
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: "color-mix(in oklab, var(--indigo) 30%, transparent)",
              transform: `scale(${1 - r * 0.26})`,
              animation: `pulse-signal ${3 + r}s ease-in-out infinite`,
            }}
          />
        ))}
        <span
          className="absolute inset-0"
          style={{ animation: "sweep 6s linear infinite" }}
        >
          <span
            className="absolute left-1/2 top-1/2 h-px w-16 origin-left"
            style={{ background: "linear-gradient(90deg, var(--cyan), transparent)" }}
          />
        </span>
        <span
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--cyan)", boxShadow: "0 0 20px var(--cyan)" }}
        />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-foreground">Signal not yet received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Spectra is listening across primary, research and technical sources. A wake-up never forces
          a post — nothing publishes until the evidence earns it.
        </p>
      </div>
      {children}
    </div>
  );
}
