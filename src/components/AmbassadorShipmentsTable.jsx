import { useMemo, useState } from 'react'
import { carrierLabel, deliveryState, normalizeCountry } from '../lib/ambassadorShipping.js'
import { instagramHandle, instagramUrl, tiktokHandle, tiktokUrl } from '../lib/socialLinks.js'
import { whereAlreadySent } from '../lib/packageItems.js'

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
  if (delivery === 'lost') return 'overdue' // never arrived: resend now
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

// Instagram (and TikTok) one click away, to check they are posting.
function SocialLinks({ row }) {
  const ig = instagramHandle(row.instagram)
  const tt = tiktokHandle(row.tiktok)
  if (!ig && !tt) return <p className="text-amber-700">No Instagram on file</p>
  return (
    <p className="flex flex-wrap gap-x-2">
      {ig && <a href={instagramUrl(row.instagram)} target="_blank" rel="noreferrer" title="Open Instagram profile" className="font-medium text-fuchsia-700 hover:underline">IG @{ig}</a>}
      {tt && <a href={tiktokUrl(row.tiktok)} target="_blank" rel="noreferrer" title="Open TikTok profile" className="text-slate-600 hover:underline">TikTok @{tt}</a>}
    </p>
  )
}

const TYPE_OPTIONS = [['standard_ambassador', 'Standard'], ['super_ambassador', 'Super'], ['extreme_ambassador', 'Extreme']]

// Before the first package goes out, the type can be ticked right here.
function TypePicker({ row, type, onSetType, busy }) {
  return (
    <div className={`mt-1 rounded border px-1.5 py-1 ${type ? 'border-slate-200' : 'border-amber-300 bg-amber-50'}`}>
      {!type && <p className="text-[10px] font-semibold text-amber-800">Tick the type:</p>}
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map(([key, label]) => (
          <label key={key} className="inline-flex items-center gap-1 text-[11px] text-slate-700">
            <input type="checkbox" checked={type === key} disabled={busy} onChange={() => onSetType(row, type === key ? '' : key)} />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}

function NameCell({ line, getType, onOpen, onSetType, onAskChoice, busy }) {
  const { row, country } = line
  return (
    <td className="px-3 py-2.5">
      <button type="button" onClick={() => onOpen(row.id)} className="text-left font-semibold text-slate-900 hover:text-fuchsia-700 hover:underline">
        {row.full_name || row.email}
      </button>
      <SocialLinks row={row} />
      <p className="text-slate-500">{[country, TYPE_LABEL[getType(row)], row.discount_code].filter(Boolean).join(' · ')}</p>
      {line.isFirst && onSetType && <TypePicker row={row} type={getType(row)} onSetType={onSetType} busy={busy} />}
      {!line.isFirst && row.choice_submitted_at && <p className="mt-1 text-[11px] font-semibold text-emerald-700">✓ Chose 5 products {fmt(row.choice_submitted_at)}</p>}
      {!line.isFirst && !row.choice_submitted_at && row.choice_requested_at && (
        <p className="mt-1 text-[11px] text-amber-700">✉ Asked to choose {fmt(row.choice_requested_at)} · waiting{onAskChoice && <> · <button type="button" onClick={() => onAskChoice(row)} disabled={busy} className="underline">remind</button></>}</p>
      )}
      {!line.isFirst && !row.choice_submitted_at && !row.choice_requested_at && onAskChoice && String(row.status).toLowerCase() === 'approved' && (
        <button type="button" onClick={() => onAskChoice(row)} disabled={busy} className="mt-1 text-[11px] font-semibold text-fuchsia-700 hover:underline">✉ Ask her to choose 5 products</button>
      )}
    </td>
  )
}

// Items for the next package: type and Add, remove with ✕. Saved straight away.
// Anything this ambassador already received is blocked unless ticked on purpose.
function Planner({ line, onAdd, onRemove, busy }) {
  const [text, setText] = useState('')
  const items = line.planned
  const sentBefore = (item) => whereAlreadySent(item, line.shipments)
  const sentLabel = (hits) => hits.map((h) => `#${h.number}${h.sent_at ? ` (${fmt(h.sent_at)})` : ''}`).join(', ')
  // Anything already sent is blocked unless "send again on purpose" is ticked.
  const [sendAgain, setSendAgain] = useState(false)
  const typedRepeat = text.trim() ? sentBefore(text) : []
  const blocked = typedRepeat.length > 0 && !sendAgain
  const add = async (values, { allowRepeat = false } = {}) => {
    const clean = values.map((v) => String(v || '').trim()).filter(Boolean)
      .filter((v) => allowRepeat || sentBefore(v).length === 0)
    if (!clean.length) return
    const ok = await onAdd(line.row, clean)
    if (ok) { setText(''); setSendAgain(false) }
  }
  return (
    <div className="min-w-[230px] space-y-1.5">
      {items.length === 0
        ? <p className="text-slate-400">Nothing added</p>
        : (
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={`${i}-${item}`} className="flex items-start justify-between gap-2 rounded border border-fuchsia-100 bg-fuchsia-50/50 px-2 py-1 text-slate-800">
                <span>
                  {item}
                  {sentBefore(item).length > 0 && (
                    <span className="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">⚠ already sent in {sentLabel(sentBefore(item))}</span>
                  )}
                </span>
                <button type="button" title="Remove" onClick={() => onRemove(line.row, i)} disabled={busy} className="shrink-0 text-slate-400 hover:text-rose-600 disabled:opacity-50">✕</button>
              </li>
            ))}
          </ul>
        )}
      <form
        className="flex gap-1"
        onSubmit={(e) => { e.preventDefault(); if (!blocked) add([text], { allowRepeat: sendAgain }) }}
      >
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setSendAgain(false) }}
          placeholder="Add an item…"
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-[11px]"
        />
        <button type="submit" disabled={busy || !text.trim() || blocked} className="rounded border border-fuchsia-300 bg-white px-2 py-1 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-50">Add</button>
      </form>
      {typedRepeat.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-800">
          <p className="font-semibold">Already sent in package {sentLabel(typedRepeat)} — can't be added.</p>
          <label className="mt-0.5 flex items-center gap-1">
            <input type="checkbox" checked={sendAgain} onChange={(e) => setSendAgain(e.target.checked)} />
            Send it again on purpose
          </label>
        </div>
      )}
    </div>
  )
}

