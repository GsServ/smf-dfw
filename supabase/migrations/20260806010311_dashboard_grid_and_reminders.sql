-- The 9-church x open-requests grid, and the 3-day / 1-day reminder machinery.
--
-- NOTE: pending_reminders() below is superseded by the Central Time version in
-- 20260806010656_reckon_dates_in_central_time.sql. Kept here as applied.

-- security_invoker so the caller's RLS still applies: a rep querying this sees
-- only their own church's real status, never another church's data.
create view request_status_grid
with (security_invoker = on) as
select
  r.id            as request_id,
  r.slug          as request_slug,
  r.title         as request_title,
  r.due_date,
  r.sort_order,
  c.id            as church_id,
  c.name          as church_name,
  c.sort_order    as church_sort_order,
  coalesce(s.status, 'missing') as status,   -- submitted | partial | missing
  s.submitted_at,
  s.updated_at
from requests r
cross join churches c
left join submissions s
  on s.request_id = r.id and s.church_id = c.id
where r.is_open;

-- One row per reminder actually sent, so a church is never emailed twice for
-- the same deadline at the same offset.
create table reminder_log (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references requests(id) on delete cascade,
  church_id   uuid not null references churches(id) on delete cascade,
  offset_days integer not null,
  channel     text not null default 'email',
  sent_at     timestamptz not null default now(),
  unique (request_id, church_id, offset_days)
);

alter table reminder_log enable row level security;

create policy reminder_log_committee_read on reminder_log
  for select to authenticated using (auth_is_committee());

create or replace function pending_reminders()
returns table (
  request_id    uuid, request_title text, due_date date, offset_days integer,
  church_id     uuid, church_name   text, status   text, recipients  text[]
)
language sql stable security definer set search_path = public
as $$
  select
    g.request_id, g.request_title, g.due_date,
    (g.due_date - current_date)::integer as offset_days,
    g.church_id, g.church_name, g.status,
    coalesce(array_agg(i.email order by i.email) filter (where i.email is not null), '{}')
  from request_status_grid g
  left join invites i on i.church_id = g.church_id
  left join reminder_log l
    on l.request_id = g.request_id and l.church_id = g.church_id
   and l.offset_days = (g.due_date - current_date)::integer
  where g.due_date is not null
    and (g.due_date - current_date) in (3, 1)
    and g.status <> 'submitted'
    and l.id is null
  group by g.request_id, g.request_title, g.due_date, g.church_id, g.church_name, g.status;
$$;

revoke all on function pending_reminders() from public, anon, authenticated;
grant execute on function pending_reminders() to service_role;
