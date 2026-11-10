-- Climboria Auth/profile access hardening.
-- Forward-only patch for the existing player_profiles/player_saves tables and
-- auth.users trigger. This is not a baseline schema bootstrap migration.

-- A trigger-only SECURITY DEFINER function must not be directly callable via
-- the public Data API by anonymous or authenticated clients.
REVOKE EXECUTE ON FUNCTION public.climboria_create_player_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.climboria_create_player_profile() TO postgres, service_role;

-- Evaluate auth.uid() once per statement rather than once per candidate row.
DROP POLICY IF EXISTS "Players can read their own profile" ON public.player_profiles;
CREATE POLICY "Players can read their own profile"
  ON public.player_profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Players can update their own username" ON public.player_profiles;
CREATE POLICY "Players can update their own username"
  ON public.player_profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Players can create their own save" ON public.player_saves;
CREATE POLICY "Players can create their own save"
  ON public.player_saves FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Players can read their own save" ON public.player_saves;
CREATE POLICY "Players can read their own save"
  ON public.player_saves FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Players can update their own save" ON public.player_saves;
CREATE POLICY "Players can update their own save"
  ON public.player_saves FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Remove broad default grants, then grant only the operations and columns the
-- authenticated game client needs. RLS still enforces per-user row ownership.
REVOKE ALL PRIVILEGES ON TABLE public.player_profiles, public.player_saves FROM anon;

REVOKE ALL PRIVILEGES ON TABLE public.player_profiles FROM authenticated;
GRANT SELECT ON TABLE public.player_profiles TO authenticated;
GRANT UPDATE (username) ON TABLE public.player_profiles TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.player_saves FROM authenticated;
GRANT SELECT ON TABLE public.player_saves TO authenticated;
GRANT INSERT (user_id, schema_version, save_data) ON TABLE public.player_saves TO authenticated;
GRANT UPDATE (schema_version, save_data, saved_at) ON TABLE public.player_saves TO authenticated;
