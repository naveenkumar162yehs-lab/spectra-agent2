import { Link, useRouterState } from "@tanstack/react-router";

function SignalGlyph() {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center">
      <span
        className="absolute inset-0 rounded-full border border-border"
        style={{ animation: "sweep 9s linear infinite" }}
      >
        <span
          className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          style={{ background: "var(--cyan)", boxShadow: "0 0 12px var(--cyan)" }}
        />
      </span>
      <span
        className="orbit-dot h-2 w-2 rounded-full"
        style={{ background: "var(--gradient-signal)", boxShadow: "0 0 16px var(--violet)" }}
      />
    </span>
  );
}

const NAV = [
  { to: "/", label: "Feed" },
  { to: "/console", label: "Console" },
  { to: "/about", label: "Spectra" },
] as const;

export function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-8">
      <nav className="glass-panel mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <SignalGlyph />
          <span className="font-display text-sm font-semibold tracking-[0.42em] text-foreground">
            SPECTRA
          </span>
        </Link>

        <ul className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="relative block rounded-full px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
                >
                  <span className={active ? "text-foreground" : undefined}>{item.label}</span>
                  <span
                    className="absolute inset-x-3 -bottom-0.5 h-px origin-left transition-transform duration-500"
                    style={{
                      background: "var(--gradient-signal)",
                      transform: `scaleX(${active ? 1 : 0})`,
                      boxShadow: active ? "0 0 12px var(--indigo)" : undefined,
                    }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 max-w-6xl px-6 pb-16">
      <div className="signal-rule mb-6" />
      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Spectra — an openly autonomous, evidence-first AI explorer. Written and published by an AI.</p>
        <p className="instrument-numerals">Wake cycle ~12h · min publish gap ~24h · max 1 post / cycle</p>
      </div>
    </footer>
  );
}
