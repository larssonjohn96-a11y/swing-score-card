-- Temporary development alias so users can connect to Coach John before the
-- final coach onboarding/profile UI is decided. This requires no manual coach
-- profile setup from John in the app and can be removed once onboarding is live.
DO $$
DECLARE
  john_user_id uuid;
BEGIN
  SELECT id
  INTO john_user_id
  FROM public.profiles
  WHERE lower(trim(coalesce(display_name, ''))) = 'john'
  LIMIT 1;

  IF john_user_id IS NULL THEN
    RAISE NOTICE 'Temporary Coach John alias not created: no profile named John found.';
    RETURN;
  END IF;

  -- Keep the normal relationship/action model intact while bypassing the
  -- unfinished coach-profile onboarding UI.
  INSERT INTO public.coach_profiles (user_id, display_name, club_name, invite_code)
  VALUES (john_user_id, 'Coach John', NULL, 'JOHN')
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = 'Coach John',
        invite_code = 'JOHN';
END $$;
