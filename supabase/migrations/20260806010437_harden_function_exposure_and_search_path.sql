-- Raised by Supabase's own security advisor after the initial schema.

-- Pin search_path so these cannot be redirected to a malicious schema.
alter function validate_submission(jsonb, jsonb) set search_path = public;
alter function set_updated_at() set search_path = public;

-- Trigger functions have no business being reachable over the REST API.
revoke all on function handle_new_user()          from public, anon, authenticated;
revoke all on function enforce_submission_rules() from public, anon, authenticated;

-- These two are used inside RLS policies, so `authenticated` must keep EXECUTE.
-- They only ever return the caller's own church and role. Signed-out callers
-- have no business calling them at all.
revoke all on function auth_church_id()   from public, anon;
revoke all on function auth_is_committee() from public, anon;
grant execute on function auth_church_id()   to authenticated;
grant execute on function auth_is_committee() to authenticated;
