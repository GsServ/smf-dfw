import { Fragment, type ReactNode } from 'react'

/**
 * Renders **bold** inside a plain string. Deliberately not a markdown library:
 * this is the only formatting the content files support, and keeping it to a
 * regex means nothing in the JSON can inject markup into the page.
 */
export function bold(text: string, boldClass = 'font-semibold text-linen-2'): ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    // Odd indices are the captured groups, i.e. the bold runs.
    i % 2 === 1 ? (
      <b key={i} className={boldClass}>
        {part}
      </b>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

/**
 * Renders *emphasis* inside a plain string, used for the theme headline where
 * the emphasised words are set in gold italic.
 */
export function emphasis(text: string, emClass: string): ReactNode {
  return text.split(/\*(.+?)\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className={emClass}>
        {part}
      </em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}
