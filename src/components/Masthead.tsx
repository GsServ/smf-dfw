import { churches, site } from '../content'
import { emphasis } from '../lib/inlineFormat'

export default function Masthead() {
  return (
    <header className="relative pb-[clamp(28px,4vw,44px)] pt-[clamp(44px,7vw,84px)] text-center">
      <div className="wrap">
        <p className="mb-[clamp(18px,3vw,26px)] font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          {site.eyebrow}
        </p>

        <h1 className="m-0 font-display text-[clamp(38px,8.5vw,76px)] font-normal leading-[1.02] tracking-[-0.015em] text-linen-2">
          {site.themeLines.map((line, i) => (
            <span key={i} className="block">
              {emphasis(line, 'italic text-gold')}
              {/* The lines are separate blocks, so without this the accessible
                  name runs together as "We Are MoreThan Conquerors". */}
              {i < site.themeLines.length - 1 && ' '}
            </span>
          ))}
        </h1>

        <p className="mt-[clamp(16px,3vw,22px)] font-mono text-xs uppercase tracking-[0.2em] text-slate">
          {site.verse}
        </p>

        <ul className="mx-auto mt-[clamp(30px,5vw,46px)] flex max-w-[800px] list-none flex-wrap justify-center gap-y-1.5 border-y border-rule p-0 py-3.5">
          {churches.map((church, i) => (
            <li
              key={church}
              className={`whitespace-nowrap px-3.5 text-[12.5px] text-slate ${
                i < churches.length - 1 ? 'border-r border-rule' : ''
              }`}
            >
              {church}
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
