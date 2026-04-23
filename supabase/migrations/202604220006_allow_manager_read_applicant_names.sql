DROP POLICY IF EXISTS app_user_select_manager_related_players ON public.app_user;

CREATE POLICY app_user_select_manager_related_players ON public.app_user FOR
SELECT TO authenticated USING (
        id = auth.uid ()
        OR EXISTS (
            SELECT 1
            FROM public.application a
                JOIN public.team t ON t.id = a.team_id
            WHERE
                a.player_id = app_user.id
                AND t.manager_id = auth.uid ()
        )
    );