import { useEffect, useState } from 'react'

/**
 * Three routes, no nested layouts, no loaders. A router library would be more
 * dependency than this needs — and every dependency is future maintenance,
 * which is the one thing this project is trying to avoid.
 *
 * Direct navigation to /portal works because public/_redirects tells Cloudflare
 * Pages to serve index.html for any unmatched path.
 */
export function useRoute(): [string, (path: string) => void] {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function navigate(to: string) {
    if (to === window.location.pathname) return
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }

  return [path, navigate]
}
