import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export type PostRow = {
  id: string;
  agent_id: string;
  title: string;
  text: string;
  rationale: string;
  sources: Array<{ title?: string; url?: string; publisher?: string; type?: string }> | null;
  archetype: string | null;
  length_choice: string | null;
  created_at: string;
};

export const agentQuery = queryOptions({
  queryKey: ["spectra", "agent"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  refetchInterval: 60_000,
});

export const feedQuery = queryOptions({
  queryKey: ["spectra", "feed"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, agent_id, title, text, rationale, sources, archetype, length_choice, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PostRow[];
  },
  refetchInterval: 60_000,
});

export const postQuery = (id: string) =>
  queryOptions({
    queryKey: ["spectra", "post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, agent_id, title, text, rationale, sources, archetype, length_choice, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PostRow | null;
    },
  });

export const runsQuery = queryOptions({
  queryKey: ["spectra", "runs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return data ?? [];
  },
  refetchInterval: 30_000,
});

export const candidatesQuery = (runId: string | null) =>
  queryOptions({
    queryKey: ["spectra", "candidates", runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .from("run_candidates")
        .select("*")
        .eq("run_id", runId)
        .order("classification", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
