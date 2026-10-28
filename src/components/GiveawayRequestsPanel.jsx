import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AmbassadorReceiptBanner from './AmbassadorReceiptBanner'
import AmbassadorMyReviews from './AmbassadorMyReviews'
import AmbassadorGiveawayCard from './AmbassadorGiveawayCard'
import AmbassadorOptOut from './AmbassadorOptOut'
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
        <li>Start the caption with <strong>GEL.IT.UP</strong>, say clearly that the giveaway is <strong>for qualified nail technicians only</strong>, and use #gelitup #gelituprofessional #salons #nailtech #madeineu.</li>
        <li>To enter, followers follow you and @gelitup, like the post and tag 1–2 nail tech friends.</li>
        <li><strong>GEL.IT.UP draws the winner</strong> at random from the comments the day after your giveaway ends, checks that she follows both accounts and is a qualified nail technician, and lets you know who won. Please don't pick a winner yourself.</li>
        <li>Announce the winner in your stories once we tell you. We contact her and ship the prize.</li>
        ${code ? `<li>Then post a story for everyone else: "Didn't win this time? Use my code <strong>${esc(code)}</strong> for 20% off."</li>` : ''}
      </ol>
      <p><strong>Please add these terms at the end of your caption:</strong></p>
      <div style="border-left:3px solid #d43790;padding:8px 12px;background:#fdf0f5">
        Giveaway terms: Runs from ${esc(formatGiveawayDate(start))} to ${esc(formatGiveawayDate(end))} (Greek time). Open to qualified nail technicians only, aged 18+, in countries GEL.IT.UP EU ships to; not open to the USA or Italy. No purchase necessary. One winner, drawn at random by GEL.IT.UP from valid entries and announced in ${esc(handle)}'s and @gelitup's stories. The winner must reply within 48 hours and show she is a qualified nail technician (a photo of her nail qualification or certificate, plus an Instagram account showing her nail work), otherwise a new winner is drawn. The prize is supplied and shipped by GEL.IT.UP and cannot be exchanged for cash. The winner will only be contacted by @gelitup, and we will never ask for payment. This giveaway is not sponsored, endorsed or administered by, or associated with, Instagram or Meta.
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

