import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatGiveawayDate, formatGiveawayMonth } from '../lib/giveaway'

// "Request a giveaway" card in the ambassador's profile.
// Shows the request form only when she is eligible, offering only products she
// has reviewed on shop.gelitup.com. Everything is checked again on the server
// (/.netlify/functions/giveaway-request).

const ENDPOINT = '/.netlify/functions/giveaway-request'

async function call(method, body, previewId) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Please log in again.')
  const res = await fetch(previewId ? `${ENDPOINT}?applicationId=${encodeURIComponent(previewId)}` : ENDPOINT, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok && !json?.reasons) throw new Error(json?.error || 'Something went wrong. Please try again.')
  return { ok: res.ok, ...json }
}

const Box = ({ children }) => (
  <div className="mt-3 rounded-xl border border-fuchsia-200 bg-white p-4">
    <p className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-700">🎁 Giveaways</p>
    {children}
  </div>
)

// previewId: admin preview of this ambassador's card (read-only).
export default function AmbassadorGiveawayCard({ previewId = null, previewVisible = true } = {}) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState([])
  const [month, setMonth] = useState('')
  const [idea, setIdea] = useState('')
  const [followers, setFollowers] = useState('')
  const [otherLinks, setOtherLinks] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [justSent, setJustSent] = useState(false)

  useEffect(() => {
    let alive = true
    call('GET', undefined, previewId)
      .then((data) => { if (alive) setState({ loading: false, error: '', data: previewId && !previewVisible ? { hidden: true } : data }) })
      .catch((err) => { if (alive) setState({ loading: false, error: err.message, data: null }) })
    return () => { alive = false }
  }, [previewId, previewVisible])

  const { loading, error, data } = state
  if (loading) return null
  if (error || !data || data.hidden) return null // never block the profile because of this card

  // Approved giveaway coming up or running now.
  if (data.upcoming) {
    return (
      <Box>
        <p className="mt-2 text-[13px] text-slate-700">
          Your giveaway is booked from <strong>{formatGiveawayDate(data.upcoming.slot_start)}</strong> to <strong>{formatGiveawayDate(data.upcoming.slot_end)} at 23:59</strong> (Greek time).
          Post it on the Monday as a Collab with @gelitup. GEL.IT.UP draws the winner on the following Monday morning, and you announce her in your stories that Monday afternoon.
        </p>
      </Box>
    )
  }

  if (justSent || data.openRequest) {
    const req = data.openRequest
    return (
      <Box>
        <p className="mt-2 text-[13px] text-slate-700">
          {req?.status === 'waitlisted'
            ? <>Your giveaway request is on the <strong>waiting list</strong>. You have priority for next month, and we'll email you your dates.</>
            : <><strong>Request received</strong> — thank you! We'll confirm your dates by email{req?.preferred_month ? <> (you asked for {formatGiveawayMonth(req.preferred_month)})</> : null}.</>}
        </p>
      </Box>
    )
  }

  if (!data.eligible) {
    // Only show what's missing when she's close; otherwise stay quiet.
    const r = data.reasons || []
    if (r.includes('not_active')) return null
    return (
      <Box>
        <p className="mt-2 text-[13px] text-slate-700">Approved ambassadors can host an official GEL.IT.UP giveaway, with the prize supplied and shipped by us. To request one:</p>
        <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
          <li>{r.includes('packages') ? '○' : '✓'} Confirmed you received at least {data.packagesNeeded} PR packages {r.includes('packages') ? `(you have ${data.packagesReceived})` : ''}</li>
          <li>{r.includes('unconfirmed') ? '○' : '✓'} Confirmed you received <strong>every</strong> package we sent you</li>
          <li>{r.includes('reviews') ? '○' : '✓'} Reviewed at least <strong>{data.minReviews || 8} products</strong> you have received, on shop.gelitup.com {r.includes('reviews') ? `(you have reviewed ${(data.reviewed || []).length})` : ''}</li>
          {r.includes('recent_giveaway') && data.allowedFrom && (
            <li>○ One giveaway every 6 months — you can request your next one from {formatGiveawayDate(data.allowedFrom)}</li>
          )}
        </ul>
        {(data.notReviewed || []).length > 0 && (
          <div className="mt-3">
            <p className="text-[12px] font-semibold text-slate-800">Products you've received but not reviewed yet:</p>
            <ul className="mt-1 divide-y divide-slate-100">
              {data.notReviewed.map((p) => (
                <li key={p.handle} className="flex items-center justify-between gap-2 py-1.5 text-[12px] text-slate-700">
                  <span className="flex items-center gap-2">
                    {p.image ? <img src={p.image} alt="" className="h-8 w-8 rounded object-contain" /> : null}
                    {p.title}
                  </span>
                  <a href={p.reviewUrl} target="_blank" rel="noreferrer" className="flex-none rounded-full bg-fuchsia-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-fuchsia-500">Review</a>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-slate-500">New reviews can take a little while to appear here.</p>
          </div>
        )}
      </Box>
    )
  }

  // 10 prize products, only from products she received and reviewed.
  const needed = Math.min(data.maxProducts, data.reviewed.length) // the most she can pick
  const least = data.minReviews || 8
  const toggle = (handle) => setPicked((prev) => (prev.includes(handle)
    ? prev.filter((h) => h !== handle)
    : prev.length >= needed ? prev : [...prev, handle]))

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (picked.length < least || picked.length > needed) { setFormError(`Please choose between ${least} and ${needed} prize products.`); return }
    if (!month) { setFormError('Please choose a month.'); return }
    if (idea.trim().length < 10) { setFormError('Please tell us a little about the look you will create.'); return }
    if (previewId) { setFormError('Preview only — nothing is sent.'); return }
    setSending(true)
    try {
      const res = await call('POST', { products: picked, preferredMonth: month, idea, followers, otherLinks, notes })
      if (!res.ok) throw new Error(res.error || 'Your request could not be sent.')
      setJustSent(true)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Box>
      <p className="mt-2 text-[13px] text-slate-700">
        You can host an official <strong>GEL.IT.UP EU giveaway</strong> as a Collab post with @gelitup. We supply and ship the prize.
        Choose {least}–{data.maxProducts} prize products from the products you have received and reviewed. To add more, review them first.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-full bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500"
        >
          Request a giveaway
        </button>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-4">
          <div>
            <p className="text-[12px] font-semibold text-slate-800">
              Choose {least}–{needed} prize products <span className="font-normal text-slate-500">from the products you have reviewed — {picked.length} chosen</span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.reviewed.map((p) => {
                const on = picked.includes(p.handle)
                return (
                  <button
                    key={p.handle}
                    type="button"
                    onClick={() => toggle(p.handle)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-left text-[12px] ${on ? 'border-fuchsia-500 bg-fuchsia-50 ring-1 ring-fuchsia-500' : 'border-slate-200 bg-white hover:border-fuchsia-300'}`}
                  >
                    {p.image ? <img src={p.image} alt="" className="h-10 w-10 flex-none rounded object-contain" /> : <span className="h-10 w-10 flex-none rounded bg-slate-100" />}
                    <span className="leading-tight text-slate-700">{p.title}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="block text-[12px] font-semibold text-slate-800">
            Preferred month
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-normal">
              <option value="">Choose…</option>
              {data.months.map((m) => <option key={m} value={m}>{formatGiveawayMonth(m)}</option>)}
            </select>
            <span className="mt-1 block font-normal text-slate-500">We run 3 giveaways a month, each from Monday to Sunday night, with the winner announced on the Monday afternoon after. We'll confirm your exact week.</span>
          </label>

          <label className="block text-[12px] font-semibold text-slate-800">
            Your content idea
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} placeholder="The look you'll create with the prize products" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-normal" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-semibold text-slate-800">
              Instagram followers (approx.)
              <input value={followers} onChange={(e) => setFollowers(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-normal" />
            </label>
            <label className="block text-[12px] font-semibold text-slate-800">
              TikTok / YouTube links (optional)
              <input value={otherLinks} onChange={(e) => setOtherLinks(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-normal" />
            </label>
          </div>

          <label className="block text-[12px] font-semibold text-slate-800">
            Anything else we should know (optional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-normal" />
          </label>

          <p className="text-[11px] text-slate-500">Open to qualified nail technicians only, aged 18+, in countries GEL.IT.UP EU ships to. Not open to the USA or Italy. Please don't announce anything until we confirm your dates.</p>
          {formError && <p className="text-[12px] text-rose-600">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="rounded-full bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-60">
              {sending ? 'Sending…' : 'Send my request'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
          </div>
        </form>
      )}
    </Box>
  )
}
