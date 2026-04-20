CREATE TABLE public.player_preference (
    user_id UUID PRIMARY KEY REFERENCES public.player (user_id) ON DELETE CASCADE,
    preferred_leagues TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_locations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.listing_preference (
    listing_id UUID PRIMARY KEY REFERENCES public.listing (id) ON DELETE CASCADE,
    preferred_positions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_player_leagues TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_player_locations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_preference_leagues ON public.player_preference USING GIN (preferred_leagues);

CREATE INDEX idx_player_preference_locations ON public.player_preference USING GIN (preferred_locations);

CREATE INDEX idx_listing_preference_positions ON public.listing_preference USING GIN (preferred_positions);

CREATE INDEX idx_listing_preference_leagues ON public.listing_preference USING GIN (preferred_player_leagues);

CREATE INDEX idx_listing_preference_locations ON public.listing_preference USING GIN (preferred_player_locations);

CREATE OR REPLACE FUNCTION public.ensure_listing_preference_row()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.listing_preference (listing_id)
    VALUES (NEW.id)
    ON CONFLICT (listing_id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_listing_preference_after_listing_insert
AFTER INSERT ON public.listing
FOR EACH ROW
EXECUTE FUNCTION public.ensure_listing_preference_row();

CREATE TRIGGER set_player_preference_updated_at
BEFORE UPDATE ON public.player_preference
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_listing_preference_updated_at
BEFORE UPDATE ON public.listing_preference
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.player_preference ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.listing_preference ENABLE ROW LEVEL SECURITY;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.player_preference TO authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.listing_preference TO authenticated;

CREATE POLICY player_preference_select_authenticated ON public.player_preference FOR
SELECT TO authenticated USING (true);

CREATE POLICY player_preference_insert_own ON public.player_preference FOR
INSERT
    TO authenticated
WITH
    CHECK (
        user_id = auth.uid ()
        AND EXISTS (
            SELECT 1
            FROM public.player
            WHERE
                player.user_id = auth.uid ()
        )
    );

CREATE POLICY player_preference_update_own ON public.player_preference FOR
UPDATE TO authenticated USING (user_id = auth.uid ())
WITH
    CHECK (user_id = auth.uid ());

CREATE POLICY player_preference_delete_own ON public.player_preference FOR DELETE TO authenticated USING (user_id = auth.uid ());

CREATE POLICY listing_preference_select_authenticated ON public.listing_preference FOR
SELECT TO authenticated USING (true);

CREATE POLICY listing_preference_insert_manager_owned_listing ON public.listing_preference FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.listing
                JOIN public.team ON team.id = listing.team_id
            WHERE
                listing.id = listing_preference.listing_id
                AND team.manager_id = auth.uid ()
        )
    );

CREATE POLICY listing_preference_update_manager_owned_listing ON public.listing_preference FOR
UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.listing
            JOIN public.team ON team.id = listing.team_id
        WHERE
            listing.id = listing_preference.listing_id
            AND team.manager_id = auth.uid ()
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.listing
                JOIN public.team ON team.id = listing.team_id
            WHERE
                listing.id = listing_preference.listing_id
                AND team.manager_id = auth.uid ()
        )
    );

CREATE POLICY listing_preference_delete_manager_owned_listing ON public.listing_preference FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.listing
            JOIN public.team ON team.id = listing.team_id
        WHERE
            listing.id = listing_preference.listing_id
            AND team.manager_id = auth.uid ()
    )
);

INSERT INTO
    public.player_preference (user_id)
SELECT user_id
FROM public.player ON CONFLICT (user_id) DO NOTHING;

INSERT INTO
    public.listing_preference (listing_id)
SELECT id
FROM public.listing ON CONFLICT (listing_id) DO NOTHING;