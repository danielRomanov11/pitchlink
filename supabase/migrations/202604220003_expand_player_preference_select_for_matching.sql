DROP POLICY IF EXISTS player_preference_select_own ON public.player_preference;

CREATE POLICY player_preference_select_authenticated ON public.player_preference FOR
SELECT TO authenticated USING (true);