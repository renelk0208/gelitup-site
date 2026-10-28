import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// "My reviews" in the ambassador profile: products from her confirmed packages
// she has reviewed on shop.gelitup.com, and the ones still to review (with a
// Review button). Read live from Judge.me each time the profile opens.

async function authHeader() {
  const { data: s } = await supabase.auth.getSession()
  const token = s?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

// "Which ones did you get?" for a general package line, e.g. "3 different Cat Eye shades".
function LinePicker({ line, onSaved }) {
  const [open, setOpen] = useState(false)
  const [shop, setShop] = useState(null)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const left = line.max - (line.picked || []).length

  const start = async () => {
    setOpen(true)
    if (shop) return
    try {
      const res = await fetch('/.netlify/functions/shop-products')
      const json = await res.json()
      setShop(Array.isArray(json?.products) ? json.products : [])
    } catch { setShop([]) }
  }
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const results = words.length && shop
    ? shop.filter((p) => words.every((w) => p.title.toLowerCase().includes(w))).slice(0, 12)
    : []
  const toggle = (p) => setPicked((prev) => (prev.some((x) => x.handle === p.handle)
    ? prev.filter((x) => x.handle !== p.handle)
    : prev.length >= left ? prev : [...prev, p]))
  const save = async () => {
    setBusy(true); setError('')
    try {
      const h = await authHeader()
      const res = await fetch('/.netlify/functions/giveaway-request?action=report', {
        method: 'POST', headers: { ...(h || {}), 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: line.line, handles: picked.map((p) => p.handle) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Could not save.')
      setOpen(false); setPicked([]); setQ('')
      onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <li className="py-2 text-[12px] text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span><strong>“{line.line}”</strong>{(line.picked || []).length ? <span className="text-emerald-700"> · added: {line.picked.map((p) => p.title).join(', ')}</span> : null}</span>
        {left > 0 && !open && <button type="button" onClick={start} className="rounded-full border border-fuchsia-400 px-3 py-1 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50">Which ones did you get?</button>}
      </div>
      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <input id={`pick-${line.line}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name or number, e.g. cat eye, 2619" className="w-full rounded border border-slate-300 px-2 py-1.5 text-[12px]" />
          {!shop && <p className="mt-1 text-slate-500">Loading products…</p>}
          {results.length > 0 && (
            <ul className="mt-1 max-h-48 overflow-y-auto">
              {results.map((p) => {
                const on = picked.some((x) => x.handle === p.handle)
                return (
                  <li key={p.handle}>
                    <button type="button" onClick={() => toggle(p)} className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left ${on ? 'bg-fuchsia-100' : 'hover:bg-white'}`}>
                      {p.image ? <img src={p.image} alt="" className="h-7 w-7 flex-none rounded object-contain" /> : null}
                      <span className="flex-1">{p.title}</span>
                      {on && <span className="font-bold text-fuchsia-700">✓</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-1 text-slate-500">Choose up to {left}. Only add products you actually received.</p>
          {error && <p className="mt-1 text-rose-700">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={!picked.length || busy} onClick={save} className="rounded-full bg-fuchsia-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : `Add ${picked.length || ''} product${picked.length === 1 ? '' : 's'}`}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-600">Cancel</button>
          </div>
        </div>
      )}
    </li>
  )
}

export default function AmbassadorMyReviews() {
  const [data, setData] = useState(null)
  const [showDone, setShowDone] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const h = await authHeader()
        if (!h) return
        const res = await fetch('/.netlify/functions/giveaway-request?view=reviews', { headers: h })
        const json = await res.json().catch(() => null)
        if (alive && res.ok && json) setData(json)
      } catch { /* the profile never breaks because of this card */ }
    })()
    return () => { alive = false }
  }, [tick])

  if (!data) return null
  const done = data.reviewed || []
  const todo = data.notReviewed || []
  const lines = (data.unmatchedLines || []).filter((l) => l.max > (l.picked || []).length)
  const total = done.length + todo.length
  if (!total && !lines.length) return null
  const pct = Math.round((done.length / total) * 100)

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">⭐ My reviews</p>
        <p className="text-[12px] text-slate-600"><strong>{done.length} of {total}</strong> products reviewed</p>
      </div>
      <div className={`mt-2 rounded-lg p-3 text-[12px] ${done.length >= 10 ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
        <p className="font-bold">🎁 Your reviews decide if you can host a GEL.IT.UP giveaway</p>
        <p className="mt-0.5">
          {done.length >= 10
            ? <>You've reviewed {done.length} products — you meet the review requirement for a giveaway. ✓</>
            : <>You need at least <strong>10 reviewed products</strong> to qualify. You have <strong>{done.length}</strong> — <strong>{10 - done.length} to go</strong>. Without your reviews you can't take part.</>}
        </p>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Products from a package appear here once you've confirmed you received it.</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100" aria-hidden="true">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>

      {lines.length > 0 && (
        <div className="mt-3 rounded-lg border border-fuchsia-200 p-3">
          <p className="text-[12px] font-semibold text-slate-900">Tell us what you received</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Some lines on your packing list don't name the exact products. Choose the ones you got, then they'll appear below for you to review.</p>
          <ul className="mt-1 divide-y divide-slate-100">
            {lines.map((l) => <LinePicker key={l.line} line={l} onSaved={() => setTick((t) => t + 1)} />)}
          </ul>
        </div>
      )}

      {todo.length > 0 ? (
        <>
          <p className="mt-3 text-[12px] font-semibold text-slate-800">Still to review ({todo.length})</p>
          <ul className="mt-1 divide-y divide-slate-100">
            {todo.map((p) => (
              <li key={p.handle} className="flex items-center justify-between gap-2 py-1.5 text-[12px] text-slate-700">
                <span className="flex min-w-0 items-center gap-2">
                  {p.image ? <img src={p.image} alt="" className="h-8 w-8 flex-none rounded object-contain" /> : null}
                  <span className="min-w-0">{p.title}</span>
                </span>
                <a href={p.reviewUrl} target="_blank" rel="noreferrer" className="flex-none rounded-full bg-fuchsia-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-fuchsia-500">Review</a>
              </li>
            ))}
          </ul>
          <div className="mt-2 rounded-lg bg-fuchsia-50 p-3 text-[12px] text-slate-700">
            <p className="font-semibold text-slate-900">How to review so it counts</p>
            <ol className="ml-4 mt-1 list-decimal space-y-0.5">
              <li>Tap <strong>Review</strong> next to the product, then <strong>Write a Review</strong> on its page.</li>
              <li>When asked <em>"How would you like to continue?"</em>, choose <strong>Continue without signing in</strong> (not "Continue with Shop").</li>
              <li>Give your stars and write your review, and use the <strong>same email you log in with here</strong>.</li>
              <li>Confirm your email in the message Judge.me sends you.</li>
            </ol>
            <p className="mt-1 text-slate-500">Reviews written another way may not be counted.</p>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[12px] font-semibold text-emerald-700">✓ You've reviewed everything you received. Thank you! 💖</p>
      )}

      {done.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowDone((v) => !v)} className="text-[11px] text-slate-500 underline">
            {showDone ? 'Hide' : 'Show'} reviewed products ({done.length})
          </button>
          {showDone && (
            <ul className="mt-1 text-[12px] text-slate-600">
              {done.map((p) => <li key={p.handle}>✓ {p.title}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
