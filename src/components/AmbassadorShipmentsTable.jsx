import { useMemo, useState } from 'react'
import { carrierLabel, deliveryState, normalizeCountry } from '../lib/ambassadorShipping.js'

// One line per ambassador: what was sent last, how, when it should arrive,
// whether it did, when the next package is due and what's planned for it.
// Data comes from the rows the Ambassadors panel already loaded (with their
// ambassador_shipments attached as row._shipments).

const fmt = (iso) => {
  if (!iso) return ''
  const d = new Date(String(iso).length === 10 ? `${iso}T12:00:00Z` : iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const TYPE_LABEL = {
  standard_ambassador: 'Standard',
  super_ambassador: 'Super',
  extreme_ambassador: 'Extreme',
}

const NEXT_BADGE = {
  needsNow: { cls: 'bg-red-100 text-red-700', text: (d) => `Next package overdue · ${fmt(d)}` },
  dueSoon: { cls: 'bg-amber-100 text-amber-800', text: (d) => `Due soon · ${fmt(d)}` },
  onTrack: { cls: 'bg-emerald-100 text-emerald-700', text: (d) => fmt(d) },
  newApproval: { cls: 'bg-slate-100 text-slate-700', text: () => 'First package: not yet acknowledged' },
  acknowledgedNoPackage: { cls: 'bg-sky-100 text-sky-800', text: () => 'First package to send' },
  paused: { cls: 'bg-slate-100 text-slate-500', text: () => 'Paused' },
}

// Once a package has gone out it is always green here: red is kept for the
// "Next package" column, i.e. something that still has to be sent.
const DELIVERY_BADGE = {
  received: { cls: 'bg-emerald-600 text-white', text: '✓ Received' },
  late: { cls: 'bg-emerald-100 text-emerald-800', text: '✓ Sent · should have arrived' },
  on_the_way: { cls: 'bg-emerald-100 text-emerald-800', text: '✓ Sent · on the way' },
}

const BUCKET_ORDER = { needsNow: 0, newApproval: 1, acknowledgedNoPackage: 2, dueSoon: 3, onTrack: 4, paused: 5 }

export default function AmbassadorShipmentsTable({ rows, getMeta, getType, plannedItems, onOpen, onMarkReceived, busyShipmentId }) {
  const [show, setShow] = useState('action')
  const [carrier, setCarrier] = useState('')
  const [country, setCountry] = useState('')

  const lines = useMemo(() => (rows || [])
    .filter((row) => ['approved', 'paused'].includes(String(row.status || '').toLowerCase()))
    .map((row) => {
      const shipments = Array.isArray(row._shipments) ? row._shipments : []
      const last = [...shipments].sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0))[0] || null
      const isPaused = String(row.status).toLowerCase() === 'paused'
      const meta = getMeta(row)
      const bucket = isPaused ? 'paused' : meta.bucket
      return {
        row,
        last,
        count: shipments.length,
        bucket,
        nextAt: isPaused ? null : meta.nextReminderAt,
        delivery: deliveryState(last),
        country: normalizeCountry(row.country),
        planned: plannedItems(row),
      }
    })
    .sort((a, b) => {
      const d = BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket]
      if (d) return d
      return new Date(a.nextAt || '2999-01-01') - new Date(b.nextAt || '2999-01-01')
    }), [rows, getMeta, plannedItems])

  const carriers = [...new Set(lines.map((l) => l.last?.carrier).filter(Boolean))].sort()
  const countries = [...new Set(lines.map((l) => l.country).filter(Boolean))].sort()

  const counts = {
    overdue: lines.filter((l) => l.bucket === 'needsNow').length,
    firstPackage: lines.filter((l) => l.bucket === 'newApproval' || l.bucket === 'acknowledgedNoPackage').length,
    dueSoon: lines.filter((l) => l.bucket === 'dueSoon').length,
    late: lines.filter((l) => l.delivery === 'late').length,
    onTheWay: lines.filter((l) => l.delivery === 'on_the_way').length,
  }

  const visible = lines.filter((l) => {
    if (carrier && l.last?.carrier !== carrier) return false
    if (country && l.country !== country) return false
    if (show === 'action') return ['needsNow', 'newApproval', 'acknowledgedNoPackage', 'dueSoon'].includes(l.bucket)
    if (show === 'transit') return l.delivery === 'on_the_way' || l.delivery === 'late'
    if (show === 'paused') return l.bucket === 'paused'
    if (show === 'active') return l.bucket !== 'paused'
    return true
  })

  const SHOW = [
    { key: 'action', label: `Needs action (${counts.overdue + counts.firstPackage + counts.dueSoon})` },
    { key: 'transit', label: `Sent, not confirmed (${counts.onTheWay + counts.late})` },
    { key: 'active', label: 'All active' },
    { key: 'paused', label: 'Paused' },
    { key: 'all', label: 'Everyone' },
  ]

  return (
    <section className="space-y-3" aria-label="Ambassador shipments">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: 'Next package overdue', value: counts.overdue, cls: 'text-red-700' },
          { label: 'First package to send', value: counts.firstPackage, cls: 'text-sky-800' },
          { label: 'Due in 7 days', value: counts.dueSoon, cls: 'text-amber-800' },
          { label: 'Sent · on the way', value: counts.onTheWay, cls: 'text-emerald-700' },
          { label: 'Sent · receipt not confirmed yet', value: counts.late, cls: 'text-slate-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SHOW.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setShow(s.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${show === s.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {s.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1 text-xs text-slate-500">
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[1100px] w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Ambassador</th>
              <th className="px-3 py-2 font-semibold">Last package</th>
              <th className="px-3 py-2 font-semibold">Carrier &amp; tracking</th>
              <th className="px-3 py-2 font-semibold">Expected delivery</th>
              <th className="px-3 py-2 font-semibold">Delivery</th>
              <th className="px-3 py-2 font-semibold">Next package</th>
              <th className="px-3 py-2 font-semibold">Planned for next package</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {visible.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Nothing here right now.</td></tr>
            )}
            {visible.map(({ row, last, count, bucket, nextAt, delivery, country: c, planned }) => {
              const next = NEXT_BADGE[bucket]
              const del = delivery ? DELIVERY_BADGE[delivery] : null
              const type = TYPE_LABEL[getType(row)] || ''
              return (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => onOpen(row.id)} className="text-left font-semibold text-slate-900 hover:text-fuchsia-700 hover:underline">
                      {row.full_name || row.email}
                    </button>
                    <p className="text-slate-500">{[c, type, row.discount_code].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {last ? (
                      <>
                        <p>{fmt(last.sent_at) || 'Date not recorded'}</p>
                        <p className="text-slate-500">Package #{count}</p>
                        {Array.isArray(last.items) && last.items.length > 0 && (
                          <details className="mt-0.5">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">{last.items.length} item{last.items.length === 1 ? '' : 's'}</summary>
                            <ul className="mt-1 list-disc pl-4 text-slate-600">{last.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                          </details>
                        )}
                      </>
                    ) : <span className="text-slate-400">Nothing sent yet</span>}
                  </td>
                  <td className="px-3 py-2">
                    {last?.tracking_number || last?.tracking_url ? (
                      <>
                        <p className="font-semibold text-slate-700">{carrierLabel(last.carrier) || 'Carrier unknown'}</p>
                        {last.tracking_url
                          ? <a href={last.tracking_url} target="_blank" rel="noreferrer" className="text-fuchsia-700 hover:underline">{last.tracking_number || 'Track parcel'}</a>
                          : <p className="text-slate-600">{last.tracking_number}</p>}
                      </>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{last?.expected_delivery ? fmt(last.expected_delivery) : <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2">
                    {del ? (
                      <div className="space-y-1">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${del.cls}`}>{del.text}</span>
                        {delivery === 'received' && last?.delivered_at && (
                          <p className="text-slate-500">{fmt(last.delivered_at)}{last.delivered_by === 'ambassador' ? ' · by ambassador' : ''}</p>
                        )}
                        {delivery !== 'received' && last?.id && (
                          <button
                            type="button"
                            onClick={() => onMarkReceived(row, last)}
                            disabled={busyShipmentId === last.id}
                            className="block rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            Mark received
                          </button>
                        )}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {next && <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${next.cls}`}>{next.text(nextAt)}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {planned.length > 0
                      ? <ul className="list-disc pl-4">{planned.map((p, i) => <li key={i}>{p}</li>)}</ul>
                      : <span className="text-slate-400">Not planned yet</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">
        Green = the package has been sent. "Received" is confirmed by the ambassador in their portal, or ticked here. Red only ever means a next package still has to go out. Expected delivery is an estimate from the carrier and country.
      </p>
    </section>
  )
}
