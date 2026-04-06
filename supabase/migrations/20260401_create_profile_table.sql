-- Profile table schema for Supabase
-- Uses user_id as both primary key and foreign key to auth.users(id).

create table if not exists public.profile (
    user_id uuid primary key references auth.users (id) on delete cascade,
    birthday date,
    position text,
    height double precision,
    bio text,
    url text,
    role text
);

-- If an older schema used video_url, rename it to url for consistency.
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profile'
          and column_name = 'video_url'
    ) and not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profile'
          and column_name = 'url'
    ) then
        alter table public.profile rename column video_url to url;
    end if;
end $$;

-- Ensure required columns exist if table already existed.
alter table public.profile
add column if not exists birthday date,
add column if not exists position text,
add column if not exists height double precision,
add column if not exists bio text,
add column if not exists url text,
add column if not exists role text;

-- Keep access user-scoped.
alter table public.profile enable row level security;

drop policy if exists profile_select_own on public.profile;

create policy profile_select_own on public.profile for
select to authenticated using (auth.uid () = user_id);

drop policy if exists profile_insert_own on public.profile;

create policy profile_insert_own on public.profile for
insert
    to authenticated
with
    check (auth.uid () = user_id);

drop policy if exists profile_update_own on public.profile;

create policy profile_update_own on public.profile for
update to authenticated using (auth.uid () = user_id)
with
    check (auth.uid () = user_id);

drop policy if exists profile_delete_own on public.profile;

create policy profile_delete_own on public.profile for delete to authenticated using (auth.uid () = user_id);

-- Optional role guardrail while keeping role as text.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profile_role_check'
    ) then
        alter table public.profile
            add constraint profile_role_check
            check (role is null or role in ('player', 'manager'));

end if;

end $$;