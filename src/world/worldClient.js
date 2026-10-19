import { createClient } from '@supabase/supabase-js'

// A separate Supabase client for the competition.
//
// Why separate: the B2B portal treats any session in the main client
// ('gelitup.portal.session') as a portal login (cart restore, checkout
// pre-fill, portalAuth flag). Competition voters must never trip that, so
// their session lives under its own storage key and this client never reads
// tokens from the page URL. Sign-in links land on /world-auth.html, a tiny
// page that loads only this client (PKCE flow), so the portal client never
// even sees the sign-in code.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasWorldConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const WORLD_STORAGE_KEY = 'gelitup.world.session'

function safeStorage() {
  if (typeof window === 'undefined') return undefined
  return {
    getItem: (k) => { try { return window.localStorage.getItem(k) } catch { return null } },
    setItem: (k, v) => { try { window.localStorage.setItem(k, v) } catch { /* ignore */ } },
    removeItem: (k) => { try { window.localStorage.removeItem(k) } catch { /* ignore */ } },
  }
}

export const worldSupabase = hasWorldConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storageKey: WORLD_STORAGE_KEY,
        storage: safeStorage(),
      },
    })
  : null
