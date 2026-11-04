import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Admin portal → Seminars: a quick view of everything happening in the seminars
// (all trainers). Full management stays at gelitup.com/seminars/admin.
const BRAND = '#D43790'
const TZ = 'Europe/Athens'
const zone = (iso) => { try { return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, timeZoneName: 'short' }).formatToParts(new Date(iso)).find((x) => x.type === 'timeZoneName')?.value || 'EET' } catch { return 'EET' } }
const fDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const fTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const when = (iso) => (iso ? `${fDate(iso)} · ${fTime(iso)} ${zone(iso)}` : '')

function Tile({ label, value, tone = 'dark' }) {
  const style = tone === 'dark' ? { background: BRAND, color: '#fff' } : { background: '#F9D3E6', color: '#9E1F63' }
  return (
    <div className="rounded-2xl px-4 py-3" style={style}>
      <p className="text-3xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-90">{label}</p>
    </div>
  )
}

export default function SeminarsOverviewPanel() {
  const [state, setState] = useState('loading')
  const [rows, setRows] = useState([])
  const [calendar, setCalendar] = useState([])
  const [requests, setRequests] = useState([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    ;(async () => {
      const [dash, cal, req] = await Promise.all([
        supabase.rpc('seminar_trainer_dashboard'),
        supabase.rpc('seminar_team_calendar'),
        supabase.from('seminar_private_requests').select('id, name, country, status, created_at, seminar_id, confirmed_start, paid_at, wants_kit').in('status', ['new', 'contacted', 'confirmed', 'paid']).order('created_at', { ascending: false }).limit(50),
      ])
      if (dash.error) { setState('error'); return }
      setRows(Array.isArray(dash.data) ? dash.data : [])
      setCalendar(Array.isArray(cal.data) ? cal.data : [])
      setRequests(req.data || [])
      setNow(Date.now())
      setState('ready')
    })()
  }, [])

  if (state === 'loading') return <p className="py-8 text-center text-sm text-slate-400">Loading seminars…</p>
  if (state === 'error') return <p className="py-8 text-center text-sm text-red-600">Could not load the seminars. Try signing in again.</p>

  const endOf = (r) => new Date(r.starts_at).getTime() + (r.duration_minutes || 120) * 60000
  const upcoming = rows.filter((r) => endOf(r) >= now)
  const titleOf = (id) => rows.find((r) => r.id === id)?.title || 'Private seminar'
  const waiting = requests.filter((r) => r.status === 'new' || r.status === 'contacted')
  const agreed = requests.filter((r) => (r.status === 'confirmed' || r.status === 'paid') && r.confirmed_start && new Date(r.confirmed_start).getTime() >= now)
  const seats = upcoming.reduce((n, r) => n + Number(r.seats_booked || 0), 0)
  const recordings = rows.reduce((n, r) => n + Number(r.recordings_sold || 0), 0)
  const soon = calendar.filter((x) => new Date(x.end).getTime() >= now && new Date(x.start).getTime() <= now + 30 * 86400000)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Seminars</h2>
          <p className="text-sm text-slate-500">All trainers · times in EET (Greece / Bulgaria / Romania), 24-hour clock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/seminars/admin" className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: BRAND }}>Manage seminars →</a>
          <a href="/seminars/trainer" className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: BRAND, color: BRAND }}>Trainer view</a>
          <a href="/seminars" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Public page</a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Upcoming seminars" value={upcoming.length} />
        <Tile label="Seats booked (upcoming)" value={seats} />
        <Tile label="Private requests waiting" value={waiting.length} tone="light" />
        <Tile label="Private 1-on-1s agreed" value={agreed.length} tone="light" />
        <Tile label="Recordings sold" value={recordings} tone="light" />
      </div>

      <section>
        <h3 className="font-bold text-slate-900">Upcoming group seminars</h3>
        {upcoming.length === 0 ? <p className="mt-2 text-sm text-slate-500">No upcoming seminars.</p> : (
          <div className="mt-2 overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="p-3">When</th><th className="p-3">Seminar</th><th className="p-3">Trainer</th><th className="p-3">Booked</th><th className="p-3">Signed in</th><th className="p-3">Vimeo</th></tr>
              </thead>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 whitespace-nowrap font-semibold">{when(r.starts_at)}</td>
                    <td className="p-3">{r.title}</td>
                    <td className="p-3">{r.trainer_name || '—'}</td>
                    <td className="p-3 font-bold" style={{ color: BRAND }}>{r.seats_booked}</td>
                    <td className="p-3">{r.seats_signed_in}</td>
                    <td className="p-3">{r.live_embed_url ? <span className="text-emerald-700 font-semibold">✓ linked</span> : <span className="text-amber-700 font-semibold">not added yet</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-bold text-slate-900">Private 1-on-1 requests waiting for a reply</h3>
        {waiting.length === 0 ? <p className="mt-2 text-sm text-slate-500">None — all answered.</p> : (
          <div className="mt-2 divide-y rounded-2xl border text-sm">
            {waiting.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-semibold">{r.name}</span>
                <span className="text-slate-500">{r.country || ''}{r.wants_kit ? ' · wants kit' : ''}</span>
                <span className="text-slate-600">{titleOf(r.seminar_id)}</span>
                <span className="text-xs text-slate-400">received {fDate(r.created_at)}</span>
                <a href={`/seminars/admin/private/${r.id}`} className="ml-auto font-semibold underline" style={{ color: BRAND }}>Reply →</a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-bold text-slate-900">Team calendar — next 30 days</h3>
        {soon.length === 0 ? <p className="mt-2 text-sm text-slate-500">Nothing booked in the next 30 days.</p> : (
          <div className="mt-2 divide-y rounded-2xl border text-sm">
            {soon.map((x, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-56 font-semibold">{fDate(x.start)} · {fTime(x.start)}–{fTime(x.end)} {zone(x.start)}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase" style={x.kind === 'group' ? { background: BRAND, color: '#fff' } : { background: '#F9D3E6', color: '#9E1F63' }}>{x.kind === 'group' ? 'Online group' : 'Private 1-on-1'}</span>
                <span className="text-slate-700">{x.title || ''}</span>
                <span className="text-slate-500">{x.trainer || ''}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
