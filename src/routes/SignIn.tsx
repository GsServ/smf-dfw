import { useState, type FormEvent } from 'react'
import { supabase, isPortalConfigured } from '../lib/supabase'
import Shell from '../components/portal/Shell'

/**
 * Magic link only. No passwords to choose, forget, reset, or write on a sticky
 * note — the servant types the address the committee already invited and clicks
 * a link in their inbox.
 */
export default function SignIn({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !email.trim()) return

    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/portal` },
    })

    if (error) {
      setState('error')
      setMessage(error.message)
    } else {
      setState('sent')
    }
  }

  if (!isPortalConfigured) {
    return (
      <Shell title="Sign in" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          The church portal is not configured on this deployment yet. The season
          calendar and rules work as normal.
        </p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Church sign in"
      subtitle="For church representatives sending team counts, rosters and judge names. Everyone else can use the calendar without signing in."
      onNavigate={onNavigate}
    >
      {state === 'sent' ? (
        <div className="max-w-note rounded-[3px] border border-rule bg-ink-2 p-6">
          <p className="m-0 font-display text-xl text-linen-2">Check your email</p>
          <p className="mt-3 text-[15px] text-linen">
            We sent a sign-in link to <b className="text-linen-2">{email}</b>. Open it
            on this device. The link works once and expires after an hour.
          </p>
          <p className="mt-3 text-[13.5px] text-slate">
            Nothing arrived? Check the spam folder. If it is still missing, your
            address may not be on the committee's list yet — ask Fr Akhnoukh to add it.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-note">
          <label
            htmlFor="email"
            className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none"
          />

          <button
            type="submit"
            disabled={state === 'sending'}
            className="mt-4 rounded-[2px] bg-gold px-5 py-2.5 text-[13.5px] font-medium text-ink hover:bg-[#E9B857] disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>

          {state === 'error' && (
            <p role="alert" className="mt-3 text-[13.5px] text-madder">
              {message}
            </p>
          )}

          <p className="mt-5 text-[13.5px] text-slate">
            Only addresses the committee has added can sign in. There is no public
            registration.
          </p>
        </form>
      )}
    </Shell>
  )
}
