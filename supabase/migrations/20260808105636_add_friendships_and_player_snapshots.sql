-- Utökar profiles med bild, samt lägger till vänskap och spelarkorts-
-- ögonblicksbilder så en accepterad vän kan se ditt spelarkort/HCP utan
-- att all rå testdata behöver delas.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Vänskap: en rad per förfrågan, requester -> addressee. 'accepted' krävs
-- innan någon part kan se den andres spelarkorts-ögonblicksbild.
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own friendship rows" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users send friend requests" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can respond, either party can update" ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Either party can remove a friendship" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE INDEX friendships_requester_idx ON public.friendships (requester_id, status);
CREATE INDEX friendships_addressee_idx ON public.friendships (addressee_id, status);

-- Spelarkorts-ögonblicksbild: de färdigberäknade talen (rating, tier, HCP
-- per kategori) som redan räknas ut lokalt i appen (computeRatingCard,
-- computeCategoryHandicaps). En rad per användare, skrivs över vid varje
-- uppdatering. Det är medvetet INTE all rå slagdata – bara sammanfattningen
-- som redan visas i det egna spelarkortet.
CREATE TABLE public.player_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  tier_key text NOT NULL,
  real_hcp numeric,
  est_hcp numeric,
  approach_hcp numeric,
  driving_hcp numeric,
  around_green_hcp numeric,
  putting_hcp numeric,
  speed_hcp numeric,
  test_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_snapshots TO authenticated;
GRANT ALL ON public.player_snapshots TO service_role;
ALTER TABLE public.player_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own snapshot" ON public.player_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Accepted friends can view snapshot" ON public.player_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = player_snapshots.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = player_snapshots.user_id)
        )
    )
  );
