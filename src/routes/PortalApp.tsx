import { AuthProvider, useAuth } from '../auth/AuthProvider'
import SignIn from './SignIn'
import Portal from './Portal'
import Committee from './Committee'

/**
 * Everything behind sign-in, in one lazily-loaded chunk.
 *
 * This exists so the Supabase client never reaches the public calendar's
 * bundle. Most visitors only ever check a date — making them download an auth
 * library to do it would break the "loads fast on a phone" requirement.
 */
export default function PortalApp({
  path,
  onNavigate,
}: {
  path: string
  onNavigate: (p: string) => void
}) {
  return (
    <AuthProvider>
      <PortalRoutes path={path} onNavigate={onNavigate} />
    </AuthProvider>
  )
}

function PortalRoutes({
  path,
  onNavigate,
}: {
  path: string
  onNavigate: (p: string) => void
}) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <p className="wrap py-16 text-[15px] text-slate" aria-live="polite">
        Loading…
      </p>
    )
  }

  // The sign-in screen *is* the page when signed out, rather than a redirect
  // that would lose the address they were trying to reach.
  if (!session) return <SignIn onNavigate={onNavigate} />

  return path === '/committee' ? (
    <Committee onNavigate={onNavigate} />
  ) : (
    <Portal onNavigate={onNavigate} />
  )
}
