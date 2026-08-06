import { daysUntil, startOfToday } from '../../lib/dates'

export type SubmissionStatus = 'submitted' | 'partial' | 'missing'

interface Props {
  status: SubmissionStatus
  dueDate?: string | null
  exceptionCount?: number
  approvedAt?: string | null
}

/**
 * Four states, not three. A submission that breaks a posted rule is *received* —
 * the church has done its part — but still needs Abouna's decision, which is a
 * different thing from being late.
 *
 * Never colour alone: each state carries a word, so it survives colour blindness
 * and a printout.
 */
export default function StatusPill({
  status,
  dueDate,
  exceptionCount = 0,
  approvedAt = null,
}: Props) {
  const flagged = status === 'submitted' && exceptionCount > 0
  const awaiting = flagged && !approvedAt

  const style = awaiting
    ? 'border-gold/50 bg-gold/15 text-gold'
    : status === 'submitted'
      ? 'border-verd/45 bg-verd/20 text-[#6FBFAA]'
      : status === 'partial'
        ? 'border-gold/45 bg-gold/15 text-gold'
        : 'border-transparent bg-madder text-white'

  const label = awaiting
    ? 'Needs Abouna'
    : flagged
      ? 'Approved'
      : status === 'submitted'
        ? 'Received'
        : status === 'partial'
          ? 'Draft'
          : 'Not sent'

  return (
    <span className="flex shrink-0 flex-wrap items-center gap-2">
      <span
        className={`whitespace-nowrap rounded-[2px] border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${style}`}
      >
        {label}
      </span>
      {dueDate && status !== 'submitted' && <DueLabel dueDate={dueDate} />}
    </span>
  )
}

function DueLabel({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate, startOfToday())
  const text =
    days < 0
      ? `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`
      : days === 0
        ? 'Due today'
        : days === 1
          ? 'Due tomorrow'
          : `Due in ${days} days`

  return (
    <span
      className={`whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.14em] ${
        days <= 1 ? 'text-madder' : 'text-slate'
      }`}
    >
      {text}
    </span>
  )
}
