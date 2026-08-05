/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0C1733', // page ground (deep lapis, from icon painting)
        'ink-2': '#132147', // raised panels
        'ink-3': '#1B2C5C', // hover states
        gold: '#D9A441', // primary accent, rules, markers
        'gold-dim': '#8A6A2C', // secondary accent — decoration and separators only
        // Lightened gold-dim, used wherever it carries actual text ("posted"
        // dates, section notes). #8A6A2C is 3.58:1 on ink and fails WCAG AA;
        // this is 4.99:1. See src/content/README.md.
        'gold-label': '#A8823A',
        madder: '#C0432F', // deadlines and urgency only
        verd: '#3E8574', // completed / received states only
        linen: '#EDE4D2', // body text
        'linen-2': '#F7F1E4', // headings
        'linen-3': '#DCD3C1', // rule list items
        slate: '#8E9AC0', // secondary text
        // Past-event text. The reference used #7A85A8 / #5D6788; the latter is
        // 3.24:1 and fails AA, so both dim tones collapse to this single 4.89:1 value.
        'slate-dim': '#7A85A8',

        // Gold hairlines. Defined here rather than under borderColor so the
        // same tokens work as `border-rule` and as `bg-rule` for divider lines.
        rule: 'rgba(217,164,65,.26)',
        'rule-soft': 'rgba(217,164,65,.14)',
        'rule-faint': 'rgba(217,164,65,.10)',
      },
      fontFamily: {
        display: ['Cardo', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        coptic: ['"Noto Sans Coptic"', 'Cardo', 'serif'],
      },
      screens: {
        // The reference's mobile breakpoint, inverted to mobile-first.
        cal: '720px',
      },
      maxWidth: {
        wrap: '1060px',
        prose: '74ch',
        note: '66ch',
      },
    },
  },
  plugins: [],
}
