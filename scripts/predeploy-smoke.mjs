#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || process.argv[2] || 'http://localhost:5173').replace(/\/$/, '')
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function fail(message) {
  console.error(`❌ ${message}`)
  process.exitCode = 1
}

function pass(message) {
  console.log(`✅ ${message}`)
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow' })
  const text = await response.text()
  return { response, text }
}

async function checkPage({ path, label }) {
  const url = `${baseUrl}${path}`
  try {
    const { response, text } = await fetchText(url)

    if (!response.ok) {
      fail(`${label}: ${url} returned ${response.status}`)
      return
    }

    const finalUrl = new URL(response.url)
    const expectedPath = new URL(url).pathname

    if (expectedPath !== '/' && finalUrl.pathname === '/') {
      fail(`${label}: route redirected to home (${response.url})`)
      return
    }

    if (!text.includes('<div id="root"></div>') && !text.includes('<div id="root">')) {
      fail(`${label}: SPA root container not found at ${response.url}`)
      return
    }

    pass(`${label}: ${url} -> ${response.url}`)
  }
  catch (error) {
    fail(`${label}: request failed for ${url} (${error instanceof Error ? error.message : 'unknown error'})`)
  }
}

async function checkSupabaseSchema() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('ℹ️ Skipping DB schema checks (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable).')
    return
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/b2b_registrations?select=status,notes&limit=1`

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })

    if (!response.ok) {
      fail(`Schema check failed for b2b_registrations (HTTP ${response.status}).`)
      return
    }

    pass('Schema check: b2b_registrations supports status + notes select.')
  }
  catch (error) {
    fail(`Schema check error: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

async function checkAdminSeed() {
  if (!supabaseUrl || !serviceRoleKey) {
    return
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/b2b_admins?select=email&limit=1`

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })

    if (!response.ok) {
      fail(`Admin seed check failed (HTTP ${response.status}).`)
      return
    }

    const rows = await response.json().catch(() => [])
    if (!Array.isArray(rows) || rows.length === 0) {
      fail('Admin seed check: no rows found in b2b_admins.')
      return
    }

    pass('Admin seed check: b2b_admins has at least one admin email.')
  }
  catch (error) {
    fail(`Admin seed check error: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

async function main() {
  console.log(`\n🔎 Running smoke checks against ${baseUrl}\n`)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('ℹ️ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not found in environment for this script run.')
    console.log('   Frontend runtime may still be configured in deployed environment variables.')
  }
  else {
    pass('Environment check: Supabase URL and anon key are present for script context.')
  }

  await checkPage({ path: '/', label: 'Homepage' })
  await checkPage({ path: '/portal/login', label: 'Client login page' })
  await checkPage({ path: '/portal/admin-login', label: 'Admin login page' })
  await checkPage({ path: '/portal/forgot-password?admin=1', label: 'Admin forgot password page' })
  await checkPage({ path: '/become-distributor', label: 'Registration page' })

  await checkSupabaseSchema()
  await checkAdminSeed()

  if (process.exitCode && process.exitCode !== 0) {
    console.error('\n🚫 Smoke checks failed. Do not deploy until fixed.\n')
    process.exit(process.exitCode)
  }

  console.log('\n✅ Smoke checks passed. Safe to continue.\n')
}

void main()
