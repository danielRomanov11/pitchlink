-- WARNING: This migration is intentionally destructive.
-- It removes existing app tables/views/functions in the public schema
-- and purges auth data so implementation can start from a clean baseline.

DO $$
DECLARE
    obj RECORD;
BEGIN
    FOR obj IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', obj.tablename);
    END LOOP;

    FOR obj IN
        SELECT viewname
        FROM pg_views
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', obj.viewname);
    END LOOP;

    FOR obj IN
        SELECT matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS public.%I CASCADE', obj.matviewname);
    END LOOP;

    FOR obj IN
        SELECT p.oid::regprocedure AS signature
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', obj.signature);
    END LOOP;
END
$$;

DO $$
DECLARE
    auth_table TEXT;
BEGIN
    FOREACH auth_table IN ARRAY ARRAY[
        'audit_log_entries',
        'flow_state',
        'identities',
        'mfa_amr_claims',
        'mfa_challenges',
        'mfa_factors',
        'one_time_tokens',
        'refresh_tokens',
        'saml_providers',
        'saml_relay_states',
        'sessions',
        'sso_domains',
        'sso_providers',
        'users'
    ]
    LOOP
        IF to_regclass(format('auth.%s', auth_table)) IS NOT NULL THEN
            EXECUTE format('TRUNCATE TABLE auth.%I RESTART IDENTITY CASCADE', auth_table);
        END IF;
    END LOOP;
END
$$;