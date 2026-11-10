-- Climboria player identity and cloud-save foundation.
-- Apply only to a dedicated Supabase project for Climboria.
-- Browser clients may write only their own non-economic save payload.
-- Never store token balances, NFT ownership, paid rewards, or trusted inventory here.

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_id text not null unique,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_username_format check (
    username is null or username ~ '^[A-Za-z0-9_]{3,20}$'
  )
);

create or replace function public.climboria_create_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_profiles (user_id, player_id)
  values (new.id, 'CLB-' || upper(substr(replace(new.id::text, '-', ''), 1, 12)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists climboria_auth_user_created on auth.users;
create trigger climboria_auth_user_created
  after insert on auth.users
  for each row execute procedure public.climboria_create_player_profile();

create or replace function public.climboria_guard_player_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id or new.player_id <> old.player_id then
    raise exception 'Climboria player identity is immutable';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists climboria_player_identity_immutable on public.player_profiles;
create trigger climboria_player_identity_immutable
  before update on public.player_profiles
  for each row execute procedure public.climboria_guard_player_identity();

create table if not exists public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  save_data jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  constraint player_save_size check (octet_length(save_data::text) <= 65536)
);

alter table public.player_profiles enable row level security;
alter table public.player_saves enable row level security;

drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile"
  on public.player_profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Players can update their own username" on public.player_profiles;
create policy "Players can update their own username"
  on public.player_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Players can read their own save" on public.player_saves;
create policy "Players can read their own save"
  on public.player_saves for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Players can create their own save" on public.player_saves;
create policy "Players can create their own save"
  on public.player_saves for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Players can update their own save" on public.player_saves;
create policy "Players can update their own save"
  on public.player_saves for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update on public.player_profiles to authenticated;
grant select, insert, update on public.player_saves to authenticated;
