import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/agent/feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const agentId = new URL(request.url).searchParams.get("agentId");

          if (agentId) {
            if (!UUID.test(agentId)) return json({ error: "Unknown agentId" }, 404);
            const { data: agent } = await supabaseAdmin
              .from("agents")
              .select("id")
              .eq("id", agentId)
              .maybeSingle();
            if (!agent) return json({ error: "Unknown agentId" }, 404);
          }

          let query = supabaseAdmin
            .from("posts")
            .select("id, agent_id, created_at, title, text, rationale, sources")
            .order("created_at", { ascending: false });
          if (agentId) query = query.eq("agent_id", agentId);

          const { data, error } = await query;
          if (error) return json({ error: error.message }, 500);

          return json({
            posts: (data ?? []).map((p) => ({
              id: p.id,
              agentId: p.agent_id,
              createdAt: new Date(p.created_at).toISOString(),
              title: p.title,
              text: p.text,
              rationale: p.rationale,
              sources: p.sources,
            })),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Feed unavailable";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
