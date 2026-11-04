import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
const BOOKING_CUTOFF_HOURS = 12
const CANCEL_HOURS = 24
const PRIVATE_CANCEL_HOURS = 48
const SHOP_URL = 'https://shop.gelitup.com'
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL || ''
const EMAIL_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

async function sendMail(to, subject, html, replyTo = 'info@gelitup.com') {
  if (!EMAIL_WEBHOOK_URL) return
  await fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: EMAIL_ANON_KEY, Authorization: `Bearer ${EMAIL_ANON_KEY}` }, body: JSON.stringify({ to, subject, html, from: 'GEL.IT.UP Seminars <info@gelitup.com>', replyTo }) }).catch(() => {})
}

const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
const writeToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } }

const escapeHtml = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

// All seminar times are shown on the 24-hour clock in EET (Greece / Bulgaria / Romania time).
const EET_ZONE = 'Europe/Athens'
const viewerZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || EET_ZONE } catch { return EET_ZONE } }
function zoneLabel(iso, tz = EET_ZONE) {
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(iso)).find((x) => x.type === 'timeZoneName')?.value || 'EET' } catch { return 'EET' }
}
const fmtDate = (iso, tz = EET_ZONE) => new Date(iso).toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
const fmtTime = (iso, tz = EET_ZONE) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
// "Mon 16 November 2026 · 18:00 EET"
const whenEET = (iso) => (iso ? `${fmtDate(iso)} · ${fmtTime(iso)} ${zoneLabel(iso)}` : '')
// Adds the viewer's own time when it differs, e.g. "(17:00 your time)".
function formatWhen(iso, withZone = true) {
  if (!iso) return ''
  const main = whenEET(iso)
  if (!withZone) return main
  const tz = viewerZone()
  const local = fmtTime(iso, tz)
  return local !== fmtTime(iso) ? `${main} (${local} your time)` : main
}

// 24-hour time picker (hours 00–23, minutes in 15-minute steps) — same on every device.
function Time24({ value, onChange, className = '' }) {
  const [h, m] = (value || '').split(':')
  const set = (nh, nm) => onChange(nh === '' ? '' : `${nh}:${nm || '00'}`)
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <select aria-label="Hour" value={h || ''} onChange={(e) => set(e.target.value, m)} className={`${inputCls} !w-auto`}>
        <option value="">hh</option>
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="font-bold">:</span>
      <select aria-label="Minutes" value={m || (h ? '00' : '')} onChange={(e) => set(h || '00', e.target.value)} className={`${inputCls} !w-auto`}>
        {['00', '15', '30', '45'].map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </span>
  )
}

// Time-zone helpers for private sessions: customers give times in their own zone.
const SEMINAR_SITE_URL = 'https://gelitup.com'
const PRIVATE_INBOX = 'seminars@gelitup.com'
function tzOffsetMs(ms, tz) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second) - ms
  } catch { return 0 }
}
// "2026-11-20" + "10:00" in "Europe/Rome" → ISO instant
function wallTimeToIso(date, time, tz) {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time || '00:00').split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0)
  let t = guess - tzOffsetMs(guess, tz || 'Europe/Athens')
  t = guess - tzOffsetMs(t, tz || 'Europe/Athens')
  return new Date(t).toISOString()
}
function whenIn(iso, tz) {
  if (!iso) return ''
  try { return `${fmtDate(iso, tz || EET_ZONE)} · ${fmtTime(iso, tz || EET_ZONE)}` } catch { return iso }
}
// Branded frame for seminar emails: logo, pink rule, soft footer.
function brandEmail(inner, footerNote = '') {
  return `<div style="background:#f4f1f2;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eadfe4">
    <div style="padding:22px 28px 14px;text-align:center"><img src="${SEMINAR_SITE_URL}/email/gelitup-logo-email.png" width="200" alt="GEL.IT.UP" style="display:inline-block;border:0;max-width:200px;height:auto" /></div>
    <div style="height:4px;background:${BRAND}"></div>
    <div style="padding:26px 28px 22px;color:#111;font-size:15px;line-height:1.55">${inner}</div>
    <div style="padding:16px 28px;background:#1a1a1a;color:#bbb;font-size:12px;text-align:center;line-height:1.6">
      <strong style="color:#fff;letter-spacing:2px">GEL.IT.UP SEMINARS</strong><br/>
      ${footerNote ? `${footerNote}<br/>` : ''}<a href="${SEMINAR_SITE_URL}/seminars" style="color:${BRAND};text-decoration:none">gelitup.com/seminars</a> · <a href="mailto:${PRIVATE_INBOX}" style="color:#bbb;text-decoration:none">${PRIVATE_INBOX}</a>
    </div>
  </div>
</div>`
}

