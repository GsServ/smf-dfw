# SMF DFW — St. Mark Festival, Dallas–Fort Worth

Public site for the St. Mark Festival (Mahragan al-Keraza), DFW region. Season
calendar, rules, and a live countdown for nine Coptic Orthodox churches.

**Phase 1: static, no login, no database.**

## Updating the site

**If you only want to change a date or a rule, you do not need this file.**
Read [`src/content/README.md`](src/content/README.md) instead — it explains the
four content files in plain language and assumes no programming knowledge.

## Running it locally

```bash
npm install
npm run dev
```

Then open the address it prints. `npm run build` produces `dist/`.

## How it is put together

React 18 + Vite + TypeScript + Tailwind. No images.

**Phase 1 — the public calendar.** No login, no database.

- `src/content/` — all site content as JSON, plus the maintainer guide
- `src/content/index.ts` — the only place content is loaded
- `src/lib/dates.ts` — past/upcoming is computed from the reader's own date at
  render time and never stored, so nothing goes stale
- `src/lib/coptic.ts` — generates the Coptic numerals on the calendar markers
- `tailwind.config.js` — the palette and typography

The rules accordion uses native `<details>`/`<summary>` for keyboard and screen
reader support. Please don't rebuild it with React state.

**Phase 2 — the church portal.** Per-church logins, submission forms, the
committee dashboard, and deadline reminders. See
[`supabase/README.md`](supabase/README.md).

- `/` — public calendar. Reads JSON, never touches the database.
- `/portal` — a church representative's submissions
- `/committee` — the nine-church status grid

The portal is loaded as a separate chunk, so the public calendar never
downloads the auth client. **The calendar keeps working even if the database is
down**, which is the point: most visitors only ever check a date.

The public calendar was deliberately **not** migrated into the database. Editing
one text file and pushing is the whole maintenance story, and moving the
calendar behind a login would undo it.

## Deployment

Cloudflare Pages, building from the `main` branch.

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

`.node-version` pins Node 20 so the Cloudflare build matches local.

Pushing to `main` redeploys automatically, about a minute per change.

## Not connected to anything else

This project has no connection to the St. George Sunday School app or its
database, and must not gain one. Eight other churches will eventually have
logins here. Separate project, separate database, no shared credentials.
