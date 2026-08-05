# How to update the website

Everything on the site — every date, every rule, the theme at the top — lives in
the four files in this folder. You do not need to know how to write code to
change them. You need to be careful about commas and quote marks, and that's it.

If something goes wrong, nothing is lost. The site keeps showing the last good
version until the mistake is fixed.

---

## The four files

| File | What it controls |
|---|---|
| `events.json` | The season calendar and the countdown at the top |
| `rules.json` | The rules section |
| `churches.json` | The list of nine churches under the title |
| `site.json` | The theme line, the verse, the footer, the draft banner |

---

## Rules that apply to all four files

These are the only ways to break the file, so they are worth reading once.

1. **Every piece of text sits inside double quotes.** `"MS Girls Jeopardy"` — yes.
   `MS Girls Jeopardy` — no.
2. **Items are separated by commas, but the last one never has a comma after it.**
   This is the mistake everyone makes.
3. **Curly quotes break the file.** If you write the text in Word or Pages, it may
   turn `"` into `"` and `"`. Type directly into the file, or use TextEdit in
   plain-text mode.
4. **`true` and `false` are never in quotes.** `"milestone": false` — yes.
   `"milestone": "false"` — no.
5. **`null` means "nothing here"** and is never in quotes.

If you want an apostrophe inside text, that's fine: `"Bring last year's trophy back."`

---

## `events.json` — the calendar

One block per event, inside `{ }`, separated by commas:

```json
{
  "id": "ms-girls-jeopardy",
  "date": "2026-08-08",
  "endDate": null,
  "title": "MS Girls Jeopardy",
  "time": "12:00–5:00 PM",
  "venue": "Pope Kyrillos",
  "milestone": false,
  "notes": null
}
```

- **`id`** — a short name with dashes instead of spaces. It never appears on the
  site. It just has to be different from every other event's id.
- **`date`** — always `YEAR-MONTH-DAY` with four digits, then two, then two.
  August 8th 2026 is `"2026-08-08"`, not `"8/8/26"`.
- **`endDate`** — leave it as `null` for a normal one-day event. For something
  that runs across several days, like the exam window, put the last day here and
  the calendar shows a range: `"2026-07-18"` with `"endDate": "2026-07-26"`
  displays as **Jul 18–26**.
- **`time`** — free text, shown exactly as you type it.
- **`venue`** — free text. The hosting church, or `"Online"`.
- **`milestone`** — `true` for a deadline (submissions closing, an exam window),
  `false` for a gathering people attend. Deadlines are shown in italics.
- **`notes`** — usually `null`. Any text you put here is shown after the venue.

**You do not have to keep events in date order.** The site sorts them itself.

**You never mark an event as finished.** The site compares each event to today's
date every time someone opens the page. Past events dim automatically and the
next one is marked. That is the whole reason nothing on this site goes stale.

### Adding a date

Copy an existing block, paste it below, change the values, and make sure there is
a comma between the two blocks. Save, then commit and push.

---

## `rules.json` — the rules section

One block per topic:

```json
{
  "id": "jeopardy-teams",
  "heading": "Jeopardy teams",
  "posted": "Posted Jul 22",
  "defaultOpen": true,
  "items": [
    "Teams are mixed. Boys and girls compete together.",
    "A team is **7 youth minimum, 10 maximum**."
  ]
}
```

- **`heading`** — the title people click on.
- **`posted`** — free text, so it can say `"Posted Jul 1 · updated Jul 8"` when a
  rule changes. Keeping this honest is what makes the site trustworthy: a servant
  can see at a glance whether they are reading the current version.
- **`defaultOpen`** — `true` means the section is already open when the page
  loads. Only the first one is set to `true`. If everything is open, nothing
  stands out.
- **`items`** — the individual rules, each in quotes, separated by commas.

### Making words bold

Put two asterisks on each side: `A team is **7 youth minimum, 10 maximum**.`

That is the only formatting available, on purpose. It keeps the rules readable
and stops the page from being broken by a stray character.

### When a rule changes mid-season

Edit the text, then update `posted` to say it was updated. For example, change
`"Posted Jul 1"` to `"Posted Jul 1 · updated Aug 12"`. People need to know the
rule moved.

---

## `churches.json`

Just the nine names, each in quotes, separated by commas. They appear under the
title in the order you list them.

---

## `site.json`

```json
{
  "seasonYear": 2026,
  "draftBanner": { "show": true, "text": "Draft preview — not published" },
  "eyebrow": "St. Mark Festival · Mahragan al-Keraza · DFW 2026",
  "themeLines": ["We Are More", "Than *Conquerors*"],
  "verse": "Romans 8:37",
  "calendarHeading": "Season calendar",
  "rulesHeading": "Rules",
  "rulesNote": "Every rule Abouna has posted",
  "footerLines": ["...", "..."]
}
```

- **`draftBanner`** — the red strip across the top. **Set `"show"` to `false`
  when the site is ready to share with the churches.** That is the one change to
  make before announcing it.
- **`themeLines`** — each item is one line of the big title. Words wrapped in
  single asterisks, like `*Conquerors*`, are shown in gold italic.
- **`footerLines`** — each item is one paragraph at the bottom.

---

## What is **not** in these files

The text that appears when someone pastes the link into WhatsApp — the preview
title and description — is not here. It lives in `index.html` in the main project
folder, near the top, in the lines marked `og:title` and `og:description`. It has
to be there because WhatsApp reads the page without opening it properly.

If the theme changes for a new season, change it in **both** places.

---

## Publishing a change

After saving the file, in the project folder:

```bash
git add . && git commit -m "Added September dates" && git push
```

The live site updates about a minute later, by itself. There is no other step.

---

## If the site breaks after an edit

It is almost always a comma or a quote mark.

- A comma after the **last** item in a list — remove it.
- A **missing** comma between two items — add it.
- A curly quote `"` instead of a straight `"` — retype it.

To check before publishing, run `npm run dev` in the project folder and open the
address it prints. If the page loads, the file is valid.
