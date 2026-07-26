CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.drill_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  score numeric NOT NULL,
  laps integer NOT NULL DEFAULT 0,
  stages_cleared integer NOT NULL DEFAULT 0,
  shots jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drill_sessions TO authenticated;
GRANT ALL ON public.drill_sessions TO service_role;
ALTER TABLE public.drill_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own drill sessions" ON public.drill_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX drill_sessions_user_idx ON public.drill_sessions (user_id, played_at DESC);

CREATE TABLE public.bunker_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  total_feet numeric NOT NULL,
  avg_feet numeric NOT NULL,
  shots jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bunker_sessions TO authenticated;
GRANT ALL ON public.bunker_sessions TO service_role;
ALTER TABLE public.bunker_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bunker sessions" ON public.bunker_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX bunker_sessions_user_idx ON public.bunker_sessions (user_id, played_at DESC);

CREATE OR REPLACE FUNCTION public.drill_leaderboard()
RETURNS TABLE (user_id uuid, display_name text, best_score numeric, avg_score numeric, sessions bigint, last_played timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name,
         MAX(d.score)::numeric,
         AVG(d.score)::numeric,
         COUNT(d.id),
         MAX(d.played_at)
  FROM public.profiles p
  JOIN public.drill_sessions d ON d.user_id = p.id
  GROUP BY p.id, p.display_name
  ORDER BY MAX(d.score) DESC, AVG(d.score) DESC
$$;
GRANT EXECUTE ON FUNCTION public.drill_leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.bunker_leaderboard()
RETURNS TABLE (user_id uuid, display_name text, best_avg_feet numeric, avg_feet numeric, sessions bigint, last_played timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name,
         MIN(b.avg_feet)::numeric,
         AVG(b.avg_feet)::numeric,
         COUNT(b.id),
         MAX(b.played_at)
  FROM public.profiles p
  JOIN public.bunker_sessions b ON b.user_id = p.id
  GROUP BY p.id, p.display_name
  ORDER BY MIN(b.avg_feet) ASC
$$;
GRANT EXECUTE ON FUNCTION public.bunker_leaderboard() TO authenticated;