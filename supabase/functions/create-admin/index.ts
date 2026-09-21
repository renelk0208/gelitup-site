// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const adminsTable = Deno.env.get('B2B_ADMINS_TABLE') || 'b2b_admins'

    // ── Verify caller is an authenticated admin ──────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header.' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user?.email) return json({ error: 'Unauthorized.' }, 401)

    const { data: adminRows } = await callerClient
      .from(adminsTable)
      .select('email')
      .ilike('email', user.email)
      .limit(1)

    if (!adminRows?.length) return json({ error: 'Forbidden: caller is not an admin.' }, 403)

    // ── Parse request ─────────────────────────────────────────────────────────
    const body = await req.json()
    const action = String(body?.action || '')
    const targetEmail = String(body?.email || '').trim().toLowerCase()

    if (!targetEmail) return json({ error: 'email is required.' }, 400)

    // Service role client — bypasses RLS
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Create admin ──────────────────────────────────────────────────────────
    if (action === 'create') {
      const password = String(body?.password || '')
      if (!password || password.length < 8) {
        return json({ error: 'Password must be at least 8 characters.' }, 400)
      }

      // Check if already an admin in b2b_admins
      const { data: existing } = await adminClient
        .from(adminsTable)
        .select('email')
        .ilike('email', targetEmail)
        .limit(1)

      if (existing?.length) {
        return json({ error: 'This email is already registered as an admin.' }, 409)
      }

      // Check if auth user already exists and update password, or create fresh
      const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const existingAuthUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === targetEmail,
      )

      let userId: string

      if (existingAuthUser) {
        const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(
          existingAuthUser.id,
          { password, email_confirm: true },
        )
        if (updateErr) return json({ error: updateErr.message }, 400)
        userId = updated.user.id
      } else {
        const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
          email: targetEmail,
          password,
          email_confirm: true,
        })
        if (createErr) return json({ error: createErr.message }, 400)
        userId = created.user.id
      }

      // Add to b2b_admins
      const { error: insertErr } = await adminClient
        .from(adminsTable)
        .upsert({ email: targetEmail }, { onConflict: 'email' })

      if (insertErr) return json({ error: insertErr.message }, 500)

      return json({ ok: true, userId })
    }

    // ── Remove admin ──────────────────────────────────────────────────────────
    if (action === 'remove') {
      if (targetEmail === user.email.toLowerCase()) {
        return json({ error: 'You cannot remove your own admin account.' }, 400)
      }

      const { error: deleteErr } = await adminClient
        .from(adminsTable)
        .delete()
        .ilike('email', targetEmail)

      if (deleteErr) return json({ error: deleteErr.message }, 500)

      return json({ ok: true })
    }

    return json({ error: 'Unknown action. Use "create" or "remove".' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
