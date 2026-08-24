import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'
import { SPIRAL_SHIMMERS_PRODUCTS, WINTER_VAULT_REVEAL_AT } from '../data/product-releases.js'

function useDetailedCountdown(targetIso) {
  const [msLeft, setMsLeft] = useState(() => new Date(targetIso).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(new Date(targetIso).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [targetIso])

  const clamped = Math.max(0, msLeft)
  return {
    days: Math.floor(clamped / 86400000),
    hours: Math.floor((clamped / 3600000) % 24),
    minutes: Math.floor((clamped / 60000) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
    isOver: clamped <= 0,
  }
}

function VaultDoorGraphic() {
  const rivets = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    return { x: 160 + Math.cos(angle) * 135, y: 160 + Math.sin(angle) * 135 }
  })
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2
    return {
      x1: 160 + Math.cos(angle) * 30, y1: 160 + Math.sin(angle) * 30,
      x2: 160 + Math.cos(angle) * 50, y2: 160 + Math.sin(angle) * 50,
    }
  })
  return (
    <svg viewBox="0 0 320 320" className="w-full h-auto" role="img" aria-label="Closed vault door">
      <circle cx="160" cy="160" r="150" fill="#1a1a1a" stroke="#D43790" strokeWidth="6" />
      <circle cx="160" cy="160" r="120" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      {rivets.map((r, i) => (
        <circle key={i} cx={r.x} cy={r.y} r="5" fill="rgba(255,255,255,0.25)" />
      ))}
      <circle cx="160" cy="160" r="55" fill="#D43790" />
      <circle cx="160" cy="160" r="55" fill="none" stroke="#1a1a1a" strokeWidth="3" />
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
      ))}
      <circle cx="160" cy="160" r="12" fill="#1a1a1a" />
    </svg>
  )
}

export default function WinterVaultLandingPage() {
  const reveal = useDetailedCountdown(WINTER_VAULT_REVEAL_AT)
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState('idle') // idle | submitting | success | error

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!subscribeEmail.trim()) return
    setSubscribeStatus('submitting')
    try {
      if (hasSupabaseConfig && supabase) {
        const { error: insertError } = await supabase
          .from('vault_subscribers')
          .insert({ email: subscribeEmail.trim().toLowerCase(), campaign: 'winter-vault-reveal' })
        if (insertError && insertError.code !== '23505') throw insertError
      }
      setSubscribeStatus('success')
    } catch {
      setSubscribeStatus('error')
    }
  }

  useEffect(() => {
    document.title = 'The Winter Vault | GEL.IT.UP by GIUP®'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Something new is locked in the vault. It opens 1 September — leave your email and be the first inside.')
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a1a1a', fontFamily: 'inherit' }}>

      {/* Minimal sticky header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#111' }}>
        <NavLink to="/">
          <img src="/gelitup_logo.png" alt="GEL.IT.UP" className="h-8 w-auto" />
        </NavLink>
        <NavLink
          to="/full-catalogue"
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#D43790' }}
        >
          Browse the Catalogue
        </NavLink>
      </header>

      {/* The vault */}
      <section className="flex-1 px-5 py-14 sm:py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#D43790' }}>
          GEL.IT.UP by GIUP® — The Winter Vault
        </p>
        <h1 className="heading-on-dark mt-4 text-4xl sm:text-6xl font-black leading-tight tracking-tight" style={{ color: '#fff' }}>
          {reveal.isOver ? <>Spiral Shimmers<br />have arrived</> : <>Something new is<br />locked away</>}
        </h1>
        <p className="mt-5 mx-auto max-w-lg text-base sm:text-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
          {reveal.isOver
            ? 'Five new Spiral Shimmers gel polish colours are now available.'
            : 'Brand new products, sealed until the vault opens on 1 September. Leave your email and be the first inside.'}
        </p>

        {!reveal.isOver ? (
          <>
            <div className="relative mx-auto mt-12" style={{ maxWidth: '280px' }}>
              <VaultDoorGraphic />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <div className="flex items-end gap-3">
                  {[
                    { v: reveal.days, l: 'D' },
                    { v: reveal.hours, l: 'H' },
                    { v: reveal.minutes, l: 'M' },
                    { v: reveal.seconds, l: 'S' },
                  ].map((u) => (
                    <div key={u.l} className="text-center">
                      <p className="text-2xl font-black text-white leading-none tabular-nums">{String(u.v).padStart(2, '0')}</p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{u.l}</p>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </div>
            <p className="mt-10 text-sm font-bold text-white">Opens 1 September 2026</p>
            <form onSubmit={handleSubscribe} className="mt-6 mx-auto flex flex-col sm:flex-row gap-2 justify-center max-w-sm">
              <input
                type="email"
                required
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-xl px-4 py-3 text-sm flex-1"
                style={{ border: '1px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff' }}
              />
              <button
                type="submit"
                disabled={subscribeStatus === 'submitting' || subscribeStatus === 'success'}
                className="rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#D43790' }}
              >
                {subscribeStatus === 'submitting' ? 'Saving…' : subscribeStatus === 'success' ? "You're on the list ✓" : 'Keep Me Posted'}
              </button>
            </form>
            {subscribeStatus === 'error' && (
              <p className="mt-2 text-xs" style={{ color: '#f87171' }}>Something went wrong. Please try again.</p>
            )}
            {subscribeStatus === 'success' && (
              <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>We'll email you the moment the vault opens.</p>
            )}
          </>
        ) : (
          <div className="mx-auto mt-10 max-w-5xl">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {SPIRAL_SHIMMERS_PRODUCTS.map((product) => (
                <NavLink
                  key={product.code}
                  to="/full-catalogue?subcategory=spiral-shimmers"
                  className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-left transition hover:-translate-y-1 hover:border-[#D43790]"
                >
                  <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />
                  <div className="p-3">
                    <p className="text-sm font-bold text-white">{product.name}</p>
                    <p className="mt-1 text-xs text-white/55">View in catalogue</p>
                  </div>
                </NavLink>
              ))}
            </div>
            <NavLink
              to="/full-catalogue?subcategory=spiral-shimmers"
              className="mt-8 inline-flex rounded-xl bg-[#D43790] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#BF3182]"
            >
              Shop Spiral Shimmers
            </NavLink>
          </div>
        )}
      </section>

      {/* Minimal footer */}
      <footer className="px-5 py-5 text-center text-xs" style={{ color: '#9ca3af', backgroundColor: '#111' }}>
        © {new Date().getFullYear()} GEL.IT.UP by GIUP® · gelitup.com ·{' '}
        <NavLink to="/privacy-policy" className="underline">Privacy</NavLink>
      </footer>
    </div>
  )
}
