CREATE TABLE public.coach_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  club_name text,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.coach_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending','accepted','declined')),
  share_training_data boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, coach_id),
  CHECK(player_id <> coach_id)
);

CREATE TABLE public.coach_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.coach_relationships(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('focus','goal','session','comment','reaction')),
  title text NOT NULL,
  body text,
  route text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_profiles, public.coach_relationships, public.coach_actions TO authenticated;
GRANT ALL ON public.coach_profiles, public.coach_relationships, public.coach_actions TO service_role;

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can find coaches" ON public.coach_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches manage own profile" ON public.coach_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coach relationships visible to participants" ON public.coach_relationships FOR SELECT TO authenticated USING (auth.uid() = player_id OR auth.uid() = coach_id);
CREATE POLICY "Players can connect to coaches" ON public.coach_relationships FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Participants can update coach relationship" ON public.coach_relationships FOR UPDATE TO authenticated USING (auth.uid() = player_id OR auth.uid() = coach_id) WITH CHECK (auth.uid() = player_id OR auth.uid() = coach_id);
CREATE POLICY "Participants can remove coach relationship" ON public.coach_relationships FOR DELETE TO authenticated USING (auth.uid() = player_id OR auth.uid() = coach_id);

CREATE POLICY "Coach actions visible to participants" ON public.coach_actions FOR SELECT TO authenticated USING (auth.uid() = player_id OR auth.uid() = coach_id);
CREATE POLICY "Coaches create actions for own players" ON public.coach_actions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = coach_id AND EXISTS (
    SELECT 1 FROM public.coach_relationships r
    WHERE r.id = relationship_id AND r.coach_id = auth.uid() AND r.player_id = coach_actions.player_id AND r.status = 'accepted'
  )
);
CREATE POLICY "Participants can update actions" ON public.coach_actions FOR UPDATE TO authenticated USING (auth.uid() = player_id OR auth.uid() = coach_id) WITH CHECK (auth.uid() = player_id OR auth.uid() = coach_id);

CREATE POLICY "Connected coach can view player snapshot" ON public.player_snapshots FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.coach_relationships r
    WHERE r.player_id = player_snapshots.user_id
      AND r.coach_id = auth.uid()
      AND r.status = 'accepted'
      AND r.share_training_data = true
  )
);

CREATE INDEX coach_relationships_player_idx ON public.coach_relationships(player_id, status);
CREATE INDEX coach_relationships_coach_idx ON public.coach_relationships(coach_id, status);
CREATE INDEX coach_actions_player_idx ON public.coach_actions(player_id, created_at DESC);
CREATE INDEX coach_actions_coach_idx ON public.coach_actions(coach_id, created_at DESC);
