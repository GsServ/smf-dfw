-- The committee's start-of-season checklist.
--
-- Only the ticks are stored here. The wording of the standard steps lives in
-- the app (src/routes/SeasonStart.tsx) so it can be reworded without a
-- migration, and a row appears the first time somebody ticks a step or writes
-- one of their own. Nothing seeds this table; an empty table means a season
-- nobody has started yet.

create table season_tasks (
  id          uuid primary key default gen_random_uuid(),
  season_year integer not null,
  -- Matches a step defined in the app, or a slug generated for a step the
  -- committee added itself.
  slug        text not null,
  -- Null for the standard steps, whose wording the app owns. Set only for the
  -- committee's own additions.
  label       text,
  sort_order  integer not null default 0,
  done_at     timestamptz,
  done_by     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (season_year, slug)
);

create index season_tasks_by_year on season_tasks (season_year);

alter table season_tasks enable row level security;

-- Committee work, and only theirs. A church representative has no business
-- seeing which parts of the season the committee has not got to yet.
create policy season_tasks_committee_only on season_tasks
  for all to authenticated
  using (auth_is_committee())
  with check (auth_is_committee());
