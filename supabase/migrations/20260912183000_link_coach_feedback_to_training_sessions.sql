ALTER TABLE public.coach_actions
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.test_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS coach_actions_session_idx
  ON public.coach_actions(session_id, created_at DESC);

CREATE POLICY "Connected coach can view shared training sessions"
  ON public.test_sessions FOR SELECT TO authenticated
  USING (
    test_type = 'training'
    AND EXISTS (
      SELECT 1
      FROM public.coach_relationships r
      WHERE r.player_id = test_sessions.user_id
        AND r.coach_id = auth.uid()
        AND r.status = 'accepted'
        AND r.share_training_data = true
    )
  );

DROP POLICY IF EXISTS "Coaches create actions for own players" ON public.coach_actions;
CREATE POLICY "Coaches create actions for own players"
  ON public.coach_actions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1
      FROM public.coach_relationships r
      WHERE r.id = relationship_id
        AND r.coach_id = auth.uid()
        AND r.player_id = coach_actions.player_id
        AND r.status = 'accepted'
    )
    AND (
      session_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.test_sessions s
        WHERE s.id = coach_actions.session_id
          AND s.user_id = coach_actions.player_id
          AND s.test_type = 'training'
      )
    )
  );
