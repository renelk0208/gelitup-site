import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'
import { seminarCodeEmail } from '../lib/seminarEmail'

// ─────────────────────────────────────────────────────────────────────────────
// GEL.IT.UP online seminars — gelitup.com/seminars
//
//   /seminars              upcoming seminars (clickable booking images, SOLD OUT)
//   /seminars/login        attendee sign-in: email + access code (no account)
//   /seminars/my           my seminars + add another code
//   /seminars/room/:id     live stream + Q&A, then 30-day replay
//   /seminars/private      request a private seminar (own date & time)
//   /seminars/admin        GEL.IT.UP admins: seminars, stream links, codes, requests
//
// Attendees never get a website account (that would open the B2B portal).
// The stream links only come back from the seminar_room() database function,
// for the one device currently signed in, inside the live/replay window.
// ─────────────────────────────────────────────────────────────────────────────

const BRAND = '#D43790'
const TOKEN_KEY = 'gelitup.seminar.token'
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL || ''
const EMAIL_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
const writeToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } }

const escapeHtml = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function formatWhen(iso, withZone = true) {
  if (!iso) return ''
  const d = new Date(iso)
  const local = d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (!withZone) return local
  const athens = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' })
  return `${local} (your time) · ${athens} Greece / Bulgaria time`
}

// Turn whatever Vimeo link is pasted into the right embed addresses.
function vimeoLiveEmbeds(input) {
  const s = String(input || '').trim()
  const m = s.match(/vimeo\.com\/event\/(\d+)/)
  if (m) return { live: `https://vimeo.com/event/${m[1]}/embed`, chat: `https://vimeo.com/event/${m[1]}/chat/` }
  return { live: s, chat: '' }
}
function vimeoVideoEmbed(input) {
  const s = String(input || '').trim()
  if (s.includes('player.vimeo.com')) return s
  const m = s.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/)
  if (m) return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ''}`
  return s
}

const ERRORS = {
  invalid_email: 'Please enter a valid email address.',
  invalid_code: 'That access code was not recognised. Check the code in your booking email.',
  code_in_use: 'This code is already linked to another email address. Use the email you first signed in with, or contact us.',
  signed_out: 'You were signed out — possibly because this code was used on another device. Please sign in again.',
}

// ── Layout ───────────────────────────────────────────────────────────────────
function Shell({ children, wide = false }) {
  return <div className={`${wide ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-4 md:px-6 py-8 md:py-12`}>{children}</div>
}

function SubNav({ signedIn }) {
  const cls = ({ isActive }) => `px-3 py-1.5 rounded-full text-sm ${isActive ? 'bg-black text-white' : 'text-black/70 hover:bg-black/5'}`
  return (
    <nav className="flex flex-wrap gap-2 justify-center mb-8">
      <NavLink end to="/seminars" className={cls}>Seminars</NavLink>
      <NavLink to={signedIn ? '/seminars/my' : '/seminars/login'} className={cls}>{signedIn ? 'My seminars' : 'Sign in'}</NavLink>
      <NavLink to="/seminars/private" className={cls}>Private seminar</NavLink>
    </nav>
  )
}

function Button({ children, className = '', ...props }) {
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold text-white disabled:opacity-50 ${className}`} style={{ background: BRAND }}>{children}</button>
}

const inputCls = 'w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D43790]/40'

// ── Attendee session hook ────────────────────────────────────────────────────
function useSeminarSession() {
  const [token, setToken] = useState(readToken)
  const [state, setState] = useState({ loading: Boolean(readToken()), email: '', seminars: [], error: '' })

  const refresh = useCallback(async (t = token) => {
    if (!t || !hasSupabaseConfig) { setState({ loading: false, email: '', seminars: [], error: '' }); return }
    const { data, error } = await supabase.rpc('seminar_room', { p_token: t })
    if (error) { setState((s) => ({ ...s, loading: false, error: 'Could not load your seminars. Please refresh.' })); return }
    if (!data?.ok) { writeToken(''); setToken(''); setState({ loading: false, email: '', seminars: [], error: ERRORS[data?.error] || '' }); return }
    setState({ loading: false, email: data.email, seminars: data.seminars || [], error: '' })
  }, [token])

  // Loads the attendee's seminars from the database (external system) on sign-in / token change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh() }, [refresh])

  const signIn = async (email, code) => {
    const { data, error } = await supabase.rpc('seminar_sign_in', { p_email: email, p_code: code })
    if (error) return 'Something went wrong. Please try again.'
    if (!data?.ok) return ERRORS[data?.error] || 'Sign-in failed.'
    writeToken(data.token); setToken(data.token)
    await refresh(data.token)
    return ''
  }
  const addCode = async (code) => {
    const { data, error } = await supabase.rpc('seminar_add_code', { p_token: token, p_code: code })
    if (error) return 'Something went wrong. Please try again.'
    if (!data?.ok) return ERRORS[data?.error] || 'Could not add the code.'
    await refresh()
    return ''
  }
  const signOut = async () => {
    if (token) await supabase.rpc('seminar_sign_out', { p_token: token })
    writeToken(''); setToken('')
    setState({ loading: false, email: '', seminars: [], error: '' })
  }
  return { token, signedIn: Boolean(token), ...state, refresh, signIn, addCode, signOut }
}

