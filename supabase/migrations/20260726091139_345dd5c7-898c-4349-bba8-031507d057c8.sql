REVOKE EXECUTE ON FUNCTION public.drill_leaderboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bunker_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.drill_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bunker_leaderboard() TO authenticated;