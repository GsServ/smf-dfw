import type { RuleGroup as RuleGroupData } from '../content'
import { bold } from '../lib/inlineFormat'

/**
 * Native <details>/<summary>. Keyboard access and screen-reader semantics come
 * for free, and the group stays open if the browser restores scroll position.
 * Do not rebuild this with React state.
 */
export default function RuleGroup({ group }: { group: RuleGroupData }) {
  return (
    <details className="group border-b border-rule-soft" open={group.defaultOpen}>
      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-1 py-[19px] cal:grid-cols-[1fr_auto_auto]">
        <h3 className="m-0 font-display text-xl font-normal text-linen-2">
          {group.heading}
        </h3>
        <span className="col-start-1 row-start-2 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold-label cal:col-start-2 cal:row-start-1">
          {group.posted}
        </span>
        <span
          aria-hidden="true"
          className="col-start-2 row-start-1 text-[15px] leading-none text-gold transition-transform duration-200 group-open:rotate-45 cal:col-start-3"
        >
          ✕
        </span>
      </summary>

      <ul className="m-0 list-none py-0 pb-[22px] pl-[22px] pr-1">
        {group.items.map((item, i) => (
          <li
            key={i}
            className="rule-bullet relative max-w-prose pb-[11px] pl-[18px] text-[14.5px] text-linen-3"
          >
            {bold(item)}
          </li>
        ))}
      </ul>
    </details>
  )
}
