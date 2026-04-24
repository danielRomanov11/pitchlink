CREATE TABLE IF NOT EXISTS public.listing_preference (
    listing_id UUID PRIMARY KEY REFERENCES public.listing (id) ON DELETE CASCADE,
    preferred_positions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_player_leagues TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_player_locations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_preference_positions ON public.listing_preference USING gin (preferred_positions);

CREATE INDEX IF NOT EXISTS idx_listing_preference_leagues ON public.listing_preference USING gin (preferred_player_leagues);

CREATE INDEX IF NOT EXISTS idx_listing_preference_locations ON public.listing_preference USING gin (preferred_player_locations);

DROP TRIGGER IF EXISTS set_listing_preference_updated_at ON public.listing_preference;

CREATE TRIGGER set_listing_preference_updated_at
BEFORE UPDATE ON public.listing_preference
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.player_preference (
    user_id UUID PRIMARY KEY REFERENCES public.player (user_id) ON DELETE CASCADE,
    preferred_leagues TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_locations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_preference_leagues ON public.player_preference USING gin (preferred_leagues);

CREATE INDEX IF NOT EXISTS idx_player_preference_locations ON public.player_preference USING gin (preferred_locations);

DROP TRIGGER IF EXISTS set_player_preference_updated_at ON public.player_preference;

CREATE TRIGGER set_player_preference_updated_at
BEFORE UPDATE ON public.player_preference
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.listing_preference ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.player_preference ENABLE ROW LEVEL SECURITY;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.listing_preference TO authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.player_preference TO authenticated;

CREATE POLICY listing_preference_select_authenticated ON public.listing_preference FOR
SELECT TO authenticated USING (true);

CREATE POLICY listing_preference_insert_manager_owned_listing ON public.listing_preference FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.listing l
                JOIN public.team t ON t.id = l.team_id
            WHERE
                l.id = listing_id
                AND t.manager_id = auth.uid ()
        )
    );

CREATE POLICY listing_preference_update_manager_owned_listing ON public.listing_preference FOR
UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.listing l
            JOIN public.team t ON t.id = l.team_id
        WHERE
            l.id = listing_id
            AND t.manager_id = auth.uid ()
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.listing l
                JOIN public.team t ON t.id = l.team_id
            WHERE
                l.id = listing_id
                AND t.manager_id = auth.uid ()
        )
    );

CREATE POLICY listing_preference_delete_manager_owned_listing ON public.listing_preference FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.listing l
            JOIN public.team t ON t.id = l.team_id
        WHERE
            l.id = listing_id
            AND t.manager_id = auth.uid ()
    )
);

CREATE POLICY player_preference_select_own ON public.player_preference FOR
SELECT TO authenticated USING (user_id = auth.uid ());

CREATE POLICY player_preference_insert_own ON public.player_preference FOR
INSERT
    TO authenticated
WITH
    CHECK (user_id = auth.uid ());

CREATE POLICY player_preference_update_own ON public.player_preference FOR
UPDATE TO authenticated USING (user_id = auth.uid ())
WITH
    CHECK (user_id = auth.uid ());

CREATE POLICY player_preference_delete_own ON public.player_preference FOR DELETE TO authenticated USING (user_id = auth.uid ());