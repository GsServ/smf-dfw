-- The database runs in UTC, but the festival happens in Dallas-Fort Worth.
-- Between roughly 7pm and midnight Central, UTC is already tomorrow, so any
-- date arithmetic against current_date fires reminders a day early and can skip
-- a deadline entirely on the day it falls. Everything date-shaped reckons in
-- America/Chicago, which also handles daylight saving on its own.
create or replace function festival_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'America/Chicago')::date;
$$;

create or replace function pending_reminders()
returns table (
  request_id    uuid, request_title text, due_date date, offset_days integer,
  church_id     uuid, church_name   text, status   text, recipients  text[]
)
language sql stable security definer set search_path = public
as $$
  select
    g.request_id, g.request_title, g.due_date,
    (g.due_date - festival_today())::integer as offset_days,
    g.church_id, g.church_name, g.status,
    coalesce(array_agg(i.email order by i.email) filter (where i.email is not null), '{}')
  from request_status_grid g
  left join invites i on i.church_id = g.church_id
  left join reminder_log l
    on l.request_id = g.request_id and l.church_id = g.church_id
   and l.offset_days = (g.due_date - festival_today())::integer
  where g.due_date is not null
    and (g.due_date - festival_today()) in (3, 1)
    and g.status <> 'submitted'
    and l.id is null
  group by g.request_id, g.request_title, g.due_date, g.church_id, g.church_name, g.status;
$$;

revoke all on function pending_reminders() from public, anon, authenticated;
grant execute on function pending_reminders() to service_role;
