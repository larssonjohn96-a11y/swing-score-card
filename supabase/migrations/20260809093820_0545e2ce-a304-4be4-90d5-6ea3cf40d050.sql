DROP POLICY IF EXISTS "Snapshots visible to owner, friends and public" ON public.player_snapshots;
DROP FUNCTION IF EXISTS public.are_friends(uuid, uuid);

CREATE POLICY "Snapshots visible to owner, friends and public" ON public.player_snapshots
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR is_public
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = player_snapshots.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = player_snapshots.user_id))
    )
  );