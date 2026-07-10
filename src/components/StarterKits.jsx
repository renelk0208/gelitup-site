import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate, NavLink } from 'react-router-dom'

/**
 * Starter Kits / Packages section — data-driven from /gelitup-content/starter-kits.json.
 *
 * Landing (no kitId): grid of kit cover cards.
 * Builder (kitId): shows the always-included must-haves + free gift, lets the
 * customer choose the required number of colours, optionally add extras at the
 * current website price, and add the finished kit to the basket.
 *
 * Props:
 *   discount   — { active: boolean, pct: number }  (for optional-extra pricing)
 *   onAddKit   — (kitPayload) => void  (adds the built kit to the cart)
 */

const KIT_STORE_KEY = 'gelitup.kits.v1'

function readKitStore() {
  try { return JSON.parse(localStorage.getItem(KIT_STORE_KEY) || '{}') } catch { return {} }
}
function writeKitStore(obj) {
  try { localStorage.setItem(KIT_STORE_KEY, JSON.stringify(obj)) } catch { /* ignore */ }
}

function fmt(n) { return `€${Number(n || 0).toFixed(2)}` }

export default function StarterKits({ discount = { active: false, pct: 0 }, onAddKit }) {
  const { kitId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    fetch('/gelitup-content/starter-kits.json')
      .then((r) => r.json())
      .then((d) => { if (mounted) setData(d) })
      .catch(() => { if (mounted) setError('Could not load kits.') })
    return () => { mounted = false }
  }, [])

  const kits = [...(data?.kits || [])].sort((a, b) => Number(a.price) - Number(b.price))
  const activeKit = kitId ? kits.find((k) => k.id === kitId) : null

  if (error) return <section className="mx-auto max-w-6xl px-4 py-16 text-center text-black/60">{error}</section>
  if (!data) return <section className="mx-auto max-w-6xl px-4 py-16 text-center text-black/50">Loading kits…</section>

  if (activeKit) {
    return <KitBuilder kit={activeKit} addOns={data.addOns || []} discount={discount} onAddKit={onAddKit} onBack={() => navigate('/starter-kits')} />
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-[#9B1268]">Build your own</p>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-neutral-900 sm:text-5xl">Starter Kits <span className="font-serif italic text-[#9B1268]">&amp;</span> Packages</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-500">Professionally curated bundles — prep, base and top included. Choose your colours and we’ll take care of the rest.</p>

        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-neutral-200" />
            <p className="text-[13px] font-bold uppercase tracking-[0.24em] text-[#9B1268]">Every kit includes</p>
            <span className="h-px w-8 bg-neutral-200" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(kits[0]?.included || []).slice(0, 4).map((item) => (
              <div key={item.name} className={`flex flex-col items-center gap-2 rounded-xl px-3 py-3 text-center ${item.free ? 'border border-[#D43790]/35 bg-[#D43790]/[0.06]' : 'bg-[#faf8f6]'}`}>
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-white">
                  {item.image
                    ? <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    : <span className="text-lg text-[#9B1268]/40">{item.free ? '✦' : '◦'}</span>}
                  {item.free && <span className="absolute left-1 top-1 rounded-full bg-[#D43790] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">Free</span>}
                </div>
                <span className="text-[12px] font-medium leading-tight text-neutral-800">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-4 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#9B1268] to-[#D43790] px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_-8px_rgba(212,55,144,0.6)]">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
          Summer Madness &mdash; limited-time kit pricing
        </div>
      </div>

      <div className="mt-12 grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {kits.map((kit) => {
          const cover = kit.coverImage
          const fallback = kit.colours.find((c) => c.image)?.image || ''
          return (
            <button
              key={kit.id}
              type="button"
              onClick={() => navigate(`/starter-kits/${kit.id}`)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-300 bg-white text-left shadow-sm ring-1 ring-black/[0.02] transition duration-300 hover:-translate-y-1 hover:border-[#9B1268]/50 hover:shadow-[0_18px_50px_-18px_rgba(155,18,104,0.35)]"
            >
              <div className="relative flex h-52 w-full items-center justify-center overflow-hidden bg-[#f7f2f5]">
                <img
                  src={cover}
                  alt={kit.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  onError={(e) => { if (fallback && e.currentTarget.src !== fallback) { e.currentTarget.src = fallback; e.currentTarget.className = 'h-full w-full object-contain p-6' } else { e.currentTarget.style.display = 'none' } }}
                />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#9B1268] backdrop-blur">Kit</span>
                {kit.savingsPct > 0 && <span className="absolute right-4 top-4 rounded-full bg-[#9B1268] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white">&minus;{kit.savingsPct}%</span>}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-medium tracking-tight text-neutral-900">{kit.name}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">
                  {kit.choose > 0 ? `Choose ${kit.choose} ${kit.chooseLabel}` : 'Ready-made kit'} &middot; prep, base &amp; top included
                </p>
                <div className="mt-auto flex items-end justify-between pt-5">
                  <div className="leading-none">
                    {kit.savings > 0 && <span className="mb-1 block text-[12px] text-neutral-400 line-through">{fmt(kit.retailValue)}</span>}
                    <span className="text-2xl font-light tracking-tight text-neutral-900">{fmt(kit.price)}</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.15em] text-[#9B1268] transition-all group-hover:gap-2.5">Build <span aria-hidden>→</span></span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function KitBuilder({ kit, addOns = [], discount, onAddKit, onBack }) {
  const navigate = useNavigate()
  const [sel, setSel] = useState({})           // sectionKey -> [skus]
  const [extras, setExtras] = useState({})     // sku -> qty (optional extras)
  const [added, setAdded] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Any purchasable item that can be added as an extra (kit colours + wider range + add-ons).
  const extraCatalog = useMemo(() => [...kit.colours, ...(kit.extraColours || []), ...addOns], [kit.colours, kit.extraColours, addOns])
  const findItem = useCallback((sku) => extraCatalog.find((x) => x.sku === sku), [extraCatalog])

  // Selection sections: explicit groups, or a single section for a "choose N" kit.
  const sections = useMemo(() => {
    if (kit.groups?.length) return kit.groups
    if (kit.choose > 0) return [{ key: '_all', label: `Choose your ${kit.chooseLabel}`, choose: kit.choose, colours: kit.colours }]
    return []
  }, [kit])
  const ready = sections.every((g) => (sel[g.key] || []).length >= g.choose)
  const remaining = sections.reduce((s, g) => s + Math.max(0, g.choose - (sel[g.key] || []).length), 0)

  // Where the "add more" section draws from — a wider range when configured, else the kit's own items.
  const extrasSource = kit.extraColours?.length ? kit.extraColours : kit.colours
  // A separate "add more" section only shows when there is no chooser for this range
  // (ready-made kits), or when a wider range is configured (e.g. Beginner → full colours).
  // When there IS a chooser, extra picks are made in the chooser itself.
  const showExtraSection = sections.length === 0 || (kit.extraColours?.length > 0)

  const extraPrice = useCallback((c) => {
    const base = Number(c.listPrice)
    if (!Number.isFinite(base)) return null
    return discount.active ? Number((base * (1 - discount.pct / 100)).toFixed(2)) : base
  }, [discount])

  // Selections beyond the included count in each section are charged at the website price.
  const chooserExtras = useMemo(() => sections.flatMap((g) => (sel[g.key] || []).slice(g.choose)), [sections, sel])
  const chooserExtrasTotal = useMemo(
    () => chooserExtras.reduce((sum, sku) => { const c = findItem(sku); const p = c ? extraPrice(c) : 0; return sum + (p || 0) }, 0),
    [chooserExtras, findItem, extraPrice],
  )

  const extrasList = useMemo(() => Object.entries(extras).filter(([, q]) => q > 0), [extras])
  const extrasTotal = useMemo(
    () => extrasList.reduce((sum, [sku, q]) => {
      const c = findItem(sku)
      const p = c ? extraPrice(c) : 0
      return sum + (p || 0) * q
    }, 0),
    [extrasList, findItem, extraPrice],
  )
  const combinedExtrasTotal = extrasTotal + chooserExtrasTotal
  const grandTotal = Number(kit.price) + combinedExtrasTotal

  const groupByFamily = (colours) => {
    const m = new Map()
    for (const c of colours) { const f = c.family || 'Other'; if (!m.has(f)) m.set(f, []); m.get(f).push(c) }
    return [...m.entries()]
  }
  const toggleColour = (sectionKey, sku) => {
    setSel((prev) => {
      const cur = prev[sectionKey] || []
      if (cur.includes(sku)) return { ...prev, [sectionKey]: cur.filter((s) => s !== sku) }
      return { ...prev, [sectionKey]: [...cur, sku] }
    })
  }
  const addExtra = (sku) => setExtras((e) => ({ ...e, [sku]: (e[sku] || 0) + 1 }))
  const removeExtra = (sku) => setExtras((e) => { const q = (e[sku] || 0) - 1; const n = { ...e }; if (q <= 0) delete n[sku]; else n[sku] = q; return n })

  const handleAdd = () => {
    if (!ready) return
    const includedChosen = sections.flatMap((g) => (sel[g.key] || []).slice(0, g.choose))
    // Additional items (paid extras) become their own separate basket lines — not folded into the kit.
    const extraQty = {}
    for (const sku of chooserExtras) extraQty[sku] = (extraQty[sku] || 0) + 1
    for (const [sku, q] of extrasList) extraQty[sku] = (extraQty[sku] || 0) + q
    const extraLineItems = Object.entries(extraQty).map(([sku, qty]) => {
      const c = findItem(sku)
      return { name: c?.name || sku, sku, qty, price: c ? extraPrice(c) : null }
    })
    const payload = {
      kitId: kit.id,
      name: kit.name,
      price: Number(kit.price),
      chosen: includedChosen.map((sku) => findItem(sku)?.name || sku),
      mustHaves: kit.mustHaves,
      freeGift: kit.freeGift,
      extras: [],
      extrasTotal: 0,
      total: Number(Number(kit.price).toFixed(2)),
    }
    // Persist kit line to the kit store keyed by a unique line id
    const store = readKitStore()
    const lineId = `${kit.id}-${Date.now()}`
    store[lineId] = payload
    writeKitStore(store)
    if (typeof onAddKit === 'function') onAddKit({ lineId, ...payload, extraLineItems })
    setAdded(true)
    setShowModal(true)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.15em] text-neutral-500 transition hover:text-[#9B1268]"><span aria-hidden>←</span> All kits</button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl">{kit.name}</h1>

          {/* Always included (with product descriptions) */}
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-[#faf8f6] p-5">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9B1268]">Included</span>
              <span className="h-px flex-1 bg-neutral-200" />
              <span className="text-[11px] text-neutral-400">{sections.length === 0 ? "What’s in this kit" : 'no need to add these'}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[...(kit.included || []), ...(sections.length === 0 ? kit.colours : [])].map((item) => (
                <div key={item.name} className="flex gap-3 rounded-xl border border-neutral-200/70 bg-white p-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7f2f5]">
                    {item.image
                      ? <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      : <span className="text-lg text-[#9B1268]/40">{item.free ? '✦' : '◦'}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-tight text-neutral-900">{item.name}{item.free ? <span className="ml-1.5 rounded-full bg-[#9B1268]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#9B1268]">free</span> : null}</p>
                    {item.description && <p className="mt-1 text-[12px] leading-snug text-neutral-500">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product descriptions & application guides */}
          {kit.guides?.length > 0 && (
            <div className="mt-4 space-y-2">
              {kit.guides.map((g) => (
                <details key={g.title} className="group rounded-xl border border-neutral-200 bg-white p-4">
                  <summary className="flex cursor-pointer items-center justify-between text-[13px] font-medium tracking-tight text-neutral-900">{g.title} <span className="text-[11px] font-normal uppercase tracking-[0.12em] text-neutral-400">how to use</span></summary>
                  {g.paragraphs.map((p, i) => (<p key={i} className="mt-2 text-[13px] leading-relaxed text-neutral-600">{p}</p>))}
                  {g.application.length > 0 && (
                    <>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.15em] text-[#9B1268]">Application</p>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[13px] text-neutral-600">{g.application.map((a, i) => (<li key={i}>{a}</li>))}</ol>
                    </>
                  )}
                </details>
              ))}
            </div>
          )}

          {/* Colour chooser — one section per required selection */}
          {sections.map((section) => {
            const secSel = sel[section.key] || []
            const secReady = secSel.length >= section.choose
            const secExtra = Math.max(0, secSel.length - section.choose)
            const fams = groupByFamily(section.colours)
            return (
              <div key={section.key} className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-[13px] font-medium uppercase tracking-[0.18em] text-neutral-700">{section.label}</h2>
                  <span className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${secReady ? 'bg-[#9B1268] text-white' : 'border border-neutral-300 text-neutral-500'}`}>{Math.min(secSel.length, section.choose)} / {section.choose}{secExtra > 0 ? ` +${secExtra}` : ''}</span>
                </div>
                <p className="mt-1 text-[12px] text-neutral-500">{section.choose} included in your kit — pick more to add at the website price.</p>
                <div className="mt-4 space-y-6">
                  {fams.map(([family, list]) => (
                    <div key={family}>
                      {fams.length > 1 && (
                        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#9B1268]">{family} <span className="font-normal text-neutral-400">&middot; {list.length}</span></p>
                      )}
                      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
                        {list.map((c) => {
                          const isSel = secSel.includes(c.sku)
                          const pos = secSel.indexOf(c.sku)
                          const isPaid = isSel && pos >= section.choose
                          const capReached = secSel.length >= section.choose
                          const p = extraPrice(c)
                          const views = [c.image, c.imageB, c.imageC].filter(Boolean)
                          return (
                            <button
                              key={c.sku}
                              type="button"
                              onClick={() => toggleColour(section.key, c.sku)}
                              className={`flex flex-col overflow-hidden rounded-xl border text-left transition ${isSel ? 'border-[#9B1268] ring-1 ring-[#9B1268]' : 'border-neutral-200 hover:border-[#9B1268]/40'}`}
                              title={c.name}
                            >
                              <div className="relative flex h-40 items-center justify-center bg-[#faf8f6] p-2">
                                {c.image
                                  ? <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-contain" onMouseEnter={(e) => { if (views.length < 2) return; let i = 0; clearInterval(e.currentTarget._t); e.currentTarget._t = setInterval(() => { i = (i + 1) % views.length; e.currentTarget.src = views[i] }, 800) }} onMouseLeave={(e) => { clearInterval(e.currentTarget._t); e.currentTarget.src = c.image }} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                                  : <span className="text-[10px] text-neutral-400">Image coming soon</span>}
                                {isSel && !isPaid && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#9B1268] text-[12px] font-bold text-white">✓</span>}
                                {isPaid && p != null && <span className="absolute right-2 top-2 rounded-full bg-[#9B1268] px-2 py-0.5 text-[10px] font-semibold text-white">+{fmt(p)}</span>}
                                {!isSel && capReached && p != null && <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#9B1268] shadow-sm">+{fmt(p)}</span>}
                                {views.length > 1 && <span className="absolute bottom-1.5 right-1.5 rounded bg-neutral-900/40 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white">A·B·C</span>}
                              </div>
                              <span className="border-t border-neutral-100 px-3 py-2.5 text-[12px] font-medium leading-tight tracking-tight text-neutral-800">{c.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Optional extras */}
          {showExtraSection && extrasSource.length > 0 && (
            <details className="mt-5 rounded-2xl border border-neutral-200 bg-[#faf8f6] p-5" open={extrasSource.length <= 24}>
              <summary className="cursor-pointer text-[13px] font-medium tracking-tight text-neutral-900">{kit.extraColours?.length ? 'Add more colours' : 'Add more from this range'} <span className="font-normal text-neutral-400">— at the current website price</span></summary>
              <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {extrasSource.map((c) => {
                  const q = extras[c.sku] || 0
                  const p = extraPrice(c)
                  const views = [c.image, c.imageB, c.imageC].filter(Boolean)
                  return (
                    <div key={`x-${c.sku}`} className={`flex flex-col overflow-hidden rounded-xl border bg-white transition ${q > 0 ? 'border-[#9B1268] ring-1 ring-[#9B1268]' : 'border-neutral-200'}`}>
                      <div className="relative flex h-32 items-center justify-center bg-[#faf8f6] p-2">
                        {c.image
                          ? <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-contain" onMouseEnter={(e) => { if (views.length < 2) return; let i = 0; clearInterval(e.currentTarget._t); e.currentTarget._t = setInterval(() => { i = (i + 1) % views.length; e.currentTarget.src = views[i] }, 800) }} onMouseLeave={(e) => { clearInterval(e.currentTarget._t); e.currentTarget.src = c.image }} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                          : <span className="text-[10px] text-neutral-400">Image coming soon</span>}
                        {q > 0 && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#9B1268] text-[12px] font-bold text-white">{q}</span>}
                        {views.length > 1 && <span className="absolute bottom-1.5 right-1.5 rounded bg-neutral-900/40 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white">A·B·C</span>}
                      </div>
                      <div className="flex flex-1 flex-col border-t border-neutral-100 p-2.5">
                        <span className="line-clamp-2 text-[12px] font-medium leading-tight text-neutral-800">{c.name}</span>
                        <span className="mt-0.5 text-[12px] font-medium text-[#9B1268]">{p != null ? fmt(p) : '—'}</span>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button type="button" onClick={() => removeExtra(c.sku)} disabled={q === 0} className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition hover:border-[#9B1268] hover:text-[#9B1268] disabled:opacity-30">−</button>
                          <span className="w-6 text-center text-[13px] font-medium text-neutral-800">{q}</span>
                          <button type="button" onClick={() => addExtra(c.sku)} disabled={p == null} className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition hover:border-[#9B1268] hover:text-[#9B1268] disabled:opacity-30">+</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] text-neutral-500">
                This is only a selection.
                <NavLink to="/full-catalogue" className="font-semibold text-[#9B1268] underline decoration-[#9B1268]/40 underline-offset-2 transition hover:text-[#7c1445]">Click to see the full catalogue →</NavLink>
              </p>
            </details>
          )}

          {/* Complete your kit — popular add-ons (slow auto-scrolling marquee) */}
          {addOns.length > 0 && (
            <div className="giup-marquee mt-8 rounded-2xl border border-neutral-200 p-5">
              <style>{`
                @keyframes giup-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                .giup-marquee-track { animation: giup-marquee 45s linear infinite; }
                .giup-marquee:hover .giup-marquee-track { animation-play-state: paused; }
                @media (prefers-reduced-motion: reduce) { .giup-marquee-track { animation: none; } }
              `}</style>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9B1268]">Complete your kit</span>
                <span className="h-px flex-1 bg-neutral-200" />
                <span className="text-[11px] text-neutral-400">popular extras</span>
              </div>
              <div className="mt-4 overflow-hidden">
                <div className="giup-marquee-track flex w-max gap-3">
                  {[...addOns, ...addOns].map((a, idx) => {
                    const q = extras[a.sku] || 0
                    const p = extraPrice(a)
                    return (
                      <div key={`a-${a.sku}-${idx}`} className={`flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border bg-white transition ${q > 0 ? 'border-[#9B1268] ring-1 ring-[#9B1268]' : 'border-neutral-200'}`}>
                        <div className="relative flex h-32 items-center justify-center bg-[#faf8f6] p-3">
                          {a.image
                            ? <img src={a.image} alt={a.name} loading="lazy" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                            : <span className="text-[11px] text-neutral-400">Image coming soon</span>}
                          {q > 0 && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#9B1268] text-[12px] font-bold text-white">{q}</span>}
                        </div>
                        <div className="flex flex-1 flex-col border-t border-neutral-100 p-3">
                          <p className="text-[13px] font-medium leading-tight tracking-tight text-neutral-900">{a.name}</p>
                          <span className="mt-1 text-sm font-medium text-[#9B1268]">{p != null ? fmt(p) : '—'}</span>
                          <div className="mt-2 flex items-center gap-1.5">
                            <button type="button" onClick={() => removeExtra(a.sku)} disabled={q === 0} className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition hover:border-[#9B1268] hover:text-[#9B1268] disabled:opacity-30">−</button>
                            <span className="w-6 text-center text-[13px] font-medium text-neutral-800">{q}</span>
                            <button type="button" onClick={() => addExtra(a.sku)} disabled={p == null} className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition hover:border-[#9B1268] hover:text-[#9B1268] disabled:opacity-30">+</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-400">
                Hover to pause · a few popular picks —
                <NavLink to="/full-catalogue" className="font-semibold text-[#9B1268] underline decoration-[#9B1268]/40 underline-offset-2 transition hover:text-[#7c1445]">see the full catalogue →</NavLink>
              </p>
            </div>
          )}
        </div>

        {/* Summary rail */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">Your kit</p>
            <div className="mt-4 flex items-center justify-between text-[14px]">
              <span className="text-neutral-600">{kit.name}</span>
              <span className="font-medium text-neutral-900">{fmt(kit.price)}</span>
            </div>
            {kit.retailValue > kit.price && (
              <div className="mt-1.5 flex items-center justify-between text-[13px]">
                <span className="text-neutral-400">Bought separately</span>
                <span className="text-neutral-400 line-through">{fmt(kit.retailValue)}</span>
              </div>
            )}
            {combinedExtrasTotal > 0 && (
              <div className="mt-1.5 flex items-center justify-between text-[13px]">
                <span className="text-neutral-600">Optional extras</span>
                <span className="font-medium text-neutral-900">{fmt(combinedExtrasTotal)}</span>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
              <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-neutral-500">Total</span>
              <span className="text-3xl font-light tracking-tight text-neutral-900">{fmt(grandTotal)}</span>
            </div>
            {kit.savings > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#9B1268]/[0.05] py-2 text-[12px] font-medium text-[#9B1268]">Save {fmt(kit.savings)} ({kit.savingsPct}%) vs buying separately</div>
            )}
            <p className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D43790]" /> Summer Madness price — build now, before the sale ends.</p>
            <p className="mt-2 text-[11px] text-neutral-400">Shipping added at checkout (flat rate by country).</p>

            {added ? (
              <div className="mt-5">
                <div className="rounded-lg border border-[#9B1268]/20 bg-[#9B1268]/[0.05] px-3 py-2.5 text-center text-[13px] font-medium text-[#9B1268]">Kit added to your basket</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setSel({}); setExtras({}); setAdded(false) }} className="rounded-full border border-neutral-300 px-3 py-2.5 text-[12px] font-medium uppercase tracking-[0.1em] text-neutral-700 transition hover:border-[#9B1268] hover:text-[#9B1268]">Build another</button>
                  <NavLink to="/checkout" className="rounded-full bg-[#9B1268] px-3 py-2.5 text-center text-[12px] font-medium uppercase tracking-[0.1em] text-white transition hover:bg-[#7c1445]">Checkout</NavLink>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={!ready}
                className="mt-5 w-full rounded-full bg-[#9B1268] px-5 py-3.5 text-[13px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-[#7c1445] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ready ? 'Add kit to basket' : `Select ${remaining} more`}
              </button>
            )}
            <NavLink to="/full-catalogue" className="mt-4 block text-center text-[12px] font-medium text-[#9B1268] transition hover:text-[#7c1445]">Continue shopping in the full catalogue →</NavLink>
            <p className="mt-1.5 text-center text-[11px] text-neutral-400">Your basket is saved as you browse.</p>
          </div>
        </aside>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <div className="flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#9B1268]/10 text-2xl text-[#9B1268]">✓</span>
            </div>
            <h3 className="mt-4 text-center text-xl font-medium tracking-tight text-neutral-900">Your kit is ready!</h3>
            <p className="mt-2 text-center text-[14px] leading-relaxed text-neutral-500"><span className="font-medium text-neutral-800">{kit.name}</span> has been added to your basket. Would you like to add more, or head to checkout?</p>
            <div className="mt-6 space-y-2.5">
              <NavLink to="/checkout" className="block w-full rounded-full bg-[#9B1268] px-5 py-3 text-center text-[13px] font-medium uppercase tracking-[0.12em] text-white transition hover:bg-[#7c1445]">Continue to checkout</NavLink>
              <button type="button" onClick={() => { setShowModal(false); setSel({}); setExtras({}); setAdded(false); navigate('/starter-kits') }} className="block w-full rounded-full border border-neutral-300 px-5 py-3 text-center text-[13px] font-medium uppercase tracking-[0.12em] text-neutral-700 transition hover:border-[#9B1268] hover:text-[#9B1268]">Build another kit</button>
              <button type="button" onClick={() => setShowModal(false)} className="block w-full px-5 py-2 text-center text-[12px] font-medium text-neutral-500 transition hover:text-[#9B1268]">Keep adding to this kit</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
