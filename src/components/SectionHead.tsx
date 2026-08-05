interface Props {
  id: string
  title: string
  note: string
}

/** Heading, hairline rule, and a small note set to the right. */
export default function SectionHead({ id, title, note }: Props) {
  return (
    <div className="mb-[clamp(22px,3vw,32px)] flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2
        id={id}
        className="m-0 whitespace-nowrap font-display text-[clamp(24px,4vw,34px)] font-normal tracking-[-0.01em] text-linen-2"
      >
        {title}
      </h2>
      <span className="h-px flex-1 bg-rule" aria-hidden="true" />
      <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-gold-label">
        {note}
      </span>
    </div>
  )
}
