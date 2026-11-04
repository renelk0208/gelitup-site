import { useEffect, useState } from 'react'
import { searchProducts } from '../lib/reviewProducts.js'
import { chooseSlotLabel, isChooseSlot } from '../lib/ambassadorPacks.js'

// One line of the next package, with a Swap (or Pick, for a "Choose: …" slot)
// button that replaces it with an exact product from shop.gelitup.com.
//   loadProducts: () => Promise<[{ handle, title, image }]>
//   onSwap(newTitle) -> Promise<boolean>
export function PlannedItemSwap({ item, loadProducts, onSwap, busy, className = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState(null)
  const slot = isChooseSlot(item)
  useEffect(() => {
    if (!open || products) return
    let alive = true
    Promise.resolve(loadProducts?.()).then((list) => { if (alive) setProducts(Array.isArray(list) ? list : []) })
    return () => { alive = false }
  }, [open, products, loadProducts])
  if (!loadProducts || !onSwap) return null
  const results = products && query.trim() ? searchProducts(products, query, 6) : []
  const pick = async (title) => {
    const ok = await onSwap(title)
    if (ok !== false) { setOpen(false); setQuery('') }
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setQuery(slot ? chooseSlotLabel(item).replace(/\(.*?\)/g, '').trim() : '') }}
        disabled={busy}
        title={slot ? 'Pick the exact product from the shop' : 'Swap for another shop product'}
        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-50 ${slot ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-fuchsia-200 bg-white text-fuchsia-700 hover:bg-fuchsia-50'} ${className}`}
      >
        {slot ? 'Pick' : 'Swap'}
      </button>
    )
  }
  return (
    <div className="order-last mt-1 w-full basis-full rounded border border-fuchsia-200 bg-white p-1.5">
      <div className="flex gap-1">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the shop, e.g. cat eye, 2601, multimix 60…"
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-[11px]"
        />
        <button type="button" onClick={() => { setOpen(false); setQuery('') }} className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50">Cancel</button>
      </div>
      {!products && <p className="mt-1 text-[10px] text-slate-400">Loading the shop products…</p>}
      {products && query.trim() && results.length === 0 && <p className="mt-1 text-[10px] text-slate-500">No shop product matches — try another word.</p>}
      {results.length > 0 && (
        <ul className="mt-1 divide-y divide-slate-100 rounded border border-slate-200">
          {results.map((p) => (
            <li key={p.handle}>
              <button type="button" disabled={busy} onClick={() => pick(p.title)} className="flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] hover:bg-fuchsia-50 disabled:opacity-50">
                {p.image && <img src={p.image} alt="" className="h-5 w-5 rounded object-cover" />}{p.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PlannedItemSwap
