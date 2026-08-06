import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The portal is optional. If these are not configured the public calendar still
 * works perfectly — it reads flat JSON and needs no database at all. Only the
 * sign-in and submission screens depend on this.
 */
export const isPortalConfigured = Boolean(url && key)

/*
 * This key is *meant* to be public — it ships inside every browser that loads
 * the site, exactly like a website's own address. It grants nothing on its own.
 * What actually protects submissions is row-level security in Postgres: a
 * church can read and write only its own rows, enforced by the database on
 * every single query. See supabase/README.md.
 */
export const supabase = isPortalConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
