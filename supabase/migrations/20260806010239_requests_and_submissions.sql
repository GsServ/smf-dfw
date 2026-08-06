-- What the committee asks for, and what each church sends back.

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table requests (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  due_date    date,
  -- Matches an `id` in the site's events.json. Deliberately NOT a foreign key:
  -- the public calendar stays a flat file so the maintenance story ("edit one
  -- text file") survives Phase 2. See supabase/README.md for the reasoning.
  event_slug  text,
  fields      jsonb not null default '[]'::jsonb,
  is_open     boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger requests_updated_at before update on requests
  for each row execute function set_updated_at();

create table submissions (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references requests(id) on delete cascade,
  church_id    uuid not null references churches(id) on delete cascade,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'partial' check (status in ('partial', 'submitted')),
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (request_id, church_id)
);

create index submissions_by_church on submissions (church_id);
create index submissions_by_request on submissions (request_id);

-- Checks a payload against its request's field spec. Returns human-readable
-- problems, empty when clean. The form calls this same logic client-side as the
-- user types (src/lib/validateSubmission.ts); the trigger below enforces it
-- again so the API cannot be used to store a team of five.
create or replace function validate_submission(fields jsonb, payload jsonb)
returns text[]
language plpgsql
immutable
as $$
declare
  f        jsonb;
  errs     text[] := '{}';
  key      text;
  label    text;
  ftype    text;
  raw      jsonb;
  num      numeric;
  arr_len  integer;
begin
  for f in select * from jsonb_array_elements(fields) loop
    key   := f ->> 'key';
    label := coalesce(f ->> 'label', key);
    ftype := coalesce(f ->> 'type', 'text');
    raw   := payload -> key;

    if raw is null or raw = 'null'::jsonb
       or (jsonb_typeof(raw) = 'string' and btrim(raw #>> '{}') = '') then
      if coalesce((f ->> 'required')::boolean, false) then
        errs := errs || format('%s is required.', label);
      end if;
      continue;
    end if;

    if ftype = 'number' then
      begin
        num := (raw #>> '{}')::numeric;
      exception when others then
        errs := errs || format('%s must be a number.', label);
        continue;
      end;

      if f ? 'min' and num < (f ->> 'min')::numeric then
        errs := errs || format('%s must be at least %s.', label, f ->> 'min');
      end if;
      if f ? 'max' and num > (f ->> 'max')::numeric then
        errs := errs || format('%s must be no more than %s.', label, f ->> 'max');
      end if;

    elsif ftype = 'name_list' then
      if jsonb_typeof(raw) <> 'array' then
        errs := errs || format('%s must be a list of names.', label);
        continue;
      end if;

      select count(*) into arr_len
      from jsonb_array_elements_text(raw) v where btrim(v) <> '';

      if f ? 'min_items' and arr_len < (f ->> 'min_items')::integer then
        errs := errs || format('%s needs at least %s names — you have %s.',
                               label, f ->> 'min_items', arr_len);
      end if;
      if f ? 'max_items' and arr_len > (f ->> 'max_items')::integer then
        errs := errs || format('%s allows at most %s names — you have %s.',
                               label, f ->> 'max_items', arr_len);
      end if;
    end if;
  end loop;

  return errs;
end;
$$;

create or replace function enforce_submission_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  spec jsonb;
  errs text[];
begin
  if new.status = 'submitted' then
    select fields into spec from requests where id = new.request_id;
    errs := validate_submission(spec, new.payload);

    if array_length(errs, 1) > 0 then
      raise exception 'This submission is not complete: %', array_to_string(errs, ' ');
    end if;

    if new.submitted_at is null then
      new.submitted_at := now();
    end if;
    new.submitted_by := coalesce(new.submitted_by, auth.uid());
  else
    -- Reverting to a draft clears the record of it having been sent.
    new.submitted_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger submissions_enforce before insert or update on submissions
  for each row execute function enforce_submission_rules();

alter table requests    enable row level security;
alter table submissions enable row level security;

-- Every rep needs to see what is being asked of them.
create policy requests_read on requests
  for select to authenticated using (true);

create policy requests_committee_writes on requests
  for all to authenticated
  using (auth_is_committee()) with check (auth_is_committee());

-- A church sees and edits only its own submissions. The committee reads all,
-- and does not write on a church's behalf.
create policy submissions_read on submissions
  for select to authenticated
  using (church_id = auth_church_id() or auth_is_committee());

create policy submissions_insert_own on submissions
  for insert to authenticated
  with check (church_id = auth_church_id());

create policy submissions_update_own on submissions
  for update to authenticated
  using (church_id = auth_church_id())
  with check (church_id = auth_church_id());

create policy submissions_delete_own on submissions
  for delete to authenticated
  using (church_id = auth_church_id());
