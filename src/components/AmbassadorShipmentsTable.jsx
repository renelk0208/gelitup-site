import { useMemo, useState } from 'react'
import { carrierLabel, deliveryState, normalizeCountry } from '../lib/ambassadorShipping.js'

// Shipments overview, grouped so every ambassador sits in exactly ONE section
// with ONE status:
//   1. Overdue      – their next package should already have gone out
//   2. To send soon – next package due within 14 days, or first package to send
//   3. On the way   – a package has been sent and isn't confirmed received yet
//   4. Complete     – last package received, next one not due yet
//   5. Paused
// Data comes from the rows the Ambassadors panel already loaded (with their
// ambassador_shipments attached as row._shipments).

const DAY = 24 * 60 * 60 * 1000
const SOON_DAYS = 14

const fmt = (iso) => {
  if (!iso) return ''
  const d = new Date(String(iso).length === 10 ? `${iso}T12:00:00Z` : iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
const daysFromToday = (iso) => {
  if (!iso) return null
  const d = new Date(String(iso).length === 10 ? `${iso}T12:00:00Z` : iso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date(); today.setHours(12, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / DAY)
}

const TYPE_LABEL = { standard_ambassador: 'Standard', super_ambassador: 'Super', extreme_ambassador: 'Extreme' }

const SECTIONS = [
  {
    key: 'overdue',
    title: 'Overdue',
    hint: 'Their next package should already have been sent.',
    tone: { bar: 'bg-red-600', head: 'bg-red-50 text-red-800', count: 'bg-red-600 text-white' },
  },
  {
    key: 'soon',
    title: 'To send soon',
    hint: `Next package due in the next ${SOON_DAYS} days, or their first package still to send.`,
    tone: { bar: 'bg-amber-500', head: 'bg-amber-50 text-amber-900', count: 'bg-amber-500 text-white' },
  },
  {
    key: 'transit',
    title: 'On the way',
    hint: 'Package sent. Waiting for the ambassador to confirm it arrived.',
    tone: { bar: 'bg-sky-600', head: 'bg-sky-50 text-sky-900', count: 'bg-sky-600 text-white' },
  },
  {
    key: 'complete',
    title: 'Complete',
    hint: 'Last package received. Nothing to do until the next one is due.',
    tone: { bar: 'bg-emerald-600', head: 'bg-emerald-50 text-emerald-900', count: 'bg-emerald-600 text-white' },
  },
  {
    key: 'paused',
    title: 'Paused',
    hint: 'No packages are sent while paused.',
    tone: { bar: 'bg-slate-400', head: 'bg-slate-50 text-slate-700', count: 'bg-slate-500 text-white' },
  },
]

function sectionFor({ isPaused, hasEverShipped, nextIn, delivery }) {
  if (isPaused) return 'paused'
  if (!hasEverShipped) return 'soon' // first package still to send
  if (nextIn != null && nextIn < 0) return 'overdue'
  if (nextIn != null && nextIn <= SOON_DAYS) return 'soon'
  if (delivery && delivery !== 'received') return 'transit'
  return 'complete'
}

function Tracking({ pkg }) {
  if (!pkg?.tracking_number && !pkg?.tracking_url) return <span className="text-slate-400">No tracking</span>
  return (
    <span>
      <span className="font-semibold text-slate-700">{carrierLabel(pkg.carrier) || 'Carrier'}</span>{' '}
      {pkg.tracking_url
        ? <a href={pkg.tracking_url} target="_blank" rel="noreferrer" className="text-fuchsia-700 hover:underline">{pkg.tracking_number || 'track'}</a>
        : <span className="text-slate-600">{pkg.tracking_number}</span>}
    </span>
  )
}

function NameCell({ line, getType, onOpen }) {
  const { row, country } = line
  return (
    <td className="px-3 py-2.5">
      <button type="button" onClick={() => onOpen(row.id)} className="text-left font-semibold text-slate-900 hover:text-fuchsia-700 hover:underline">
        {row.full_name || row.email}
      </button>
      <p className="text-slate-500">{[country, TYPE_LABEL[getType(row)], row.discount_code].filter(Boolean).join(' · ')}</p>
    </td>
  )
}

function Planned({ items }) {
  if (!items.length) return <span className="text-amber-700">Not planned yet</span>
  return <ul className="list-disc space-y-0.5 pl-4 text-slate-700">{items.map((p, i) => <li key={i}>{p}</li>)}</ul>
}

function LastPackageNote({ line }) {
  const { last, count } = line
  if (!last) return <span className="text-slate-400">Nothing sent yet</span>
  return (
    <span className="text-slate-500">
      #{count} sent {fmt(last.sent_at)}{last.delivered_at ? ' · received' : ' · not confirmed yet'}
    </span>
  )
}

export default function AmbassadorShipmentsTable({ rows, getMeta, getType, plannedItems, onOpen, onMarkReceived, busyShipmentId }) {
  const [carrier, setCarrier] = useState('')
  const [country, setCountry] = useState('')

  const lines = useMemo(() => (rows || [])
    .filter((row) => ['approved', 'paused'].includes(String(row.status || '').toLowerCase()))
    .map((row) => {
      const shipments = Array.isArray(row._shipments) ? row._shipments : []
      const last = [...shipments].sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0))[0] || null
      const isPaused = String(row.status).toLowerCase() === 'paused'
      const meta = getMeta(row)
      const nextAt = isPaused ? null : meta.nextReminderAt
      const nextIn = daysFromToday(nextAt)
      const delivery = deliveryState(last)
      const hasEverShipped = Boolean(last) || Boolean(meta.shipmentPreviouslySent)
      return {
        row,
        last,
        count: shipments.length,
        nextAt,
        nextIn,
        delivery,
        isFirst: !hasEverShipped,
        firstAcknowledged: Boolean(meta.isFactoryAcked),
        country: normalizeCountry(row.country),
        planned: plannedItems(row),
        section: sectionFor({ isPaused, hasEverShipped, nextIn, delivery }),
      }
    }), [rows, getMeta, plannedItems])

  const carriers = [...new Set(lines.map((l) => l.last?.carrier).filter(Boolean))].sort()
  const countries = [...new Set(lines.map((l) => l.country).filter(Boolean))].sort()
  const visible = lines.filter((l) => (!carrier || l.last?.carrier === carrier) && (!country || l.country === country))

  const bySection = Object.fromEntries(SECTIONS.map((s) => [s.key, []]))
  visible.forEach((l) => bySection[l.section].push(l))
  // Most urgent first inside each section.
  bySection.overdue.sort((a, b) => (a.nextIn ?? 0) - (b.nextIn ?? 0))
  bySection.soon.sort((a, b) => (a.isFirst === b.isFirst ? (a.nextIn ?? -999) - (b.nextIn ?? -999) : a.isFirst ? -1 : 1))
  bySection.transit.sort((a, b) => new Date(a.last?.sent_at || 0) - new Date(b.last?.sent_at || 0))
  bySection.complete.sort((a, b) => (a.nextIn ?? 999) - (b.nextIn ?? 999))

  const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
  const td = 'px-3 py-2.5 text-slate-700'

  const renderTable = (key, list) => {
    if (key === 'overdue') {
      return (
        <table className="w-full min-w-[820px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Was due</th><th className={th}>Late by</th><th className={th}>Planned for this package</th><th className={th}>Previous package</th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} />
                <td className={td}>{fmt(l.nextAt)}</td>
                <td className="px-3 py-2.5 font-bold text-red-700">{Math.abs(l.nextIn)} day{Math.abs(l.nextIn) === 1 ? '' : 's'}</td>
                <td className={td}><Planned items={l.planned} /></td>
                <td className={td}><LastPackageNote line={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    if (key === 'soon') {
      return (
        <table className="w-full min-w-[820px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Due</th><th className={th}>Planned for this package</th><th className={th}>Previous package</th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} />
                <td className={td}>
                  {l.isFirst
                    ? <span className="font-semibold text-amber-800">First package{l.firstAcknowledged ? '' : ' · factory not told yet'}</span>
                    : <><span className="font-semibold">{fmt(l.nextAt)}</span><br /><span className="text-slate-500">{l.nextIn === 0 ? 'today' : `in ${l.nextIn} day${l.nextIn === 1 ? '' : 's'}`}</span></>}
                </td>
                <td className={td}><Planned items={l.planned} /></td>
                <td className={td}><LastPackageNote line={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    if (key === 'transit') {
      return (
        <table className="w-full min-w-[820px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Sent</th><th className={th}>Carrier &amp; tracking</th><th className={th}>Expected delivery</th><th className={th}></th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} />
                <td className={td}>{fmt(l.last?.sent_at)}<br /><span className="text-slate-500">Package #{l.count}</span></td>
                <td className={td}><Tracking pkg={l.last} /></td>
                <td className={td}>
                  {fmt(l.last?.expected_delivery) || '—'}
                  {l.delivery === 'late' && <><br /><span className="text-slate-500">should have arrived by now</span></>}
                </td>
                <td className={td}>
                  <button
                    type="button"
                    onClick={() => onMarkReceived(l.row, l.last)}
                    disabled={busyShipmentId === l.last?.id}
                    className="rounded-lg border border-emerald-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    Mark received
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    if (key === 'complete') {
      return (
        <table className="w-full min-w-[820px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Last package</th><th className={th}>Received</th><th className={th}>Carrier &amp; tracking</th><th className={th}>Next package due</th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} />
                <td className={td}>{fmt(l.last?.sent_at)}<br /><span className="text-slate-500">Package #{l.count}</span></td>
                <td className={td}>
                  <span className="font-semibold text-emerald-700">✓ {fmt(l.last?.delivered_at)}</span>
                  {l.last?.delivered_by === 'ambassador' && <><br /><span className="text-slate-500">confirmed by ambassador</span></>}
                </td>
                <td className={td}><Tracking pkg={l.last} /></td>
                <td className={td}>{l.nextAt ? <>{fmt(l.nextAt)}<br /><span className="text-slate-500">in {l.nextIn} days</span></> : <span className="text-slate-400">No date set</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    return (
      <table className="w-full min-w-[820px] text-xs">
        <thead><tr><th className={th}>Ambassador</th><th className={th}>Last package</th><th className={th}>Carrier &amp; tracking</th></tr></thead>
        <tbody className="divide-y divide-slate-100 align-top">
          {list.map((l) => (
            <tr key={l.row.id}>
              <NameCell line={l} getType={getType} onOpen={onOpen} />
              <td className={td}><LastPackageNote line={l} /></td>
              <td className={td}><Tracking pkg={l.last} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <section className="space-y-4" aria-label="Ambassador shipments">
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.key} href={`#ship-${s.key}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-slate-300">
            <div className={`h-1.5 ${s.tone.bar}`} />
            <div className="px-3 py-2">
              <p className="text-2xl font-bold text-slate-900">{bySection[s.key].length}</p>
              <p className="text-xs font-semibold text-slate-600">{s.title}</p>
            </div>
          </a>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-slate-500">
          Carrier
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
            <option value="">All</option>
            {carriers.map((c) => <option key={c} value={c}>{carrierLabel(c)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          Country
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
            <option value="">All</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {SECTIONS.map((s) => {
        const list = bySection[s.key]
        return (
          <details key={s.key} id={`ship-${s.key}`} open={s.key !== 'paused' && s.key !== 'complete'} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <summary className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 ${s.tone.head}`}>
              <span className={`min-w-[2rem] rounded-full px-2 py-0.5 text-center text-sm font-bold ${s.tone.count}`}>{list.length}</span>
              <span className="text-sm font-bold">{s.title}</span>
              <span className="text-xs opacity-80">{s.hint}</span>
            </summary>
            {list.length === 0
              ? <p className="px-4 py-4 text-xs text-slate-500">No one here.</p>
              : <div className="overflow-x-auto">{renderTable(s.key, list)}</div>}
          </details>
        )
      })}

      <p className="text-[11px] text-slate-500">
        Each ambassador appears in one section only. Expected delivery is an estimate from the carrier and country.
        A package moves to Complete when the ambassador confirms it in their portal or you press Mark received.
      </p>
    </section>
  )
}
