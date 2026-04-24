# Supabase Migration Runbook

This folder now contains destructive reset + relational schema migrations.

## Migrations

1. `migrations/202604060001_reset_legacy_data.sql`
2. `migrations/202604060002_create_relational_schema.sql`
3. `migrations/202604170001_guard_application_message_on_status_change.sql`
4. `migrations/202604220001_create_preference_tables.sql`
5. `migrations/202604220002_add_location_coordinate_cache.sql`
6. `migrations/202604220003_expand_player_preference_select_for_matching.sql`
7. `migrations/202604230001_create_team_preference_table.sql`

## What The Reset Does

- Drops all existing app objects in `public` (tables/views/materialized views/functions).
- Purges old auth account data from `auth` tables, including `auth.users`.

## Apply In Supabase Dashboard (SQL Editor)

Run in order:

1. `202604060001_reset_legacy_data.sql`
2. `202604060002_create_relational_schema.sql`
3. `202604170001_guard_application_message_on_status_change.sql`
4. `202604220001_create_preference_tables.sql`
5. `202604220002_add_location_coordinate_cache.sql`
6. `202604220003_expand_player_preference_select_for_matching.sql`
7. `202604230001_create_team_preference_table.sql`

## Apply With Supabase CLI

If you have a linked project:

```bash
supabase db push
```

## Edge Functions

Distance-based match scoring uses the `distance-miles` edge function:

```bash
supabase functions deploy distance-miles
```

The function geocodes locations, caches coordinates in `location_coordinate_cache`, and returns the shortest distance in miles.

If the project is not linked yet:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## Safety Notes

- The reset migration is irreversible for existing app data and users.
- Run on development/staging first before production.
- Keep a backup if any legacy data must be retained.
