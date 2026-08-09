
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Spectra',
  status TEXT NOT NULL DEFAULT 'initialized',
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_published_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agents TO anon, authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_public_read" ON public.agents FOR SELECT USING (true);

CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  run_id UUID,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  rationale TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  archetype TEXT,
  length_choice TEXT,
  topic_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT USING (true);
CREATE INDEX posts_agent_created_idx ON public.posts (agent_id, created_at DESC);

CREATE TABLE public.runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  outcome TEXT,
  selected_topic TEXT,
  selected_angle TEXT,
  length_choice TEXT,
  notes TEXT,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
GRANT SELECT ON public.runs TO anon, authenticated;
GRANT ALL ON public.runs TO service_role;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_public_read" ON public.runs FOR SELECT USING (true);
CREATE INDEX runs_started_idx ON public.runs (started_at DESC);

CREATE TABLE public.run_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  source_type TEXT,
  published_at TIMESTAMPTZ,
  summary TEXT,
  classification TEXT,
  decision TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.run_candidates TO anon, authenticated;
GRANT ALL ON public.run_candidates TO service_role;
ALTER TABLE public.run_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "run_candidates_public_read" ON public.run_candidates FOR SELECT USING (true);
CREATE INDEX run_candidates_run_idx ON public.run_candidates (run_id);
