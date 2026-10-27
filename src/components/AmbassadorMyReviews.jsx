import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// "My reviews" in the ambassador profile: products from her confirmed packages
// she has reviewed on shop.gelitup.com, and the ones still to review (with a
// Review button). Read live from Judge.me each time the profile opens.

export default function AmbassadorMyReviews() {
  const [data, setData] = useState(null)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: s } = await supabase.auth.getSession()
        const token = s?.session?.access_token
        if (!token) return
        const res = await fetch('/.netlify/functions/giveaway-request?view=reviews', { headers: { Authorization: `Bearer ${token}` } })
        const json = await res.json().catch(() => null)
        if (alive && res.ok && json) setData(json)
      } catch { /* the profile never breaks because of this card */ }
    })()
    return () => { alive = false }
  }, [])

  if (!data) return null
  const done = data.reviewed || []
  const todo = data.notReviewed || []
  const total = done.length + todo.length
  if (!total) return null
  const pct = Math.round((done.length / total) * 100)

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">⭐ My reviews</p>
        <p className="text-[12px] text-slate-600"><strong>{done.length} of {total}</strong> products reviewed</p>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Products from a package appear here once you've confirmed you received it.</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100" aria-hidden="true">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>

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
          <p className="mt-1 text-[11px] text-slate-500">After writing a review, confirm your email in the message Judge.me sends you, or it won't appear here.</p>
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
