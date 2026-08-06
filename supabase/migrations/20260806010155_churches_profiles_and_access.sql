-- Identity and access for the St. Mark Festival DFW site.
--
-- Design note: a rep must never be able to change which church they belong to,
-- nor promote themselves to committee. So `profiles` has NO user-facing write
-- policy at all — rows are created by a trigger from an invite list that only
-- the committee controls.

create type app_role as enum ('rep', 'committee');

create table churches (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- One row per signed-in person. church_id is null for committee accounts.
create table profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  church_id   uuid references churches(id) on delete restrict,
  role        app_role not null default 'rep',
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  -- A rep without a church would have access to nothing and is a bug, not a state.
  constraint rep_must_have_church check (role <> 'rep' or church_id is not null)
);

-- The committee adds an email here before that person can get in. Signing up
-- with an uninvited address creates an auth user with no profile, which every
-- RLS policy below then denies. No open registration.
create table invites (
  email       text primary key,
  church_id   uuid references churches(id) on delete cascade,
  role        app_role not null default 'rep',
  full_name   text,
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  constraint invited_rep_must_have_church check (role <> 'rep' or church_id is not null)
);

-- Fires when someone completes a magic-link sign-in for the first time.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite invites%rowtype;
begin
  select * into invite from invites where email = lower(new.email);

  if found then
    insert into profiles (user_id, church_id, role, full_name)
    values (new.id, invite.church_id, invite.role, invite.full_name)
    on conflict (user_id) do nothing;

    update invites set claimed_at = now() where email = lower(new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helpers used by RLS. SECURITY DEFINER so reading `profiles` inside a policy
-- on `profiles` cannot recurse.
create or replace function auth_church_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select church_id from profiles where user_id = auth.uid();
$$;

create or replace function auth_is_committee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'committee' from profiles where user_id = auth.uid()), false);
$$;

alter table churches enable row level security;
alter table profiles enable row level security;
alter table invites  enable row level security;

-- Church names are already public on the site; any signed-in user may read them.
create policy churches_read on churches
  for select to authenticated using (true);

create policy churches_committee_writes on churches
  for all to authenticated
  using (auth_is_committee()) with check (auth_is_committee());

-- You can see yourself. The committee can see everyone.
create policy profiles_read_own on profiles
  for select to authenticated
  using (user_id = auth.uid() or auth_is_committee());

-- Deliberately no insert/update/delete policy for `authenticated`:
-- profiles are written only by the trigger above and by the committee below.
create policy profiles_committee_writes on profiles
  for all to authenticated
  using (auth_is_committee()) with check (auth_is_committee());

create policy invites_committee_only on invites
  for all to authenticated
  using (auth_is_committee()) with check (auth_is_committee());
