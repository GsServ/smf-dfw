# The church portal (Phase 2)

Everything behind sign-in: per-church logins, submission forms, the committee
dashboard, and the deadline reminders.

**The public calendar does not use any of this.** It reads flat JSON files and
works whether or not the database is up. Updating a date is still a one-file
edit — see [`src/content/README.md`](../src/content/README.md).

- **Project:** `nhvvevmsibgxnzsbtumy` — <https://nhvvevmsibgxnzsbtumy.supabase.co>
- **Separate from the St. George Sunday School database (`zpxuaizxrcnztlhvyajf`)**,
  and it must stay that way. Different project, different credentials, no link
  between them.

---

## How access works

There is no public registration. A person can only get in if the committee has
already added their email address.

1. The committee inserts a row into `invites` (email, church, role).
2. That person enters their address on `/portal` and gets a sign-in link.
3. On first sign-in, a trigger reads the invite and creates their `profile`.
4. Signing in with an address that was never invited creates an auth user with
   **no profile** — and every security policy then denies them everything.

Two roles:

- **`rep`** — belongs to one church. Sees and edits only that church's
  submissions.
- **`committee`** — belongs to no church. Reads everything, writes nobody's
  submissions.

### Adding a church representative

```sql
insert into invites (email, church_id, role, full_name)
values (
  'servant@example.com',
  (select id from churches where slug = 'st-george'),
  'rep',
  'Their Name'
);
```

Church slugs: `st-george`, `st-mary`, `st-mark`, `st-meena`, `st-abanoub`,
`st-philopateer`, `archangel-michael`, `pope-kyrillos`, `st-marina`.

### Changing someone's role or church

Edit the invite. The change reaches them immediately, whether or not they have
already signed in:

```sql
update invites
   set church_id = (select id from churches where slug = 'st-mary')
 where email = 'servant@example.com';
```

### Removing someone's access

```sql
delete from invites where email = 'servant@example.com';
```

That is the whole thing. Their profile — which is what actually grants access —
is removed with it. Their submissions stay; the church's work is not lost
because a representative left.

Re-adding the invite restores access, even for somebody who signed in long ago.

**`invites` is the single source of truth.** Do not edit `profiles` by hand; it
is kept in step by a trigger, and a manual edit will be overwritten the next
time the invite is touched.

---

## Why the security is where it is

Every rule is enforced **in the database**, not in the browser. The key that
ships in the website grants nothing on its own; anyone can read it from the page
source, and it was checked to confirm an anonymous caller gets an empty result
from every table except `event_documents`.

`event_documents` is readable by anyone on purpose — the public calendar fetches
it so a servant can open the rules for a game without an account, and the
`event-documents` storage bucket is public for the same reason. Only committee
accounts can write to either. **Nothing with a child's name in it belongs in
that bucket**; the upload screen says so, and that warning is the only thing
standing between a roster and the open web.

That means a church cannot see another church's roster even by crafting their
own API request. This was tested directly, not assumed:

- a rep querying all submissions sees only their own church's
- a rep inserting a row for another church is rejected
- a rep running `update profiles set role = 'committee'` changes nothing

If you change a policy, re-run those checks.

---

## Validation lives in two places, on purpose

A rule like "a team is 7 youth minimum" is written twice:

- [`src/lib/validateSubmission.ts`](../src/lib/validateSubmission.ts) — runs as
  the servant types, so a short roster is flagged in the moment
- `validate_submission()` in the migrations — runs on every write, so the rule
  holds even against a direct API call

**Change a rule in both places.** The database is the one that actually enforces
it; the client one is there so the servant finds out immediately rather than the
week of the event.

Bounds are not hard-coded — they come from each request's `fields` JSON, so
adding a new form is a data change, not a code change:

```sql
insert into requests (slug, title, description, due_date, sort_order, fields)
values (
  'ping-pong-roster',
  'Ping pong roster',
  'Three players per tournament.',
  '2026-09-01',
  5,
  '[{"key":"players","label":"Players","type":"name_list",
     "min_items":3,"max_items":3,"required":true,
     "help":"Send 3 per tournament."}]'::jsonb
);
```

Field types: `text`, `textarea`, `number` (`min`/`max`), `name_list`
(`min_items`/`max_items`). Any field may set `required` and `help`.

---

## Dates are reckoned in Central Time, not UTC

The database runs in UTC. Dallas–Fort Worth does not. Between about 7pm and
midnight Central, UTC has already rolled over to tomorrow — so anything
comparing against `current_date` would count a day early every evening, and
could skip a deadline entirely on the day it falls.

Everything date-shaped goes through `festival_today()`, which returns the date
in `America/Chicago` and handles daylight saving itself. **Use it instead of
`current_date` in anything you add.**

---

## Reminders

A scheduled job runs daily at 14:00 UTC (9am Central in summer) and calls the
`send-reminders` edge function. That function asks the database who is
outstanding at 3 days and 1 day before each deadline, emails them, and records
what it sent in `reminder_log` so nobody is nudged twice for the same deadline.

Only the scheduled job can run it. The function checks that the caller's token
carries the `service_role` claim and refuses everything else with a 403. This
matters because the publishable key is a valid signed token *and* ships inside
the website — without the check, a stranger could trigger the send and burn the
email quota.

