import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Scheduler entry point. Called by the platform cron roughly every 12 hours. */
export const Route = createFileRoute("/api/public/hooks/agent-cycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey) return json({ error: "Missing apikey" }, 401);

        try {
          const { runCycle } = await import("@/lib/spectra/cycle.server");
          const result = await runCycle();
          return json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Cycle failed";
          return json({ outcome: "failed", detail: message }, 500);
        }
      },
    },
  },
});
