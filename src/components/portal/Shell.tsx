import type { ReactNode } from 'react'
import { useAuth } from '../../auth/AuthProvider'

interface Props {
  title: string
  subtitle?: string
  onNavigate: (path: string) => void
  children: ReactNode
}

/** Frame shared by the sign-in, portal and committee screens. */
export default function Shell({ title, subtitle, onNavigate, children }: Props) {
  const { session, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              onNavigate('/')
            }}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:text-linen-2"
          >
            ← St. Mark Festival
          </a>

          {session && (
            <div className="flex flex-wrap items-center gap-4">
              {profile?.church?.name && (
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
                  {profile.church.name}
                </span>
              )}
              {profile?.role === 'committee' && (
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-label">
                  Committee
                </span>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-linen hover:border-gold hover:text-gold"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="wrap py-[clamp(28px,5vw,56px)]">
        <h1 className="m-0 font-display text-[clamp(28px,5vw,42px)] font-normal text-linen-2">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-note text-[15px] text-slate">{subtitle}</p>}
        <div className="mt-[clamp(24px,4vw,40px)]">{children}</div>
      </main>
    </div>
  )
}