// Every package this ambassador has had, newest first.
function PackageHistory({ line, open = false, onEditContents, onMarkLost, onEditNote }) {
  const { shipments } = line
  if (!shipments.length) return <span className="text-slate-400">Nothing sent yet</span>
  const n = shipments.length
  return (
    <details open={open} className="group">
      <summary className="cursor-pointer list-none font-semibold text-slate-700 hover:text-fuchsia-700">
        <span aria-hidden="true" className="group-open:hidden">▸</span><span aria-hidden="true" className="hidden group-open:inline">▾</span> {n} package{n === 1 ? '' : 's'} sent
      </summary>
      <ol className="mt-2 space-y-2">
        {shipments.map((pkg, i) => (
          <li key={pkg.id || i} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">#{n - i} · {fmt(pkg.sent_at) || 'date not recorded'}</span>
              {pkg.lost_at
                ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">✕ LOST — not received</span>
                : pkg.delivered_at
                  ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">✓ Received {fmt(pkg.delivered_at)}</span>
                  : <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">Sent · not confirmed</span>}
            </div>
            <p className="mt-0.5"><Tracking pkg={pkg} /></p>
            {Array.isArray(pkg.items) && pkg.items.length > 0
              ? <p className="mt-0.5 text-slate-600">{pkg.items.join(', ')}</p>
              : <p className="mt-0.5 text-amber-700">Contents not recorded</p>}
            {pkg.note && <p className="mt-1 rounded bg-amber-50 px-1.5 py-1 text-amber-900">📝 {pkg.note}</p>}
            {pkg.delivered_at && pkg.delivered_by === 'ambassador (email link)' && <p className="mt-0.5 text-[10px] text-emerald-700">Confirmed by the ambassador from the email link</p>}
            <div className="mt-1 flex flex-wrap gap-3">
              {onEditContents && pkg.id && (
                <button type="button" onClick={() => onEditContents(line.row, pkg)} className="text-[10px] font-semibold text-fuchsia-700 hover:underline">
                  {Array.isArray(pkg.items) && pkg.items.length > 0 ? 'Edit contents' : '+ Add what was in this package'}
                </button>
              )}
              {onEditNote && pkg.id && (
                <button type="button" onClick={() => onEditNote(line.row, pkg)} className="text-[10px] font-semibold text-slate-600 hover:underline">
                  {pkg.note ? 'Edit note' : '+ Note'}
                </button>
              )}
              {onMarkLost && pkg.id && !pkg.lost_at && (
                <button type="button" onClick={() => onMarkLost(line.row, pkg)} className="text-[10px] font-semibold text-red-700 hover:underline">
                  Not received — mark lost
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </details>
  )
}

export default function AmbassadorShipmentsTable({ rows, getMeta, getType, plannedItems, onAddPlanned, onRemovePlanned, savingId, onEditContents, onSetType, onMarkLost, onEditNote, onAskChoice, onOpen, onMarkReceived, busyShipmentId }) {
  const [carrier, setCarrier] = useState('')
  // Package history (with what was in each package) is shown open by default.
  const [expandAll, setExpandAll] = useState(true)
  const [country, setCountry] = useState('')

  const lines = useMemo(() => (rows || [])
    .filter((row) => ['approved', 'paused'].includes(String(row.status || '').toLowerCase()))
    .map((row) => {
      const shipments = Array.isArray(row._shipments) ? row._shipments : []
      const sorted = [...shipments].sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0))
      const last = sorted[0] || null
      const isPaused = String(row.status).toLowerCase() === 'paused'
      const meta = getMeta(row)
      const nextAt = isPaused ? null : meta.nextReminderAt
      const nextIn = daysFromToday(nextAt)
      const delivery = deliveryState(last)
      const hasEverShipped = Boolean(last) || Boolean(meta.shipmentPreviouslySent)
      return {
        row,
        last,
        shipments: sorted,
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

  const planner = (l) => (
    <Planner
      line={l}
      onAdd={onAddPlanned}
      onRemove={onRemovePlanned}
      busy={savingId === l.row.id}
    />
  )

  const renderTable = (key, list) => {
    if (key === 'overdue') {
      return (
        <table className="w-full min-w-[980px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Was due</th><th className={th}>Late by</th><th className={th}>What goes in this package</th><th className={th}>All packages</th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} onSetType={onSetType} onAskChoice={onAskChoice} busy={savingId === l.row.id} />
                <td className={td}>{fmt(l.nextAt)}</td>
                <td className="px-3 py-2.5 font-bold text-red-700">{Math.abs(l.nextIn)} day{Math.abs(l.nextIn) === 1 ? '' : 's'}</td>
                <td className={td}>{planner(l)}</td>
                <td className={td}><PackageHistory key={`h-${l.row.id}-${expandAll}`} line={l} open={expandAll} onEditContents={onEditContents} onMarkLost={onMarkLost} onEditNote={onEditNote} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    if (key === 'soon') {
      return (
        <table className="w-full min-w-[980px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Due</th><th className={th}>What goes in this package</th><th className={th}>All packages</th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} onSetType={onSetType} onAskChoice={onAskChoice} busy={savingId === l.row.id} />
                <td className={td}>
                  {l.isFirst
                    ? <span className="font-semibold text-amber-800">First package{l.firstAcknowledged ? '' : ' · factory not told yet'}</span>
                    : <><span className="font-semibold">{fmt(l.nextAt)}</span><br /><span className="text-slate-500">{l.nextIn === 0 ? 'today' : `in ${l.nextIn} day${l.nextIn === 1 ? '' : 's'}`}</span></>}
                </td>
                <td className={td}>{planner(l)}</td>
                <td className={td}><PackageHistory key={`h-${l.row.id}-${expandAll}`} line={l} open={expandAll} onEditContents={onEditContents} onMarkLost={onMarkLost} onEditNote={onEditNote} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    if (key === 'transit') {
      return (
        <table className="w-full min-w-[980px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Sent</th><th className={th}>Carrier &amp; tracking</th><th className={th}>Expected delivery</th><th className={th}></th><th className={th}>Plan next package</th><th className={th}>All packages</th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} onSetType={onSetType} onAskChoice={onAskChoice} busy={savingId === l.row.id} />
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
                <td className={td}>{planner(l)}</td>
                <td className={td}><PackageHistory key={`h-${l.row.id}-${expandAll}`} line={l} open={expandAll} onEditContents={onEditContents} onMarkLost={onMarkLost} onEditNote={onEditNote} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    if (key === 'complete') {
      return (
        <table className="w-full min-w-[980px] text-xs">
          <thead><tr><th className={th}>Ambassador</th><th className={th}>Last package</th><th className={th}>Received</th><th className={th}>Carrier &amp; tracking</th><th className={th}>Next package due</th><th className={th}>Plan next package</th><th className={th}>All packages</th></tr></thead>
          <tbody className="divide-y divide-slate-100 align-top">
            {list.map((l) => (
              <tr key={l.row.id}>
                <NameCell line={l} getType={getType} onOpen={onOpen} onSetType={onSetType} onAskChoice={onAskChoice} busy={savingId === l.row.id} />
                <td className={td}>{fmt(l.last?.sent_at)}<br /><span className="text-slate-500">Package #{l.count}</span></td>
                <td className={td}>
                  <span className="font-semibold text-emerald-700">✓ {fmt(l.last?.delivered_at)}</span>
                  {l.last?.delivered_by === 'ambassador' && <><br /><span className="text-slate-500">confirmed by ambassador</span></>}
                </td>
                <td className={td}><Tracking pkg={l.last} /></td>
                <td className={td}>{l.nextAt ? <>{fmt(l.nextAt)}<br /><span className="text-slate-500">in {l.nextIn} days</span></> : <span className="text-slate-400">No date set</span>}</td>
                <td className={td}>{planner(l)}</td>
                <td className={td}><PackageHistory key={`h-${l.row.id}-${expandAll}`} line={l} open={expandAll} onEditContents={onEditContents} onMarkLost={onMarkLost} onEditNote={onEditNote} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    return (
      <table className="w-full min-w-[980px] text-xs">
        <thead><tr><th className={th}>Ambassador</th><th className={th}>All packages</th></tr></thead>
        <tbody className="divide-y divide-slate-100 align-top">
          {list.map((l) => (
            <tr key={l.row.id}>
              <NameCell line={l} getType={getType} onOpen={onOpen} onSetType={onSetType} onAskChoice={onAskChoice} busy={savingId === l.row.id} />
              <td className={td}><PackageHistory key={`h-${l.row.id}-${expandAll}`} line={l} open={expandAll} onEditContents={onEditContents} onMarkLost={onMarkLost} onEditNote={onEditNote} /></td>
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

      {(() => {
        const missing = lines.flatMap((l) => l.shipments
          .filter((pkg) => !pkg.lost_at && !(Array.isArray(pkg.items) && pkg.items.length))
          .map((pkg) => `${l.row.full_name} (${fmt(pkg.sent_at)})`))
        return missing.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>{missing.length} package{missing.length === 1 ? '' : 's'} with no contents recorded:</strong> {missing.join(', ')}.
            {' '}Open the package history and click "+ Add what was in this package".
          </div>
        )
      })()}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setExpandAll((v) => !v)}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {expandAll ? 'Collapse package history' : 'Show what was in every package'}
        </button>
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