const privatePayUrl = (variantId, email, requestId) => `${SHOP_URL}/cart/${variantId}:1?checkout[email]=${encodeURIComponent(email || '')}&attributes[private_request]=${encodeURIComponent(requestId)}`

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
function SeminarCard({ s, onBook }) {
  const soldOut = Boolean(s.sold_out)
  const past = Boolean(s.past)
  const closed = Boolean(s.closed) && !past
  // Recordings are only offered once the seminar has finished — never before.
  const recording = Boolean(s.recording_on_sale) && past
  const clickable = recording || (!soldOut && !past && !closed)
  const inner = (
    <>
      <div className="relative aspect-square bg-black/5 overflow-hidden rounded-2xl">
        {s.image_url
          ? <img src={s.image_url} alt={s.title} loading="lazy" className={`h-full w-full object-cover transition-transform duration-500 ${clickable ? 'group-hover:scale-[1.03]' : ''} ${(soldOut || past) && !recording ? 'grayscale-[60%] opacity-80' : ''}`} />
          : <div className="h-full w-full flex items-center justify-center text-black/30 text-sm p-6 text-center">Seminar image<br />1200 × 1500 px</div>}
        {soldOut && !past && !recording && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-12deg] border-4 border-white bg-black/80 px-6 py-2 text-2xl md:text-3xl font-black tracking-widest text-white shadow-xl">SOLD OUT</span>
          </div>
        )}
        {past && !recording && <span className="absolute top-3 left-3 rounded-full bg-black/80 text-white text-xs font-semibold px-3 py-1">Finished</span>}
        {recording && <span className="absolute top-3 left-3 rounded-full text-white text-xs font-semibold px-3 py-1" style={{ background: BRAND }}>▶ Recording available</span>}
      </div>
      <div className="pt-3 text-left">
        <p className="text-xs uppercase tracking-wider text-black/50">{formatWhen(s.starts_at, false)}</p>
        <h3 className="font-bold text-lg leading-snug">{s.title}</h3>
        {s.trainer_name && <p className="text-sm text-black/60">with {s.trainer_name}</p>}
        {!clickable && (
          <p className="mt-2 text-sm font-semibold text-gray-500">
            {past ? 'This seminar has finished' : soldOut ? 'Sold out — watch for the next date' : `Online booking closed ${BOOKING_CUTOFF_HOURS} hours before the start`}
          </p>
        )}
      </div>
    </>
  )
  const book = () => onBook({ ...s, mode: recording ? 'recording' : 'live' })
  const hasPrivate = s.private_price != null
  return (
    <div>
      {clickable
        ? <button type="button" onClick={book} className="group block w-full" aria-label={recording ? `Watch the recording of ${s.title}` : `Book ${s.title}`}>{inner}</button>
        : <div className="block cursor-default" aria-disabled="true">{inner}</div>}
      {(clickable || hasPrivate) && (
        <div className={`mt-3 grid gap-2 ${clickable && hasPrivate ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {clickable && (
            <button type="button" onClick={book} className="rounded-xl px-3 py-3 text-left text-white transition hover:opacity-90" style={{ background: BRAND }}>
              <span className="block text-[11px] font-bold uppercase tracking-wider opacity-80">{recording ? 'Recording' : 'Online group'}</span>
              <span className="block text-sm font-bold">{recording ? `Watch (${s.recording_days || 30} days) →` : 'Book your seat →'}</span>
            </button>
          )}
          {hasPrivate && (
            <Link to={`/seminars/private?seminar=${s.id}`} className="rounded-xl px-3 py-3 text-left transition hover:brightness-95" style={{ background: '#F9D3E6', color: '#9E1F63' }}>
              <span className="block text-[11px] font-bold uppercase tracking-wider opacity-80">Private session</span>
              <span className="block text-sm font-bold">{Math.round((s.private_minutes || 120) / 60 * 10) / 10} h 1-on-1 · Request →</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

const money = (n) => (n == null ? '' : `€${Number(n).toFixed(2)}`)

// Booking panel: seat + optional kit with its choices, then straight to Shopify checkout.
// Countries where the shop does not ship: the seminar kit comes from the local distributor.
// Fill in contact/email per country when known; until then buyers are pointed to info@gelitup.com.
const KIT_DISTRIBUTOR_COUNTRIES = {
  BG: { name: 'Bulgaria', contact: 'GEL.IT.UP Bulgaria', email: 'gelitup_prorofessional@abv.bg' },
  IT: { name: 'Italy', contact: 'GEL.IT.UP Italia', email: 'info@gelitup.it' },
}
const guessDistributorCountry = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz === 'Europe/Sofia') return 'BG'
    if (tz === 'Europe/Rome' || tz === 'Europe/Vatican' || tz === 'Europe/San_Marino') return 'IT'
  } catch { /* ignore */ }
  return ''
}

function BookingPanel({ seminar, onClose }) {
  const isRec = seminar.mode === 'recording'
  const recDays = seminar.recording_days || 30
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [withKit, setWithKit] = useState(false)
  const [kitCountry, setKitCountry] = useState(guessDistributorCountry)
  const [pickCountry, setPickCountry] = useState(false)
  const distributor = KIT_DISTRIBUTOR_COUNTRIES[kitCountry]
  const [choice, setChoice] = useState([])
  const [agreed, setAgreed] = useState(false)
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Prices are read in the visitor's own browser so Shopify returns her market's prices.
        const { data: row } = await supabase.from('seminars').select('sold_out, shopify_sku, shop_url, kit_url, recording_sku, recording_shop_url, recording_on_sale').eq('id', seminar.id).maybeSingle()
        if (!row) throw new Error('not found')
        const handle = (u) => (String(u || '').match(/\/products\/([^/?#]+)/) || [])[1]
        const load = async (u) => { const h = handle(u); if (!h) return null; const r = await fetch(`${SHOP_URL}/products/${h}.js`); return r.ok ? r.json() : null }
        if (isRec && !row.recording_on_sale) throw new Error('not on sale')
        // Recordings: the kit is suggested after watching, not at checkout.
        const [seatP, kitP] = await Promise.all([load(isRec ? row.recording_shop_url : row.shop_url), isRec ? null : load(row.kit_url)])
        const wantSku = String((isRec ? row.recording_sku : row.shopify_sku) || '').trim()
        const v = seatP?.variants?.find((x) => String(x.sku || '').trim() === wantSku)
        // Shopify's .js feed lists at most 250 variants. For bigger kits, add the missing
        // combinations from /seminars/kit-variants/<handle>.json; price and stock follow a
        // listed variant with the same last option (e.g. the forms choice).
        let optionImages = null
        let contents = null
        if (kitP?.variants?.length) {
          try {
            const extra = await fetch(`/seminars/kit-variants/${handle(row.kit_url)}.json`).then((r) => (r.ok ? r.json() : null))
            optionImages = extra?.optionImages || null
            contents = Array.isArray(extra?.contents) ? extra.contents : null
            const have = new Set(kitP.variants.map((x) => x.options.join('|')))
            const last = (opts) => opts[opts.length - 1]
            for (const ev of extra?.variants || []) {
              if (have.has(ev.options.join('|'))) continue
              const twin = kitP.variants.find((x) => last(x.options) === last(ev.options)) || kitP.variants[0]
              kitP.variants.push({ ...twin, id: ev.id, options: ev.options })
            }
          } catch { /* keep the listed variants */ }
        }
        const d = {
          soldOut: isRec ? false : Boolean(row.sold_out),
          seat: v ? { id: v.id, price: v.price / 100, available: v.available } : null,
          kit: kitP ? {
            options: (kitP.options || []).map((o) => ({ name: o.name, values: o.values })),
            images: optionImages,
            contents,
            variants: (kitP.variants || []).map((x) => ({ id: x.id, options: x.options, price: x.price / 100, compareAt: x.compare_at_price ? x.compare_at_price / 100 : null, available: x.available })),
          } : null,
          checkoutBase: `${SHOP_URL}/cart/`,
        }
        if (cancelled) return
        setData(d)
        setChoice((d.kit?.options || []).map((o) => o.values[0]))
      } catch {
        if (!cancelled) setError('Booking is not open yet for this seminar. Please check back soon.')
      }
    })()
    return () => { cancelled = true }
  }, [seminar.id, isRec])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const kitVariant = data?.kit?.variants?.find((v) => v.options.every((o, i) => o === choice[i]))
  const bookingClosed = !isRec && new Date(seminar.starts_at).getTime() - BOOKING_CUTOFF_HOURS * 3600000 < Date.now()
  const seatOk = data?.seat && data.seat.available && !data.soldOut && !bookingClosed
  const kitOn = withKit && !distributor
  const total = (seatOk ? data.seat.price * qty : 0) + (kitOn && kitVariant ? kitVariant.price * qty : 0)

  const checkout = () => {
    // Add to the shop cart (keeps anything already in it, e.g. a kit added earlier) and open
    // the cart, where the buyer can still remove or change items before paying.
    const items = [{ id: data.seat.id, quantity: qty }]
    if (withKit && kitVariant && !distributor) items.push({ id: kitVariant.id, quantity: qty })
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = `${SHOP_URL}/cart/add`
    const field = (name, value) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = name; i.value = String(value); form.appendChild(i) }
    items.forEach((it, n) => { field(`items[${n}][id]`, it.id); field(`items[${n}][quantity]`, it.quantity) })
    field('return_to', '/cart')
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`Book ${seminar.title}`} onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: BRAND }}>{isRec ? 'Watch the recording' : 'Book your seat'}</p>
            <h2 className="text-xl font-bold mt-1">{seminar.title}</h2>
            <p className="text-sm text-black/60">{isRec ? `Recorded on ${formatWhen(seminar.starts_at, false)}` : formatWhen(seminar.starts_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-2xl leading-none text-black/40 hover:text-black">×</button>
        </div>

        {seminar.description && <p className="mt-4 text-sm text-black/70 whitespace-pre-line max-h-48 overflow-y-auto pr-1">{seminar.description}</p>}
        {!data && !error && <p className="mt-6 text-black/40 text-sm">Loading…</p>}
        {error && <p className="mt-6 text-sm text-black/70">{error}</p>}
        {data && !seatOk && <p className="mt-6 text-sm text-black/70">{bookingClosed ? `Online booking closed ${BOOKING_CUTOFF_HOURS} hours before the start.` : data.soldOut ? 'This seminar is sold out.' : 'Booking is not open yet for this seminar. Please check back soon.'}</p>}

        {data && seatOk && (
          <>
            <div className="mt-6 flex items-center justify-between border rounded-xl p-4">
              <div>{isRec
                ? <><p className="font-semibold">Seminar recording</p><p className="text-sm text-black/60">Watch as often as you like for {recDays} days from purchase</p></>
                : <><p className="font-semibold">Live seminar seat</p><p className="text-sm text-black/60">Includes live Q&amp;A and 30-day replay</p></>}</div>
              <div className="text-right"><p className="font-semibold">{money(data.seat.price)}</p>
                <label className="text-xs text-black/60">{isRec ? 'Quantity' : 'Seats'}{' '}
                  <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="border rounded px-1 py-0.5 ml-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {qty > 1 && <p className="text-xs text-black/50 mt-1">Each {isRec ? 'one' : 'seat'} gets its own access code — forward one to each person.</p>}

            {data.kit && distributor && (
              <div className="mt-4 rounded-xl border border-[#D43790] bg-[#F9D3E6]/40 p-4 text-sm">
                <p className="font-semibold" style={{ color: '#9E1F63' }}>Seminar kit in {distributor.name}</p>
                <p className="mt-1 text-black/70">The shop does not deliver to {distributor.name} — the products used in the seminar are supplied by your local GEL.IT.UP distributor. Book your seat here and order the kit from them in good time before the seminar.</p>
                {data.kit.contents?.length > 0 && (
                  <div className="mt-3 rounded-lg bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9E1F63' }}>What's in the seminar kit</p>
                    <ul className="mt-1 list-disc pl-5 text-black/80">{data.kit.contents.map((c) => <li key={c}>{c}</li>)}</ul>
                    <p className="mt-1 text-xs text-black/50">Show this list to your distributor so you get exactly what the trainer uses.</p>
                  </div>
                )}
                <p className="mt-2 text-black/80">
                  {distributor.contact && <><strong>{distributor.contact}</strong>{distributor.email ? ' · ' : ''}</>}
                  {distributor.email
                    ? <a className="font-semibold underline" style={{ color: BRAND }} href={`mailto:${distributor.email}?subject=${encodeURIComponent(`Seminar kit: ${seminar.title}`)}`}>{distributor.email}</a>
                    : <>Email <a className="font-semibold underline" style={{ color: BRAND }} href={`mailto:info@gelitup.com?subject=${encodeURIComponent(`Seminar kit in ${distributor.name}: ${seminar.title}`)}`}>info@gelitup.com</a> and we will put you in touch with your distributor.</>}
                </p>
                <button type="button" className="mt-2 text-xs underline text-black/50" onClick={() => { setKitCountry(''); setPickCountry(false) }}>Not in {distributor.name}? Show the kit</button>
              </div>
            )}
            {data.kit && !distributor && (
              <p className="mt-4 text-xs text-black/50">
                Ordering from Bulgaria or Italy?{' '}
                {pickCountry
                  ? Object.entries(KIT_DISTRIBUTOR_COUNTRIES).map(([code, c]) => <button key={code} type="button" className="ml-1 font-semibold underline" style={{ color: BRAND }} onClick={() => { setKitCountry(code); setWithKit(false) }}>{c.name}</button>)
                  : <button type="button" className="font-semibold underline" style={{ color: BRAND }} onClick={() => setPickCountry(true)}>The kit comes from your local distributor →</button>}
              </p>
            )}
            {data.kit && !distributor && (
              <div className={`mt-2 border rounded-xl p-4 ${withKit ? 'border-[#D43790] bg-[#D43790]/[0.03]' : ''}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={withKit} onChange={(e) => setWithKit(e.target.checked)} className="mt-1" />
                  <span className="flex-1">
                    <span className="font-semibold block">Add the seminar kit{qty > 1 ? ` (×${qty})` : ''}</span>
                    <span className="text-sm text-black/60">All the products used in the seminar, shipped before the date. 15% off.</span>
                  </span>
                  {kitVariant && (
                    <span className="text-right shrink-0">
                      {kitVariant.compareAt > kitVariant.price && <span className="block text-base font-bold text-black/70 line-through decoration-2" style={{ textDecorationColor: BRAND }}>{money(kitVariant.compareAt)}</span>}
                      <span className="block text-lg font-extrabold" style={{ color: BRAND }}>{money(kitVariant.price)}</span>
                      {kitVariant.compareAt > kitVariant.price && <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: BRAND }}>You save {money(kitVariant.compareAt - kitVariant.price)}</span>}
                    </span>
                  )}
                </label>
                {withKit && (
                  <div className="mt-4 grid gap-3">
                    {data.kit.options.map((o, i) => (
                      <label key={o.name} className="block"><span className="text-sm font-medium">{o.name}</span>
                        {data.kit.images?.[o.name] ? (
                          <span className="mt-1 grid grid-cols-4 sm:grid-cols-5 gap-2">
                            {o.values.map((v) => {
                              const on = choice[i] === v
                              return (
                                <button type="button" key={v} onClick={() => setChoice((c) => c.map((x, j) => (j === i ? v : x)))} className="rounded-lg p-1 text-center border-2 transition" style={{ borderColor: on ? BRAND : 'transparent', background: on ? '#fdf2f8' : 'transparent' }} aria-pressed={on}>
                                  {data.kit.images[o.name][v] ? <img src={data.kit.images[o.name][v]} alt={v} loading="lazy" className="w-full aspect-square object-cover rounded-md bg-black/5" /> : <span className="block w-full aspect-square rounded-md bg-black/5" />}
                                  <span className="block text-[11px] leading-tight mt-1">{v}</span>
                                </button>
                              )
                            })}
                          </span>
                        ) : (
                          <select value={choice[i] || ''} onChange={(e) => setChoice((c) => c.map((v, j) => (j === i ? e.target.value : v)))} className={`${inputCls} mt-1`}>
                            {o.values.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        )}
                      </label>
                    ))}
                    {((kitVariant && !kitVariant.available) || !kitVariant) && <p className="text-sm text-red-600">This combination is currently unavailable — please choose another.</p>}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-black/60">Total{kitOn ? ' (shipping added at checkout)' : ''}</p>
              <p className="text-2xl font-bold">{money(total)}</p>
            </div>
            <div className="mt-5 rounded-xl bg-black/[0.03] p-4 text-xs text-black/70">
              <p className="font-semibold text-sm text-black">Booking terms — summary</p>
              {isRec ? (
                <ul className="mt-2 space-y-1.5 list-disc pl-4">
                  <li><strong>Payment</strong> is taken in full at checkout. Prices include VAT.</li>
                  <li>The recording is <strong>digital content</strong>: access starts as soon as your code arrives, for <strong>{recDays} days from purchase</strong>.</li>
                  <li><strong>No cancellation or refund</strong> once access has started (see the consent below). The {CANCEL_HOURS}-hour rule for live seats does not apply to recordings.</li>
                  <li>Your access code is <strong>personal and non-transferable</strong>, works on one device at a time, and may not be shared. Downloading, recording or redistributing the video is not allowed.</li>
                  <li>Participants must be 18 or older.</li>
                </ul>
              ) : (
              <ul className="mt-2 space-y-1.5 list-disc pl-4">
                <li><strong>Payment</strong> is taken in full at checkout. Prices include VAT.</li>
                <li><strong>Free cancellation</strong> with a full refund of the seat up to {CANCEL_HOURS} hours before the start, in My seminars. <strong>Within {CANCEL_HOURS} hours</strong> the seat cannot be cancelled or refunded, including if you do not attend.</li>
                <li>Your access code is <strong>personal and non-transferable</strong> once used, works on one device at a time, and may not be shared. Recording or redistributing the seminar is not allowed.</li>
                <li>Replay access for {30} days after the seminar. Participants must be 18 or older.</li>
                {kitOn && <li>The kit is a physical product: normal 14-day right of withdrawal and shop returns policy apply; it is not refunded automatically when a seat is cancelled.</li>}
              </ul>
              )}
              <a href="/seminars/terms" target="_blank" rel="noopener" className="inline-block mt-2 underline" style={{ color: BRAND }}>Read the full seminar terms &amp; conditions</a>
              <label className="mt-3 flex items-start gap-2 text-sm text-black cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                <span>I have read and agree to the seminar terms &amp; conditions.</span>
              </label>
              <label className="mt-2 flex items-start gap-2 text-sm text-black cursor-pointer">
                <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-0.5" />
                <span>{isRec
                  ? 'I ask for access to the recording to start immediately, within the 14-day withdrawal period. I understand that I lose my right of withdrawal once access has started, so the recording cannot be cancelled or refunded.'
                  : `I ask for the seminar to be provided on the booked date and for access to the recording to start after it, even if this is within the 14-day withdrawal period. I understand that I lose my right of withdrawal once the seminar has been provided and the recording made available, and that cancellations follow the ${CANCEL_HOURS}-hour rule above.`}</span>
              </label>
            </div>
            <Button type="button" onClick={checkout} disabled={!agreed || !consented || (kitOn && (!kitVariant || !kitVariant.available))} className="w-full mt-4">Continue to your cart →</Button>
            {(!agreed || !consented) && <p className="text-xs text-black/50 mt-2 text-center">Please tick both boxes to continue.</p>}
            <p className="text-xs text-black/50 mt-3 text-center">You can check or change your items in the cart, then pay securely with Shopify. Your access code is emailed straight after payment.</p>
          </>
        )}
      </div>
    </div>
  )
}

function SeminarsHome({ session }) {
  const [seminars, setSeminars] = useState(null)
  const [booking, setBooking] = useState(null)
  const closeBooking = useCallback(() => setBooking(null), [])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!hasSupabaseConfig) { setSeminars([]); return }
      const since = new Date(Date.now() - 2 * 86400000).toISOString()
      const { data } = await supabase.from('seminars')
        .select('id, title, description, trainer_name, starts_at, duration_minutes, sold_out, image_url, status, kind, recording_on_sale, recording_days, private_price, private_minutes')
        .eq('kind', 'group').in('status', ['scheduled', 'ended']).or(`starts_at.gte.${since},recording_on_sale.eq.true`).order('starts_at')
      const now = Date.now()
      const rows = (data || []).map((s) => ({ ...s, past: new Date(s.starts_at).getTime() + s.duration_minutes * 60000 < now, closed: new Date(s.starts_at).getTime() - BOOKING_CUTOFF_HOURS * 3600000 < now }))
      if (cancelled) return
      setSeminars(rows)
      // gelitup.com/seminars?book=<seminar id> opens that seminar's booking panel (used by the kit page link).
      const want = new URLSearchParams(window.location.search).get('book')
      const hit = want && rows.find((r) => r.id === want && ((!r.past && !r.closed && !r.sold_out) || (r.past && r.recording_on_sale)))
      if (hit) setBooking({ ...hit, mode: hit.past && hit.recording_on_sale ? 'recording' : 'live' })
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <Shell wide>
      <SubNav signedIn={session.signedIn} />
      <header className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: BRAND }}>GEL.IT.UP Education</p>
        <h1 className="text-3xl md:text-5xl font-bold mt-2">Live online seminars</h1>
        <p className="mt-4 text-black/60">Learn live from GEL.IT.UP trainers, ask your questions in the live Q&amp;A, and rewatch the recording for 30 days.{seminars?.some((x) => x.past && x.recording_on_sale) ? ' Missed one? Many seminars are also available as a recording.' : ''}</p>
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
          {seminars.map((s) => <SeminarCard key={s.id} s={s} onBook={setBooking} />)}
        </div>
      )}

      <section className="mt-14 grid gap-4 md:grid-cols-3 text-sm">
        {[
          ['1. Book', 'Click a seminar, add the seminar kit if you want the products, and pay securely.'],
          ['2. Get your code', 'Your personal access code arrives by email straight after payment.'],
          ['3. Join live', 'Sign in here with your email and code, on your phone, tablet or computer. Nothing to install.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border p-5"><p className="font-bold">{t}</p><p className="text-black/60 mt-1">{d}</p></div>
        ))}
      </section>
      <p className="text-center mt-8 text-sm text-black/60">Already booked? <Link to="/seminars/login" className="font-semibold underline" style={{ color: BRAND }}>Sign in with your access code</Link></p>
      {booking && <BookingPanel seminar={booking} onClose={closeBooking} />}
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
        <p className="text-sm mt-6 text-center">Are you a trainer? <Link to="/seminars/trainer" className="font-semibold underline" style={{ color: BRAND }}>Trainer login →</Link></p>
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
  const [confirming, setConfirming] = useState(null)
  const [cancelled, setCancelled] = useState(null)
  useEffect(() => { const id = setInterval(() => { if (!cancelled) session.refresh() }, 60000); return () => clearInterval(id) }, [session, cancelled])

  const cancel = async (s) => {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.rpc('seminar_cancel', { p_token: session.token, p_seminar_id: s.id })
    setBusy(false); setConfirming(null)
    if (error || !data?.ok) {
      setMsg(data?.error === 'too_late' ? 'Cancellations close 24 hours before the seminar starts, so this booking can no longer be cancelled or refunded.' : 'The booking could not be cancelled. Please contact info@gelitup.com.')
      return
    }
    const when = formatWhen(s.starts_at)
    const orders = (data.orders || []).join(', ')
    await Promise.all([
      sendMail('info@gelitup.com', `Seminar cancellation — refund due (${orders})`,
        `<h2>Seminar cancellation — please refund</h2><p><strong>${escapeHtml(s.title)}</strong><br/>${escapeHtml(when)}</p><p>Attendee: <strong>${escapeHtml(data.email)}</strong><br/>Seats cancelled: <strong>${data.seats}</strong><br/>Shopify order(s): <strong>${escapeHtml(orders)}</strong></p><p>The attendee cancelled more than 24 hours before the start. Please refund the seminar seat(s) in Shopify (the seminar kit follows the normal returns policy). Then mark the code(s) as refunded in gelitup.com/seminars/admin.</p>`,
        data.email),
      sendMail(data.email, `Your seminar booking is cancelled — ${s.title}`,
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><p style="color:${BRAND};font-weight:bold;letter-spacing:2px;font-size:12px">GEL.IT.UP LIVE SEMINAR</p><h1 style="font-size:20px">Your booking is cancelled</h1><p>Your seat${data.seats > 1 ? 's' : ''} for <strong>${escapeHtml(s.title)}</strong> (${escapeHtml(when)}) ${data.seats > 1 ? 'have' : 'has'} been cancelled and your access code no longer works.</p><p>Your refund for the seminar seat will be processed to your original payment method, usually within 5–10 working days.</p><p style="font-size:13px;color:#555">Questions? Just reply to this email.</p></div>`),
    ])
    setCancelled({ title: s.title, seats: data.seats })
  }

  if (cancelled) {
    return (
      <Shell>
        <SubNav signedIn={false} />
        <div className="border rounded-2xl p-8 text-center">
          <p className="text-xl font-bold">Your booking is cancelled</p>
          <p className="text-black/60 mt-2">{cancelled.seats > 1 ? `Your ${cancelled.seats} seats` : 'Your seat'} for {cancelled.title} {cancelled.seats > 1 ? 'have' : 'has'} been cancelled. Your refund will be processed to your original payment method, usually within 5–10 working days. A confirmation email is on its way.</p>
          <Link to="/seminars" onClick={() => session.refresh()} className="inline-block mt-6 underline" style={{ color: BRAND }}>Back to seminars</Link>
        </div>
      </Shell>
    )
  }

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
              {s.image_url && <img src={s.image_url} alt="" className="w-16 h-16 object-cover rounded-lg hidden sm:block" />}
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${cls}`} style={s.phase === 'live' ? { background: BRAND } : undefined}>{label}</span>
                <h2 className="font-bold mt-1">{s.title}</h2>
                <p className="text-sm text-black/60">{formatWhen(s.starts_at)}</p>
                {(s.phase === 'replay' || s.phase === 'replay_pending') && <p className="text-xs text-black/50 mt-1">{s.access_type === 'recording' ? 'Recording' : 'Replay'} open until {formatWhen(s.replay_until, false)}</p>}
                {s.phase === 'upcoming' && s.can_cancel && confirming !== s.id && (
                  <button type="button" onClick={() => setConfirming(s.id)} className="text-xs text-black/60 underline mt-2">Cancel my booking (free until {formatWhen(s.cancel_until, false)})</button>
                )}
                {s.phase === 'upcoming' && s.can_cancel && confirming === s.id && (
                  <div className="mt-3 rounded-xl bg-black/[0.04] p-3 text-sm">
                    <p>Cancel {s.my_seats > 1 ? `your ${s.my_seats} seats` : 'your seat'} and get a refund for the seminar? Your access code will stop working.</p>
                    <div className="mt-2 flex gap-3">
                      <button type="button" disabled={busy} onClick={() => cancel(s)} className="rounded-lg px-3 py-1.5 text-white font-semibold disabled:opacity-50" style={{ background: BRAND }}>{busy ? 'Cancelling…' : 'Yes, cancel'}</button>
                      <button type="button" onClick={() => setConfirming(null)} className="underline">Keep my booking</button>
                    </div>
                  </div>
                )}
                {s.phase === 'upcoming' && !s.can_cancel && s.status === 'scheduled' && (
                  <p className="text-xs text-black/50 mt-2">Cancellations closed 24 hours before the start — this booking can no longer be refunded.</p>
                )}
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
      </form>
      {msg && <p className="text-sm mt-4 text-black/70">{msg}</p>}
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

// ── Live stream (Cloudflare) + our own chat / Q&A ───────────────────────────
const STREAM_FN = '/.netlify/functions/seminar-stream'
async function streamCall(payload, withAuth = false) {
  const headers = { 'Content-Type': 'application/json' }
  if (withAuth) {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`
  }
  const res = await fetch(STREAM_FN, { method: 'POST', headers, body: JSON.stringify(payload) })
  return res.json().catch(() => ({ error: 'bad_response' }))
}

// Signed player: live while the seminar is on, the recording afterwards.
// Live: the page asks every few seconds whether the trainer is on air, shows "waiting" until she is,
// and switches to the new broadcast by itself if her connection drops and comes back.
function CfPlayer({ seminarId, token = '', staffMode = '', title = 'Seminar' }) {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let alive = true
    let timer = null
    const load = async () => {
      const r = await streamCall(token ? { action: 'play', seminar_id: seminarId, token } : { action: 'play', seminar_id: seminarId, mode: staffMode }, !token)
      if (!alive) return
      // Keep the same player (no reload) while the same broadcast is on air.
      setState((prev) => (r?.uid && prev.uid === r.uid ? prev : { loading: false, ...r }))
      const next = r?.mode === 'live' ? (r.waiting ? 8000 : 20000) : 30 * 60000
      timer = setTimeout(load, next)
    }
    load()
    return () => { alive = false; clearTimeout(timer) }
  }, [seminarId, token, staffMode])
  const box = 'relative aspect-video rounded-2xl overflow-hidden bg-black'
  if (state.loading) return <div className={`${box} flex items-center justify-center text-white/60 text-sm`}>Loading the player…</div>
  if (state.waiting) return <div className={`${box} flex flex-col items-center justify-center text-center p-6 text-white`}><span className="h-3 w-3 rounded-full animate-pulse" style={{ background: BRAND }} /><p className="mt-3 font-semibold">Waiting for the trainer to go live…</p><p className="mt-1 text-sm text-white/60">The picture appears here by itself — no need to refresh.</p></div>
  if (state.pending) return <div className={`${box} flex items-center justify-center text-center p-6 text-white`}>The recording is being prepared — it usually takes a few minutes after the seminar ends. Please check back soon.</div>
  if (!state.url) return <div className={`${box} flex items-center justify-center text-center p-6 text-white/80 text-sm`}>{state.error === 'stream_not_configured' ? 'The stream is not set up yet.' : state.error === 'no_stream' ? 'No stream has been created for this seminar yet.' : 'The player could not be loaded. Please refresh the page.'}</div>
  return <div className={box}><iframe key={state.uid || state.url} title={title} src={`${state.url}?autoplay=true&letterboxColor=transparent`} className="absolute inset-0 h-full w-full border-0" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
}

const NAME_KEY = 'giup_seminar_chat_name'
const timeHM = (iso) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: EET_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

function ChatList({ messages, staff = false, onModerate }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [messages.length])
  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-3 grid content-start gap-2 text-sm min-h-[260px] max-h-[460px]">
      {messages.length === 0 && <p className="text-black/40 text-center mt-6">No messages yet — say hello!</p>}
      {messages.map((m) => (
        <div key={m.id} className={`rounded-xl px-3 py-2 ${m.hidden ? 'opacity-40' : ''} ${m.role !== 'attendee' ? 'bg-[#F9D3E6]' : m.is_question ? 'bg-amber-50 border border-amber-200' : 'bg-black/[0.04]'}`}>
          <p className="text-[11px] text-black/50">
            <strong className={m.role !== 'attendee' ? 'text-[#9E1F63]' : 'text-black/70'}>{m.author}{m.role === 'trainer' ? ' · Trainer' : m.role === 'team' ? ' · GEL.IT.UP' : ''}</strong>
            {' · '}{timeHM(m.at)}{m.is_question ? ' · ❓ Question' : ''}{m.answered ? ' · ✓ answered' : ''}{staff && m.email ? ` · ${m.email}` : ''}
          </p>
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
          {staff && m.role === 'attendee' && (
            <p className="mt-1 flex gap-3 text-[11px]">
              {m.is_question && <button type="button" className="underline" onClick={() => onModerate(m.id, { p_answered: !m.answered })}>{m.answered ? 'Mark unanswered' : 'Mark answered'}</button>}
              <button type="button" className="underline" onClick={() => onModerate(m.id, { p_hidden: !m.hidden })}>{m.hidden ? 'Show again' : 'Hide'}</button>
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function useChatPoll(fetcher, deps) {
  const [messages, setMessages] = useState([])
  const [ok, setOk] = useState(true)
  const reload = useCallback(async () => {
    const r = await fetcher(0)
    if (r?.ok) { setMessages(r.messages || []); setOk(true) } else setOk(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    reload()
    const t = setInterval(reload, 3000)
    return () => clearInterval(t)
  }, [reload])
  return { messages, ok, reload }
}

function RoomChat({ seminarId, token }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } })
  const [text, setText] = useState('')
  const [question, setQuestion] = useState(false)
  const [err, setErr] = useState('')
  const { messages, ok, reload } = useChatPoll(async () => (await supabase.rpc('seminar_chat_list', { p_token: token, p_seminar: seminarId, p_after: 0 })).data, [seminarId, token])
  const send = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    try { localStorage.setItem(NAME_KEY, name) } catch { /* ignore */ }
    const { data } = await supabase.rpc('seminar_chat_post', { p_token: token, p_seminar: seminarId, p_name: name, p_body: text, p_question: question })
    if (data?.ok) { setText(''); setQuestion(false); setErr(''); reload() } else setErr(data?.error === 'slow' ? 'One moment — wait a second between messages.' : 'The chat is closed right now.')
  }
  return (
    <div className="rounded-2xl border overflow-hidden flex flex-col">
      <p className="px-4 py-3 border-b font-semibold text-sm">Questions &amp; chat</p>
      {ok ? <ChatList messages={messages} /> : <p className="p-4 text-sm text-black/50">The chat opens 30 minutes before the start.</p>}
      {ok && (
        <form onSubmit={send} className="border-t p-3 grid gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" maxLength={40} className={`${inputCls} !py-1.5 text-sm`} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder={question ? 'Type your question for the trainer…' : 'Write a message…'} className={`${inputCls} !py-1.5 text-sm`} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e) }} />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={question} onChange={(e) => setQuestion(e.target.checked)} /> This is a question for the trainer</label>
            <button type="submit" className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white" style={{ background: BRAND }}>Send</button>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </form>
      )}
    </div>
  )
}

function StaffChat({ seminarId, defaultName }) {
  const [text, setText] = useState('')
  const [onlyQ, setOnlyQ] = useState(false)
  const { messages, ok, reload } = useChatPoll(async () => (await supabase.rpc('seminar_chat_staff_list', { p_seminar: seminarId, p_after: 0 })).data, [seminarId])
  const moderate = async (id, patch) => { await supabase.rpc('seminar_chat_moderate', { p_id: id, p_answered: null, p_hidden: null, ...patch }); reload() }
  const send = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.rpc('seminar_chat_staff_post', { p_seminar: seminarId, p_name: defaultName || 'GEL.IT.UP', p_body: text })
    setText(''); reload()
  }
  if (!ok) return null
  const open = messages.filter((m) => m.is_question && !m.answered && !m.hidden).length
  const shown = onlyQ ? messages.filter((m) => m.is_question || m.role !== 'attendee') : messages
  return (
    <div className="rounded-2xl border overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">Questions &amp; chat{open ? <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: BRAND }}>{open} open</span> : null}</span>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyQ} onChange={(e) => setOnlyQ(e.target.checked)} /> Questions only</label>
      </div>
      <ChatList messages={shown} staff onModerate={moderate} />
      <form onSubmit={send} className="border-t p-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to everyone…" className={`${inputCls} !py-1.5 text-sm`} />
        <button type="submit" className="rounded-lg px-4 text-sm font-semibold text-white" style={{ background: BRAND }}>Send</button>
      </form>
    </div>
  )
}

function CopyField({ label, value, secret = false }) {
  const [show, setShow] = useState(!secret)
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="text-xs font-semibold text-black/60">{label}</p>
      <div className="mt-1 flex gap-2">
        <input readOnly value={show ? value || '' : '••••••••••••••••••••'} className={`${inputCls} !py-1.5 font-mono text-xs`} />
        {secret && <button type="button" onClick={() => setShow(!show)} className="rounded-lg border px-3 text-xs">{show ? 'Hide' : 'Show'}</button>}
        <button type="button" onClick={() => { navigator.clipboard?.writeText(value || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="rounded-lg px-3 text-xs font-semibold text-white" style={{ background: BRAND }}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  )
}

// Trainer / team: OBS settings, a preview of what attendees see, and the Q&A.
function StaffStream({ seminar }) {
  const [settings, setSettings] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [view, setView] = useState('')
  const load = useCallback(async () => {
    const { data } = await supabase.rpc('seminar_stream_settings', { p_seminar: seminar.id })
    setSettings(data?.ok ? data : { has_stream: false })
  }, [seminar.id])
  // Reads the stream settings from the database when the card opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])
  const create = async () => {
    setBusy(true); setErr('')
    const r = await streamCall({ action: 'create', seminar_id: seminar.id }, true)
    setBusy(false)
    if (r?.ok) load(); else setErr(r?.error === 'stream_not_configured' ? 'Cloudflare is not connected yet (CF_ACCOUNT_ID / CF_STREAM_API_TOKEN in Netlify).' : r?.message || 'Could not create the stream.')
  }
  if (!settings) return null
  return (
    <div className="mt-4 rounded-2xl bg-black/[0.03] p-4">
      <p className="font-semibold">Live stream (OBS)</p>
      {!settings.has_stream ? (
        <div className="mt-2">
          <p className="text-sm text-black/60">No stream yet. Create it once — the same settings work for the test and the live seminar.</p>
          <button type="button" disabled={busy} onClick={create} className="mt-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: BRAND }}>{busy ? 'Creating…' : 'Create the live stream'}</button>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </div>
      ) : (
        <div className="mt-2 grid gap-3">
          <p className="text-sm text-black/60">In OBS: <strong>Settings → Stream</strong> → Service <strong>Custom…</strong>, then paste these two. Keep the stream key private.</p>
          <CopyField label="Server" value={settings.server} />
          <CopyField label="Stream key" value={settings.key} secret />
          <p className="text-xs text-black/50">Everything you stream is recorded automatically and becomes the attendees' replay. <Link to="/seminars/obs-guide" className="underline" style={{ color: BRAND }}>OBS step-by-step guide →</Link></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setView(view === 'live' ? '' : 'live')} className="rounded-xl px-4 py-2 text-sm font-bold border" style={{ borderColor: BRAND, color: BRAND }}>{view === 'live' ? 'Hide preview' : 'Preview what attendees see'}</button>
            <button type="button" onClick={() => setView(view === 'replay' ? '' : 'replay')} className="rounded-xl px-4 py-2 text-sm font-bold border">{view === 'replay' ? 'Hide recording' : 'Watch the recording'}</button>
          </div>
          {view && (
            <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
              <CfPlayer key={view} seminarId={seminar.id} staffMode={view} title={`${seminar.title} preview`} />
              <StaffChat seminarId={seminar.id} defaultName={seminar.trainer_name} />
            </div>
          )}
        </div>
      )}
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
          {s.cf_stream ? <CfPlayer seminarId={s.id} token={session.token} title={s.title} /> : s.live_embed_url
            ? <div className="relative aspect-video rounded-2xl overflow-hidden bg-black"><iframe title={s.title} src={s.live_embed_url} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
            : <div className="aspect-video rounded-2xl bg-black text-white flex items-center justify-center text-center p-6">The stream will appear here in a moment — the page refreshes automatically.</div>}
          {s.cf_stream ? <RoomChat seminarId={s.id} token={session.token} /> : <div className="rounded-2xl border overflow-hidden min-h-[420px] lg:min-h-0 flex flex-col">
            <p className="px-4 py-3 border-b font-semibold text-sm">Questions &amp; chat</p>
            {s.chat_embed_url
              ? <iframe title="Seminar Q&A" src={s.chat_embed_url} className="flex-1 w-full min-h-[380px]" />
              : <p className="p-4 text-sm text-black/50">The Q&amp;A opens when the seminar starts.</p>}
          </div>}
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
          {s.cf_stream ? <CfPlayer seminarId={s.id} token={session.token} title={`${s.title} replay`} /> : <div className="relative aspect-video rounded-2xl overflow-hidden bg-black"><iframe title={`${s.title} replay`} src={s.replay_embed_url} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>}
          <p className="text-sm text-black/60 mt-3">{s.access_type === 'recording' ? 'Recording' : 'Replay'} available until {formatWhen(s.replay_until, false)}.</p>
          {s.kit_url && (
            <a href={s.kit_url} className="mt-6 flex items-center gap-4 rounded-2xl border p-5 hover:border-[#D43790] transition-colors">
              <span className="text-3xl" aria-hidden="true">💅</span>
              <span className="flex-1"><span className="block font-bold">Ready to try it yourself?</span><span className="block text-sm text-black/60">Get all the products used in this seminar in one kit — 15% off the products bought separately.</span></span>
              <span className="shrink-0 font-semibold" style={{ color: BRAND }}>Shop the kit →</span>
            </a>
          )}
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
  // /seminars/private?seminar=<id> = a private 1-on-1 session of a listed seminar, at its fixed price.
  const [seminarId] = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('seminar')))
  const [seminar, setSeminar] = useState(null)
  useEffect(() => {
    if (!seminarId || !hasSupabaseConfig) return
    supabase.from('seminars').select('id, title, trainer_name, trainer_email, private_price, private_minutes').eq('id', seminarId).maybeSingle()
      .then(({ data }) => { if (data?.private_price != null) setSeminar(data) })
  }, [seminarId])
  const hours = seminar ? Math.round((seminar.private_minutes || 120) / 60 * 10) / 10 : 0
  const tz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } }, [])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setSlot = (i, k) => (e) => setForm((f) => ({ ...f, slots: f.slots.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)) }))

  const submit = async (e) => {
    e.preventDefault(); setState('sending')
    const slots = form.slots.filter((s) => s.date).map((s) => ({ ...s, tz: EET_ZONE }))
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined
    const record = { id, name: form.name, email: form.email.trim().toLowerCase(), phone: form.phone, country: form.country, timezone: tz, preferred_slots: slots, topic: seminar ? `Private 1-on-1: ${seminar.title} (€${Number(seminar.private_price).toFixed(0)}, ${hours} h)${form.topic ? ` — ${form.topic}` : ''}` : form.topic, attendees: seminar ? 1 : Number(form.attendees) || 1, wants_kit: form.wants_kit, notes: form.notes, seminar_id: seminar?.id || null }
    const { error } = await supabase.from('seminar_private_requests').insert(record)
    if (error) { setState('error'); return }
    if (EMAIL_WEBHOOK_URL) {
      const rows = [['Name', record.name], ['Email', record.email], ['Phone', record.phone], ['Country', record.country], ['Time zone', tz], ['People', record.attendees], ['Kit', record.wants_kit ? 'Yes' : 'No'], ['Topic', record.topic], ['Notes', record.notes]]
      const replyUrl = id ? `${SEMINAR_SITE_URL}/seminars/admin/private/${id}` : `${SEMINAR_SITE_URL}/seminars/admin`
      const slotRows = slots.map((sl, i) => {
        const iso = sl.time ? wallTimeToIso(sl.date, sl.time, sl.tz || tz) : null
        const theirs = iso && tz && fmtTime(iso, tz) !== fmtTime(iso) ? `<br/><span style="color:#666">${escapeHtml(fmtTime(iso, tz))} their time (${escapeHtml(tz)})</span>` : ''
        return `<tr><td style="padding:8px 12px 8px 0">${iso ? `<strong>${escapeHtml(whenEET(iso))}</strong>${theirs}` : `${escapeHtml(sl.date)} (no time given)`}</td><td style="padding:8px 0"><a href="${replyUrl}?slot=${i}" style="background:${BRAND};color:#fff;padding:9px 14px;border-radius:8px;text-decoration:none;font-weight:bold;white-space:nowrap">✓ Agree this time</a></td></tr>`
      }).join('')
      const html = brandEmail(`<div>
        <h2 style="margin:0 0 4px">${seminar ? 'Private 1-on-1 request' : 'Private seminar request'}</h2>
        ${seminar ? `<p style="margin:0 0 14px;color:#444">${escapeHtml(seminar.title)} · ${hours} hours · €${Number(seminar.private_price).toFixed(0)}</p>` : ''}
        <table style="font-size:14px">${rows.filter(([, v]) => v !== '' && v != null).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}</table>
        <h3 style="margin:20px 0 4px">Preferred times — click the one you agree</h3>
        <table style="font-size:14px">${slotRows}</table>
        <p style="margin:18px 0"><a href="${replyUrl}" style="color:${BRAND};font-weight:bold">Reply with another time or a comment →</a></p>
        <p style="font-size:12px;color:#777">Each button opens the reply page (trainer or seminar-team sign-in needed), where you can add a comment for the client and send the confirmation with the €${seminar ? Number(seminar.private_price).toFixed(0) : ''} payment link.</p>
      </div>`, 'Internal notification — private session request')
      const inboxes = [PRIVATE_INBOX, ...(seminar?.trainer_email && seminar.trainer_email.toLowerCase() !== PRIVATE_INBOX ? [seminar.trainer_email] : [])]
      inboxes.forEach((to) => fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: EMAIL_ANON_KEY, Authorization: `Bearer ${EMAIL_ANON_KEY}` }, body: JSON.stringify({ to, subject: seminar ? `Private 1-on-1 request — ${seminar.title} — ${record.name}` : `Private seminar request — ${record.name}`, html, from: 'GEL.IT.UP Seminars <info@gelitup.com>', replyTo: record.email }) }).catch(() => {}))
    }
    setState('done')
  }

  return (
    <Shell>
      <SubNav signedIn={session.signedIn} />
      <h1 className="text-3xl font-bold text-center">{seminar ? 'Private 1-on-1 session' : 'Private seminar'}</h1>
      {seminar ? (
        <div className="text-center mt-2 max-w-xl mx-auto">
          <p className="text-lg font-semibold">{seminar.title}</p>
          <p className="text-black/60 mt-1">{hours} hours, live online, just you and {seminar.trainer_name || 'the trainer'} · <strong style={{ color: BRAND }}>€{Number(seminar.private_price).toFixed(0)}</strong> for one person</p>
          <p className="text-sm text-black/60 mt-3">Send us 2–3 dates and times that suit you. We'll confirm one with the trainer and email you a payment link — your session is booked once it's paid. Free cancellation up to {PRIVATE_CANCEL_HOURS} hours before the start; after that it can't be refunded. <Link to="/seminars/terms" className="underline" style={{ color: BRAND }}>Booking terms</Link></p>
        </div>
      ) : (
        <p className="text-center text-black/60 mt-2 max-w-xl mx-auto">A live session for you, your salon or your academy, at a date and time that suits you. Tell us what you'd like and we'll confirm with the trainer and send you a payment link.</p>
      )}
      {state === 'done' ? (
        <div className="mt-8 border rounded-2xl p-8 text-center"><p className="text-xl font-bold">Thank you — request received.</p><p className="text-black/60 mt-2">We'll check availability with our trainer and email you within 2 working days.</p></div>
      ) : (
        <form onSubmit={submit} className="mt-8 border rounded-2xl p-6 md:p-8 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">Name *</span><input required value={form.name} onChange={set('name')} className={`${inputCls} mt-1`} /></label>
          <label className="block"><span className="text-sm font-medium">Email *</span><input required type="email" value={form.email} onChange={set('email')} className={`${inputCls} mt-1`} /></label>
          <label className="block"><span className="text-sm font-medium">Phone</span><input value={form.phone} onChange={set('phone')} className={`${inputCls} mt-1`} /></label>
          <label className="block"><span className="text-sm font-medium">Country</span><input value={form.country} onChange={set('country')} className={`${inputCls} mt-1`} /></label>
          <label className="block md:col-span-2"><span className="text-sm font-medium">{seminar ? 'Anything you would like to focus on?' : 'What would you like to learn? *'}</span><textarea required={!seminar} rows={3} value={form.topic} onChange={set('topic')} className={`${inputCls} mt-1`} placeholder={seminar ? 'Optional' : 'e.g. Builder gel structure and apex, almond shape'} /></label>
          <div className="md:col-span-2">
            <p className="text-sm font-medium">Preferred dates &amp; times — <span style={{ color: BRAND }}>in EET (Greece / Bulgaria / Romania time), 24-hour clock</span></p>
            {tz && fmtTime(new Date().toISOString(), tz) !== fmtTime(new Date().toISOString()) && <p className="text-xs text-black/50">Your own time zone is {tz} — we show your local time next to each choice.</p>}
            <p className="mt-1 rounded-lg bg-[#D43790]/5 px-3 py-2 text-xs text-black/70"><strong>Need the products?</strong> If you'd like the seminar kit, choose dates that leave enough time for it to reach you — delivery time depends on your country. We'll also check this when we confirm your date.</p>
            <div className="mt-1 grid gap-2">
              {form.slots.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input type="date" required={i === 0} value={s.date} onChange={setSlot(i, 'date')} className={`${inputCls} !w-auto`} />
                  <Time24 value={s.time} onChange={(v) => setForm((f) => ({ ...f, slots: f.slots.map((x, j) => (j === i ? { ...x, time: v } : x)) }))} />
                  <span className="text-sm font-semibold">EET</span>
                  {s.date && s.time && fmtTime(wallTimeToIso(s.date, s.time, EET_ZONE), tz) !== s.time && <span className="text-xs text-black/50">= {fmtTime(wallTimeToIso(s.date, s.time, EET_ZONE), tz)} your time</span>}
                </div>
              ))}
            </div>
          </div>
          {!seminar && <label className="block"><span className="text-sm font-medium">Number of people</span><input type="number" min={1} max={100} value={form.attendees} onChange={set('attendees')} className={`${inputCls} mt-1`} /></label>}
          <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.wants_kit} onChange={set('wants_kit')} /> <span className="text-sm">I'd like the seminar kit (products) too <span className="text-black/50">— delivered to you before the session</span></span></label>
          <label className="block md:col-span-2"><span className="text-sm font-medium">Anything else?</span><textarea rows={2} value={form.notes} onChange={set('notes')} className={`${inputCls} mt-1`} /></label>
          {state === 'error' && <p className="text-sm text-red-600 md:col-span-2">Sorry, the request could not be sent. Please try again or email seminars@gelitup.com.</p>}
          <div className="md:col-span-2"><Button type="submit" disabled={state === 'sending'} className="w-full">{state === 'sending' ? 'Sending…' : 'Send request'}</Button></div>
        </form>
      )}
    </Shell>
  )
}

// After any emailed link (first-time setup or password reset) the account is marked as
// verified; ?setpw=1 / ?reset=1 then asks for a password.
async function seminarAuthStep() {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) return 'signin'
  await supabase.rpc('seminar_mark_verified')
  const q = new URLSearchParams(window.location.search)
  if (q.get('setpw') || q.get('reset')) return 'newpass'
  return 'ok'
}

// ── Seminar admin sign-in (seminar team accounts, e.g. seminars@gelitup.com) ─
// Access is granted only to emails listed in seminar_admins (or B2B admins) — it gives
// the seminar admin pages only, not the B2B portal.
function SeminarAdminSignIn({ initialMode = 'signin', signInTitle = 'Seminar team sign-in', kicker = 'GEL.IT.UP Seminars' }) {
  const [mode, setMode] = useState(initialMode) // signin | create | forgot | newpass
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [signedInAs, setSignedInAs] = useState('')

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined
    supabase.auth.getSession().then(({ data }) => setSignedInAs(data?.session?.user?.email || ''))
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setMode('newpass') })
    return () => sub?.subscription?.unsubscribe()
  }, [])

  const back = `${window.location.origin}${window.location.pathname}${window.location.search}`
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const em = email.trim().toLowerCase()
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password })
        if (error) throw error
        window.location.reload(); return
      }
      if (mode === 'create') {
        // Prove the inbox first: we email a sign-in link; the password is chosen after clicking it.
        const url = new URL(back); url.searchParams.set('setpw', '1')
        const { error } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: url.toString(), shouldCreateUser: true } })
        if (error) throw error
        setMsg('We sent you an email. Click the link in it to confirm it is you — you will then choose your password.')
      }
      if (mode === 'forgot') {
        const u2 = new URL(back); u2.searchParams.set('reset', '1')
        const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: u2.toString() })
        if (error) throw error
        setMsg('We sent you a link to set a new password.')
      }
      if (mode === 'newpass') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        const next = new URL(window.location.href); next.searchParams.delete('reset'); next.searchParams.delete('setpw')
        window.location.replace(next.toString()); return
      }
    } catch (err) {
      setMsg(err?.message || 'Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  if (signedInAs && mode !== 'newpass') {
    return (
      <Shell>
        <div className="max-w-sm mx-auto border rounded-2xl p-6 text-center">
          <p className="font-semibold">Signed in as {signedInAs}</p>
          <p className="text-sm text-black/60 mt-2">No access yet. If this is your seminar team or trainer email, confirm it once — we'll email you a link. Otherwise sign out and use your seminar account.</p>
          <Button type="button" disabled={busy} className="w-full mt-4" onClick={async () => { setBusy(true); const { error } = await supabase.auth.signInWithOtp({ email: signedInAs, options: { emailRedirectTo: back, shouldCreateUser: false } }); setBusy(false); setMsg(error ? error.message : `We sent a link to ${signedInAs}. Click it to confirm it's you.`) }}>Email me a confirmation link</Button>
          <button type="button" className="mt-3 text-sm underline" onClick={async () => { await supabase.auth.signOut(); window.location.reload() }}>Sign out</button>
          {msg && <p className="text-sm mt-3">{msg}</p>}
        </div>
      </Shell>
    )
  }

  const titles = { signin: signInTitle, create: 'First time — confirm your email', forgot: 'Reset your password', newpass: 'Choose a new password' }
  return (
    <Shell>
      <form onSubmit={submit} className="max-w-sm mx-auto border rounded-2xl p-6 grid gap-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND }}>{kicker}</p>
        <h1 className="text-xl font-bold">{titles[mode]}</h1>
        {mode !== 'newpass' && <label className="block"><span className="text-sm font-medium">Email</span><input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} /></label>}
        {mode !== 'forgot' && mode !== 'create' && <label className="block"><span className="text-sm font-medium">{mode === 'signin' ? 'Password' : 'New password (min. 8 characters)'}</span><input type="password" required minLength={mode === 'signin' ? 1 : 8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1`} /></label>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'create' ? 'Email me a link' : mode === 'forgot' ? 'Send reset link' : 'Save password'}</Button>
        {msg && <p className="text-sm text-center">{msg}</p>}
        {mode !== 'newpass' && (
          <div className="flex justify-between text-sm">
            {mode !== 'signin' ? <button type="button" className="underline" onClick={() => { setMode('signin'); setMsg('') }}>Back to sign in</button> : <button type="button" className="underline" onClick={() => { setMode('create'); setMsg('') }}>First time? Set up access</button>}
            {mode === 'signin' && <button type="button" className="underline" onClick={() => { setMode('forgot'); setMsg('') }}>Forgot password?</button>}
          </div>
        )}
      </form>
    </Shell>
  )
}

// ── Trainer: my schedule, bookings and what attendees see ────────────────────
function countdownText(iso, now) {
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return ''
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return d > 0 ? `in ${d} day${d === 1 ? '' : 's'} ${h} h` : h > 0 ? `in ${h} h ${m} min` : `in ${m} min`
}
function icsHref({ at, minutes, title, kind }) {
  const f = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = new Date(new Date(at).getTime() + (minutes || 120) * 60000)
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GEL.IT.UP//Seminars//EN', 'BEGIN:VEVENT', `UID:${f(at)}-${kind}@gelitup.com`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(at)}`, `DTEND:${f(end)}`, `SUMMARY:${kind === 'group' ? 'Online group' : 'Private 1-on-1'}: ${title}`, `URL:${SEMINAR_SITE_URL}/seminars/trainer`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`
}
const vimeoEventPage = (embed) => { const m = String(embed || '').match(/vimeo\.com\/event\/(\d+)/); return m ? `https://vimeo.com/event/${m[1]}` : '' }

function TrainerPage() {
  const [state, setState] = useState('checking') // checking | signin | ready
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [calendar, setCalendar] = useState([])

  useEffect(() => {
    ;(async () => {
      if (!hasSupabaseConfig) { setState('signin'); return }
      const step = await seminarAuthStep()
      if (step === 'newpass') { setState('newpass'); return }
      if (step === 'signin') { setState('signin'); return }
      const [{ data, error }, { data: cal }] = await Promise.all([supabase.rpc('seminar_trainer_dashboard'), supabase.rpc('seminar_team_calendar')])
      if (error) { setState('signin'); return }
      setRows(Array.isArray(data) ? data : [])
      setCalendar(Array.isArray(cal) ? cal : [])
      setState('ready')
    })()
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  if (state === 'checking') return <Shell><p className="text-center text-black/40">Loading…</p></Shell>
  if (state === 'newpass') return <SeminarAdminSignIn initialMode="newpass" />
  if (state === 'signin') return <SeminarAdminSignIn signInTitle="Trainer login" kicker="GEL.IT.UP Seminars · Trainers" />

  const endOf = (r) => new Date(r.starts_at).getTime() + (r.duration_minutes || 120) * 60000
  const upcoming = rows.filter((r) => endOf(r) >= now)
  const past = rows.filter((r) => endOf(r) < now).reverse()
  // Schedule = group seminars + confirmed private sessions, in time order.
  const schedule = [
    ...upcoming.map((r) => ({ at: r.starts_at, kind: 'group', title: r.title, minutes: r.duration_minutes, extra: `${r.seats_booked} booked` })),
    ...rows.flatMap((r) => (r.private_sessions || []).filter((p) => new Date(p.start).getTime() + (r.private_minutes || 120) * 60000 >= now)
      .map((p) => ({ id: p.id, at: p.start, kind: 'private', title: r.title, minutes: r.private_minutes || 120, extra: `${p.name}${p.country ? `, ${p.country}` : ''} · ${p.status === 'paid' ? 'paid' : 'awaiting payment'}${p.wants_kit ? ' · wants kit' : ''}` }))),
  ].sort((a, b) => new Date(a.at) - new Date(b.at))

  const Card = ({ r }) => {
    const live = now >= new Date(r.starts_at).getTime() - 30 * 60000 && now <= endOf(r) + 60 * 60000
    const ev = vimeoEventPage(r.live_embed_url)
    return (
      <div className="border rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-black/50">{whenEET(r.starts_at)} · {Math.round((r.duration_minutes || 120) / 60 * 10) / 10} h{countdownText(r.starts_at, now) ? ` · ${countdownText(r.starts_at, now)}` : ''}</p>
            <h3 className="font-bold text-lg">{r.title}</h3>
            {live && <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: BRAND }}>● LIVE WINDOW OPEN</span>}
          </div>
          <div className="flex gap-2 text-center">
            <div className="rounded-xl px-4 py-2" style={{ background: BRAND, color: '#fff' }}><p className="text-2xl font-extrabold leading-none">{r.seats_booked}</p><p className="text-[11px] font-semibold uppercase">seats booked</p></div>
            <div className="rounded-xl px-4 py-2" style={{ background: '#F9D3E6', color: '#9E1F63' }}><p className="text-2xl font-extrabold leading-none">{r.seats_signed_in}</p><p className="text-[11px] font-semibold uppercase">signed in</p></div>
          </div>
        </div>
        <p className="mt-2 text-sm text-black/60">{r.recordings_sold > 0 ? `${r.recordings_sold} recording${r.recordings_sold === 1 ? '' : 's'} sold · ` : ''}{r.cancellations > 0 ? `${r.cancellations} cancelled · ` : ''}{r.private_pending > 0 ? `${r.private_pending} private request${r.private_pending === 1 ? '' : 's'} waiting for a reply` : ''}</p>
        {(r.live_embed_url || r.replay_embed_url) && <div className="mt-3 flex flex-wrap gap-2">
          {ev && <a href={ev} target="_blank" rel="noreferrer" className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: '#111' }}>Open the Vimeo event (go live) ↗</a>}
          <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="rounded-xl px-4 py-2 text-sm font-bold border" style={{ borderColor: BRAND, color: BRAND }}>{open === r.id ? 'Hide' : 'See what attendees see'}</button>
        </div>}
        <StaffStream seminar={r} />
        {open === r.id && (
          r.live_embed_url || r.replay_embed_url ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2 relative aspect-video rounded-2xl overflow-hidden bg-black"><iframe title={`${r.title} preview`} src={r.live_embed_url || r.replay_embed_url} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
              {r.chat_embed_url ? <div className="relative min-h-[320px] rounded-2xl overflow-hidden border"><iframe title="Chat and Q&A" src={r.chat_embed_url} className="absolute inset-0 h-full w-full" /></div> : <div className="rounded-2xl border p-4 text-sm text-black/50">Chat / Q&amp;A appears here once the Vimeo event link is added.</div>}
            </div>
          ) : <p className="mt-3 text-sm text-black/50">Nothing to preview yet — no Vimeo link added.</p>
        )}
      </div>
    )
  }

  return (
    <Shell wide>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND }}>GEL.IT.UP Seminars · Trainer</p>
      <h1 className="text-3xl font-bold mt-1">My schedule</h1>
      <p className="text-black/60 mt-1">All times are EET (Greece / Bulgaria / Romania time), 24-hour clock.</p>

      {rows.length === 0 && <div className="mt-8 border rounded-2xl p-8 text-center text-black/60">No seminars are linked to this account yet. Ask the seminar team to add your email to your seminar.</div>}

      {(() => {
        const waiting = rows.flatMap((r) => (r.private_requests || []).map((q) => ({ ...q, title: r.title })))
        return waiting.length > 0 && (
          <section className="mt-6 rounded-2xl border-2 p-4" style={{ borderColor: BRAND }}>
            <h2 className="font-bold text-lg">Private 1-on-1 requests waiting for your reply</h2>
            <div className="mt-2 divide-y">
              {waiting.map((q) => (
                <div key={q.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="font-semibold">{q.name}</span>
                  <span className="text-black/50">{q.country || ''}{q.wants_kit ? ' · wants kit' : ''}</span>
                  <span className="text-black/70">{q.title}</span>
                  <span className="text-xs text-black/40">received {fmtDate(q.created_at)}</span>
                  <Link to={`/seminars/admin/private/${q.id}`} className="ml-auto rounded-full px-4 py-1.5 text-sm font-bold text-white" style={{ background: BRAND }}>Reply →</Link>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      <TeamCalendar items={calendar} now={now} />

      {schedule.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold text-lg">Coming up</h2>
          <div className="mt-2 border rounded-2xl divide-y">
            {schedule.map((x, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-bold w-56">{whenEET(x.at)}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase" style={x.kind === 'group' ? { background: BRAND, color: '#fff' } : { background: '#F9D3E6', color: '#9E1F63' }}>{x.kind === 'group' ? 'Online group' : 'Private 1-on-1'}</span>
                <span className="flex-1">{x.title} · {Math.round((x.minutes || 120) / 60 * 10) / 10} h</span>
                <span className="text-black/60">{x.extra}</span>
                {x.id && <Link to={`/seminars/admin/private/${x.id}`} className="text-xs font-semibold underline" style={{ color: BRAND }}>Reschedule / cancel</Link>}
                <a href={icsHref(x)} download={`${x.kind}-${String(x.at).slice(0, 10)}.ics`} className="text-xs font-semibold underline" style={{ color: BRAND }}>+ Add to calendar</a>
              </div>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold text-lg">Group seminars</h2>
          <div className="mt-2 grid gap-4">{upcoming.map((r) => <Fragment key={r.id}>{Card({ r })}</Fragment>)}</div>
          <div className="mt-4 rounded-2xl bg-black/[0.03] p-4 text-sm">
            <p className="font-semibold">Before you go live</p>
            <ul className="mt-1 list-disc pl-5 text-black/70 space-y-0.5">
              <li>Test your stream with the seminar team at least a day before.</li>
              <li>Camera and light set up; a second close-up angle on the nails if you use OBS.</li>
              <li>All products from the seminar kit ready and in reach.</li>
              <li>Go live 10–15 minutes early — attendees can enter the room 30 minutes before the start.</li>
              <li>Keep the chat / Q&amp;A open to answer questions.</li>
            </ul>
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold text-lg">Past seminars</h2>
          <div className="mt-2 grid gap-4">{past.map((r) => <Fragment key={r.id}>{Card({ r })}</Fragment>)}</div>
        </section>
      )}
    </Shell>
  )
}

// Shared calendar for all trainers: shows when the seminar team is busy so nobody
// double-books. Other trainers' private sessions show only as "busy" — no names,
// bookings or numbers.
function TeamCalendar({ items, now, showOwner = false }) {
  const [days, setDays] = useState(30)
  const until = now + days * 86400000
  const list = (items || []).filter((x) => new Date(x.end).getTime() >= now && new Date(x.start).getTime() <= until)
  const byDay = new Map()
  for (const x of list) {
    const k = fmtDate(x.start)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k).push(x)
  }
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-lg">Team calendar <span className="text-sm font-normal text-black/50">— all trainers, so nothing is double-booked</span></h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputCls} !w-auto !py-1.5 text-sm`}>
          <option value={14}>Next 2 weeks</option><option value={30}>Next 30 days</option><option value={90}>Next 3 months</option>
        </select>
      </div>
      {byDay.size === 0 ? <p className="mt-2 text-sm text-black/50">Nothing booked in this period.</p> : (
        <div className="mt-2 border rounded-2xl divide-y text-sm">
          {[...byDay.entries()].map(([day, xs]) => (
            <div key={day} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
              <span className="w-44 font-bold">{day}</span>
              <div className="flex-1 grid gap-1">
                {xs.map((x, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{fmtTime(x.start)}–{fmtTime(x.end)} {zoneLabel(x.start)}</span>
                    {!showOwner && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase" style={x.mine ? { background: BRAND, color: '#fff' } : { background: '#eee', color: '#555' }}>{x.mine ? 'You' : 'Booked'}</span>}
                    <span className="text-black/70">{x.kind === 'group' ? `Online group${x.title ? ` · ${x.title}` : ''}` : `Private 1-on-1${x.title ? ` · ${x.title}` : ''}`}{showOwner && x.trainer ? ` · ${x.trainer}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Admin ────────────────────────────────────────────────────────────────────
const EMPTY = { title: '', trainer_name: '', description: '', starts_at: '', duration_minutes: 90, replay_days: 30, status: 'draft', kind: 'group', shopify_sku: '', shop_url: '', kit_url: '', image_url: '', sold_out: false, recording_sku: '', recording_shop_url: '', recording_days: 30, recording_on_sale: false, vimeo_event: '', replay_video: '' }

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
  const [trainers, setTrainers] = useState([])
  const [newTrainer, setNewTrainer] = useState({ name: '', email: '' })

  const load = useCallback(async () => {
    const [{ data: s }, { data: r }, { data: t }] = await Promise.all([
      supabase.from('seminars').select('*, seminar_media(*), seminar_access_codes(count)').order('starts_at', { ascending: false }),
      supabase.from('seminar_private_requests').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('seminar_trainers').select('*').order('name'),
    ])
    setSeminars(s || []); setRequests(r || []); setTrainers(t || [])
  }, [])
  const addTrainer = async (e) => {
    e.preventDefault()
    const row = { name: newTrainer.name.trim(), email: newTrainer.email.trim().toLowerCase() }
    if (!row.name || !row.email) return
    const { error } = await supabase.from('seminar_trainers').insert(row)
    setMsg(error ? `Could not add trainer: ${error.message}` : `${row.name} added. They can sign in at gelitup.com/seminars/trainer with "First time? Create password" once a seminar is assigned to them.`)
    if (!error) { setNewTrainer({ name: '', email: '' }); load() }
  }
  const removeTrainer = async (t) => {
    if (!window.confirm(`Remove ${t.name} from the trainers list? Their seminars keep their name and login email.`)) return
    await supabase.from('seminar_trainers').delete().eq('id', t.id); load()
  }

  useEffect(() => {
    ;(async () => {
      if (!hasSupabaseConfig) { setAuthState('no'); return }
      const step = await seminarAuthStep()
      if (step === 'newpass') { setAuthState('reset'); return }
      if (step === 'signin') { setAuthState('no'); return }
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
  if (authState === 'reset') return <SeminarAdminSignIn initialMode="newpass" />
  if (authState === 'no') return <SeminarAdminSignIn />

  const startEdit = (s) => {
    const m = Array.isArray(s?.seminar_media) ? s.seminar_media[0] : s?.seminar_media
    setEditing(s ? { ...EMPTY, ...s, starts_at: toLocalInput(s.starts_at), shopify_sku: s.shopify_sku || '', vimeo_event: m?.live_embed_url || '', replay_video: m?.replay_embed_url || '' } : { ...EMPTY })
    setMsg('')
  }

  const save = async (e) => {
    e.preventDefault(); setMsg('Saving…')
    const { vimeo_event, replay_video, id } = editing
    const FIELDS = ['title', 'trainer_name', 'description', 'duration_minutes', 'replay_days', 'status', 'kind', 'shopify_sku', 'shop_url', 'kit_url', 'image_url', 'sold_out', 'recording_sku', 'recording_shop_url', 'recording_days', 'recording_on_sale', 'private_price', 'private_minutes', 'private_variant_id', 'trainer_email']
    const rest = Object.fromEntries(FIELDS.map((f) => [f, editing[f] === '' ? null : editing[f]]))
    const row = { ...rest, starts_at: new Date(editing.starts_at).toISOString(), shopify_sku: rest.shopify_sku?.trim() || null, duration_minutes: Number(rest.duration_minutes), replay_days: Number(rest.replay_days), recording_days: Number(rest.recording_days) || 30, recording_sku: rest.recording_sku?.trim() || null, updated_at: new Date().toISOString() }
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

  const markRefunded = async (c) => { await supabase.from('seminar_access_codes').update({ refunded_at: new Date().toISOString() }).eq('code', c.code); loadCodes(selected) }
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
        <div className="flex items-center gap-3"><Link to="/seminars/trainer" className="text-sm font-semibold underline" style={{ color: BRAND }}>Trainer view (schedule &amp; bookings) →</Link><Button onClick={() => startEdit(null)}>+ New seminar</Button></div>
      </div>
      {msg && <p className="mt-3 text-sm bg-black/5 rounded-lg px-3 py-2">{msg}</p>}

      {editing && (
        <form onSubmit={save} className="mt-6 border rounded-2xl p-5 md:p-6 grid gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-bold text-lg">{editing.id ? 'Edit seminar' : 'New seminar'}</h2>
          <div className="md:col-span-2">{F({ label: 'Title *', k: 'title', required: true })}</div>
          <label className="block md:col-span-2"><span className="text-sm font-medium">Trainer</span>
            <select value={trainers.find((t) => t.email === String(editing.trainer_email || '').toLowerCase())?.id || ''} onChange={(e) => { const t = trainers.find((x) => x.id === e.target.value); setEditing((x) => ({ ...x, trainer_name: t ? t.name : '', trainer_email: t ? t.email : '' })) }} className={`${inputCls} mt-1`}>
              <option value="">{editing.trainer_name && !trainers.some((t) => t.email === String(editing.trainer_email || '').toLowerCase()) ? `${editing.trainer_name} (not in the trainers list — add below)` : '— choose a trainer —'}</option>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.email}</option>)}
            </select>
            <span className="text-xs text-black/50">The trainer sees this seminar's bookings and schedule at gelitup.com/seminars/trainer.</span>
          </label>
          {F({ label: 'Starts (your local time) *', k: 'starts_at', type: 'datetime-local', required: true })}
          {F({ label: 'Duration (minutes)', k: 'duration_minutes', type: 'number', min: 15 })}
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
          {F({ label: 'Seminar product page on shop.gelitup.com (…/products/…)', k: 'shop_url', type: 'url' })}
          {F({ label: 'Seminar kit product page (optional, …/products/…)', k: 'kit_url', type: 'url' })}
          {F({ label: 'Booking image URL (1200 × 1500 px)', k: 'image_url', type: 'url' })}
          <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={Boolean(editing.sold_out)} onChange={(e) => setEditing((x) => ({ ...x, sold_out: e.target.checked }))} /><span className="text-sm font-semibold">Show SOLD OUT</span></label>
          <div className="md:col-span-2 rounded-xl bg-black/[0.03] p-4 grid gap-3 md:grid-cols-2">
            <p className="font-semibold text-sm md:col-span-2">Recording for people who could not attend</p>
            {F({ label: 'Recording product page on shop.gelitup.com', k: 'recording_shop_url', type: 'url' })}
            {F({ label: 'Recording SKU in Shopify', k: 'recording_sku', placeholder: 'e.g. SEM-OMBRE-REC' })}
            {F({ label: 'Access days from purchase', k: 'recording_days', type: 'number', min: 1 })}
            <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={Boolean(editing.recording_on_sale)} onChange={(e) => setEditing((x) => ({ ...x, recording_on_sale: e.target.checked }))} /><span className="text-sm font-semibold">Recording on sale (shows "Watch the recording" after the seminar)</span></label>
          </div>
          <div className="md:col-span-2 rounded-xl bg-black/[0.03] p-4 grid gap-3 md:grid-cols-2">
            <p className="font-semibold text-sm md:col-span-2">Private 1-on-1 session (leave the price empty to not offer it)</p>
            {F({ label: 'Private session price (€)', k: 'private_price', type: 'number', min: 0 })}
            {F({ label: 'Private session length (minutes)', k: 'private_minutes', type: 'number', min: 15 })}
            {F({ label: 'Payment link: Shopify variant ID of the unlisted private-session product', k: 'private_variant_id', placeholder: 'e.g. 55333004214610' })}
          </div>
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
          <thead className="bg-black/[0.03] text-left"><tr><th className="p-3">Seminar</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Booked</th><th className="p-3">Sold out</th><th className="p-3"></th></tr></thead>
          <tbody>
            {seminars.map((s) => (
              <tr key={s.id} className={`border-t ${selected === s.id ? 'bg-[#D43790]/5' : ''}`}>
                <td className="p-3 font-semibold">{s.title}<div className="text-xs font-normal text-black/50">{s.kind === 'private' ? 'Private · ' : ''}{s.shopify_sku || 'no SKU'}</div></td>
                <td className="p-3 whitespace-nowrap">{formatWhen(s.starts_at, false)}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3">{s.seminar_access_codes?.[0]?.count ?? 0}</td>
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
                  <tr key={c.code} className={`border-t ${c.revoked && !c.cancelled_at ? 'opacity-40' : ''}`}>
                    <td className="p-3 font-mono">{c.code}</td>
                    <td className="p-3">{c.buyer_name || ''}<div className="text-xs text-black/50">{c.buyer_email}</div></td>
                    <td className="p-3">{c.attendee_email || <span className="text-black/40">not yet</span>}</td>
                    <td className="p-3">{c.order_ref || c.source}</td>
                    <td className="p-3 whitespace-nowrap">{c.last_seen_at ? formatWhen(c.last_seen_at, false) : '—'}</td>
                    <td className="p-3 whitespace-nowrap text-right">
                      {c.cancelled_at && !c.refunded_at && <><span className="text-xs font-bold text-amber-700 mr-2">Cancelled — refund due</span><button onClick={() => markRefunded(c)} className="underline mr-3">Mark refunded</button></>}
                      {c.refunded_at && <span className="text-xs font-bold text-emerald-700 mr-3">Refunded</span>}
                      {!c.cancelled_at && <><button onClick={() => resend(c)} className="underline mr-3">Resend</button><button onClick={() => revoke(c)} className="underline">{c.revoked ? 'Restore' : 'Revoke'}</button></>}
                    </td>
                  </tr>
                ))}
                {!codes.length && <tr><td colSpan={6} className="p-6 text-center text-black/50">No codes yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-bold text-lg">Trainers</h2>
        <div className="mt-3 border rounded-2xl divide-y text-sm">
          {trainers.map((t) => {
            const count = seminars.filter((x) => String(x.trainer_email || '').toLowerCase() === t.email && x.status !== 'cancelled').length
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-semibold">{t.name}</span><a className="underline text-black/60" href={`mailto:${t.email}`}>{t.email}</a>
                <span className="text-black/50">{count} seminar{count === 1 ? '' : 's'}</span>
                <button type="button" onClick={() => removeTrainer(t)} className="ml-auto text-xs underline text-black/50">Remove</button>
              </div>
            )
          })}
          {!trainers.length && <p className="px-4 py-3 text-black/50">No trainers yet.</p>}
          <form onSubmit={addTrainer} className="flex flex-wrap items-end gap-2 px-4 py-3 bg-black/[0.02]">
            <label className="block"><span className="text-xs text-black/60">Name</span><input value={newTrainer.name} onChange={(e) => setNewTrainer((x) => ({ ...x, name: e.target.value }))} className={`${inputCls} !w-56`} required /></label>
            <label className="block"><span className="text-xs text-black/60">Login email</span><input type="email" value={newTrainer.email} onChange={(e) => setNewTrainer((x) => ({ ...x, email: e.target.value }))} className={`${inputCls} !w-72`} required /></label>
            <Button type="submit">+ Add trainer</Button>
          </form>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-bold text-lg">Private seminar requests</h2>
        <div className="mt-3 grid gap-3">
          {requests.map((r) => (
            <div key={r.id} className="border rounded-2xl p-4 text-sm">
              <div className="flex justify-between flex-wrap gap-2"><p className="font-semibold">{r.name} · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> {r.phone && `· ${r.phone}`}</p><span className="text-xs rounded-full bg-black/5 px-2 py-1">{r.status}</span></div>
              <p className="text-black/70 mt-1">{r.topic}</p>
              <p className="text-black/50 mt-1">{(r.preferred_slots || []).map((s) => `${s.date} ${s.time || ''}`).join(' / ')} ({r.timezone}) · {r.attendees} people · kit: {r.wants_kit ? 'yes' : 'no'}{r.country ? ` · ${r.country}` : ''}</p>
              {r.notes && <p className="text-black/60 mt-1 italic">{r.notes}</p>}
              {r.confirmed_start && <p className="mt-1 font-semibold">Agreed: {whenEET(r.confirmed_start)}{r.paid_at ? ` · PAID ${r.order_ref || ''}` : ' · awaiting payment'}</p>}
              <div className="mt-2 flex flex-wrap gap-3"><Link to={`/seminars/admin/private/${r.id}`} className="font-semibold underline" style={{ color: BRAND }}>Open &amp; reply →</Link>{['contacted', 'confirmed', 'paid', 'declined'].map((st) => <button key={st} onClick={() => setRequestStatus(r, st)} className="underline">{st}</button>)}</div>
            </div>
          ))}
          {!requests.length && <p className="text-black/50 text-sm">No requests yet.</p>}
        </div>
      </section>
    </Shell>
  )
}

// ── Admin: reply to a private-session request ────────────────────────────────
function privateReplyEmail({ req, seminar, startIso, comment, decline, payUrl, reschedule = false, cancel = false }) {
  const tz = req.timezone || 'Europe/Athens'
  const hours = seminar ? Math.round((seminar.private_minutes || 120) / 60 * 10) / 10 : null
  const title = seminar?.title || 'your private seminar'
  const commentHtml = comment ? `<p style="background:#f6f6f6;border-radius:8px;padding:12px 14px;white-space:pre-wrap">${escapeHtml(comment)}</p>` : ''
  const paid = req.status === 'paid'
  if (cancel) {
    return { subject: `Your private session has been cancelled — ${title}`, html: brandEmail(`<p>Hi ${escapeHtml(req.name || 'there')},</p><p>We're sorry — your private 1-on-1 session of <strong>${escapeHtml(title)}</strong>${req.confirmed_start ? ` on <strong>${escapeHtml(whenEET(req.confirmed_start))}</strong>` : ''} has been cancelled.</p>${commentHtml}${paid ? '<p>As the session was cancelled by us, you will receive a <strong>full refund</strong> to your original payment method. You will get a confirmation from the shop once it has been processed.</p>' : ''}<p>If you'd like to book a new time, just reply to this email.</p><p>Warm regards,<br/>GEL.IT.UP Seminars</p>`) }
  }
  if (decline) {
    return { subject: `Your private session request — ${title}`, html: brandEmail(`<p>Hi ${escapeHtml(req.name || 'there')},</p><p>Thank you for your request for a private session${seminar ? ` of <strong>${escapeHtml(title)}</strong>` : ''}.</p>${commentHtml}<p>Just reply to this email and we'll find a solution together.</p><p>Warm regards,<br/>GEL.IT.UP Seminars</p>`) }
  }
  const tzLine = fmtTime(startIso, tz) !== fmtTime(startIso) ? `<br/><span style="color:#666">${escapeHtml(whenIn(startIso, tz))} your time</span>` : ''
  return {
    subject: reschedule ? `New time for your private session — ${title}` : `Your private session is reserved — ${title}`,
    html: brandEmail(`
      <p style="color:${BRAND};font-weight:bold;letter-spacing:2px;font-size:12px;margin:0">PRIVATE 1-ON-1 SESSION</p>
      <h1 style="font-size:22px;margin:4px 0 12px">${escapeHtml(title)}</h1>
      <p>Hi ${escapeHtml(req.name || 'there')},</p>
      <p>${reschedule ? `Your session has been moved. Your <strong>new time</strong> is:` : `Good news — ${seminar?.trainer_name ? escapeHtml(seminar.trainer_name) : 'our trainer'} is available. We have reserved this time for you:`}</p>${reschedule && req.confirmed_start ? `<p style="text-align:center;color:#999;margin:0 0 6px"><s>${escapeHtml(whenEET(req.confirmed_start))}</s></p>` : ''}
      <p style="font-size:18px;background:#f6f6f6;border-radius:8px;padding:14px;text-align:center"><strong>${escapeHtml(whenEET(startIso))}</strong>${tzLine}${hours ? `<br/><span style="color:#666">${hours} hours, live online, 1-on-1</span>` : ''}</p>
      ${commentHtml}
      ${paid ? `<p style="text-align:center;color:#2e7d32;font-weight:bold">Your payment has been received — nothing more to pay.</p>` : ''}
      <p style="text-align:center;margin:24px 0 10px">${paid ? '' : `<a href="${payUrl}" style="display:inline-block;margin:4px;background:${BRAND};color:#fff;padding:14px 26px;border-radius:8px;text-decoration:none;font-weight:bold">Pay${seminar?.private_price != null ? ` €${Number(seminar.private_price).toFixed(0)}` : ''} to book your session</a>`}${seminar?.kit_url ? `<a href="${seminar.kit_url}" style="display:inline-block;margin:4px;background:#ffffff;color:${BRAND};border:2px solid ${BRAND};padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Shop the seminar kit</a>` : ''}</p>
      ${seminar?.kit_url ? `<p style="text-align:center;font-size:13px;color:#555;margin:0 0 20px">${req.wants_kit ? 'You asked about the products — ' : ''}the kit has every product used in the session, 15% off the products bought separately. Delivery time depends on your country, so please order it soon to have it in time for your session.</p>` : ''}
      <p style="font-size:13px;color:#555">${paid ? `We'll send you the link to join before the session.` : `Your session is booked once payment is received. We'll then send you the link to join.`} Free cancellation with a full refund up to ${PRIVATE_CANCEL_HOURS} hours before the start; after that, or if you don't attend, it can't be refunded. You can move the session once, free of charge, with at least ${PRIVATE_CANCEL_HOURS} hours' notice. Full terms: <a href="${SEMINAR_SITE_URL}/seminars/terms" style="color:${BRAND}">gelitup.com/seminars/terms</a>.</p>
      <p style="font-size:13px;color:#555">Questions? Just reply to this email.</p>
      <p>Warm regards,<br/>GEL.IT.UP Seminars</p>`),
  }
}

function PrivateReply() {
  const { id } = useParams()
  const [authState, setAuthState] = useState('checking')
  const [isAdmin, setIsAdmin] = useState(false)
  const [me, setMe] = useState('')
  const [req, setReq] = useState(null)
  const [seminar, setSeminar] = useState(null)
  const [slot] = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('slot')))
  const [when, setWhen] = useState({ date: '', time: '' })
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState('confirm')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState([])

  useEffect(() => {
    ;(async () => {
      if (!hasSupabaseConfig) { setAuthState('no'); return }
      const step = await seminarAuthStep()
      if (step !== 'ok') { setAuthState('no'); return }
      const [{ data: ok }, { data: u }] = await Promise.all([supabase.rpc('seminar_is_admin'), supabase.auth.getUser()])
      setIsAdmin(Boolean(ok))
      setMe(String(u?.user?.email || '').toLowerCase())
      // Admins see every request; a trainer only the requests for her own seminars (enforced by the database).
      const { data: r } = await supabase.from('seminar_private_requests').select('*').eq('id', id).maybeSingle()
      if (!ok && !r) { setAuthState('no'); return }
      setAuthState('yes')
      supabase.rpc('seminar_team_calendar').then(({ data }) => setBusy(Array.isArray(data) ? data : []))
      setReq(r || false)
      if (r?.seminar_id) {
        const { data: sm } = await supabase.from('seminars').select('id, title, trainer_name, trainer_email, private_price, private_minutes, private_variant_id, kit_url').eq('id', r.seminar_id).maybeSingle()
        setSeminar(sm || null)
      }
      if (r && ['confirmed', 'paid'].includes(r.status)) setMode('reschedule')
      const picked = r && slot != null ? (r.preferred_slots || [])[Number(slot)] : null
      if (picked) {
        const pIso = picked.time ? wallTimeToIso(picked.date, picked.time, picked.tz || r.timezone || EET_ZONE) : null
        setWhen(pIso ? { date: new Date(pIso).toLocaleDateString('en-CA', { timeZone: EET_ZONE }), time: fmtTime(pIso) } : { date: picked.date || '', time: '' })
      }
    })()
  }, [id, slot])

  if (authState === 'checking') return <Shell><p className="text-center text-black/40">Checking access…</p></Shell>
  if (authState === 'no') return <SeminarAdminSignIn signInTitle="Sign in to reply" kicker="GEL.IT.UP Seminars · Trainers & team" />
  if (req === null) return <Shell><p className="text-center text-black/40">Loading request…</p></Shell>
  const back = isAdmin ? { to: '/seminars/admin', label: '← Seminar admin' } : { to: '/seminars/trainer', label: '← My schedule' }
  if (req === false) return <Shell><p className="text-center">Request not found. <Link className="underline" to={back.to}>{back.label}</Link></p></Shell>

  const tz = req.timezone || 'Europe/Athens'
  const booked = ['confirmed', 'paid'].includes(req.status)
  const closed = ['declined', 'cancelled'].includes(req.status)
  const startIso = when.date && when.time ? wallTimeToIso(when.date, when.time, EET_ZONE) : null
  const payUrl = seminar?.private_variant_id ? privatePayUrl(seminar.private_variant_id, req.email, req.id) : ''
  const decline = mode === 'decline'
  const cancel = mode === 'cancel'
  const reschedule = mode === 'reschedule'
  const pickTime = mode === 'confirm' || reschedule
  const ready = decline || cancel ? Boolean(comment.trim()) : Boolean(startIso && (payUrl || req.status === 'paid') && startIso !== req.confirmed_start)
  const preview = ready ? privateReplyEmail({ req, seminar, startIso, comment: comment.trim(), decline, payUrl, reschedule, cancel }) : null
  const who = isAdmin ? 'seminar team' : (seminar?.trainer_name || me)

  const send = async () => {
    if (!preview) return
    setMsg('Sending…')
    await sendMail(req.email, preview.subject, preview.html, PRIVATE_INBOX)
    const nowIso = new Date().toISOString()
    const patch = cancel
      ? { status: 'cancelled', cancelled_at: nowIso, cancel_reason: comment.trim(), handled_by: me || null }
      : decline
        ? { status: 'declined', reply_comment: comment.trim() || null, replied_at: nowIso, handled_by: me || null }
        : { status: req.status === 'paid' ? 'paid' : 'confirmed', confirmed_start: startIso, previous_start: reschedule ? req.confirmed_start : req.previous_start || null, reply_comment: comment.trim() || null, replied_at: nowIso, handled_by: me || null }
    const { error } = await supabase.from('seminar_private_requests').update(patch).eq('id', req.id)
    const line = `${escapeHtml(seminar?.title || 'Private session')} · ${escapeHtml(req.name || '')}${req.country ? `, ${escapeHtml(req.country)}` : ''} · <a href="mailto:${escapeHtml(req.email)}">${escapeHtml(req.email)}</a>`
    const note = comment.trim() ? `<p style="color:#555">Message to the client: <em>${escapeHtml(comment.trim())}</em></p>` : ''
    // Keep the seminar team informed of everything a trainer does (and the trainer of what the team does).
    const team = cancel
      ? { subject: `${req.status === 'paid' ? 'REFUND NEEDED — ' : ''}Private 1-on-1 cancelled — ${req.name}`, body: `<p>Cancelled by <strong>${escapeHtml(who)}</strong>.</p><p>${line}</p>${req.confirmed_start ? `<p>Was booked for <strong>${escapeHtml(whenEET(req.confirmed_start))}</strong></p>` : ''}${note}${req.status === 'paid' ? `<p style="color:#b00020;font-weight:bold">The client had paid (${escapeHtml(req.order_ref || 'order')}). Please refund the full amount in Shopify.</p>` : ''}` }
      : decline
        ? { subject: `Private 1-on-1 request answered — ${req.name}`, body: `<p>Replied by <strong>${escapeHtml(who)}</strong> (no time agreed).</p><p>${line}</p>${note}` }
        : { subject: `Private 1-on-1 ${reschedule ? 'moved' : 'booked in'} — ${whenEET(startIso)}`, body: `<p>${reschedule ? 'Moved' : 'Agreed'} by <strong>${escapeHtml(who)}</strong>${req.status === 'paid' ? ' (already paid)' : ' — payment link sent to the client'}.</p><p style="font-size:17px;background:#f6f6f6;border-radius:8px;padding:12px;text-align:center">${reschedule && req.confirmed_start ? `<s style="color:#999">${escapeHtml(whenEET(req.confirmed_start))}</s><br/>` : ''}<strong>${escapeHtml(whenEET(startIso))}</strong></p><p>${line}</p>${note}<p>Schedule: <a href="${SEMINAR_SITE_URL}/seminars/trainer" style="color:${BRAND}">gelitup.com/seminars/trainer</a></p>` }
    const recipients = new Set([PRIVATE_INBOX.toLowerCase()])
    if (seminar?.trainer_email) recipients.add(seminar.trainer_email.toLowerCase())
    recipients.delete(me)
    for (const to of recipients) await sendMail(to, team.subject, brandEmail(team.body, 'Seminar team notification'), PRIVATE_INBOX)
    setMsg(error ? `Email sent, but the request could not be updated: ${error.message}` : cancel ? 'Cancelled. The client has been told' + (req.status === 'paid' ? ' and the seminar team has been asked to refund.' : '.') : decline ? 'Sent. The request is marked as answered.' : reschedule ? 'Moved. The client has the new time.' : 'Sent. The client has the agreed time and the payment link; you will get an email when they pay.')
    setReq((r) => ({ ...r, ...patch }))
    setComment('')
  }

  const tabs = closed ? [] : booked
    ? [['reschedule', 'Reschedule'], ['cancel', 'Cancel session']]
    : [['confirm', 'Confirm a time'], ['decline', "Can't do it / reply only"]]

  return (
    <Shell>
      <p className="text-sm"><Link to={back.to} className="underline">{back.label}</Link></p>
      <h1 className="text-2xl font-bold mt-3">{seminar ? 'Private 1-on-1' : 'Private seminar request'}</h1>
      {seminar && <p className="text-black/60">{seminar.title}{seminar.trainer_name ? ` · ${seminar.trainer_name}` : ''}</p>}
      <div className="mt-4 border rounded-2xl p-4 text-sm grid gap-1">
        <p><strong>{req.name}</strong> · <a className="underline" href={`mailto:${req.email}`}>{req.email}</a>{req.phone ? ` · ${req.phone}` : ''}{req.country ? ` · ${req.country}` : ''}</p>
        <p className="text-black/70">{req.topic}</p>
        {req.notes && <p className="italic text-black/60">{req.notes}</p>}
        <p className="text-black/50">Kit: {req.wants_kit ? 'yes' : 'no'} · Status: <strong>{{ new: 'new request', contacted: 'waiting for a reply', confirmed: 'time agreed — awaiting payment', paid: 'booked & paid', declined: 'answered, no time agreed', cancelled: 'cancelled' }[req.status] || req.status}</strong>{req.paid_at ? ` · ${req.order_ref || ''}` : ''}</p>
        {req.confirmed_start && !closed && <p className="font-semibold" style={{ color: BRAND }}>{whenEET(req.confirmed_start)}</p>}
        {req.handled_by && <p className="text-xs text-black/40">Last handled by {req.handled_by}</p>}
      </div>

      {closed && <p className="mt-6 rounded-xl bg-black/[0.04] p-4 text-sm">This request is {req.status}. {req.cancel_reason ? <>Reason given: <em>{req.cancel_reason}</em></> : ''}</p>}

      {tabs.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setMsg('') }} className={`rounded-full px-4 py-2 text-sm font-semibold border ${mode === k ? 'text-white' : ''}`} style={mode === k ? (k === 'cancel' || k === 'decline' ? { background: '#111', borderColor: '#111' } : { background: BRAND, borderColor: BRAND }) : {}}>{label}</button>
          ))}
        </div>
      )}

      {!closed && pickTime && (
        <div className="mt-4">
          {!reschedule && <p className="text-sm font-medium">Their preferred times — pick one, or type another below</p>}
          {reschedule && <p className="text-sm font-medium">Choose the new date and time{req.status === 'paid' ? ' — the client has already paid, so no new payment link is sent' : ''}</p>}
          {!reschedule && (
            <div className="mt-2 grid gap-2">
              {(req.preferred_slots || []).map((sl, i) => {
                const iso = sl.time ? wallTimeToIso(sl.date, sl.time, sl.tz || tz) : null
                const on = iso ? startIso === iso : (when.date === sl.date && !when.time)
                return (
                  <label key={i} className={`flex items-center gap-3 border rounded-xl px-3 py-2 text-sm cursor-pointer ${on ? 'border-[#D43790] bg-[#D43790]/5' : ''}`}>
                    <input type="radio" name="slot" checked={on} onChange={() => setWhen({ date: iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: EET_ZONE }) : sl.date, time: iso ? fmtTime(iso) : '' })} />
                    <span>{iso ? <><strong>{whenEET(iso)}</strong>{fmtTime(iso, tz) !== fmtTime(iso) && <span className="text-black/50"> · {fmtTime(iso, tz)} their time</span>}</> : <>{sl.date} <span className="text-black/50">(no time given — add one below)</span></>}</span>
                  </label>
                )
              })}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block"><span className="text-xs text-black/60">Date</span><input type="date" value={when.date} onChange={(e) => setWhen((w) => ({ ...w, date: e.target.value }))} className={inputCls} /></label>
            <label className="block"><span className="text-xs text-black/60">Time — EET, 24-hour</span><Time24 value={when.time} onChange={(v) => setWhen((w) => ({ ...w, time: v }))} className="mt-0.5" /></label>
          </div>
          {startIso && (() => {
            const s0 = new Date(startIso).getTime(), s1 = s0 + (seminar?.private_minutes || 120) * 60000
            const own = req.confirmed_start ? new Date(req.confirmed_start).getTime() : null
            const clash = busy.filter((b) => new Date(b.start).getTime() < s1 && new Date(b.end).getTime() > s0 && new Date(b.start).getTime() !== own)
            return clash.length ? <p className="mt-2 rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-sm text-amber-900"><strong>Heads-up — overlaps with:</strong> {clash.map((c) => `${fmtTime(c.start)}–${fmtTime(c.end)} ${c.kind === 'group' ? 'Online group' : 'Private 1-on-1'}${c.title ? ` (${c.title})` : ''}`).join('; ')}</p> : null
          })()}
          {startIso && <p className="mt-2 text-sm">{reschedule ? 'New time' : 'Agreed time'}: <strong>{whenEET(startIso)}</strong>{fmtTime(startIso, tz) !== fmtTime(startIso) ? ` · ${fmtTime(startIso, tz)} for the client (${tz})` : ''}</p>}
          {!payUrl && req.status !== 'paid' && <p className="mt-2 text-sm text-red-600">This seminar has no private-session product linked yet, so a payment link can't be added.</p>}
        </div>
      )}

      {!closed && cancel && <p className="mt-4 rounded-xl border border-black/20 p-3 text-sm">The client will be told the session is cancelled.{req.status === 'paid' ? ' They have paid, so the seminar team is asked to refund them in full.' : ''} Please give a short reason.</p>}

      {!closed && (
        <label className="block mt-5"><span className="text-sm font-medium">{decline || cancel ? 'Your message to the client *' : 'Comment for the client (optional)'}</span>
          <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={`${inputCls} mt-1`} placeholder={cancel ? "e.g. I'm unwell that day — I'm so sorry. Reply and we'll find a new time." : decline ? 'e.g. I am away that week — could you do 1 or 2 December instead?' : reschedule ? 'e.g. Sorry for the change — see you then!' : 'e.g. Please have your products and dual forms ready before we start.'} />
        </label>
      )}

      {preview && (
        <div className="mt-6">
          <p className="text-sm font-medium">Email the client will receive · <span className="text-black/60">{preview.subject}</span></p>
          <div className="mt-2 border rounded-2xl p-4 bg-white" dangerouslySetInnerHTML={{ __html: preview.html }} />
        </div>
      )}
      {!closed && <div className="mt-4"><Button type="button" disabled={!ready || msg === 'Sending…'} onClick={send} className="w-full">{cancel ? 'Cancel the session & tell the client' : decline ? 'Send reply' : reschedule ? 'Send the new time' : 'Send confirmation with payment link'}</Button></div>}
      {msg && <p className="mt-3 text-sm text-center">{msg}</p>}
    </Shell>
  )
}

// ── OBS guide for trainers ───────────────────────────────────────────────────
function ObsStep({ n, title, children }) {
  return (
    <section className="mt-6 flex gap-4">
      <span className="shrink-0 h-8 w-8 rounded-full text-white font-bold flex items-center justify-center" style={{ background: BRAND }}>{n}</span>
      <div className="flex-1"><h2 className="font-bold text-lg">{title}</h2><div className="mt-1 text-black/75 leading-relaxed grid gap-2">{children}</div></div>
    </section>
  )
}

function ObsGuide() {
  return (
    <Shell>
      <p className="text-sm"><Link to="/seminars/trainer" className="underline">← My schedule</Link></p>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: BRAND }}>GEL.IT.UP Seminars · Trainers</p>
      <h1 className="text-3xl font-bold mt-1">Going live with OBS</h1>
      <p className="mt-2 text-black/60">OBS Studio is a free program that sends your cameras to the seminar page. Set it up once, do a test with the seminar team, and on the day it's two clicks.</p>

      <ObsStep n={1} title="Install OBS Studio">
        <p>Download it free from <a className="underline" style={{ color: BRAND }} href="https://obsproject.com" target="_blank" rel="noreferrer">obsproject.com</a> (Windows or Mac) and install it. When it first opens, the setup wizard asks what you'll use it for: choose <strong>“Optimize for streaming”</strong>, resolution <strong>1920×1080</strong>, <strong>30 FPS</strong>.</p>
      </ObsStep>

      <ObsStep n={2} title="Connect OBS to your seminar">
        <p>On <Link className="underline" style={{ color: BRAND }} to="/seminars/trainer">your trainer page</Link>, find the seminar and its <strong>Live stream (OBS)</strong> box. Then in OBS go to <strong>Settings → Stream</strong>:</p>
        <ul className="list-disc pl-5"><li>Service: <strong>Custom…</strong></li><li>Server: paste <strong>Server</strong> from your trainer page</li><li>Stream key: paste <strong>Stream key</strong> (keep it private — anyone with it could stream to your seminar)</li></ul>
        <p>Click <strong>OK</strong>. This only needs doing once per seminar.</p>
      </ObsStep>

      <ObsStep n={3} title="Add your cameras">
        <p>In the <strong>Sources</strong> box at the bottom, click <strong>+ → Video Capture Device</strong> and choose your camera (face camera or webcam). For a close-up of the nails, add a second <strong>Video Capture Device</strong> for the second camera or your phone (apps like <em>Camo</em> or <em>DroidCam</em> turn a phone into a camera).</p>
        <p>Drag and resize the boxes in the preview — for example the nails large and your face small in a corner.</p>
        <p>Tip: make two <strong>Scenes</strong> (bottom left) — “Talking” (face big) and “Nails” (close-up big) — and click between them during the seminar.</p>
      </ObsStep>

      <ObsStep n={4} title="Add your microphone">
        <p>In <strong>Audio Mixer</strong> check that your microphone moves when you speak. A clip-on microphone or headset sounds much better than the laptop's. If it doesn't show, <strong>Sources → + → Audio Input Capture</strong>.</p>
      </ObsStep>

      <ObsStep n={5} title="Settings for a smooth stream">
        <p><strong>Settings → Output</strong>: Video bitrate <strong>4500 Kbps</strong> (use 2500 on slower internet), Audio bitrate 160. <strong>Settings → Video</strong>: Output resolution 1920×1080 (or 1280×720 on slower internet), 30 FPS.</p>
        <p>For a shorter delay: <strong>Settings → Output</strong>, tick <strong>Enable Custom Encoder Settings</strong> and type <code className="rounded bg-black/5 px-1">keyint=60 tune=zerolatency</code>. Attendees still see you about 10 seconds later than real time — that's normal; read the chat at natural pauses.</p>
        <p>Use a cable to your router if you can — Wi-Fi drops are the most common problem. Close other programs and video calls.</p>
      </ObsStep>

      <ObsStep n={6} title="On the day">
        <ul className="list-disc pl-5">
          <li>Start OBS <strong>15 minutes early</strong> and click <strong>Start Streaming</strong>. Attendees can enter the room 30 minutes before the start.</li>
          <li>On your trainer page click <strong>Preview what attendees see</strong> to check picture and sound (there's a delay of about 10–20 seconds — that's normal).</li>
          <li>The <strong>Questions &amp; chat</strong> box next to the preview shows attendees' messages. Questions are marked ❓ — tick <strong>Mark answered</strong> as you go, and <strong>Hide</strong> anything inappropriate.</li>
          <li>When you finish, click <strong>Stop Streaming</strong>. The recording is saved automatically and becomes the replay within a few minutes — you don't need to upload anything.</li>
        </ul>
      </ObsStep>

      <ObsStep n={7} title="Do a test first">
        <p>At least a day before, stream for a few minutes with the seminar team watching the preview. Anything streamed before the seminar is recorded too, so tell the team after the test so they can remove the test recording if needed.</p>
      </ObsStep>
    </Shell>
  )
}

// ── Seminar terms & conditions ───────────────────────────────────────────────
// NOTE: have the text checked by a lawyer.
function H({ children }) { return <h2 className="text-lg font-bold mt-8 mb-2">{children}</h2> }

function TermsPage({ session }) {
  return (
    <Shell>
      <SubNav signedIn={session.signedIn} />
      <article className="text-sm text-black/80 leading-relaxed">
        <h1 className="text-2xl md:text-3xl font-bold text-black">Online seminar terms &amp; conditions</h1>
        <p className="text-black/50 mt-1">Last updated: 4 November 2026</p>
        <p className="mt-4">These terms apply to bookings for GEL.IT.UP live online seminars and their recordings made at gelitup.com/seminars. The seller is <strong>Thermitek Ltd</strong>, 8 Racho Dimchev, 1000 Sofia, Bulgaria, VAT no. BG202102027, email info@gelitup.com (“we”, “us”). Products such as seminar kits are also subject to the general terms of shop.gelitup.com.</p>

        <H>1. Booking and payment</H>
        <ul className="list-disc pl-5 space-y-1">
          <li>A booking is confirmed when payment is completed and you receive our confirmation email with your personal access code.</li>
          <li>Full payment is required at checkout, using the payment methods offered at checkout.</li>
          <li>Prices are shown in euro and include VAT where applicable. We may correct obvious pricing errors before your booking is confirmed; if this affects you, we will contact you and you may cancel free of charge.</li>
          <li>Online booking closes {BOOKING_CUTOFF_HOURS} hours before the seminar starts.</li>
          <li>Participants must be 18 years or older.</li>
        </ul>

        <H>2. Cancellation and refunds</H>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>By you, more than {CANCEL_HOURS} hours before the start:</strong> you can cancel free of charge in My seminars at gelitup.com/seminars and receive a full refund of the seminar seat to your original payment method, usually within 5–10 working days.</li>
          <li><strong>By you, less than {CANCEL_HOURS} hours before the start, or if you do not attend:</strong> the seat cannot be cancelled or refunded. You keep access to the recording for the replay period.</li>
          <li><strong>Your right of withdrawal (consumers in the EU):</strong> when you book, you expressly ask us to provide the seminar on the booked date and to make the recording available afterwards, even if this falls within the 14-day withdrawal period, and you acknowledge that you lose your right of withdrawal once the seminar has been provided and the recording made available. Before that point, cancellation is handled as described above. Nothing in these terms limits rights you have under mandatory consumer law in your country.</li>
          <li><strong>By us:</strong> if we cancel or move a seminar, you can choose a seat on the new date or a full refund.</li>
          <li><strong>Seminar kits</strong> are physical products. The normal 14-day right of withdrawal and the shop’s shipping and returns policy apply to them; a kit is not refunded automatically when a seat is cancelled.</li>
          <li>Business customers (buying for their salon or business) do not have the consumer right of withdrawal; the {CANCEL_HOURS}-hour cancellation rule applies to them in the same way.</li>
        </ul>

        <H>3. Access and use</H>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each access code is for one participant. If you book several seats, forward one code to each participant; once a code has been used, it is linked to that person’s email address and cannot be transferred.</li>
          <li>A code works on one device at a time. Sharing codes, links or the stream with others is not allowed.</li>
          <li>The live seminar and recording are our intellectual property. You may not record, copy, download, publish or redistribute them.</li>
          <li>If these rules are broken, we may suspend access without a refund.</li>
          <li>The recording is available to participants for 30 days after the seminar. After that, access ends.</li>
          <li>You need a stable internet connection and an up-to-date browser. We are not responsible for problems with your own device or connection; if the seminar cannot take place because of a problem on our side, we will reschedule or refund.</li>
        </ul>

        <H>4. Seminar recordings</H>
        <ul className="list-disc pl-5 space-y-1">
          <li>Where a seminar is offered as a recording, you can buy access to it after the live date. Access lasts {30} days from purchase, unless the booking page states another period.</li>
          <li>A recording is <strong>digital content</strong>. When you buy it you expressly ask for access to start immediately, and you acknowledge that you lose your right of withdrawal once access has started. Recordings therefore cannot be cancelled or refunded once purchased. The {CANCEL_HOURS}-hour cancellation rule applies only to live seats.</li>
          <li>Recording access codes are personal and non-transferable, work on one device at a time, and may not be shared. Downloading, recording or redistributing the video is not allowed.</li>
          <li>If the recording cannot be played because of a problem on our side, we will fix it or refund you.</li>
        </ul>

        <H>Private 1-on-1 sessions</H>
        <ul className="list-disc pl-5 space-y-1">
          <li>You request a private session with your preferred dates and times. We confirm one date and time with the trainer and send you a payment link; the session is booked once payment is received.</li>
          <li><strong>Cancellation:</strong> you can cancel free of charge, with a full refund, up to {PRIVATE_CANCEL_HOURS} hours before the confirmed start. Less than {PRIVATE_CANCEL_HOURS} hours before the start, or if you do not attend, the session cannot be refunded. You may ask to move the session once, free of charge, if you tell us at least {PRIVATE_CANCEL_HOURS} hours before the start.</li>
          <li>When you pay, you expressly ask us to provide the session on the confirmed date, even if this falls within the 14-day withdrawal period, and you acknowledge that you lose your right of withdrawal once the session has been provided. If we have to cancel or move the session, you can choose a new date or a full refund.</li>
        </ul>

        <H>5. Certificates and professional use</H>
        <ul className="list-disc pl-5 space-y-1">
          <li>Where a certificate of participation is offered, it is issued after the seminar to participants who attended or completed the course and paid in full.</li>
          <li>A certificate of participation confirms that you took part in the training. It is not a professional qualification. Whether it is accepted for professional insurance, licensing or other purposes is decided by your insurer and the rules in your country.</li>
          <li>Products and techniques shown are for professional use. Always follow the product instructions and the health and safety rules that apply in your country.</li>
        </ul>

        <H>6. Personal data</H>
        <p>We use your name, email address and booking details to provide the seminar, send your access code and handle cancellations. See our <Link to="/privacy-policy" className="underline" style={{ color: BRAND }}>privacy policy</Link>.</p>

        <H>7. Questions and complaints</H>
        <p>Contact us at info@gelitup.com and we will reply as soon as possible. If we cannot resolve a complaint, consumers can contact the competent consumer protection or alternative dispute resolution body in their country. These terms are governed by the law of Bulgaria; this does not remove the protection of mandatory consumer law in your country of residence.</p>
      </article>
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
      <Route path="terms" element={<TermsPage session={session} />} />
      <Route path="admin" element={<AdminPage />} />
      <Route path="admin/private/:id" element={<PrivateReply />} />
      <Route path="trainer" element={<TrainerPage />} />
      <Route path="obs-guide" element={<ObsGuide />} />
      <Route path="*" element={<Navigate to="/seminars" replace />} />
    </Routes>
  )
}
