# Supabase Migration Runbook

This folder now contains destructive reset + relational schema migrations.

## Migrations

1. `migrations/202604060001_reset_legacy_data.sql`
2. `migrations/202604060002_create_relational_schema.sql`
3. `migrations/202604170001_guard_application_message_on_status_change.sql`

## What The Reset Does

- Drops all existing app objects in `public` (tables/views/materialized views/functions).
- Purges old auth account data from `auth` tables, including `auth.users`.

## Apply In Supabase Dashboard (SQL Editor)

Run in order:

1. `202604060001_reset_legacy_data.sql`
2. `202604060002_create_relational_schema.sql`
3. `202604170001_guard_application_message_on_status_change.sql`

## Apply With Supabase CLI

If you have a linked project:

```bash
supabase db push
```

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
