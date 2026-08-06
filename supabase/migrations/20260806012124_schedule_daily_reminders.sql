create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The scheduled job needs the service role key to call the edge function.
-- It reads it from Supabase Vault rather than having it written into the job
-- definition in plain text, where anyone with database access could read it.
--
-- ONE-TIME SETUP, run once by a person (see supabase/README.md):
--   select vault.create_secret('<service role key>', 'service_role_key');
--
-- Until that secret exists the job runs and does nothing, which is the correct
-- failure mode: no silent half-sent reminders.
--
-- 14:00 UTC is 9am Central in summer, 8am in winter. A morning nudge, not a
-- late-night one. The function re-checks the offset in Central Time, so the
-- daylight-saving drift in this schedule cannot cause a wrong-day reminder.
select cron.schedule(
  'smf-daily-reminders',
  '0 14 * * *',
  $$
  select net.http_post(
    url     := 'https://nhvvevmsibgxnzsbtumy.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'service_role_key' limit 1
      )
    ),
    body    := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'service_role_key');
  $$
);
