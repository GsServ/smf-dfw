import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Nudges churches 3 days and 1 day before a deadline they have not met.
 *
 * Runs on a schedule (see the pg_cron job in the migrations). It asks the
 * database who is outstanding — that query reckons dates in America/Chicago,
 * not UTC, so an evening run does not count a day early — then emails them and
 * records what it sent so nobody is nudged twice for the same deadline.
 *
 * If RESEND_API_KEY is not set the function still runs and reports exactly what
 * it would have sent, but delivers nothing and logs nothing as sent. That makes
 * it safe to schedule before the email provider is signed up for.
 */

interface Reminder {
  request_id: string
  request_title: string
  due_date: string
  offset_days: number
  church_id: string
  church_name: string
  status: string
  recipients: string[]
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://smf-dfw.pages.dev'
const FROM = Deno.env.get('REMINDER_FROM') ?? 'St. Mark Festival <onboarding@resend.dev>'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase.rpc('pending_reminders')
  if (error) {
    return json({ ok: false, error: error.message }, 500)
  }

  const reminders = (data ?? []) as Reminder[]
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const dryRun = !apiKey

  const sent: string[] = []
  const skipped: string[] = []
  const failed: string[] = []

  for (const r of reminders) {
    const label = `${r.church_name} / ${r.request_title} (${r.offset_days}d)`

    if (!r.recipients?.length) {
      // No representative invited for this church yet — nothing to send to.
      skipped.push(`${label}: no recipients`)
      continue
    }

    if (dryRun) {
      skipped.push(`${label}: dry run, would email ${r.recipients.join(', ')}`)
      continue
    }

    const when = r.offset_days === 1 ? 'tomorrow' : `in ${r.offset_days} days`
    const started = r.status === 'partial'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: r.recipients,
        subject: `${r.request_title} — due ${when}`,
        text: [
          `${r.church_name},`,
          '',
          `${r.request_title} is due ${when}, on ${r.due_date}.`,
          started
            ? 'You have started this but not sent it yet.'
            : 'Nothing has been sent for this yet.',
          '',
          `You can send it here: ${SITE_URL}/portal`,
          '',
          'St. Mark Festival, DFW',
        ].join('\n'),
      }),
    })

    if (!res.ok) {
      failed.push(`${label}: ${res.status} ${await res.text()}`)
      continue
    }

    // Only log it once delivery actually succeeded, so a failure is retried on
    // the next run rather than silently swallowed.
    const { error: logError } = await supabase.from('reminder_log').insert({
      request_id: r.request_id,
      church_id: r.church_id,
      offset_days: r.offset_days,
    })

    if (logError) failed.push(`${label}: sent but not logged — ${logError.message}`)
    else sent.push(label)
  }

  return json({
    ok: true,
    dryRun,
    considered: reminders.length,
    sent: sent.length,
    details: { sent, skipped, failed },
  })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
