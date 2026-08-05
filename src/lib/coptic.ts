/**
 * Coptic numerals for the calendar markers.
 *
 * Coptic letters are the numbering system, in the same way Roman letters are:
 * ⲁ is 1, ⲓ is 10, ⲕ is 20, so 11 is ⲓⲁ and 21 is ⲕⲁ. The children on this
 * calendar are studying these letters for the festival's Coptic exam.
 *
 * The reference design hard-coded twelve numerals. This generates them instead,
 * so adding a thirteenth event to events.json does not leave a blank disc.
 */
const UNITS = ['', 'ⲁ', 'ⲃ', 'ⲅ', 'ⲇ', 'ⲉ', 'ⲋ', 'ⲍ', 'ⲏ', 'ⲑ']
const TENS = ['', 'ⲓ', 'ⲕ', 'ⲗ', 'ⲙ', 'ⲛ', 'ⲝ', 'ⲟ', 'ⲡ', 'ⳁ']

/** `n` is 1-based. Falls back to the Arabic numeral above 99. */
export function copticNumeral(n: number): string {
  if (n < 1 || n > 99) return String(n)
  return TENS[Math.floor(n / 10)] + UNITS[n % 10]
}
