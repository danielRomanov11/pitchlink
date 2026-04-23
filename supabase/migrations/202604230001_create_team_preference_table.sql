CREATE TABLE IF NOT EXISTS public.team_preference (
    team_id UUID PRIMARY KEY REFERENCES public.team (id) ON DELETE CASCADE,
    preferred_positions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_player_levels TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    preferred_player_locations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_preference_positions ON public.team_preference USING gin (preferred_positions);

CREATE INDEX IF NOT EXISTS idx_team_preference_levels ON public.team_preference USING gin (preferred_player_levels);

CREATE INDEX IF NOT EXISTS idx_team_preference_locations ON public.team_preference USING gin (preferred_player_locations);

DROP TRIGGER IF EXISTS set_team_preference_updated_at ON public.team_preference;

CREATE TRIGGER set_team_preference_updated_at
BEFORE UPDATE ON public.team_preference
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.team_preference ENABLE ROW LEVEL SECURITY;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.team_preference TO authenticated;

CREATE POLICY team_preference_select_authenticated ON public.team_preference FOR
SELECT TO authenticated USING (true);

CREATE POLICY team_preference_insert_manager_owned_team ON public.team_preference FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.team t
            WHERE
                t.id = team_id
                AND t.manager_id = auth.uid ()
        )
    );

CREATE POLICY team_preference_update_manager_owned_team ON public.team_preference FOR
UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.team t
        WHERE
            t.id = team_id
            AND t.manager_id = auth.uid ()
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.team t
            WHERE
                t.id = team_id
                AND t.manager_id = auth.uid ()
        )
    );

CREATE POLICY team_preference_delete_manager_owned_team ON public.team_preference FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.team t
        WHERE
            t.id = team_id
            AND t.manager_id = auth.uid ()
    )
);

WITH source AS (
    SELECT
        l.team_id,
        lp.preferred_positions,
        lp.preferred_player_leagues,
        lp.preferred_player_locations
    FROM public.listing_preference lp
        JOIN public.listing l ON l.id = lp.listing_id
),
positions AS (
    SELECT
        s.team_id,
        COALESCE(
            array_agg(DISTINCT trim(position_value)) FILTER (
                WHERE
                    position_value IS NOT NULL
                    AND trim(position_value) <> ''
            ),
            '{}'::TEXT[]
        ) AS preferred_positions
    FROM source s
        LEFT JOIN LATERAL unnest(COALESCE(s.preferred_positions, '{}'::TEXT[])) AS position_value ON true
    GROUP BY
        s.team_id
),
levels AS (
    SELECT
        s.team_id,
        COALESCE(
            array_agg(DISTINCT trim(level_value)) FILTER (
                WHERE
                    level_value IS NOT NULL
                    AND trim(level_value) <> ''
            ),
            '{}'::TEXT[]
        ) AS preferred_player_levels
    FROM source s
        LEFT JOIN LATERAL unnest(COALESCE(s.preferred_player_leagues, '{}'::TEXT[])) AS level_value ON true
    GROUP BY
        s.team_id
),
locations AS (
    SELECT
        s.team_id,
        COALESCE(
            array_agg(DISTINCT trim(location_value)) FILTER (
                WHERE
                    location_value IS NOT NULL
                    AND trim(location_value) <> ''
            ),
            '{}'::TEXT[]
        ) AS preferred_player_locations
    FROM source s
        LEFT JOIN LATERAL unnest(COALESCE(s.preferred_player_locations, '{}'::TEXT[])) AS location_value ON true
    GROUP BY
        s.team_id
)
INSERT INTO
    public.team_preference (
        team_id,
        preferred_positions,
        preferred_player_levels,
        preferred_player_locations
    )
SELECT
    p.team_id,
    p.preferred_positions,
    COALESCE(l.preferred_player_levels, '{}'::TEXT[]),
    COALESCE(loc.preferred_player_locations, '{}'::TEXT[])
FROM positions p
    LEFT JOIN levels l ON l.team_id = p.team_id
    LEFT JOIN locations loc ON loc.team_id = p.team_id ON CONFLICT (team_id) DO UPDATE
SET
    preferred_positions = EXCLUDED.preferred_positions,
    preferred_player_levels = EXCLUDED.preferred_player_levels,
    preferred_player_locations = EXCLUDED.preferred_player_locations,
    updated_at = now();