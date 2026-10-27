import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  GIVEAWAY_SLOTS,
  formatGiveawayDate,
  formatGiveawayMonth,
  giveawaySlotDates,
  nextMonth,
  upcomingGiveawayMonths,
} from '../lib/giveaway'

// Admin: giveaway requests from ambassadors (Shipments view).
// Approve into a slot (week 1, 2 or 3 of a month), waitlist for next month, or
// decline. Each decision emails the ambassador from ambassadors@gelitup.com.

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const firstName = (row) => {
  const n = String(row?.full_name || '').trim().split(/\s+/)[0] || 'there'
  return n.charAt(0).toUpperCase() + n.slice(1)
}
const sign = '<p>With love,<br/>René Krallis<br/>Marketing Director, GEL.IT.UP International</p>'
const wrap = (inner) => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">${inner}</div>`
const productList = (req) => `<ul>${(req.products || []).map((p) => `<li>${esc(p.title)}</li>`).join('')}</ul>`

function approvedEmail(row, req, start, end) {
  const code = String(row?.discount_code || '').trim()
  const handle = String(row?.instagram || '').trim().replace(/^@?/, '@').replace(/^@$/, '@youraccount')
  return {
    subject: 'Your GEL.IT.UP giveaway is approved 🎁',
    html: wrap(`
      <p>Hi ${esc(firstName(row))},</p>
      <p>Great news — your giveaway is approved! Your dates are <strong>${esc(formatGiveawayDate(start))}</strong> to <strong>${esc(formatGiveawayDate(end))}</strong>.</p>
      <p><strong>Prize</strong> (supplied and shipped by GEL.IT.UP to the winner):</p>
      ${productList(req)}
      <p><strong>What to do</strong></p>
      <ol>
        <li>Create your post with real nail content using the prize products — a finished look, not just the boxes.</li>
        <li>Publish it on your start date as an Instagram <strong>Collab</strong> with <strong>@gelitup</strong> and turn on the <strong>Paid partnership</strong> label (or add #ad).</li>
        <li>Start the caption with <strong>GEL.IT.UP</strong> and use #gelitup #gelituprofessional #salons #nailtech #madeineu.</li>
        <li>To enter, followers follow you and @gelitup, like the post and tag 1–2 nail tech friends.</li>
        <li>On the last day, pick the winner with a random comment picker and show the draw in your stories.</li>
        <li>Email the winner's name, Instagram, full address and phone number to <a href="mailto:ambassadors@gelitup.com">ambassadors@gelitup.com</a>. We ship the prize.</li>
        ${code ? `<li>After the draw, post a story: "Didn't win this time? Use my code <strong>${esc(code)}</strong> for 20% off."</li>` : ''}
      </ol>
      <p><strong>Please add these terms at the end of your caption:</strong></p>
      <div style="border-left:3px solid #d43790;padding:8px 12px;background:#fdf0f5">
        Giveaway terms: Runs from ${esc(formatGiveawayDate(start))} to ${esc(formatGiveawayDate(end))} (Greek time). Open to nail technicians, nail students and salons aged 18+ in countries GEL.IT.UP EU ships to; not open to the USA or Italy. No purchase necessary. One winner, chosen at random from valid entries and announced in ${esc(handle)}'s stories. The prize is supplied and shipped by GEL.IT.UP and cannot be exchanged for cash. The winner will only be contacted by ${esc(handle)} or @gelitup, and we will never ask for payment. This giveaway is not sponsored, endorsed or administered by, or associated with, Instagram or Meta.
      </div>
      <p>We can't wait to see it! 💖</p>
      ${sign}`),
  }
}

function waitlistEmail(row, req, forMonth) {
  return {
    subject: 'Your GEL.IT.UP giveaway request — waiting list',
    html: wrap(`
      <p>Hi ${esc(firstName(row))},</p>
      <p>Thank you for your giveaway request! All our giveaway weeks${req.preferred_month ? ` for ${esc(formatGiveawayMonth(req.preferred_month))}` : ''} are already booked, so we've put you on the waiting list.</p>
      <p>You have <strong>priority for ${esc(formatGiveawayMonth(forMonth))}</strong>, and we'll email you your exact dates. Please don't announce anything until then.</p>
      ${sign}`),
  }
}

