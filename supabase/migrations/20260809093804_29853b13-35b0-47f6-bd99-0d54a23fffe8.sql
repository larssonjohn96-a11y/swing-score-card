ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT friendships_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique UNIQUE (requester_id, addressee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own friendships" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users send friend requests" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users respond to their friendships" ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users delete their own friendships" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = _a AND f.addressee_id = _b)
        OR (f.requester_id = _b AND f.addressee_id = _a))
  )
$$;

CREATE TABLE IF NOT EXISTS public.player_snapshots (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 0,
  tier_key TEXT NOT NULL DEFAULT 'bronze',
  real_hcp NUMERIC,
  est_hcp NUMERIC,
  approach_hcp NUMERIC,
  driving_hcp NUMERIC,
  around_green_hcp NUMERIC,
  putting_hcp NUMERIC,
  speed_hcp NUMERIC,
  test_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_snapshots TO authenticated;
GRANT ALL ON public.player_snapshots TO service_role;
ALTER TABLE public.player_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Snapshots visible to owner, friends and public" ON public.player_snapshots
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_public OR public.are_friends(auth.uid(), user_id));
CREATE POLICY "Users insert their own snapshot" ON public.player_snapshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own snapshot" ON public.player_snapshots
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own snapshot" ON public.player_snapshots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Friends and public profiles are viewable" ON public.profiles
  FOR SELECT TO authenticated USING (true);