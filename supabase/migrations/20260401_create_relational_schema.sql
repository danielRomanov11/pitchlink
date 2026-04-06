-- Full relational schema for Pitch Link.
-- NOTE: In Supabase, auth.users is the source of truth for email/password.
-- This migration adds app-level relational tables and policies.

create extension if not exists pgcrypto;

-- Keep app-facing user data separated from auth internals.
create table if not exists public.app_user (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null unique,
    name text,
    role text not null default 'player',
    created_at timestamptz not null default timezone ('utc', now()),
    updated_at timestamptz not null default timezone ('utc', now()),
    constraint app_user_role_check check (role in ('player', 'manager'))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists app_user_set_updated_at on public.app_user;

create trigger app_user_set_updated_at
before update on public.app_user
for each row
execute function public.set_updated_at();

-- Sync auth user rows into app_user so PK/FK relationships are stable.
create or replace function public.sync_app_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    normalized_role text;
begin
    normalized_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'player'));

    if normalized_role not in ('player', 'manager') then
        normalized_role := 'player';
    end if;

    insert into public.app_user (id, email, name, role)
    values (
        new.id,
        coalesce(new.email, ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        normalized_role
    )
    on conflict (id) do update
    set
        email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        updated_at = timezone('utc', now());

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_app_user on auth.users;

create trigger on_auth_user_created_sync_app_user
after insert on auth.users
for each row
execute function public.sync_app_user_from_auth();

drop trigger if exists on_auth_user_updated_sync_app_user on auth.users;

create trigger on_auth_user_updated_sync_app_user
after update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_app_user_from_auth();

-- Backfill existing auth users.
insert into
    public.app_user (id, email, name, role)
select
    u.id,
    coalesce(u.email, ''),
    nullif(
        trim(
            u.raw_user_meta_data ->> 'full_name'
        ),
        ''
    ),
    case
        when lower(
            coalesce(
                u.raw_user_meta_data ->> 'role',
                'player'
            )
        ) in ('player', 'manager') then lower(
            coalesce(
                u.raw_user_meta_data ->> 'role',
                'player'
            )
        )
        else 'player'
    end
from auth.users u on conflict (id) do nothing;

-- Subclass: Manager (1:1 with app_user)
create table if not exists public.manager (
    user_id uuid primary key references public.app_user (id) on delete cascade,
    created_at timestamptz not null default timezone ('utc', now())
);

-- Subclass: Player (1:1 with app_user)
create table if not exists public.player (
    user_id uuid primary key references public.app_user (id) on delete cascade,
    birthday date,
    position text,
    height double precision,
    bio text,
    url text,
    created_at timestamptz not null default timezone ('utc', now()),
    updated_at timestamptz not null default timezone ('utc', now()),
    constraint player_height_check check (
        height is null
        or (
            height >= 0
            and height <= 300
        )
    )
);

drop trigger if exists player_set_updated_at on public.player;

create trigger player_set_updated_at
before update on public.player
for each row
execute function public.set_updated_at();

-- Enforce role-subclass consistency.
create or replace function public.enforce_manager_role_match()
returns trigger
language plpgsql
as $$
declare
    current_role text;
begin
    select role into current_role
    from public.app_user
    where id = new.user_id;

    if current_role is null then
        raise exception 'No app_user row exists for manager user_id %', new.user_id;
    end if;

    if current_role <> 'manager' then
        raise exception 'User % must have role manager to exist in manager table', new.user_id;
    end if;

    return new;
end;
$$;

drop trigger if exists manager_role_guard on public.manager;

create trigger manager_role_guard
before insert or update on public.manager
for each row
execute function public.enforce_manager_role_match();

create or replace function public.enforce_player_role_match()
returns trigger
language plpgsql
as $$
declare
    current_role text;
begin
    select role into current_role
    from public.app_user
    where id = new.user_id;

    if current_role is null then
        raise exception 'No app_user row exists for player user_id %', new.user_id;
    end if;

    if current_role <> 'player' then
        raise exception 'User % must have role player to exist in player table', new.user_id;
    end if;

    return new;
end;
$$;

drop trigger if exists player_role_guard on public.player;

create trigger player_role_guard
before insert or update on public.player
for each row
execute function public.enforce_player_role_match();

create table if not exists public.team (
    id uuid primary key default gen_random_uuid (),
    name text not null,
    league text,
    location text,
    url text,
    manager_id uuid not null references public.manager (user_id) on delete restrict,
    created_at timestamptz not null default timezone ('utc', now())
);

create table if not exists public.listing (
    id uuid primary key default gen_random_uuid (),
    status text not null,
    description text,
    position text,
    team_id uuid not null references public.team (id) on delete cascade,
    created_at timestamptz not null default timezone ('utc', now())
);

create table if not exists public.application (
    id uuid primary key default gen_random_uuid (),
    status text not null,
    message text,
    player_id uuid not null references public.player (user_id) on delete cascade,
    team_id uuid not null references public.team (id) on delete cascade,
    created_at timestamptz not null default timezone ('utc', now()),
    constraint application_player_team_unique unique (player_id, team_id)
);

create index if not exists idx_team_manager_id on public.team (manager_id);

create index if not exists idx_listing_team_id on public.listing (team_id);

create index if not exists idx_application_player_id on public.application (player_id);

create index if not exists idx_application_team_id on public.application (team_id);

-- RLS
alter table public.app_user enable row level security;

alter table public.manager enable row level security;

alter table public.player enable row level security;

alter table public.team enable row level security;

alter table public.listing enable row level security;

alter table public.application enable row level security;

-- app_user: users can read/update only themselves.
drop policy if exists app_user_select_own on public.app_user;

create policy app_user_select_own on public.app_user for
select to authenticated using (auth.uid () = id);

drop policy if exists app_user_update_own on public.app_user;

create policy app_user_update_own on public.app_user for
update to authenticated using (auth.uid () = id)
with
    check (auth.uid () = id);

-- manager/player: users manage only their own subclass row.
drop policy if exists manager_select_own on public.manager;

create policy manager_select_own on public.manager for
select to authenticated using (auth.uid () = user_id);

drop policy if exists manager_insert_own on public.manager;

create policy manager_insert_own on public.manager for
insert
    to authenticated
with
    check (auth.uid () = user_id);

drop policy if exists manager_update_own on public.manager;

create policy manager_update_own on public.manager for
update to authenticated using (auth.uid () = user_id)
with
    check (auth.uid () = user_id);

drop policy if exists player_select_own on public.player;

create policy player_select_own on public.player for
select to authenticated using (auth.uid () = user_id);

drop policy if exists player_insert_own on public.player;

create policy player_insert_own on public.player for
insert
    to authenticated
with
    check (auth.uid () = user_id);

drop policy if exists player_update_own on public.player;

create policy player_update_own on public.player for
update to authenticated using (auth.uid () = user_id)
with
    check (auth.uid () = user_id);

-- team: all authenticated users can read; only owning manager can write.
drop policy if exists team_select_all_authenticated on public.team;

create policy team_select_all_authenticated on public.team for
select to authenticated using (true);

drop policy if exists team_insert_manager_own on public.team;

create policy team_insert_manager_own on public.team for
insert
    to authenticated
with
    check (auth.uid () = manager_id);

drop policy if exists team_update_manager_own on public.team;

create policy team_update_manager_own on public.team for
update to authenticated using (auth.uid () = manager_id)
with
    check (auth.uid () = manager_id);

drop policy if exists team_delete_manager_own on public.team;

create policy team_delete_manager_own on public.team for delete to authenticated using (auth.uid () = manager_id);

-- listing: all authenticated users can read; only team owner manager can write.
drop policy if exists listing_select_all_authenticated on public.listing;

create policy listing_select_all_authenticated on public.listing for
select to authenticated using (true);

drop policy if exists listing_insert_team_manager on public.listing;

create policy listing_insert_team_manager on public.listing for
insert
    to authenticated
with
    check (
        exists (
            select 1
            from public.team t
            where
                t.id = team_id
                and t.manager_id = auth.uid ()
        )
    );

drop policy if exists listing_update_team_manager on public.listing;

create policy listing_update_team_manager on public.listing for
update to authenticated using (
    exists (
        select 1
        from public.team t
        where
            t.id = team_id
            and t.manager_id = auth.uid ()
    )
)
with
    check (
        exists (
            select 1
            from public.team t
            where
                t.id = team_id
                and t.manager_id = auth.uid ()
        )
    );

drop policy if exists listing_delete_team_manager on public.listing;

create policy listing_delete_team_manager on public.listing for delete to authenticated using (
    exists (
        select 1
        from public.team t
        where
            t.id = team_id
            and t.manager_id = auth.uid ()
    )
);

-- application: player can apply as self; player and target team manager can read.
drop policy if exists application_select_player_or_team_manager on public.application;

create policy application_select_player_or_team_manager on public.application for
select to authenticated using (
        auth.uid () = player_id
        or exists (
            select 1
            from public.team t
            where
                t.id = team_id
                and t.manager_id = auth.uid ()
        )
    );

drop policy if exists application_insert_player_self on public.application;

create policy application_insert_player_self on public.application for
insert
    to authenticated
with
    check (auth.uid () = player_id);

drop policy if exists application_update_player_or_team_manager on public.application;

create policy application_update_player_or_team_manager on public.application for
update to authenticated using (
    auth.uid () = player_id
    or exists (
        select 1
        from public.team t
        where
            t.id = team_id
            and t.manager_id = auth.uid ()
    )
)
with
    check (
        auth.uid () = player_id
        or exists (
            select 1
            from public.team t
            where
                t.id = team_id
                and t.manager_id = auth.uid ()
        )
    );

drop policy if exists application_delete_player_self on public.application;

create policy application_delete_player_self on public.application for delete to authenticated using (auth.uid () = player_id);