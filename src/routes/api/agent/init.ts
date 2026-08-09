import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/agent/init")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { initAgent, runCycle } = await import("@/lib/spectra/cycle.server");
          const { agent, created } = await initAgent();

          if (created) {
            // Kick off the autonomous lifecycle immediately; the scheduler carries it on.
            void runCycle().catch((e) => console.error("[spectra] first cycle", e));
          }

          return json({
            agentId: agent.id,
            status: agent.status,
            initialized: true,
            alreadyInitialized: !created,
            initializedAt: agent.initialized_at,
            message: created
              ? "Spectra initialized. Autonomous lifecycle started."
              : "Spectra is already initialized. History preserved; no duplicate agent created.",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Initialization failed";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
