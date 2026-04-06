CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.app_user (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
    role TEXT NOT NULL CHECK (role IN ('player', 'manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.manager (
    user_id UUID PRIMARY KEY REFERENCES public.app_user (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.player (
    user_id UUID PRIMARY KEY REFERENCES public.app_user (id) ON DELETE CASCADE,
    birthday DATE,
    position TEXT,
    height INTEGER,
    bio TEXT,
    url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        height IS NULL
        OR height BETWEEN 100 AND 260
    )
);

CREATE TABLE public.team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    league TEXT NOT NULL,
    location TEXT NOT NULL,
    url TEXT,
    manager_id UUID NOT NULL REFERENCES public.manager (user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.listing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    description TEXT NOT NULL DEFAULT '',
    position TEXT NOT NULL,
    team_id UUID NOT NULL REFERENCES public.team (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.application (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'accepted',
            'declined'
        )
    ),
    message TEXT,
    player_id UUID NOT NULL REFERENCES public.player (user_id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.team (id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listing (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (player_id, listing_id)
);

CREATE INDEX idx_app_user_role ON public.app_user (role);

CREATE INDEX idx_player_position ON public.player (position);

CREATE INDEX idx_player_height ON public.player (height);

CREATE INDEX idx_team_manager_id ON public.team (manager_id);

CREATE INDEX idx_team_league_location ON public.team (league, location);

CREATE INDEX idx_listing_team_id ON public.listing (team_id);

CREATE INDEX idx_listing_status_position ON public.listing (status, position);

CREATE INDEX idx_application_status ON public.application (status);

CREATE INDEX idx_application_player_id ON public.application (player_id);

CREATE INDEX idx_application_team_id ON public.application (team_id);

CREATE INDEX idx_application_listing_id ON public.application (listing_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_role_subclass_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.role = 'manager' THEN
        INSERT INTO public.manager (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;

        DELETE FROM public.player
        WHERE user_id = NEW.id;
    ELSIF NEW.role = 'player' THEN
        INSERT INTO public.player (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;

        DELETE FROM public.manager
        WHERE user_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_role TEXT;
    next_name TEXT;
BEGIN
    next_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'player');

    IF next_role NOT IN ('player', 'manager') THEN
        next_role := 'player';
    END IF;

    next_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), '');

    IF next_name IS NULL THEN
        next_name := split_part(COALESCE(NEW.email, 'pitchlink.user@local'), '@', 1);
    END IF;

    INSERT INTO public.app_user (id, email, name, role)
    VALUES (NEW.id, COALESCE(NEW.email, ''), next_name, next_role)
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_application_listing_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    listing_team_id UUID;
BEGIN
    SELECT team_id
    INTO listing_team_id
    FROM public.listing
    WHERE id = NEW.listing_id;

    IF listing_team_id IS NULL THEN
        RAISE EXCEPTION 'Listing % does not exist', NEW.listing_id;
    END IF;

    IF NEW.team_id <> listing_team_id THEN
        RAISE EXCEPTION 'team_id must match the listing team_id';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER set_app_user_updated_at
BEFORE UPDATE ON public.app_user
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_player_updated_at
BEFORE UPDATE ON public.player
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_team_updated_at
BEFORE UPDATE ON public.team
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_listing_updated_at
BEFORE UPDATE ON public.listing
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_application_updated_at
BEFORE UPDATE ON public.application
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sync_role_subclass_tables_on_user_change
AFTER INSERT OR UPDATE OF role ON public.app_user
FOR EACH ROW
EXECUTE FUNCTION public.sync_role_subclass_tables();

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_created();

CREATE TRIGGER validate_application_listing_team_before_write
BEFORE INSERT OR UPDATE ON public.application
FOR EACH ROW
EXECUTE FUNCTION public.validate_application_listing_team();

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.manager ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.player ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.listing ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.application ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.app_user TO authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.manager TO authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.player TO authenticated;

GRANT SELECT, INSERT , UPDATE, DELETE ON public.team TO authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.listing TO authenticated;

GRANT
SELECT,
INSERT
,
UPDATE,
DELETE ON public.application TO authenticated;

CREATE POLICY app_user_select_own ON public.app_user FOR
SELECT TO authenticated USING (id = auth.uid ());

CREATE POLICY app_user_insert_own ON public.app_user FOR
INSERT
    TO authenticated
WITH
    CHECK (id = auth.uid ());

CREATE POLICY app_user_update_own ON public.app_user FOR
UPDATE TO authenticated USING (id = auth.uid ())
WITH
    CHECK (id = auth.uid ());

CREATE POLICY manager_select_authenticated ON public.manager FOR
SELECT TO authenticated USING (true);

CREATE POLICY manager_insert_own ON public.manager FOR
INSERT
    TO authenticated
WITH
    CHECK (user_id = auth.uid ());

CREATE POLICY manager_update_own ON public.manager FOR
UPDATE TO authenticated USING (user_id = auth.uid ())
WITH
    CHECK (user_id = auth.uid ());

CREATE POLICY player_select_authenticated ON public.player FOR
SELECT TO authenticated USING (true);

CREATE POLICY player_insert_own ON public.player FOR
INSERT
    TO authenticated
WITH
    CHECK (user_id = auth.uid ());

CREATE POLICY player_update_own ON public.player FOR
UPDATE TO authenticated USING (user_id = auth.uid ())
WITH
    CHECK (user_id = auth.uid ());

CREATE POLICY team_select_authenticated ON public.team FOR
SELECT TO authenticated USING (true);

CREATE POLICY team_insert_manager_owned ON public.team FOR
INSERT
    TO authenticated
WITH
    CHECK (
        manager_id = auth.uid ()
        AND EXISTS (
            SELECT 1
            FROM public.manager
            WHERE
                user_id = auth.uid ()
        )
    );

CREATE POLICY team_update_manager_owned ON public.team FOR
UPDATE TO authenticated USING (manager_id = auth.uid ())
WITH
    CHECK (manager_id = auth.uid ());

CREATE POLICY team_delete_manager_owned ON public.team FOR DELETE TO authenticated USING (manager_id = auth.uid ());

CREATE POLICY listing_select_authenticated ON public.listing FOR
SELECT TO authenticated USING (true);

CREATE POLICY listing_insert_manager_owned_team ON public.listing FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.team
            WHERE
                team.id = listing.team_id
                AND team.manager_id = auth.uid ()
        )
    );

CREATE POLICY listing_update_manager_owned_team ON public.listing FOR
UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.team
        WHERE
            team.id = listing.team_id
            AND team.manager_id = auth.uid ()
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.team
            WHERE
                team.id = listing.team_id
                AND team.manager_id = auth.uid ()
        )
    );

CREATE POLICY listing_delete_manager_owned_team ON public.listing FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.team
        WHERE
            team.id = listing.team_id
            AND team.manager_id = auth.uid ()
    )
);

