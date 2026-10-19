import { worldSupabase } from './worldClient'

// Landing page for competition sign-in links (PKCE). Exchanges the one-time
// code for a session in the competition client only, then returns the person
// to the page they were on.

const params = new URLSearchParams(window.location.search)
const nextRaw = params.get('next') || '/world'
const next = nextRaw.startsWith('/world') ? nextRaw : '/world'
const msg = document.getElementById('msg')

async function run() {
  const code = params.get('code')
  const errDesc = params.get('error_description')
  if (errDesc) throw new Error(errDesc)
  if (!worldSupabase) throw new Error('not configured')
  if (code) {
    const { error } = await worldSupabase.auth.exchangeCodeForSession(code)
    if (error) throw error
  }
  window.location.replace(next)
}

run().catch(() => {
  msg.innerHTML = 'This sign-in link has expired or was opened on a different device or browser. ' +
    '<a href="' + next + '">Go back</a> and request a new link.'
})
