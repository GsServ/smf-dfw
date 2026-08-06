-- Until now the invite list was read exactly once, when a person first signed
-- in. After that it was decoration: changing someone's role or church in
-- `invites` had no effect, deleting an invite did not revoke access, and
-- re-inviting somebody who had already signed in did nothing at all. None of
-- those failures announced themselves.
--
-- `invites` is now the single source of truth, in both directions.

create or replace function sync_profile_from_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if tg_op = 'DELETE' then
    -- Removing an invite revokes access. The auth user and any submissions
    -- survive; only the profile — which is what grants access — is dropped.
    select id into uid from auth.users where lower(email) = old.email;
    if uid is not null then
      delete from profiles where user_id = uid;
    end if;
    return old;
  end if;

  select id into uid from auth.users where lower(email) = new.email;

  -- No auth user yet simply means they have not signed in. handle_new_user()
  -- will pick the invite up when they do.
  if uid is not null then
    insert into profiles (user_id, church_id, role, full_name)
    values (uid, new.church_id, new.role, new.full_name)
    on conflict (user_id) do update
      set church_id = excluded.church_id,
          role      = excluded.role,
          full_name = coalesce(excluded.full_name, profiles.full_name);
  end if;

  return new;
end;
$$;

revoke all on function sync_profile_from_invite() from public, anon, authenticated;

create trigger invites_sync_profile
  after insert or update or delete on invites
  for each row execute function sync_profile_from_invite();