// ── Public: upcoming seminars ────────────────────────────────────────────────
function SeminarCard({ s }) {
  const soldOut = s.sold_out || (s.seats_taken ?? 0) >= s.seats
  const past = Boolean(s.past)
  const clickable = !soldOut && !past && s.shop_url
  const inner = (
    <>
      <div className="relative aspect-[4/5] bg-black/5 overflow-hidden rounded-2xl">
        {s.image_url
          ? <img src={s.image_url} alt={s.title} loading="lazy" className={`h-full w-full object-cover transition-transform duration-500 ${clickable ? 'group-hover:scale-[1.03]' : ''} ${soldOut || past ? 'grayscale-[60%] opacity-80' : ''}`} />
          : <div className="h-full w-full flex items-center justify-center text-black/30 text-sm p-6 text-center">Seminar image<br />1200 × 1500 px</div>}
        {soldOut && !past && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-12deg] border-4 border-white bg-black/80 px-6 py-2 text-2xl md:text-3xl font-black tracking-widest text-white shadow-xl">SOLD OUT</span>
          </div>
        )}
        {past && <span className="absolute top-3 left-3 rounded-full bg-black/80 text-white text-xs font-semibold px-3 py-1">Finished</span>}
        {!soldOut && !past && s.seats - (s.seats_taken ?? 0) <= 5 && (
          <span className="absolute top-3 left-3 rounded-full text-white text-xs font-semibold px-3 py-1" style={{ background: BRAND }}>
            Only {s.seats - (s.seats_taken ?? 0)} seats left
          </span>
        )}
      </div>
      <div className="pt-3">
        <p className="text-xs uppercase tracking-wider text-black/50">{formatWhen(s.starts_at, false)}</p>
        <h3 className="font-bold text-lg leading-snug">{s.title}</h3>
        {s.trainer_name && <p className="text-sm text-black/60">with {s.trainer_name}</p>}
        <p className="mt-2 text-sm font-semibold" style={{ color: soldOut || past ? '#6b7280' : BRAND }}>
          {past ? 'This seminar has finished' : soldOut ? 'Sold out — watch for the next date' : 'Book your seat →'}
        </p>
      </div>
    </>
  )
  return clickable
    ? <a href={s.shop_url} className="group block" aria-label={`Book ${s.title}`}>{inner}</a>
    : <div className="block cursor-default" aria-disabled="true">{inner}</div>
}

function SeminarsHome({ session }) {
  const [seminars, setSeminars] = useState(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!hasSupabaseConfig) { setSeminars([]); return }
      const since = new Date(Date.now() - 2 * 86400000).toISOString()
      const { data } = await supabase.from('seminars')
        .select('id, title, trainer_name, starts_at, duration_minutes, seats, sold_out, shop_url, image_url, status, kind')
        .eq('kind', 'group').eq('status', 'scheduled').gte('starts_at', since).order('starts_at')
      const rows = data || []
      const withSeats = await Promise.all(rows.map(async (s) => {
        const { data: taken } = await supabase.rpc('seminar_seats_taken', { p_seminar_id: s.id })
        return { ...s, seats_taken: taken ?? 0, past: new Date(s.starts_at).getTime() + s.duration_minutes * 60000 < Date.now() }
      }))
      if (!cancelled) setSeminars(withSeats)
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <Shell wide>
      <SubNav signedIn={session.signedIn} />
      <header className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: BRAND }}>GEL.IT.UP Education</p>
        <h1 className="text-3xl md:text-5xl font-bold mt-2">Live online seminars</h1>
        <p className="mt-4 text-black/60">Learn live from GEL.IT.UP trainers, ask your questions in the live Q&amp;A, and rewatch the recording for 30 days. Only 20 seats per date.</p>
      </header>

      {seminars === null && <p className="text-center text-black/40">Loading seminars…</p>}
      {seminars?.length === 0 && (
        <div className="text-center border rounded-2xl p-10 text-black/60">
          <p className="font-semibold text-black">New seminar dates are coming soon.</p>
          <p className="mt-2">Want a session at a time that suits you? <Link to="/seminars/private" className="underline" style={{ color: BRAND }}>Request a private seminar</Link>.</p>
        </div>
      )}
      {seminars?.length > 0 && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {seminars.map((s) => <SeminarCard key={s.id} s={s} />)}
        </div>
      )}

      <section className="mt-14 grid gap-4 md:grid-cols-3 text-sm">
        {[
          ['1. Book', 'Choose a date on our shop and add the seminar kit if you want the products.'],
          ['2. Get your code', 'Your personal access code arrives by email straight after payment.'],
          ['3. Join live', 'Sign in here with your email and code, on your phone, tablet or computer. Nothing to install.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border p-5"><p className="font-bold">{t}</p><p className="text-black/60 mt-1">{d}</p></div>
        ))}
      </section>
      <p className="text-center mt-8 text-sm text-black/60">Already booked? <Link to="/seminars/login" className="font-semibold underline" style={{ color: BRAND }}>Sign in with your access code</Link></p>
    </Shell>
  )
}

