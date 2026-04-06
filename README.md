# Pitch Link

Pitch Link is a Vite + React + TypeScript app with Supabase authentication and profile storage.

## Supabase Auth Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file and set public client credentials:

```bash
cp .env.example .env.local
```

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Start the app:

```bash
npm run dev
```

## Security Defaults In This App

- Uses Supabase client auth with `flowType: 'pkce'`.
- Rejects frontend startup when a service-role key is provided.
- Uses only public env vars (`VITE_...`) in browser code.
- Protects private routes and redirects unauthenticated users to `/login`.
- Redirects signed-in users away from `/login` and `/signup`.

## Required Supabase Dashboard Settings

1. In Auth URL configuration:
- Set Site URL to your app origin (for example `http://localhost:5173` during dev).
- Add redirect URL: `http://localhost:5173/complete-profile`.

2. Keep email confirmation enabled unless your onboarding requires immediate sessions.

3. Ensure Row Level Security is enabled on `profile` and policies are user-scoped.

Example policy setup:

```sql
alter table public.profile enable row level security;

create policy "profile_select_own"
on public.profile
for select
to authenticated
using (auth.uid() = user_id);

create policy "profile_insert_own"
on public.profile
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profile_update_own"
on public.profile
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## Security Checklist

- Never use `service_role` keys in frontend code.
- Never commit `.env.local`.
- Keep anon/publishable keys in client only.
- Apply least-privilege RLS policies to every table exposed to the app.
- Add a server-side layer for any privileged operations.
