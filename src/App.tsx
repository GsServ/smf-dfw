import { Suspense, lazy } from 'react'
import { useRoute } from './lib/router'
import PublicSite from './routes/PublicSite'

// Loaded only when someone actually visits a portal route, so the public
// calendar never downloads the auth client.
const PortalApp = lazy(() => import('./routes/PortalApp'))

const PORTAL_ROUTES = ['/portal', '/committee', '/signin']

export default function App() {
  const [path, navigate] = useRoute()

  if (PORTAL_ROUTES.includes(path)) {
    return (
      <Suspense
        fallback={
          <p className="wrap py-16 text-[15px] text-slate" aria-live="polite">
            Loading…
          </p>
        }
      >
        <PortalApp path={path} onNavigate={navigate} />
      </Suspense>
    )
  }

  return <PublicSite onNavigate={navigate} />
}