// ── Attendee sign-in ─────────────────────────────────────────────────────────
function SignInPage({ session }) {
  const navigate = useNavigate()
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const [email, setEmail] = useState(params.get('email') || '')
  const [code, setCode] = useState(params.get('code') || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(session.error || '')

  if (session.signedIn && !session.loading) return <Navigate to="/seminars/my" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    const err = await session.signIn(email, code)
    setBusy(false)
    if (err) setError(err); else navigate('/seminars/my')
  }
  return (
    <Shell>
      <SubNav signedIn={false} />
      <div className="max-w-md mx-auto border rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl font-bold">Sign in to your seminar</h1>
        <p className="text-black/60 mt-1 text-sm">Use the email address you booked with and the access code from your booking email.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="text-sm font-medium">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <label className="block"><span className="text-sm font-medium">Access code</span>
            <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SEM-XXXX-XXXX-XXXX" className={`${inputCls} mt-1 font-mono tracking-wider`} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="text-xs text-black/50 mt-4">Your code works on one device at a time — signing in somewhere new signs out the previous device.</p>
      </div>
    </Shell>
  )
}

// ── My seminars ──────────────────────────────────────────────────────────────
const PHASE_LABEL = {
  upcoming: ['Upcoming', 'bg-black/5 text-black/70'],
  live: ['LIVE NOW', 'text-white'],
  replay: ['Replay available', 'bg-emerald-100 text-emerald-800'],
  replay_pending: ['Replay coming soon', 'bg-amber-100 text-amber-800'],
  expired: ['Access ended', 'bg-black/5 text-black/50'],
  cancelled: ['Cancelled', 'bg-red-100 text-red-700'],
}

