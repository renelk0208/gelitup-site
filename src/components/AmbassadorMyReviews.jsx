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
