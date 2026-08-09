import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type State = "idle" | "sending" | "done" | "error";

/**
 * The field performs no text or keyword matching and has no independent logic.
 * Whatever is typed, submitting issues exactly one POST to /api/agent/init.
 * The placeholder is cosmetic guidance only, never a trigger condition.
 */
export function InitField() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/agent/init", { method: "POST" });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Initialization failed");
      setState("done");
      setMessage(body.message ?? "Initialized.");
      await queryClient.invalidateQueries({ queryKey: ["spectra"] });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Initialization failed");
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div
        className="glass-panel flex items-center gap-2 rounded-full px-2 py-2"
        style={
          state === "sending"
            ? { animation: "pulse-signal 1.6s ease-in-out infinite", boxShadow: "var(--shadow-float)" }
            : state === "done"
              ? { boxShadow: "var(--shadow-lift)" }
              : undefined
        }
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="init"
          aria-label="Optional initialization request"
          className="min-w-0 flex-1 bg-transparent px-4 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="shrink-0 rounded-full px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          style={{ background: "var(--gradient-signal)" }}
        >
          {state === "sending" ? "Sending…" : "Send"}
        </button>
      </div>
      <p
        className={`mt-3 min-h-[1.25rem] text-xs ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}
      >
        {message ||
          "Optional. Submitting issues a single POST to /api/agent/init — it does not replace the autonomous scheduler."}
      </p>
    </form>
  );
}