function MySeminars({ session }) {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { const id = setInterval(() => session.refresh(), 60000); return () => clearInterval(id) }, [session])

  if (!session.signedIn && !session.loading) return <Navigate to="/seminars/login" replace />
  if (session.loading) return <Shell><p className="text-center text-black/40">Loading…</p></Shell>

  const add = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const err = await session.addCode(code)
    setBusy(false); if (err) setMsg(err); else { setCode(''); setMsg('Code added.') }
  }
  return (
    <Shell>
      <SubNav signedIn />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl md:text-3xl font-bold">My seminars</h1><p className="text-sm text-black/50">{session.email}</p></div>
        <button onClick={session.signOut} className="text-sm text-black/60 underline">Sign out</button>
      </div>
      <div className="mt-6 space-y-4">
        {session.seminars.map((s) => {
          const [label, cls] = PHASE_LABEL[s.phase] || ['', '']
          const canEnter = s.phase === 'live' || s.phase === 'replay' || s.phase === 'upcoming' || s.phase === 'replay_pending'
          return (
            <div key={s.id} className="border rounded-2xl p-5 flex gap-4 items-center">
              {s.image_url && <img src={s.image_url} alt="" className="w-16 h-20 object-cover rounded-lg hidden sm:block" />}
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${cls}`} style={s.phase === 'live' ? { background: BRAND } : undefined}>{label}</span>
                <h2 className="font-bold mt-1">{s.title}</h2>
                <p className="text-sm text-black/60">{formatWhen(s.starts_at)}</p>
                {(s.phase === 'replay' || s.phase === 'replay_pending') && <p className="text-xs text-black/50 mt-1">Replay open until {formatWhen(s.replay_until, false)}</p>}
              </div>
              {canEnter && <Link to={`/seminars/room/${s.id}`} className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: s.phase === 'live' ? BRAND : '#111' }}>{s.phase === 'live' ? 'Join now' : s.phase === 'replay' ? 'Watch replay' : 'Open'}</Link>}
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-8 border rounded-2xl p-5">
        <p className="font-semibold">Booked another seminar?</p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SEM-XXXX-XXXX-XXXX" required className={`${inputCls} flex-1 min-w-[220px] font-mono`} />
          <Button type="submit" disabled={busy}>Add code</Button>
        </div>
        {msg && <p className="text-sm mt-2 text-black/70">{msg}</p>}
      </form>
    </Shell>
  )
}

// ── Seminar room ─────────────────────────────────────────────────────────────
function Countdown({ to }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const ms = Math.max(0, new Date(to).getTime() - now)
  const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60
  return (
    <div className="flex justify-center gap-3 mt-6">
      {[['days', d], ['hours', h], ['min', m], ['sec', s]].map(([l, v]) => (
        <div key={l} className="w-20 rounded-xl bg-white/10 py-3 text-center"><p className="text-3xl font-bold tabular-nums">{String(v).padStart(2, '0')}</p><p className="text-xs uppercase text-white/60">{l}</p></div>
      ))}
    </div>
  )
}

function Room({ session }) {
  const { id } = useParams()
  useEffect(() => { const t = setInterval(() => session.refresh(), 45000); return () => clearInterval(t) }, [session])
  if (!session.signedIn && !session.loading) return <Navigate to="/seminars/login" replace />
  if (session.loading) return <Shell><p className="text-center text-black/40">Loading…</p></Shell>
  const s = session.seminars.find((x) => x.id === id)
  if (!s) return <Shell><p className="text-center">This seminar isn't linked to your access code. <Link className="underline" to="/seminars/my">Back to my seminars</Link></p></Shell>

  return (
    <Shell wide>
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link to="/seminars/my" className="text-sm text-black/60">← My seminars</Link>
        <span className="text-xs text-black/40">{session.email}</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold">{s.title}</h1>
      <p className="text-black/60 text-sm">{s.trainer_name ? `with ${s.trainer_name} · ` : ''}{formatWhen(s.starts_at)}</p>

      {s.phase === 'live' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          {s.live_embed_url
            ? <div className="relative aspect-video rounded-2xl overflow-hidden bg-black"><iframe title={s.title} src={s.live_embed_url} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
            : <div className="aspect-video rounded-2xl bg-black text-white flex items-center justify-center text-center p-6">The stream will appear here in a moment — the page refreshes automatically.</div>}
          <div className="rounded-2xl border overflow-hidden min-h-[420px] lg:min-h-0 flex flex-col">
            <p className="px-4 py-3 border-b font-semibold text-sm">Questions &amp; chat</p>
            {s.chat_embed_url
              ? <iframe title="Seminar Q&A" src={s.chat_embed_url} className="flex-1 w-full min-h-[380px]" />
              : <p className="p-4 text-sm text-black/50">The Q&amp;A opens when the seminar starts.</p>}
          </div>
        </div>
      )}

      {s.phase === 'upcoming' && (
        <div className="mt-6 rounded-2xl bg-black text-white p-8 md:p-12 text-center">
          <p className="uppercase tracking-[0.2em] text-xs" style={{ color: BRAND }}>Starts in</p>
          <Countdown to={s.starts_at} />
          <p className="mt-6 text-white/70 text-sm">The room opens 30 minutes before the start. Keep this page open — it switches to the live stream automatically.</p>
          {s.kit_url && <a href={s.kit_url} className="inline-block mt-6 underline text-white">Don't have the seminar kit yet? Get it here</a>}
        </div>
      )}

      {s.phase === 'replay' && (
        <div className="mt-6">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black"><iframe title={`${s.title} replay`} src={s.replay_embed_url} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
          <p className="text-sm text-black/60 mt-3">Replay available until {formatWhen(s.replay_until, false)}.</p>
        </div>
      )}
      {s.phase === 'replay_pending' && <div className="mt-6 rounded-2xl border p-8 text-center text-black/70">Thank you for joining! The recording is being prepared and will appear here soon. You'll be able to watch it until {formatWhen(s.replay_until, false)}.</div>}
      {s.phase === 'expired' && <div className="mt-6 rounded-2xl border p-8 text-center text-black/70">Access to this seminar has ended. See <Link className="underline" to="/seminars">upcoming seminars</Link>.</div>}
      {s.phase === 'cancelled' && <div className="mt-6 rounded-2xl border p-8 text-center text-black/70">This seminar was cancelled. We'll be in touch by email.</div>}
      {s.description && <div className="mt-8 text-black/70 whitespace-pre-line">{s.description}</div>}
    </Shell>
  )
}

// ── Private seminar request ──────────────────────────────────────────────────
function PrivateRequest({ session }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', country: '', topic: '', attendees: 1, wants_kit: false, notes: '', slots: [{ date: '', time: '' }, { date: '', time: '' }, { date: '', time: '' }] })
  const [state, setState] = useState('idle')
  const tz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } }, [])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setSlot = (i, k) => (e) => setForm((f) => ({ ...f, slots: f.slots.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)) }))

  const submit = async (e) => {
    e.preventDefault(); setState('sending')
    const slots = form.slots.filter((s) => s.date)
    const record = { name: form.name, email: form.email.trim().toLowerCase(), phone: form.phone, country: form.country, timezone: tz, preferred_slots: slots, topic: form.topic, attendees: Number(form.attendees) || 1, wants_kit: form.wants_kit, notes: form.notes }
    const { error } = await supabase.from('seminar_private_requests').insert(record)
    if (error) { setState('error'); return }
    if (EMAIL_WEBHOOK_URL) {
      const rows = [['Name', record.name], ['Email', record.email], ['Phone', record.phone], ['Country', record.country], ['Time zone', tz], ['People', record.attendees], ['Kit', record.wants_kit ? 'Yes' : 'No'], ['Topic', record.topic], ['Preferred', slots.map((s) => `${s.date} ${s.time}`).join(' / ')], ['Notes', record.notes]]
      fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: EMAIL_ANON_KEY, Authorization: `Bearer ${EMAIL_ANON_KEY}` }, body: JSON.stringify({ to: 'info@gelitup.com', subject: `Private seminar request — ${record.name}`, html: `<h2>Private seminar request</h2><table>${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}</table>`, from: 'GEL.IT.UP Seminars <info@gelitup.com>', replyTo: record.email }) }).catch(() => {})
    }
    setState('done')
  }

  return (
    <Shell>
      <SubNav signedIn={session.signedIn} />
      <h1 className="text-3xl font-bold text-center">Private seminar</h1>
      <p className="text-center text-black/60 mt-2 max-w-xl mx-auto">A live session for you, your salon or your academy, at a date and time that suits you. Tell us what you'd like and we'll confirm with the trainer and send you a payment link.</p>
      {state === 'done' ? (
        <div className="mt-8 border rounded-2xl p-8 text-center"><p className="text-xl font-bold">Thank you — request received.</p><p className="text-black/60 mt-2">We'll check availability with our trainer and email you within 2 working days.</p></div>
      ) : (
        <form onSubmit={submit} className="mt-8 border rounded-2xl p-6 md:p-8 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">Name *</span><input required value={form.name} onChange={set('name')} className={`${inputCls} mt-1`} /></label>
          <label className="block"><span className="text-sm font-medium">Email *</span><input required type="email" value={form.email} onChange={set('email')} className={`${inputCls} mt-1`} /></label>
          <label className="block"><span className="text-sm font-medium">Phone</span><input value={form.phone} onChange={set('phone')} className={`${inputCls} mt-1`} /></label>
          <label className="block"><span className="text-sm font-medium">Country</span><input value={form.country} onChange={set('country')} className={`${inputCls} mt-1`} /></label>
          <label className="block md:col-span-2"><span className="text-sm font-medium">What would you like to learn? *</span><textarea required rows={3} value={form.topic} onChange={set('topic')} className={`${inputCls} mt-1`} placeholder="e.g. Builder gel structure and apex, almond shape" /></label>
          <div className="md:col-span-2">
            <p className="text-sm font-medium">Preferred dates &amp; times <span className="text-black/50 font-normal">(your time zone: {tz || 'local'})</span></p>
            <div className="mt-1 grid gap-2">
              {form.slots.map((s, i) => (
                <div key={i} className="flex gap-2"><input type="date" required={i === 0} value={s.date} onChange={setSlot(i, 'date')} className={inputCls} /><input type="time" value={s.time} onChange={setSlot(i, 'time')} className={inputCls} /></div>
              ))}
            </div>
          </div>
          <label className="block"><span className="text-sm font-medium">Number of people</span><input type="number" min={1} max={100} value={form.attendees} onChange={set('attendees')} className={`${inputCls} mt-1`} /></label>
          <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.wants_kit} onChange={set('wants_kit')} /> <span className="text-sm">I'd like the seminar kit (products) too</span></label>
          <label className="block md:col-span-2"><span className="text-sm font-medium">Anything else?</span><textarea rows={2} value={form.notes} onChange={set('notes')} className={`${inputCls} mt-1`} /></label>
          {state === 'error' && <p className="text-sm text-red-600 md:col-span-2">Sorry, the request could not be sent. Please try again or email info@gelitup.com.</p>}
          <div className="md:col-span-2"><Button type="submit" disabled={state === 'sending'} className="w-full">{state === 'sending' ? 'Sending…' : 'Send request'}</Button></div>
        </form>
      )}
    </Shell>
  )
}

// ── Admin ────────────────────────────────────────────────────────────────────
const EMPTY = { title: '', trainer_name: '', description: '', starts_at: '', duration_minutes: 90, seats: 20, replay_days: 30, status: 'draft', kind: 'group', shopify_sku: '', shop_url: '', kit_url: '', image_url: '', sold_out: false, vimeo_event: '', replay_video: '' }

const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

async function emailCode({ to, name, code, seminar }) {
  if (!EMAIL_WEBHOOK_URL) throw new Error('Email is not configured')
  const { subject, html } = seminarCodeEmail({ name, email: to, codes: [code], seminar })
  const res = await fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: EMAIL_ANON_KEY, Authorization: `Bearer ${EMAIL_ANON_KEY}` }, body: JSON.stringify({ to, subject, html, from: 'GEL.IT.UP Seminars <info@gelitup.com>', replyTo: 'info@gelitup.com' }) })
  if (!res.ok) throw new Error(`Email failed (${res.status})`)
}

function AdminPage() {
  const [authState, setAuthState] = useState('checking')
  const [seminars, setSeminars] = useState([])
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [codes, setCodes] = useState([])
  const [requests, setRequests] = useState([])
  const [msg, setMsg] = useState('')
  const [issue, setIssue] = useState({ email: '', name: '', count: 1, note: '' })

  const load = useCallback(async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from('seminars').select('*, seminar_media(*), seminar_access_codes(count)').order('starts_at', { ascending: false }),
      supabase.from('seminar_private_requests').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setSeminars(s || []); setRequests(r || [])
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!hasSupabaseConfig) { setAuthState('no'); return }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess?.session) { setAuthState('no'); return }
      const { data: ok } = await supabase.rpc('seminar_is_admin')
      setAuthState(ok ? 'yes' : 'no')
      if (ok) load()
    })()
  }, [load])

  const loadCodes = async (sid) => {
    setSelected(sid)
    const { data } = await supabase.from('seminar_access_codes').select('*').eq('seminar_id', sid).order('created_at', { ascending: false })
    setCodes(data || [])
  }

  if (authState === 'checking') return <Shell><p className="text-center text-black/40">Checking access…</p></Shell>
  if (authState === 'no') return <Shell><p className="text-center">Admins only. <Link className="underline" to="/portal/admin-login">Sign in as admin</Link>, then come back to /seminars/admin.</p></Shell>

  const startEdit = (s) => {
    const m = Array.isArray(s?.seminar_media) ? s.seminar_media[0] : s?.seminar_media
    setEditing(s ? { ...EMPTY, ...s, starts_at: toLocalInput(s.starts_at), shopify_sku: s.shopify_sku || '', vimeo_event: m?.live_embed_url || '', replay_video: m?.replay_embed_url || '' } : { ...EMPTY })
    setMsg('')
  }

  const save = async (e) => {
    e.preventDefault(); setMsg('Saving…')
    const { vimeo_event, replay_video, id } = editing
    const FIELDS = ['title', 'trainer_name', 'description', 'duration_minutes', 'seats', 'replay_days', 'status', 'kind', 'shopify_sku', 'shop_url', 'kit_url', 'image_url', 'sold_out']
    const rest = Object.fromEntries(FIELDS.map((f) => [f, editing[f] === '' ? null : editing[f]]))
    const row = { ...rest, starts_at: new Date(editing.starts_at).toISOString(), shopify_sku: rest.shopify_sku?.trim() || null, duration_minutes: Number(rest.duration_minutes), seats: Number(rest.seats), replay_days: Number(rest.replay_days), updated_at: new Date().toISOString() }
    const q = id ? supabase.from('seminars').update(row).eq('id', id).select().single() : supabase.from('seminars').insert(row).select().single()
    const { data, error } = await q
    if (error) { setMsg(`Could not save: ${error.message}`); return }
    const live = vimeoLiveEmbeds(vimeo_event)
    const { error: mErr } = await supabase.from('seminar_media').upsert({ seminar_id: data.id, live_embed_url: live.live || null, chat_embed_url: live.chat || null, replay_embed_url: replay_video ? vimeoVideoEmbed(replay_video) : null, updated_at: new Date().toISOString() })
    if (mErr) { setMsg(`Saved, but stream links failed: ${mErr.message}`); return }
    setMsg('Saved.'); setEditing(null); load()
  }

  const toggleSoldOut = async (s) => {
    await supabase.from('seminars').update({ sold_out: !s.sold_out, updated_at: new Date().toISOString() }).eq('id', s.id)
    load()
  }

  const issueCodes = async (e) => {
    e.preventDefault(); setMsg('Issuing…')
    const s = seminars.find((x) => x.id === selected)
    const { data, error } = await supabase.rpc('admin_issue_seminar_codes', { p_seminar_id: selected, p_email: issue.email, p_name: issue.name || null, p_count: Number(issue.count) || 1, p_note: issue.note || null })
    if (error) { setMsg(error.message); return }
    const list = (data || []).map((r) => (typeof r === 'string' ? r : r.admin_issue_seminar_codes))
    let sent = 0
    for (const code of list) {
      try { await emailCode({ to: issue.email, name: issue.name, code, seminar: s }); sent++; await supabase.from('seminar_access_codes').update({ emailed_at: new Date().toISOString() }).eq('code', code) } catch { /* shown below */ }
    }
    setMsg(`Issued ${list.length} code(s): ${list.join(', ')} — emailed ${sent}.`)
    setIssue({ email: '', name: '', count: 1, note: '' }); loadCodes(selected); load()
  }

  const revoke = async (c) => { await supabase.from('seminar_access_codes').update({ revoked: !c.revoked, session_token: null }).eq('code', c.code); loadCodes(selected) }
  const resend = async (c) => {
    const s = seminars.find((x) => x.id === c.seminar_id)
    try { await emailCode({ to: c.attendee_email || c.buyer_email, name: c.buyer_name, code: c.code, seminar: s }); setMsg(`Code re-sent to ${c.attendee_email || c.buyer_email}.`) } catch (err) { setMsg(err.message) }
  }
  const setRequestStatus = async (r, status) => { await supabase.from('seminar_private_requests').update({ status }).eq('id', r.id); load() }

  const F = ({ label, k, type = 'text', ...p }) => (
    <label className="block"><span className="text-sm font-medium">{label}</span>
      <input type={type} value={editing[k] ?? ''} onChange={(e) => setEditing((x) => ({ ...x, [k]: type === 'checkbox' ? e.target.checked : e.target.value }))} className={`${inputCls} mt-1`} {...p} />
    </label>
  )

  return (
    <Shell wide>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Seminars admin</h1>
        <Button onClick={() => startEdit(null)}>+ New seminar</Button>
      </div>
      {msg && <p className="mt-3 text-sm bg-black/5 rounded-lg px-3 py-2">{msg}</p>}

      {editing && (
        <form onSubmit={save} className="mt-6 border rounded-2xl p-5 md:p-6 grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-bold text-lg">{editing.id ? 'Edit seminar' : 'New seminar'}</h2>
          <div className="md:col-span-2">{F({ label: 'Title *', k: 'title', required: true })}</div>
          {F({ label: 'Trainer', k: 'trainer_name' })}
          {F({ label: 'Starts (your local time) *', k: 'starts_at', type: 'datetime-local', required: true })}
          {F({ label: 'Duration (minutes)', k: 'duration_minutes', type: 'number', min: 15 })}
          {F({ label: 'Seats', k: 'seats', type: 'number', min: 1 })}
          {F({ label: 'Replay days after seminar', k: 'replay_days', type: 'number', min: 0 })}
          <label className="block"><span className="text-sm font-medium">Status</span>
            <select value={editing.status} onChange={(e) => setEditing((x) => ({ ...x, status: e.target.value }))} className={`${inputCls} mt-1`}>
              <option value="draft">Draft (hidden)</option><option value="scheduled">Scheduled (shown on /seminars)</option><option value="ended">Ended (live finished)</option><option value="cancelled">Cancelled</option>
            </select></label>
          <label className="block"><span className="text-sm font-medium">Type</span>
            <select value={editing.kind} onChange={(e) => setEditing((x) => ({ ...x, kind: e.target.value }))} className={`${inputCls} mt-1`}>
              <option value="group">Group seminar (public listing)</option><option value="private">Private seminar (not listed)</option>
            </select></label>
          {F({ label: 'Shopify SKU of this date (links orders → codes)', k: 'shopify_sku', placeholder: 'e.g. SEM-LIVE-2026-12-05' })}
          {F({ label: 'Booking page (shop.gelitup.com link)', k: 'shop_url', type: 'url' })}
          {F({ label: 'Seminar kit page (optional)', k: 'kit_url', type: 'url' })}
          {F({ label: 'Booking image URL (1200 × 1500 px)', k: 'image_url', type: 'url' })}
          <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={Boolean(editing.sold_out)} onChange={(e) => setEditing((x) => ({ ...x, sold_out: e.target.checked }))} /><span className="text-sm font-semibold">Show SOLD OUT</span></label>
          <div className="md:col-span-2"><label className="block"><span className="text-sm font-medium">Description</span><textarea rows={4} value={editing.description || ''} onChange={(e) => setEditing((x) => ({ ...x, description: e.target.value }))} className={`${inputCls} mt-1`} /></label></div>
          <div className="md:col-span-2 rounded-xl bg-black/[0.03] p-4 grid gap-3">
            <p className="font-semibold text-sm">Stream links (only shown to signed-in attendees)</p>
            {F({ label: 'Vimeo live event link — e.g. https://vimeo.com/event/1234567', k: 'vimeo_event' })}
            {F({ label: 'Replay video link (add after the seminar) — e.g. https://vimeo.com/987654321', k: 'replay_video' })}
          </div>
          <div className="md:col-span-2 flex gap-3"><Button type="submit">Save</Button><button type="button" onClick={() => setEditing(null)} className="px-4 text-sm underline">Cancel</button></div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto border rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left"><tr><th className="p-3">Seminar</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Codes / seats</th><th className="p-3">Sold out</th><th className="p-3"></th></tr></thead>
          <tbody>
            {seminars.map((s) => (
              <tr key={s.id} className={`border-t ${selected === s.id ? 'bg-[#D43790]/5' : ''}`}>
                <td className="p-3 font-semibold">{s.title}<div className="text-xs font-normal text-black/50">{s.kind === 'private' ? 'Private · ' : ''}{s.shopify_sku || 'no SKU'}</div></td>
                <td className="p-3 whitespace-nowrap">{formatWhen(s.starts_at, false)}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3">{s.seminar_access_codes?.[0]?.count ?? 0} / {s.seats}</td>
                <td className="p-3"><button onClick={() => toggleSoldOut(s)} className={`rounded-full px-3 py-1 text-xs font-bold ${s.sold_out ? 'bg-black text-white' : 'bg-black/5'}`}>{s.sold_out ? 'SOLD OUT' : 'Off'}</button></td>
                <td className="p-3 whitespace-nowrap text-right"><button onClick={() => startEdit(s)} className="underline mr-3">Edit</button><button onClick={() => loadCodes(s.id)} className="underline">Codes</button></td>
              </tr>
            ))}
            {!seminars.length && <tr><td colSpan={6} className="p-6 text-center text-black/50">No seminars yet — click “New seminar”.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <section className="mt-8">
          <h2 className="font-bold text-lg">Access codes — {seminars.find((s) => s.id === selected)?.title}</h2>
          <form onSubmit={issueCodes} className="mt-3 flex flex-wrap gap-2 items-end border rounded-2xl p-4">
            <label className="flex-1 min-w-[200px]"><span className="text-xs">Email *</span><input required type="email" value={issue.email} onChange={(e) => setIssue((x) => ({ ...x, email: e.target.value }))} className={inputCls} /></label>
            <label className="flex-1 min-w-[160px]"><span className="text-xs">Name</span><input value={issue.name} onChange={(e) => setIssue((x) => ({ ...x, name: e.target.value }))} className={inputCls} /></label>
            <label className="w-20"><span className="text-xs">Codes</span><input type="number" min={1} max={50} value={issue.count} onChange={(e) => setIssue((x) => ({ ...x, count: e.target.value }))} className={inputCls} /></label>
            <label className="flex-1 min-w-[160px]"><span className="text-xs">Note</span><input value={issue.note} onChange={(e) => setIssue((x) => ({ ...x, note: e.target.value }))} placeholder="comp / ambassador / private" className={inputCls} /></label>
            <Button type="submit">Issue &amp; email</Button>
          </form>
          <div className="mt-3 overflow-x-auto border rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03] text-left"><tr><th className="p-3">Code</th><th className="p-3">Buyer</th><th className="p-3">Signed in as</th><th className="p-3">Order</th><th className="p-3">Last seen</th><th className="p-3"></th></tr></thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code} className={`border-t ${c.revoked ? 'opacity-40' : ''}`}>
                    <td className="p-3 font-mono">{c.code}</td>
                    <td className="p-3">{c.buyer_name || ''}<div className="text-xs text-black/50">{c.buyer_email}</div></td>
                    <td className="p-3">{c.attendee_email || <span className="text-black/40">not yet</span>}</td>
                    <td className="p-3">{c.order_ref || c.source}</td>
                    <td className="p-3 whitespace-nowrap">{c.last_seen_at ? formatWhen(c.last_seen_at, false) : '—'}</td>
                    <td className="p-3 whitespace-nowrap text-right"><button onClick={() => resend(c)} className="underline mr-3">Resend</button><button onClick={() => revoke(c)} className="underline">{c.revoked ? 'Restore' : 'Revoke'}</button></td>
                  </tr>
                ))}
                {!codes.length && <tr><td colSpan={6} className="p-6 text-center text-black/50">No codes yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-bold text-lg">Private seminar requests</h2>
        <div className="mt-3 grid gap-3">
          {requests.map((r) => (
            <div key={r.id} className="border rounded-2xl p-4 text-sm">
              <div className="flex justify-between flex-wrap gap-2"><p className="font-semibold">{r.name} · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> {r.phone && `· ${r.phone}`}</p><span className="text-xs rounded-full bg-black/5 px-2 py-1">{r.status}</span></div>
              <p className="text-black/70 mt-1">{r.topic}</p>
              <p className="text-black/50 mt-1">{(r.preferred_slots || []).map((s) => `${s.date} ${s.time || ''}`).join(' / ')} ({r.timezone}) · {r.attendees} people · kit: {r.wants_kit ? 'yes' : 'no'}{r.country ? ` · ${r.country}` : ''}</p>
              {r.notes && <p className="text-black/60 mt-1 italic">{r.notes}</p>}
              <div className="mt-2 flex gap-3">{['contacted', 'confirmed', 'declined'].map((st) => <button key={st} onClick={() => setRequestStatus(r, st)} className="underline">{st}</button>)}</div>
            </div>
          ))}
          {!requests.length && <p className="text-black/50 text-sm">No requests yet.</p>}
        </div>
      </section>
    </Shell>
  )
}

// ── Router ───────────────────────────────────────────────────────────────────
export default function SeminarsPage() {
  const session = useSeminarSession()
  useEffect(() => { document.title = 'Live online seminars | GEL.IT.UP' }, [])
  return (
    <Routes>
      <Route index element={<SeminarsHome session={session} />} />
      <Route path="login" element={<SignInPage session={session} />} />
      <Route path="my" element={<MySeminars session={session} />} />
      <Route path="room/:id" element={<Room session={session} />} />
      <Route path="private" element={<PrivateRequest session={session} />} />
      <Route path="admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/seminars" replace />} />
    </Routes>
  )
}