CREATE POLICY application_select_relevant ON public.application FOR
SELECT TO authenticated USING (
        player_id = auth.uid ()
        OR EXISTS (
            SELECT 1
            FROM public.team
            WHERE
                team.id = application.team_id
                AND team.manager_id = auth.uid ()
        )
    );

CREATE POLICY application_insert_player_owned ON public.application FOR
INSERT
    TO authenticated
WITH
    CHECK (
        player_id = auth.uid ()
        AND EXISTS (
            SELECT 1
            FROM public.player
            WHERE
                player.user_id = auth.uid ()
        )
        AND EXISTS (
            SELECT 1
            FROM public.listing
            WHERE
                listing.id = application.listing_id
                AND listing.team_id = application.team_id
                AND listing.status = 'open'
        )
    );

CREATE POLICY application_update_manager_owned_team ON public.application FOR
UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.team
        WHERE
            team.id = application.team_id
            AND team.manager_id = auth.uid ()
    )
)
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.team
            WHERE
                team.id = application.team_id
                AND team.manager_id = auth.uid ()
        )
    );

CREATE POLICY application_delete_player_or_manager ON public.application FOR DELETE TO authenticated USING (
    player_id = auth.uid ()
    OR EXISTS (
        SELECT 1
        FROM public.team
        WHERE
            team.id = application.team_id
            AND team.manager_id = auth.uid ()
    )
);

INSERT INTO
    public.manager (user_id)
SELECT id
FROM public.app_user
WHERE
    role = 'manager' ON CONFLICT (user_id) DO NOTHING;

INSERT INTO
    public.player (user_id)
SELECT id
FROM public.app_user
WHERE
    role = 'player' ON CONFLICT (user_id) DO NOTHING;

DELETE FROM public.manager m USING public.app_user u
WHERE
    m.user_id = u.id
    AND u.role <> 'manager';

DELETE FROM public.player p USING public.app_user u
WHERE
    p.user_id = u.id
    AND u.role <> 'player';