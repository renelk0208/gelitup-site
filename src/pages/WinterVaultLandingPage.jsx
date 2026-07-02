import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

// Update this when the real restock window is confirmed.
const VAULT_CLOSES_AT = '2026-08-09T23:59:59'

// New-product reveal date — separate teaser from the winter revival above.
const REVEAL_AT = '2026-09-01T00:00:00'

const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/gelitupinternational/'

const VOTER_KEY_STORAGE = 'gelitup.vault.voter_key.v1'
const VOTED_CODES_STORAGE = 'gelitup.vault.voted_codes.v1'

// Random per-browser key so one browser can't inflate a shade's count — no PII.
function getVoterKey() {
  try {
    let key = localStorage.getItem(VOTER_KEY_STORAGE)
    if (!key) {
      key = crypto.randomUUID()
      localStorage.setItem(VOTER_KEY_STORAGE, key)
    }
    return key
  } catch {
    return 'anonymous'
  }
}

// Six archive shades already tagged "-HTF" (Hard To Find) in the catalogue —
// picked for a winter mood. Swap freely once the team locks the final line-up.
const VAULT_SHADES = [
  { code: '05', name: 'Snow Queen', image: '/gelitup-content/product-images/COLORS/FRENCH/GIUP-05.webp' },
  { code: '1819', name: 'Frozen', image: '/gelitup-content/product-images/COLORS/GLITTERS/GIUP-1819.webp' },
  { code: '1938', name: 'Midnight', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-1938.webp' },
  { code: '2046', name: 'Twilight Mist', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2046.webp' },
  { code: '2061', name: 'Onyx', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2061.webp' },
  { code: '2135', name: 'Ruby Velvet', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2135.webp' },
]

// Candidates for "vote for the next revival" — also real archive "-HTF" shades,
// just not yet confirmed for the vault. Seed counts are intentionally modest
// launch-day numbers; votes are client-side only until a real vote store exists.
const VOTE_CANDIDATES = [
  { code: '117', name: 'Plum-it', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-117.webp', seedVotes: 4 },
  { code: '128', name: 'Indigo Dreams', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-128.webp', seedVotes: 9 },
  { code: '129', name: 'Smoke on the Water', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-129.webp', seedVotes: 6 },
  { code: '13', name: 'Purple Rain', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-13.webp', seedVotes: 12 },
  { code: '148', name: 'Cherrywood', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown/GIUP-148.webp', seedVotes: 3 },
  { code: '150', name: 'Espresso No', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown/GIUP-150.webp', seedVotes: 5 },
  { code: '156', name: 'Foxen', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown/GIUP-156.webp', seedVotes: 2 },
  { code: '18', name: 'Violet Nights', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-18.webp', seedVotes: 8 },
  { code: '1811', name: 'Another Shade of Grey', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-1811.webp', seedVotes: 6 },
  { code: '1815', name: 'What a Slate', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-1815.webp', seedVotes: 4 },
  { code: '1822', name: 'Dark Angel', image: '/gelitup-content/product-images/COLORS/GLITTERS/GIUP-1822.webp', seedVotes: 11 },
  { code: '1900', name: 'Moon Mist', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Yellow/GIUP-1900.webp', seedVotes: 2 },
  { code: '1906', name: 'The New Black', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Coral Orange/GIUP-1906.webp', seedVotes: 7 },
  { code: '1945', name: 'Amaranth', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-1945.webp', seedVotes: 5 },
  { code: '2036', name: 'Not So Purple', image: '/gelitup-content/product-images/COLORS/PASTEL/GIUP-2036.webp', seedVotes: 3 },
  { code: '2052', name: 'Clear Grey Skies', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2052.webp', seedVotes: 6 },
  { code: '2053', name: 'Lockdown Blues', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-2053.webp', seedVotes: 2 },
  { code: '2055', name: 'Liquid Tar', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Black/GIUP-2055.webp', seedVotes: 12 },
  { code: '2057', name: 'Curfew', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-2057.webp', seedVotes: 5 },
  { code: '2113D', name: 'Rose Moonlight', image: '/gelitup-content/product-images/COLORS/GLITTERS/GIUP-2113D.webp', seedVotes: 4 },
  { code: '2113K', name: 'Dusty Crystal', image: '/gelitup-content/product-images/COLORS/GLITTERS/GIUP-2113K.webp', seedVotes: 3 },
  { code: '2113M', name: 'Lilac Ice', image: '/gelitup-content/product-images/COLORS/GLITTERS/GIUP-2113M.webp', seedVotes: 7 },
  { code: '2130', name: 'Passing Storm', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-2130.webp', seedVotes: 9 },
  { code: '2134', name: 'Vintage Rose', image: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-2134.webp', seedVotes: 5 },
]

function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

function VoteCard({ shade, count, voted, onVote }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
      <img
        src={shade.image}
        alt={`${shade.name} gel colour swatch`}
        className="aspect-square w-full object-cover"
        loading="lazy"
      />
      <div className="px-3 py-2.5">
        <p className="text-sm font-bold truncate" style={{ color: '#1a1a1a' }}>{shade.name}</p>
        <p className="text-xs mt-0.5 mb-2.5" style={{ color: '#6b7280' }}>GIUP {shade.code}</p>
        <button
          type="button"
          onClick={() => onVote(shade.code)}
          disabled={voted}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition"
          style={voted
            ? { backgroundColor: '#fbeaf0', color: '#D43790', cursor: 'default' }
            : { backgroundColor: '#1a1a1a', color: '#fff', cursor: 'pointer' }}
        >
          <HeartIcon filled={voted} />
          {voted ? 'Voted' : 'Vote'} · {count}
        </button>
      </div>
    </div>
  )
}

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

function useCountdown(targetIso) {
  const [msLeft, setMsLeft] = useState(() => new Date(targetIso).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(new Date(targetIso).getTime() - Date.now())
    }, 60000)
    return () => clearInterval(id)
  }, [targetIso])

  const clamped = Math.max(0, msLeft)
  const days = Math.floor(clamped / (1000 * 60 * 60 * 24))
  const hours = Math.floor((clamped / (1000 * 60 * 60)) % 24)
  return { days, hours, isOver: clamped <= 0 }
}

export default function WinterVaultLandingPage() {
  const { days, hours, isOver } = useCountdown(VAULT_CLOSES_AT)
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(VOTE_CANDIDATES.map((c) => [c.code, c.seedVotes]))
  )
  const [votedCodes, setVotedCodes] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(VOTED_CODES_STORAGE) || '[]')) } catch { return new Set() }
  })

  // Displayed counts = seed numbers + every real vote recorded in Supabase.
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return
    let cancelled = false
    supabase
      .from('vault_votes')
      .select('shade_code')
      .limit(10000)
      .then(({ data, error }) => {
        if (cancelled || error || !Array.isArray(data)) return
        setVotes(() => {
          const next = Object.fromEntries(VOTE_CANDIDATES.map((c) => [c.code, c.seedVotes]))
          for (const row of data) {
            if (row.shade_code in next) next[row.shade_code] += 1
          }
          return next
        })
      })
    return () => { cancelled = true }
  }, [])

  const castVote = (code) => {
    if (votedCodes.has(code)) return
    setVotes((prev) => ({ ...prev, [code]: prev[code] + 1 }))
    setVotedCodes((prev) => {
      const next = new Set(prev).add(code)
      try { localStorage.setItem(VOTED_CODES_STORAGE, JSON.stringify([...next])) } catch {}
      return next
    })
    if (hasSupabaseConfig && supabase) {
      supabase.from('vault_votes').insert({ shade_code: code, voter_key: getVoterKey() }).then(() => {})
    }
  }

  const scrollToVote = (e) => {
    e.preventDefault()
    document.getElementById('vote-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const reveal = useDetailedCountdown(REVEAL_AT)
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState('idle') // idle | submitting | success | error

  // Optional email capture after voting — feeds the same subscriber list.
  const [voteEmail, setVoteEmail] = useState('')
  const [voteEmailStatus, setVoteEmailStatus] = useState('idle') // idle | submitting | success | error

  const handleVoteSubscribe = async (e) => {
    e.preventDefault()
    if (!voteEmail.trim()) return
    setVoteEmailStatus('submitting')
    try {
      if (hasSupabaseConfig && supabase) {
        const { error: insertError } = await supabase
          .from('vault_subscribers')
          .insert({ email: voteEmail.trim().toLowerCase(), campaign: 'winter-vault-vote' })
        if (insertError && insertError.code !== '23505') throw insertError
      }
      setVoteEmailStatus('success')
    } catch {
      setVoteEmailStatus('error')
    }
  }

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
    document.title = 'The Winter Vault | GEL.IT.UP® by GIUP®'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Hard-to-find winter gel shades, back for a limited run. No new colours this year — just the ones worth bringing back.')
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f7f5', fontFamily: 'inherit' }}>

      {/* Minimal sticky header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#1a1a1a' }}>
        <NavLink to="/">
          <img src="/gelitup_logo.png" alt="GEL.IT.UP" className="h-8 w-auto" />
        </NavLink>
        <NavLink
          to="/full-catalogue?category=colours"
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition"
          style={{ backgroundColor: '#D43790' }}
        >
          Shop the Vault
        </NavLink>
      </header>

      {/* Hero */}
      <section className="px-5 py-12 sm:py-20 text-center" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#D43790' }}>
          GEL.IT.UP® by GIUP® — The Winter Vault
        </p>
        <h1 className="mt-4 text-4xl sm:text-6xl font-black leading-tight tracking-tight">
          Some shades don't<br />need reinventing
        </h1>
        <p className="mt-5 mx-auto max-w-xl text-base sm:text-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
          We didn't launch new winter colours this year. We opened the vault instead —
          six hard-to-find shades from the archive, back for a limited run only.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <NavLink
            to="/full-catalogue?category=colours"
            className="rounded-xl px-8 py-3.5 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#D43790' }}
          >
            Shop the Vault
          </NavLink>
          <a
            href="#vote-section"
            onClick={scrollToVote}
            className="rounded-xl px-8 py-3.5 text-base font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.4)', color: '#fff' }}
          >
            Vote for the Next Revival
          </a>
        </div>
      </section>

      {/* Countdown banner */}
      {!isOver && (
        <section className="px-5 py-4 text-center" style={{ backgroundColor: '#D43790' }}>
          <p className="text-sm font-bold text-white">
            Back for a limited time only — {days}d {hours}h left before these return to the vault
          </p>
        </section>
      )}

      {/* Vault shade grid */}
      <section className="px-5 py-10 sm:py-14">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: '#6b7280' }}>
          Hard to find. Found again.
        </p>
        <h2 className="text-center text-2xl sm:text-3xl font-black mb-8" style={{ color: '#1a1a1a' }}>
          Six shades from the archive
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {VAULT_SHADES.map((shade) => (
            <NavLink
              key={shade.code}
              to="/full-catalogue?category=colours"
              className="rounded-2xl overflow-hidden transition hover:scale-[1.02]"
              style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
            >
              <img
                src={shade.image}
                alt={`${shade.name} gel colour swatch`}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="px-3 py-2.5">
                <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>{shade.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>GIUP {shade.code}</p>
              </div>
            </NavLink>
          ))}
        </div>
      </section>

      {/* Vote for the next revival */}
      <section id="vote-section" className="px-5 py-10 sm:py-14" style={{ backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: '#6b7280' }}>
          24 more are waiting
        </p>
        <h2 className="text-center text-2xl sm:text-3xl font-black mb-2" style={{ color: '#1a1a1a' }}>
          Vote for the next revival
        </h2>
        <p className="text-center text-sm mb-8 mx-auto max-w-lg" style={{ color: '#6b7280' }}>
          These didn't make the first six. Vote for the ones you want back — the highest votes win the next vault drop.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
          {VOTE_CANDIDATES.map((shade) => (
            <VoteCard
              key={shade.code}
              shade={shade}
              count={votes[shade.code]}
              voted={votedCodes.has(shade.code)}
              onVote={castVote}
            />
          ))}
        </div>

        {/* Post-vote email capture — no registration required to vote */}
        <div
          className="mt-10 mx-auto max-w-md rounded-2xl px-6 py-6 text-center transition"
          style={votedCodes.size > 0
            ? { backgroundColor: '#1a1a1a' }
            : { backgroundColor: '#f8f7f5', border: '1px solid #e5e7eb' }}
        >
          <p className="text-sm font-bold" style={{ color: votedCodes.size > 0 ? '#fff' : '#1a1a1a' }}>
            {votedCodes.size > 0 ? 'Vote counted. Want to know if your pick wins?' : 'Want to know which shade wins?'}
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: votedCodes.size > 0 ? 'rgba(255,255,255,0.6)' : '#6b7280' }}>
            Leave your email and we&apos;ll tell you the moment the next revival is decided.
          </p>
          {voteEmailStatus === 'success' ? (
            <p className="text-sm font-bold" style={{ color: '#D43790' }}>You&apos;re on the list ✓</p>
          ) : (
            <form onSubmit={handleVoteSubscribe} className="flex flex-col sm:flex-row gap-2 justify-center">
              <input
                type="email"
                required
                value={voteEmail}
                onChange={(e) => setVoteEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-xl px-4 py-3 text-sm flex-1"
                style={votedCodes.size > 0
                  ? { border: '1px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff' }
                  : { border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#1a1a1a' }}
              />
              <button
                type="submit"
                disabled={voteEmailStatus === 'submitting'}
                className="rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#D43790' }}
              >
                {voteEmailStatus === 'submitting' ? 'Saving…' : 'Keep Me Posted'}
              </button>
            </form>
          )}
          {voteEmailStatus === 'error' && (
            <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>Something went wrong. Please try again.</p>
          )}
        </div>
      </section>

      {/* Coming next — new product reveal teaser */}
      <section className="px-5 py-14 sm:py-20 text-center" style={{ backgroundColor: '#1a1a1a' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-2" style={{ color: '#D43790' }}>
          What's next
        </p>
        <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
          Something new is locked away
        </h2>
        <p className="mx-auto max-w-lg text-sm sm:text-base mb-10" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Not a revival this time — brand new products. The vault opens 1 September.
        </p>

        <div className="relative mx-auto" style={{ maxWidth: '280px' }}>
          <VaultDoorGraphic />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
              {reveal.isOver ? (
                <p className="text-sm font-bold text-white">It's open</p>
              ) : (
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
              )}
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
            {subscribeStatus === 'submitting' ? 'Subscribing…' : subscribeStatus === 'success' ? 'Subscribed ✓' : 'Notify Me'}
          </button>
        </form>
        {subscribeStatus === 'error' && (
          <p className="mt-2 text-xs" style={{ color: '#f87171' }}>Something went wrong. Please try again.</p>
        )}
        {subscribeStatus === 'success' && (
          <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>We'll email you the moment it opens.</p>
        )}
      </section>

      {/* UGC / tag prompt */}
      <section className="px-5 py-10" style={{ backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-black mb-2" style={{ color: '#1a1a1a' }}>
            Wearing a Vault shade?
          </h2>
          <p className="text-sm mb-5" style={{ color: '#6b7280' }}>
            Tag us on Instagram — we're reposting our favourite Winter Vault looks all season.
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            Tag @gelitupinternational →
          </a>
        </div>
      </section>

      {/* Bottom dual CTA */}
      <section className="px-5 py-14 text-center" style={{ backgroundColor: '#1a1a1a' }}>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Ready to stock up?</h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Once these sell through, they're going back in the vault.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <NavLink
            to="/full-catalogue?category=colours"
            className="rounded-xl px-8 py-3.5 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#D43790' }}
          >
            Shop the Vault
          </NavLink>
          <NavLink
            to="/become-distributor"
            className="rounded-xl px-8 py-3.5 text-base font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.4)', color: '#fff' }}
          >
            Register as Distributor
          </NavLink>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="px-5 py-5 text-center text-xs" style={{ color: '#9ca3af', backgroundColor: '#111' }}>
        © {new Date().getFullYear()} GEL.IT.UP® by GIUP® · gelitup.com ·{' '}
        <NavLink to="/privacy-policy" className="underline">Privacy</NavLink>
      </footer>
    </div>
  )
}