function inviteEmail(row) {
  const code = String(row?.discount_code || '').trim()
  return {
    subject: 'You qualify to host a GEL.IT.UP giveaway! 🎁',
    html: wrap(`
      <p>Hi ${esc(firstName(row))},</p>
      <p>Congratulations! Thanks to your reviews and your work with our products, you now qualify to host an official <strong>GEL.IT.UP giveaway</strong> on your Instagram account. 🎉 Your account gains new followers and recognition, GEL.IT.UP reaches more nail professionals, and your followers get a reason to try the products with your code.</p>

      <p><strong>1. Request your giveaway</strong></p>
      <ol>
        <li>Log in to your ambassador page on <a href="https://gelitup.com/portal/login" style="color:#d43790">gelitup.com</a> and open <strong>Request a giveaway</strong>.</li>
        <li>Choose <strong>8 to 10 products</strong> for the prize. You can only choose products you've received <strong>and reviewed</strong> — to add more, review them first.</li>
        <li>Pick your preferred month and tell us the look you'll create.</li>
      </ol>
      <p>We run 3 giveaways a month, one week each, so every giveaway gets our full support. We'll email you your exact week. <strong>Please don't announce anything until we confirm your dates.</strong></p>

      <p><strong>2. Your giveaway post</strong></p>
      <ul>
        <li>An Instagram <strong>Collab post</strong> with <strong>@gelitup</strong>, so it appears on both your feed and ours. Turn on the <strong>Paid partnership</strong> label (or add #ad).</li>
        <li>Real nail content: a finished look or short video made with the prize products, clearly visible — not just the boxes.</li>
        <li>Start the caption with <strong>GEL.IT.UP</strong> and use #gelitup #gelituprofessional #salons #nailtech #madeineu.</li>
      </ul>

      <p><strong>3. How followers enter</strong></p>
      <ul>
        <li>Follow you and @gelitup, like the post, and comment tagging 1–2 nail tech friends.</li>
        <li>Bonus entry (optional): share the post to their story, tagging you and @gelitup.</li>
        <li><strong>Only qualified nail technicians can enter</strong> (aged 18+, in countries GEL.IT.UP EU ships to, <strong>not the USA or Italy</strong>). Please say this clearly at the start of your caption, e.g. "🎁 GIVEAWAY for qualified nail technicians only".</li>
      </ul>

      <p><strong>4. After the giveaway</strong></p>
      <ul>
        <li><strong>GEL.IT.UP draws the winner</strong> at random from the comments, so every entrant gets a fair chance. We check that she follows both accounts and is a qualified nail technician, then tell you who won.</li>
        <li>Announce the winner in your stories. We contact her and supply and ship the prize.</li>
        <li>Then post a story for everyone else: "Didn't win this time? Use my code ${code ? `<strong>${esc(code)}</strong>` : 'YOURCODE'} for 20% off." Every order with your code earns you credit.</li>
      </ul>
      <p>The winner must show us she is a qualified nail technician within 48 hours, otherwise we draw again. Protect your followers from fake accounts: add "The winner will only be contacted by @gelitup. We will never ask for payment or card details." We'll send you the full caption terms with your confirmed dates.</p>

      <p>Thank you for being such an active part of the GEL.IT.UP family! 💖</p>
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

export default function GiveawayRequestsPanel({ ambassadors = [], sendEmail, adminLabel = 'admin', standalone = false }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [approving, setApproving] = useState(null) // { id, month, slot }
  const [showPast, setShowPast] = useState(false)
  // Full ambassador picture per request: { [applicationId]: { loading, error, data } }
  const [details, setDetails] = useState({})
  const [openDetails, setOpenDetails] = useState(null) // request id
  // On/off switch: whether ambassadors see the "Request a giveaway" card.
  const [cardVisible, setCardVisible] = useState(null) // null = loading
  const [switchBusy, setSwitchBusy] = useState(false)
  const [checkId, setCheckId] = useState('')
  const [previewId, setPreviewId] = useState(null) // "Preview her page" modal
  // Giveaway readiness of every approved ambassador (who could be offered a week).
  const [readiness, setReadiness] = useState({ loading: false, error: '', data: null })
  const loadReadiness = async () => {
    setReadiness({ loading: true, error: '', data: null })
    try {
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/giveaway-request?overview=1', { headers: { Authorization: `Bearer ${sess?.session?.access_token || ''}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      setReadiness({ loading: false, error: '', data: json })
    } catch (err) {
      setReadiness({ loading: false, error: err.message, data: null })
    }
  }
  const [inviteBusy, setInviteBusy] = useState(null)
  const invite = async (a) => {
    const row = byId.get(a.id)
    if (!row?.email) { alert('This ambassador has no email address.'); return }
    if (!window.confirm(`Email ${row.full_name} that she qualifies and can now request a giveaway from her page?`)) return
    setInviteBusy(a.id)
    const { subject, html } = inviteEmail(row)
    const res = sendEmail ? await sendEmail({ to: row.email, subject, html }) : { ok: false, error: 'No email sender' }
    if (!res.ok) { setInviteBusy(null); alert(`Not sent: ${res.error || 'unknown error'}`); return }
    const at = new Date().toISOString()
    await supabase.from('ambassador_applications').update({ giveaway_invited_at: at }).eq('id', a.id)
    setInviteBusy(null)
    setReadiness((prev) => (prev.data ? { ...prev, data: { ...prev.data, ambassadors: prev.data.ambassadors.map((x) => (x.id === a.id ? { ...x, invitedAt: at } : x)) } } : prev))
  }
  // Remove a product an ambassador added herself for a general package line.
  const removeReported = async (applicationId, item) => {
    if (!window.confirm(`Remove "${item.title}" from what she says she received?`)) return
    const { error: err } = await supabase.from('ambassador_reported_items').delete().eq('id', item.id)
    if (err) { alert(`Not removed: ${err.message}`); return }
    loadDetails(applicationId, true)
  }
  // On the Giveaways tab the readiness list loads by itself.
  useEffect(() => {
    if (!standalone) return undefined
    let alive = true
    Promise.resolve().then(() => { if (alive) loadReadiness() })
    return () => { alive = false }
  }, [standalone])
  useEffect(() => {
    let alive = true
    supabase.from('app_settings').select('value').eq('key', 'giveaway_card_visible').maybeSingle()
      .then(({ data }) => { if (alive) setCardVisible(data?.value === true) })
    return () => { alive = false }
  }, [])
  const flipCard = async () => {
    const next = !cardVisible
    const msg = next
      ? 'Show the "Request a giveaway" card to ALL ambassadors in their profile now?\n\nNo emails are sent — they will only see it when they log in.'
      : 'Hide the "Request a giveaway" card from all ambassadors?'
    if (!window.confirm(msg)) return
    setSwitchBusy(true)
    const { error: err } = await supabase.from('app_settings')
      .upsert({ key: 'giveaway_card_visible', value: next, updated_at: new Date().toISOString(), updated_by: adminLabel })
    setSwitchBusy(false)
    if (err) { alert(`Not changed: ${err.message}`); return }
    setCardVisible(next)
  }

  const loadDetails = async (applicationId, force = false) => {
    if (!force && (details[applicationId]?.data || details[applicationId]?.loading)) return
    setDetails((prev) => ({ ...prev, [applicationId]: { loading: true } }))
    try {
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch(`/.netlify/functions/giveaway-request?applicationId=${encodeURIComponent(applicationId)}`, {
        headers: { Authorization: `Bearer ${s?.session?.access_token || ''}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      setDetails((prev) => ({ ...prev, [applicationId]: { data: json } }))
    } catch (err) {
      setDetails((prev) => ({ ...prev, [applicationId]: { error: err.message } }))
    }
  }
  // Credit a shop review (no product) to one product she received.
  const [creditPick, setCreditPick] = useState({}) // { [reviewId]: handle }
  const [creditBusy, setCreditBusy] = useState(null)
  const creditReview = async (applicationId, review, receivedList) => {
    const handle = creditPick[review.id]
    if (!handle) return
    const title = (receivedList || []).find((p) => p.handle === handle)?.title || handle
    setCreditBusy(review.id)
    const { error: err } = await supabase.from('ambassador_review_credits').insert({
      application_id: applicationId, judgeme_review_id: review.id, product_handle: handle, product_title: title, credited_by: adminLabel,
    })
    setCreditBusy(null)
    if (err) { alert(`Not saved: ${err.message}`); return }
    loadDetails(applicationId, true)
  }
  const toggleDetails = (req) => {
    if (openDetails === req.id) { setOpenDetails(null); return }
    setOpenDetails(req.id)
    loadDetails(req.application_id)
  }

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

  const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
  const stars = (n) => (n ? '★'.repeat(Math.round(n)) + '☆'.repeat(Math.max(0, 5 - Math.round(n))) : '')
  const renderDetails = (d, applicationId) => {
    if (!d || d.loading) return <p className="mt-2 text-xs text-slate-500">Loading her packages and reviews…</p>
    if (d.error) return <p className="mt-2 text-xs text-rose-600">Could not load: {d.error}</p>
    const s = d.data || {}
    const a = s.admin || {}
    const other = (s.reasons || []).filter((r) => r !== 'open_request')
    const reasonText = { not_active: 'not active / paused', packages: `only ${s.packagesReceived} package(s) received`, reviews: `fewer than ${s.minReviews || 8} received products reviewed`, recent_giveaway: 'had a giveaway in the last 6 months', unconfirmed: 'a package is not confirmed as received' }
    return (
      <div className="mt-2 space-y-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-700">
        <p>
          {other.length ? <span className="font-semibold text-rose-700">Does not meet the rules now: {other.map((r) => reasonText[r] || r).join(', ')}</span>
            : <span className="font-semibold text-emerald-700">Meets all the rules</span>}
        </p>
        <div className="grid gap-2 sm:grid-cols-4">
          <div><p className="text-[10px] uppercase text-slate-500">Type</p><p className="font-semibold">{a.profile?.type || '—'}</p></div>
          <div><p className="text-[10px] uppercase text-slate-500">Packages received</p><p className="font-semibold">{s.packagesReceived}</p></div>
          <div><p className="text-[10px] uppercase text-slate-500">Reviewed / received products</p><p className="font-semibold">{(s.reviewed || []).length} / {a.receivedProductCount ?? '—'}</p></div>
          <div><p className="text-[10px] uppercase text-slate-500">Orders with her code</p><p className="font-semibold">{a.codeOrders?.count ?? 0} · €{Number(a.codeOrders?.totalEur || 0).toFixed(2)}</p></div>
        </div>
        <p className="text-slate-500">
          {a.profile?.instagram ? `Instagram: ${a.profile.instagram}` : ''}{a.profile?.tiktok ? ` · TikTok: ${a.profile.tiktok}` : ''}{a.profile?.followers ? ` · Followers (application): ${a.profile.followers}` : ''}
        </p>

        <div>
          <p className="font-semibold text-slate-800">Her reviews ({(a.reviews || []).length})</p>
          {(a.reviews || []).length === 0 ? <p className="text-slate-500">No reviews found on shop.gelitup.com.</p> : (
            <ul className="mt-1 divide-y divide-slate-200">
              {a.reviews.map((r, i) => (
                <li key={`${r.handle}-${i}`} className="py-1.5">
                  <span className="font-semibold">{r.shopReview ? 'Shop review (no product)' : r.title}</span>
                  <span className="ml-2 text-amber-500">{stars(r.rating)}</span>
                  <span className="ml-2 text-slate-400">{fmt(r.created_at)}{r.reviewerName ? ` · as "${r.reviewerName}"` : ''}{!r.shopReview && !r.received ? ' · not from her packages' : ''}{r.published ? '' : ' · unpublished'}</span>
                  {(r.heading || r.body) && <p className="mt-0.5 text-slate-600">{r.heading ? <strong>{r.heading}. </strong> : null}{r.body}</p>}
                  {r.shopReview && (r.creditedTo
                    ? <p className="mt-1 font-semibold text-emerald-700">✓ Counted as a review of {r.creditedTo}</p>
                    : (
                      <div className="mt-1 flex flex-wrap items-center gap-2 rounded bg-amber-50 px-2 py-1">
                        <span className="font-semibold text-amber-900">Not counted. Which product is it about?</span>
                        <select value={creditPick[r.id] || ''} onChange={(e) => setCreditPick((prev) => ({ ...prev, [r.id]: e.target.value }))} className="rounded border border-slate-300 px-2 py-0.5">
                          <option value="">Choose a product she received…</option>
                          {(a.receivedList || []).map((p) => <option key={p.handle} value={p.handle}>{p.title}</option>)}
                        </select>
                        <button type="button" disabled={!creditPick[r.id] || creditBusy === r.id} onClick={() => creditReview(applicationId, r, a.receivedList)} className="rounded-full bg-emerald-600 px-3 py-0.5 font-semibold text-white disabled:opacity-50">
                          {creditBusy === r.id ? 'Saving…' : 'Count it'}
                        </button>
                      </div>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </div>

        {(s.reportedItems || []).length > 0 && (
          <div>
            <p className="font-semibold text-slate-800">Products she added herself ({s.reportedItems.length})</p>
            <p className="text-slate-500">For general lines on her packing list. They count as received — remove any she didn't get.</p>
            <ul className="mt-1">
              {s.reportedItems.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-2 py-0.5">
                  <span>{it.title}</span>
                  <span className="text-slate-400">for “{it.line}”</span>
                  <button type="button" onClick={() => removeReported(applicationId, it)} className="text-rose-600 underline">remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(s.notReviewed || []).length > 0 && (
          <div>
            <p className="font-semibold text-slate-800">Received but not reviewed ({s.notReviewed.length})</p>
            <p className="text-slate-600">{s.notReviewed.map((p) => p.title).join(', ')}</p>
          </div>
        )}

        <div>
          <p className="font-semibold text-slate-800">Packages ({(a.packages || []).length})</p>
          <ul className="mt-1 space-y-1">
            {(a.packages || []).map((p, i) => (
              <li key={i}>
                <span className="font-semibold">{fmt(p.sent_at)}</span>
                <span className="text-slate-400"> · {p.lost ? 'lost' : p.delivered_at ? `received ${fmt(p.delivered_at)}` : 'not confirmed'}</span>
                <span className="text-slate-600"> — {(p.items || []).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>

        {(a.codeOrders?.last || []).length > 0 && (
          <div>
            <p className="font-semibold text-slate-800">Latest orders with her code</p>
            <ul className="mt-1">
              {a.codeOrders.last.map((o, i) => (
                <li key={i}>{fmt(o.created_at)} · {o.source || 'gelitup.com'}{o.country ? ` · ${o.country}` : ''} · €{Number(o.order_total_eur || 0).toFixed(2)}</li>
              ))}
            </ul>
          </div>
        )}

        {(a.pastGiveaways || []).length > 0 && (
          <div>
            <p className="font-semibold text-slate-800">Past giveaways</p>
            <ul>{a.pastGiveaways.map((g, i) => <li key={i}>{formatGiveawayDate(g.slot_start)} – {formatGiveawayDate(g.slot_end)}</li>)}</ul>
          </div>
        )}
      </div>
    )
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

      <button type="button" onClick={() => toggleDetails(req)} className="mt-2 text-xs font-semibold text-fuchsia-700 underline">
        {openDetails === req.id ? 'Hide her full picture' : 'Show her full picture (packages, reviews, code orders)'}
      </button>
      {openDetails === req.id && renderDetails(details[req.application_id], req.application_id)}

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
    <details className="mb-4 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/40 p-3" open={standalone || open.length > 0}>
      <summary className="cursor-pointer text-sm font-semibold text-fuchsia-800">
        🎁 Giveaway requests
        {open.length > 0 && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] text-white">{open.length} waiting</span>}
        {booked.length > 0 && <span className="ml-2 text-xs font-normal text-slate-500">{booked.length} booked</span>}
      </summary>
      {loading && <p className="mt-2 text-xs text-slate-500">Loading…</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {!loading && !error && (
        <div className="mt-3 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">Who can do a giveaway now?</p>
              <button type="button" onClick={loadReadiness} disabled={readiness.loading} className="rounded-full bg-fuchsia-600 px-3 py-1 font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-60">
                {readiness.loading ? 'Checking everyone’s packages and reviews… (about 20 seconds)' : readiness.data ? 'Refresh' : 'Show giveaway readiness'}
              </button>
              {readiness.data && <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-bold text-white">{readiness.data.ambassadors.filter((a) => a.eligible).length} ready</span>}
              {readiness.data && <span className="text-slate-500">of {readiness.data.ambassadors.length} ambassadors</span>}
            </div>
            {readiness.error && <p className="mt-2 text-rose-600">Could not check: {readiness.error}</p>}
            {readiness.data && (() => {
              const failed = readiness.data.ambassadors.filter((a) => a.error)
              if (!failed.length) return null
              return <p className="mt-2 rounded bg-rose-50 px-2 py-1 font-semibold text-rose-700">Reviews could not be checked for {failed.length} ambassador{failed.length === 1 ? '' : 's'}: {failed[0].error}</p>
            })()}
            {readiness.data && (() => {
              const need = readiness.data.needed || { packages: 2, reviews: 10 }
              const rank = (a) => (a.eligible ? 0 : a.openRequest ? 1 : a.upcoming ? 2 : a.paused ? 9 : 5)
              const list = [...readiness.data.ambassadors].sort((x, y) => rank(x) - rank(y) || (y.reviewedCount || 0) - (x.reviewedCount || 0))
              const pill = (ok, text) => <span className={`rounded-full px-2 py-0.5 font-semibold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{text}</span>
              return (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left">
                    <thead><tr className="text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="py-1.5 pr-2">Ambassador</th><th className="py-1.5 pr-2">Giveaway</th><th className="py-1.5 pr-2">Packages confirmed</th><th className="py-1.5 pr-2">Products reviewed</th><th className="py-1.5">Note</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 align-top">
                      {list.map((a) => {
                        let status
                        if (a.error) status = <span className="font-semibold text-rose-600">Could not check</span>
                        else if (a.paused) status = <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-600">{a.opt_out_type === 'end' ? 'Ending' : 'Paused'}</span>
                        else if (a.eligible) status = <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-bold text-white">✓ Ready</span>
                        else if (a.openRequest) status = <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Requested</span>
                        else if (a.upcoming) status = <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800">Booked</span>
                        else status = <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">Not yet</span>
                        const note = a.error ? a.error
                          : a.upcoming ? `Booked ${formatGiveawayDate(a.upcoming.slot_start)}`
                          : a.openRequest ? `Waiting for your decision (${formatGiveawayMonth(a.openRequest.preferred_month)})`
                          : (a.reasons || []).includes('recent_giveaway') && a.allowedFrom ? `Next giveaway from ${formatGiveawayDate(a.allowedFrom)}`
                          : a.unconfirmedCount ? `${a.unconfirmedCount} package${a.unconfirmedCount === 1 ? '' : 's'} not confirmed as received${a.notReviewedCount ? ` · ${a.notReviewedCount} products not reviewed` : ''}`
                          : a.notReviewedCount ? `${a.notReviewedCount} received product${a.notReviewedCount === 1 ? '' : 's'} not reviewed yet` : ''
                        return (
                          <tr key={a.id}>
                            <td className="py-1.5 pr-2"><button type="button" onClick={() => { setCheckId(String(a.id)); loadDetails(a.id, true); setTimeout(() => document.getElementById('giveaway-check-any')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} className="text-left font-semibold text-fuchsia-700 underline hover:text-fuchsia-900">{a.full_name}</button><span className="block text-slate-400">{[a.country, a.instagram && `@${String(a.instagram).replace(/^@/, '')}`].filter(Boolean).join(' · ')}</span></td>
                            <td className="py-1.5 pr-2">{status}</td>
                            <td className="py-1.5 pr-2 tabular-nums">{a.error ? '—' : pill((a.packagesReceived || 0) >= need.packages, `${a.packagesReceived || 0} / ${need.packages}`)}</td>
                            <td className="py-1.5 pr-2 tabular-nums">{a.error ? '—' : pill((a.reviewedCount || 0) >= need.reviews, `${a.reviewedCount || 0} / ${need.reviews}`)}</td>
                            <td className="py-1.5 text-slate-500">
                              {note}
                              {a.eligible && !a.paused && (
                                a.invitedAt
                                  ? <span className="ml-1 font-semibold text-emerald-700">Invited {fmt(a.invitedAt)} <button type="button" onClick={() => invite(a)} disabled={inviteBusy === a.id} className="ml-1 font-normal text-slate-500 underline">send again</button></span>
                                  : <button type="button" onClick={() => invite(a)} disabled={inviteBusy === a.id} className="rounded-full bg-fuchsia-600 px-3 py-0.5 font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-60">{inviteBusy === a.id ? 'Sending…' : '✉ Invite to request a giveaway'}</button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-slate-500">Click a name to see her full picture (packages, every review, shop reviews to count). Ready = at least {need.packages} packages confirmed, every package confirmed as received, {need.reviews} received products reviewed, no giveaway in the last 6 months, no request waiting. Use "Check any ambassador" above for her full picture.</p>
                </div>
              )
            })()}
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            <span className="font-semibold text-slate-800">Ambassadors can see the "Request a giveaway" card:</span>
            {cardVisible === null ? <span className="text-slate-400">…</span> : (
              <>
                <span className={`rounded-full px-2 py-0.5 font-bold ${cardVisible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{cardVisible ? 'ON' : 'OFF'}</span>
                <button type="button" disabled={switchBusy} onClick={flipCard} className={`rounded-full px-3 py-1 font-semibold text-white disabled:opacity-60 ${cardVisible ? 'bg-slate-600 hover:bg-slate-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                  {cardVisible ? 'Hide it' : 'Show it to ambassadors'}
                </button>
                {!cardVisible && <span className="text-slate-500">Hidden — ambassadors see nothing yet.</span>}
              </>
            )}
          </div>
          <div id="giveaway-check-any" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            <label className="flex flex-wrap items-center gap-2 font-semibold text-slate-800">
              Check any ambassador:
              <select
                value={checkId}
                onChange={(e) => { setCheckId(e.target.value); if (e.target.value) loadDetails(Number(e.target.value)) }}
                className="rounded border border-slate-300 px-2 py-1 font-normal"
              >
                <option value="">Choose…</option>
                {[...ambassadors].filter((a) => String(a.status || '').toLowerCase() === 'approved')
                  .sort((x, y) => String(x.full_name || '').localeCompare(String(y.full_name || '')))
                  .map((a) => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
              </select>
            </label>
            {checkId && (
              <button type="button" onClick={() => setPreviewId(Number(checkId))} className="mt-2 rounded-full bg-slate-800 px-3 py-1 font-semibold text-white hover:bg-slate-700">
                👁 Preview her page (what she sees)
              </button>
            )}
            {checkId && renderDetails(details[Number(checkId)], Number(checkId))}
          </div>
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
      {previewId && (() => {
        const row = byId.get(previewId) || {}
        const latest = [...(row._shipments || [])]
          .filter((sh) => sh?.sent_at && !sh.lost_at && String(sh.status || 'sent').toLowerCase() === 'sent')
          .sort((x, y) => String(y.sent_at).localeCompare(String(x.sent_at)))[0]
        const unconfirmed = latest && !latest.delivered_at ? latest : null
        const invited = Boolean(row.giveaway_invited_at || details[previewId]?.data?.invited)
        return (
          <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={() => setPreviewId(null)}>
            <div className="my-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs text-white">
                <span>Preview — what <strong>{row.full_name}</strong> sees on her ambassador page. Buttons don't save anything.</span>
                <button type="button" onClick={() => setPreviewId(null)} className="ml-2 rounded-full bg-white/20 px-2 py-0.5 font-bold">Close</button>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">🌟</span>
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">GEL.IT.UP® Ambassador</p>
                </div>
                <AmbassadorReceiptBanner previewPkg={unconfirmed} />
                <div className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-white/60 p-3 text-[11px] text-slate-500">
                  Here she also sees her discount code{row.discount_code ? ` (${row.discount_code})` : ''}, 20% client discount, her commission, "How it works", her shipments and tracking, her credit and the orders placed with her code.
                </div>
                <AmbassadorMyReviews previewId={previewId} />
                <AmbassadorGiveawayCard previewId={previewId} previewVisible={cardVisible || invited} />
                {!(cardVisible || invited) && <p className="mt-3 rounded-lg bg-white/60 p-2 text-center text-[11px] text-slate-500">The 🎁 Giveaways card is hidden for her (not invited, and the card is switched off).</p>}
                <AmbassadorOptOut preview />
              </div>
            </div>
          </div>
        )
      })()}
    </details>
  )
}