function declineEmail(row, reason) {
  return {
    subject: 'Your GEL.IT.UP giveaway request',
    html: wrap(`
      <p>Hi ${esc(firstName(row))},</p>
      <p>Thank you for your giveaway request. Unfortunately we can't go ahead with it this time.</p>
      ${reason ? `<p>${esc(reason)}</p>` : ''}
      <p>Please keep creating and reviewing — you're welcome to request again later.</p>
      ${sign}`),
  }
}

const STATUS_STYLE = {
  requested: 'bg-amber-100 text-amber-800',
  waitlisted: 'bg-sky-100 text-sky-800',
  approved: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-600',
}

export default function GiveawayRequestsPanel({ ambassadors = [], sendEmail, adminLabel = 'admin' }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [approving, setApproving] = useState(null) // { id, month, slot }
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.from('ambassador_giveaway_requests').select('*').order('created_at', { ascending: false }).limit(300)
      .then(({ data, error: err }) => {
        if (!alive) return
        setLoading(false)
        if (err) { setError(err.message); return }
        setError('')
        setRequests(data || [])
      })
    return () => { alive = false }
  }, [])

  const byId = useMemo(() => new Map(ambassadors.map((a) => [a.id, a])), [ambassadors])
  const open = requests.filter((r) => r.status === 'requested' || r.status === 'waitlisted')
  const today = new Date().toISOString().slice(0, 10)
  const booked = requests.filter((r) => r.status === 'approved' && r.slot_end && r.slot_end >= today)
    .sort((a, b) => String(a.slot_start).localeCompare(String(b.slot_start)))
  const past = requests.filter((r) => !open.includes(r) && !booked.includes(r))
  const takenStarts = new Set(requests.filter((r) => r.status === 'approved').map((r) => r.slot_start))

  const ambassadorFor = async (req) => {
    const known = byId.get(req.application_id)
    if (known?.email) return known
    const { data } = await supabase.from('ambassador_applications').select('id, full_name, email, instagram, discount_code, country').eq('id', req.application_id).maybeSingle()
    return data
  }

  const decide = async (req, patch, buildEmail, confirmText) => {
    const row = await ambassadorFor(req)
    if (!row?.email) { alert('This ambassador has no email address.'); return }
    if (!window.confirm(confirmText(row))) return
    setBusy(req.id)
    const fullPatch = { ...patch, decided_at: new Date().toISOString(), decided_by: adminLabel }
    const { error: err } = await supabase.from('ambassador_giveaway_requests').update(fullPatch).eq('id', req.id)
    if (err) { setBusy(null); alert(`Not saved: ${err.message}`); return }
    const { subject, html } = buildEmail(row)
    const res = sendEmail ? await sendEmail({ to: row.email, subject, html }) : { ok: false, error: 'No email sender' }
    setBusy(null)
    setApproving(null)
    setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, ...fullPatch } : r)))
    if (!res.ok) alert(`Saved, but the email was not sent: ${res.error || 'unknown error'}`)
  }

  const approve = (req, month, slot) => {
    const dates = giveawaySlotDates(month, slot)
    if (!dates) return
    if (takenStarts.has(dates.start)) { alert('That week is already booked.'); return }
    return decide(
      req,
      { status: 'approved', slot_start: dates.start, slot_end: dates.end },
      (row) => approvedEmail(row, req, dates.start, dates.end),
      (row) => `Approve ${row.full_name}'s giveaway for ${formatGiveawayDate(dates.start)} – ${formatGiveawayDate(dates.end)} and email her?`,
    )
  }
  const waitlist = (req) => {
    const forMonth = nextMonth(req.preferred_month) || upcomingGiveawayMonths(2)[1]
    return decide(
      req,
      { status: 'waitlisted', preferred_month: forMonth },
      (row) => waitlistEmail(row, req, forMonth),
      (row) => `Put ${row.full_name} on the waiting list (priority for ${formatGiveawayMonth(forMonth)}) and email her?`,
    )
  }
  const decline = (req) => {
    const reason = window.prompt('Optional: a short reason to include in her email (leave empty for none)', '')
    if (reason === null) return
    return decide(req, { status: 'declined', decision_note: reason || null }, (row) => declineEmail(row, reason), (row) => `Decline ${row.full_name}'s request and email her?`)
  }

  const months = upcomingGiveawayMonths(4).slice(0, 3)
  const name = (req) => {
    const a = byId.get(req.application_id)
    return a ? `${a.full_name || a.email}${a.country ? ` · ${a.country}` : ''}` : `Ambassador #${req.application_id}`
  }

  const Card = ({ req }) => (
    <li className="rounded-xl border border-slate-200 bg-white p-3 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{name(req)}</strong>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[req.status] || ''}`}>
          {req.status === 'approved' && req.slot_start ? `Booked ${formatGiveawayDate(req.slot_start)}` : req.status}
        </span>
      </div>
      <p className="mt-1 text-slate-600">
        Wants: <strong>{formatGiveawayMonth(req.preferred_month) || '—'}</strong>
        {req.followers ? ` · ${req.followers} followers` : ''}
        {' · '}sent {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </p>
      <p className="mt-1 text-slate-700">Prize: {(req.products || []).map((p) => p.title).join(', ')}</p>
      {req.idea && <p className="mt-1 text-slate-700">Idea: {req.idea}</p>}
      {req.other_links && <p className="mt-1 text-slate-500">Other accounts: {req.other_links}</p>}
      {req.notes && <p className="mt-1 text-slate-500">Notes: {req.notes}</p>}
      {req.decision_note && <p className="mt-1 text-slate-500">Reason given: {req.decision_note}</p>}

      {(req.status === 'requested' || req.status === 'waitlisted') && (
        approving?.id === req.id ? (
          <div className="mt-2 rounded-lg bg-slate-50 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <select value={approving.month} onChange={(e) => setApproving({ ...approving, month: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs">
                {months.map((m) => <option key={m} value={m}>{formatGiveawayMonth(m)}</option>)}
              </select>
              {GIVEAWAY_SLOTS.map((s) => {
                const d = giveawaySlotDates(approving.month, s)
                const taken = takenStarts.has(d.start)
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={taken || busy === req.id}
                    onClick={() => approve(req, approving.month, s)}
                    className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:bg-slate-300"
                  >
                    Week {s}: {d.start.slice(8)}–{d.end.slice(8)}{taken ? ' (booked)' : ''}
                  </button>
                )
              })}
              <button type="button" onClick={() => setApproving(null)} className="text-xs text-slate-500 underline">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === req.id}
              onClick={() => setApproving({ id: req.id, month: months.includes(req.preferred_month) ? req.preferred_month : months[0] })}
              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Approve into a week…
            </button>
            <button type="button" disabled={busy === req.id} onClick={() => waitlist(req)} className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500">
              Waitlist for next month
            </button>
            <button type="button" disabled={busy === req.id} onClick={() => decline(req)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Decline
            </button>
          </div>
        )
      )}
    </li>
  )

  return (
    <details className="mb-4 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/40 p-3" open={open.length > 0}>
      <summary className="cursor-pointer text-sm font-semibold text-fuchsia-800">
        🎁 Giveaway requests
        {open.length > 0 && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] text-white">{open.length} waiting</span>}
        {booked.length > 0 && <span className="ml-2 text-xs font-normal text-slate-500">{booked.length} booked</span>}
      </summary>
      {loading && <p className="mt-2 text-xs text-slate-500">Loading…</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {!loading && !error && (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Waiting for a decision</p>
            {open.length === 0 ? <p className="mt-1 text-xs text-slate-500">No requests waiting.</p> : (
              <ul className="mt-2 space-y-2">{open.map((r) => <Card key={r.id} req={r} />)}</ul>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Booked</p>
            {booked.length === 0 ? <p className="mt-1 text-xs text-slate-500">No giveaways booked.</p> : (
              <ul className="mt-2 space-y-2">{booked.map((r) => <Card key={r.id} req={r} />)}</ul>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowPast((v) => !v)} className="text-xs text-slate-500 underline">
                {showPast ? 'Hide' : 'Show'} past and declined ({past.length})
              </button>
              {showPast && <ul className="mt-2 space-y-2">{past.map((r) => <Card key={r.id} req={r} />)}</ul>}
            </div>
          )}
        </div>
      )}
    </details>
  )
}
