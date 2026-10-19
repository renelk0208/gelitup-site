import { supabase } from '../lib/supabaseClient'
import { WORLD_PUBLIC } from './config'

// Before launch (WORLD_PUBLIC = false) only GEL.IT.UP admins may see the
// competition. Admin = logged in through the portal admin login with an email
// listed in b2b_admins (checked by the database function world_is_admin).
export async function canSeeWorld() {
  if (WORLD_PUBLIC) return { allowed: true, preview: false }
  if (!supabase) return { allowed: false, preview: true }
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session) return { allowed: false, preview: true }
    const { data } = await supabase.rpc('world_is_admin')
    return { allowed: Boolean(data), preview: true }
  } catch {
    return { allowed: false, preview: true }
  }
}
