-- Abouna grants exceptions. A team of 5 against a 7 minimum is a real thing
-- that happens and gets approved, so the form must accept it — refusing would
-- only push the truth back into WhatsApp, which is what this site exists to fix.
--
-- Two kinds of problem now:
--   errors   — the submission is meaningless without fixing (missing, not a number)
--   warnings — breaks a posted rule, allowed through, flagged for Abouna
--
-- Approving is an RPC rather than an RLS write policy: the committee must never
-- be able to edit what a church submitted, only to record a decision about it.

alter table submissions
  add column exceptions  jsonb not null default '[]'::jsonb,
  add column note        text,
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users(id) on delete set null;

drop function if exists validate_submission(jsonb, jsonb);

create or replace function submission_errors(fields jsonb, payload jsonb)
returns text[] language plpgsql immutable set search_path = public as $$
declare f jsonb; errs text[] := '{}'; label text; ftype text; raw jsonb;
begin
  for f in select * from jsonb_array_elements(fields) loop
    label := coalesce(f ->> 'label', f ->> 'key');
    ftype := coalesce(f ->> 'type', 'text');
    raw   := payload -> (f ->> 'key');

    if raw is null or raw = 'null'::jsonb
       or (jsonb_typeof(raw) = 'string' and btrim(raw #>> '{}') = '')
       or (ftype = 'name_list' and jsonb_typeof(raw) = 'array'
           and not exists (select 1 from jsonb_array_elements_text(raw) v where btrim(v) <> '')) then
      if coalesce((f ->> 'required')::boolean, false) then
        errs := errs || format('%s is required.', label);
      end if;
      continue;
    end if;

    if ftype = 'number' then
      begin perform (raw #>> '{}')::numeric;
      exception when others then errs := errs || format('%s must be a number.', label); end;
    elsif ftype = 'name_list' and jsonb_typeof(raw) <> 'array' then
      errs := errs || format('%s must be a list of names.', label);
    end if;
  end loop;
  return errs;
end; $$;

create or replace function submission_warnings(fields jsonb, payload jsonb)
returns text[] language plpgsql immutable set search_path = public as $$
declare f jsonb; warns text[] := '{}'; label text; ftype text; raw jsonb;
        num numeric; arr_len integer;
begin
  for f in select * from jsonb_array_elements(fields) loop
    label := coalesce(f ->> 'label', f ->> 'key');
    ftype := coalesce(f ->> 'type', 'text');
    raw   := payload -> (f ->> 'key');
    if raw is null or raw = 'null'::jsonb then continue; end if;

    if ftype = 'number' then
      begin num := (raw #>> '{}')::numeric; exception when others then continue; end;
      if f ? 'min' and num < (f ->> 'min')::numeric then
        warns := warns || format('%s is %s, below the minimum of %s.', label, num, f ->> 'min');
      end if;
      if f ? 'max' and num > (f ->> 'max')::numeric then
        warns := warns || format('%s is %s, above the limit of %s.', label, num, f ->> 'max');
      end if;
    elsif ftype = 'name_list' and jsonb_typeof(raw) = 'array' then
      select count(*) into arr_len from jsonb_array_elements_text(raw) v where btrim(v) <> '';
      if arr_len = 0 then continue; end if;
      if f ? 'min_items' and arr_len < (f ->> 'min_items')::integer then
        warns := warns || format('%s has %s names, below the minimum of %s.', label, arr_len, f ->> 'min_items');
      end if;
      if f ? 'max_items' and arr_len > (f ->> 'max_items')::integer then
        warns := warns || format('%s has %s names, above the limit of %s.', label, arr_len, f ->> 'max_items');
      end if;
    end if;
  end loop;
  return warns;
end; $$;

create or replace function enforce_submission_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare spec jsonb; errs text[]; warns text[];
begin
  select fields into spec from requests where id = new.request_id;

  if new.status = 'submitted' then
    errs := submission_errors(spec, new.payload);
    if array_length(errs, 1) > 0 then
      raise exception 'This submission is not complete: %', array_to_string(errs, ' ');
    end if;
    warns := submission_warnings(spec, new.payload);
    new.exceptions := to_jsonb(warns);
    if new.submitted_at is null then new.submitted_at := now(); end if;
    new.submitted_by := coalesce(new.submitted_by, auth.uid());
  else
    new.submitted_at := null;
    new.exceptions := '[]'::jsonb;
  end if;

  -- A church editing its answer invalidates any approval already given:
  -- Abouna approved the old numbers, not the new ones.
  if tg_op = 'UPDATE' and new.payload is distinct from old.payload then
    new.approved_at := null;
    new.approved_by := null;
  end if;

  new.updated_at := now();
  return new;
end; $$;

revoke all on function enforce_submission_rules() from public, anon, authenticated;
revoke all on function submission_errors(jsonb, jsonb)   from public, anon;
revoke all on function submission_warnings(jsonb, jsonb) from public, anon;

create or replace function approve_submission(p_submission_id uuid, p_approve boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not auth_is_committee() then
    raise exception 'Only the committee can approve an exception.';
  end if;
  update submissions
     set approved_at = case when p_approve then now() else null end,
         approved_by = case when p_approve then auth.uid() else null end
   where id = p_submission_id;
end; $$;

revoke all on function approve_submission(uuid, boolean) from public, anon;
grant execute on function approve_submission(uuid, boolean) to authenticated;

drop view if exists request_status_grid;

create view request_status_grid
with (security_invoker = on) as
select
  r.id as request_id, r.slug as request_slug, r.title as request_title,
  r.due_date, r.sort_order,
  c.id as church_id, c.name as church_name, c.sort_order as church_sort_order,
  coalesce(s.status, 'missing') as status,
  s.submitted_at, s.updated_at, s.id as submission_id,
  coalesce(jsonb_array_length(s.exceptions), 0) as exception_count,
  s.exceptions, s.note, s.approved_at,
  (s.status = 'submitted'
     and coalesce(jsonb_array_length(s.exceptions), 0) > 0
     and s.approved_at is null) as needs_review
from requests r
cross join churches c
left join submissions s on s.request_id = r.id and s.church_id = c.id
where r.is_open;
