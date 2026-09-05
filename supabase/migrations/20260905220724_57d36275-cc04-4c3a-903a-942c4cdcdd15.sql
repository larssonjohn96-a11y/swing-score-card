-- Gemensam, kanonisk lagring av alla SG4-testsessioner (HCP-test + träningstest).
CREATE TABLE public.test_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  category text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('hcp', 'training')),
  played_at timestamptz NOT NULL,
  score numeric,
  test_handicap numeric,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  shots jsonb,
  test_version integer NOT NULL DEFAULT 1,
  scoring_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_sessions TO authenticated;
GRANT ALL ON public.test_sessions TO service_role;

ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own test sessions"
  ON public.test_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own test sessions"
  ON public.test_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own test sessions"
  ON public.test_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own test sessions"
  ON public.test_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX test_sessions_user_played_idx
  ON public.test_sessions (user_id, played_at DESC);
CREATE INDEX test_sessions_user_test_played_idx
  ON public.test_sessions (user_id, test_id, played_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_test_sessions_updated_at
  BEFORE UPDATE ON public.test_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();