### Status: working, but deliberately dormant

**Decided Aug 2026: reminders are sent by hand in the WhatsApp group instead.**

Not because the automation failed — it was built, tested, and confirmed
delivering. The dashboard turned out to cover the actual need better. Fr
Akhnoukh opens the grid, sees which churches are still red, and messages those
by name in the group the servants already read. Targeted chasing beats another
channel to check.

The scheduled job stays in place but **does nothing**, because the Vault secret
below was never added. It is inert, not broken. Adding that secret is what
switches automated reminders on — so add it only if you actually want them.

To remove the job entirely: `select cron.unschedule('smf-daily-reminders');`

### If you turn it back on: test-only until a domain exists

`RESEND_API_KEY` is configured and delivery is confirmed working end to end.

**Resend has not been given a verified domain, so it delivers only to the
address the Resend account was registered with.** Any other recipient comes back
as a 403 `validation_error`. Nine churches cannot receive anything yet.

To lift that: buy a domain, verify it at
[resend.com/domains](https://resend.com/domains), and set `REMINDER_FROM` to an
address on it. Nothing in the code changes.

**Note:** Resend matches the registered address exactly. Gmail plus-addressing
(`you+church@gmail.com`) is *rejected* in test mode — tried, does not work.

### To switch automated reminders on later

Paste your project's service role key (Project Settings → API) in the SQL
editor. Nothing else is needed — the job is already scheduled and waiting:

```sql
select vault.create_secret('<service role key>', 'service_role_key');
```

Stored encrypted, not written into the job definition in plain text.

Do this only once a domain is verified, or the churches still receive nothing
and only Pete's inbox gets the reminders.

---

## Reading names off a screenshot

Servants send lists of children in the WhatsApp group as pictures. The
`read-roster` edge function takes one of those pictures and returns the names,
so a roster form can be filled by checking a list instead of typing twenty
names on a phone.

### Status: built, deployed nowhere, switched off

**This is not running.** The function is in the repository and nothing has been
deployed, because turning it on is a decision about children's names and not a
technical step.

### What it does with the picture

- The picture goes to the Anthropic API and nowhere else. It is **not** written
  to the database, **not** put in storage, and **not** logged. It exists for the
  length of one request.
- Only somebody with a profile can call it — signed in *and* invited. Without
  that check, any signed-in address could spend the API budget.
- **Nothing reaches the form on its own.** The names come back as tick boxes the
  servant reviews, corrects and confirms. That is deliberate: the reader is good
  but not perfect, and a misspelt child's name that nobody looked at is worse
  than one typed by hand.

### The decision to make first

Switching this on means **children's names, in a photograph, leave this project
and go to Anthropic** to be read. That is a real change in where the churches'
data goes, and it is Fr Akhnoukh's call rather than a maintainer's. Anthropic's
API does not train on API traffic, but the names still travel, and the parents
of those children have not been asked.

Two lighter alternatives, if the answer is no:

- Leave it off. Servants type the names, as now.
- On-device OCR (something like Tesseract in the browser) never sends anything
  anywhere, but reads transliterated Coptic and Arabic names poorly, which for
  this particular list is most of the value gone.

### To switch it on

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy read-roster
```

Then open a roster form, press **Read names from a picture**, and try a real
screenshot from the group before telling anybody it works. It uses
`claude-opus-5` with vision; one screenshot is a fraction of a cent.

Without the key the function still deploys and answers every request with a
plain "not switched on for this site yet" — the same arrangement the reminders
had before Resend existed. The button in the form surfaces that message and the
servant types the names instead, so a half-configured deployment degrades to
exactly what exists today.

---

### The invite list

The two seats currently mirror the real roles: Pete is St. George's MS/HS
coordinator, so he holds the **rep** seat; the **committee** seat is Fr
Akhnoukh's, currently pointed at a second mailbox of Pete's while the site is
still being shown to him.

Point the committee seat at Fr Akhnoukh's real address when he is ready, and add
the other eight churches' reps. Roles and permissions do not change — only the
addresses.

To see what it would send right now:

```sql
select * from pending_reminders();
```

---

## Checking the work

```sql
-- Who has sent what
select * from request_status_grid order by church_sort_order, sort_order;

-- Reminders already sent
select * from reminder_log order by sent_at desc;

-- Who can sign in
select i.email, i.role, c.name, i.claimed_at
from invites i left join churches c on c.id = i.church_id;
```

Run Supabase's security advisor after any schema change. Five warnings are
expected and intentional — anything beyond these is worth reading properly:

- `auth_church_id()` and `auth_is_committee()` are executable by signed-in
  users because the security policies themselves call them. They only ever
  return the caller's own church and role.
- `approve_submission()` is executable by signed-in users because the committee
  calls it from the dashboard. Its first statement is `if not
  auth_is_committee() then raise`, so a rep calling it directly gets an error
  and changes nothing.
- `pg_net` sits in the `public` schema. Supabase installs it there itself when
  `pg_cron` needs to call an edge function; it is not ours to move.
- Leaked-password protection is off because there are no passwords. Sign-in is
  a magic link and nothing else.
