import { useState, useEffect, useCallback } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

const TABLE = 'guestbook'
const ROLES = ['Nail Technician', 'Salon Owner', 'Distributor', 'Educator']
const PAGE_SIZE = 10

/* ── Country → flag emoji ───────────────────────────────────────────────────── */
const COUNTRY_FLAGS = {
  'italy': '🇮🇹', 'south africa': '🇿🇦', 'bulgaria': '🇧🇬', 'france': '🇫🇷',
  'japan': '🇯🇵', 'croatia': '🇭🇷', 'germany': '🇩🇪', 'united kingdom': '🇬🇧',
  'uae': '🇦🇪', 'united arab emirates': '🇦🇪', 'spain': '🇪🇸', 'sweden': '🇸🇪',
  'czech republic': '🇨🇿', 'czechia': '🇨🇿', 'greece': '🇬🇷', 'portugal': '🇵🇹',
  'netherlands': '🇳🇱', 'belgium': '🇧🇪', 'poland': '🇵🇱', 'austria': '🇦🇹',
  'switzerland': '🇨🇭', 'denmark': '🇩🇰', 'norway': '🇳🇴', 'finland': '🇫🇮',
  'ireland': '🇮🇪', 'romania': '🇷🇴', 'hungary': '🇭🇺', 'serbia': '🇷🇸',
  'slovenia': '🇸🇮', 'slovakia': '🇸🇰', 'turkey': '🇹🇷', 'usa': '🇺🇸',
  'united states': '🇺🇸', 'canada': '🇨🇦', 'australia': '🇦🇺', 'new zealand': '🇳🇿',
  'brazil': '🇧🇷', 'mexico': '🇲🇽', 'argentina': '🇦🇷', 'colombia': '🇨🇴',
  'india': '🇮🇳', 'china': '🇨🇳', 'south korea': '🇰🇷', 'thailand': '🇹🇭',
  'malaysia': '🇲🇾', 'singapore': '🇸🇬', 'philippines': '🇵🇭', 'indonesia': '🇮🇩',
  'nigeria': '🇳🇬', 'kenya': '🇰🇪', 'egypt': '🇪🇬', 'morocco': '🇲🇦',
  'israel': '🇮🇱', 'saudi arabia': '🇸🇦', 'cyprus': '🇨🇾', 'malta': '🇲🇹',
  'lithuania': '🇱🇹', 'latvia': '🇱🇻', 'estonia': '🇪🇪', 'iceland': '🇮🇸',
  'luxembourg': '🇱🇺', 'montenegro': '🇲🇪', 'north macedonia': '🇲🇰', 'albania': '🇦🇱',
  'bosnia and herzegovina': '🇧🇦', 'kosovo': '🇽🇰', 'ukraine': '🇺🇦', 'russia': '🇷🇺',
}

function flagFor(country) {
  if (!country) return '🌍'
  return COUNTRY_FLAGS[country.toLowerCase().trim()] || '🌍'
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Role badge colours ─────────────────────────────────────────────────────── */
const ROLE_STYLE = {
  'Nail Technician': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'Salon Owner': 'bg-violet-100 text-violet-700 border-violet-200',
  'Distributor': 'bg-sky-100 text-sky-700 border-sky-200',
  'Educator': 'bg-amber-100 text-amber-700 border-amber-200',
}

/* ── Avatar colour hash ─────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  'bg-fuchsia-600', 'bg-violet-600', 'bg-rose-500', 'bg-amber-500',
  'bg-emerald-600', 'bg-sky-600', 'bg-indigo-600', 'bg-pink-500',
]
const colorFor = (str) => AVATAR_COLORS[Math.abs([...str].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length]
const initials = (n) => {
  const parts = n.trim().split(/\s+/)
  return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : n.trim().slice(0, 2).toUpperCase()
}

const STAR_LABELS = ['', 'Bad', 'Poor', 'OK', 'Good', 'Excellent']
const TRUNCATE_LENGTH = 120

/* ── Entry Card ─────────────────────────────────────────────────────────────── */
function EntryCard({ entry, featured }) {
  const [expanded, setExpanded] = useState(false)
  const message = entry.message || ''
  const isLong = message.length > TRUNCATE_LENGTH
  const displayMessage = expanded || !isLong ? message : message.slice(0, TRUNCATE_LENGTH).trimEnd() + '…'

  return (
    <div className={`rounded-2xl border p-5 transition ${featured ? 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 shadow-[0_2px_20px_rgba(212,55,144,0.12)]' : 'border-slate-100 bg-white'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${entry.anonymous ? 'bg-slate-400' : colorFor(entry.name)}`}>
          {entry.anonymous ? '🙈' : initials(entry.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{entry.anonymous ? 'Anonymous' : entry.name}</p>
            <span className="text-sm" title={entry.country}>{flagFor(entry.country)}</span>
            {featured && <span className="text-xs">⭐</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {entry.role && (
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[entry.role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {entry.role}
              </span>
            )}
            <span className="text-[11px] text-slate-400">{entry.country} · {timeAgo(entry.created_at)}</span>
          </div>
          {entry.rating > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`text-base leading-none ${s <= entry.rating ? 'text-[#D43790]' : 'text-slate-300'}`}>★</span>
              ))}
              <span className="ml-1 text-[10px] text-slate-400">{STAR_LABELS[entry.rating]}</span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">"{displayMessage}"</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-800 transition"
        >
          {expanded ? 'Show less ▲' : 'Read more ▼'}
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function GuestbookPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Form state
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [role, setRole] = useState('')
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [website, setWebsite] = useState('') // honeypot
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const loadEntries = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) return
    const { data } = await supabase
      .from(TABLE)
      .select('id, name, country, role, message, rating, created_at, featured, anonymous')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(100)
    setEntries(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  const formValid = name.trim().length > 0 && country.trim().length > 0 && role && comment.trim().length >= 10

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formValid) {
      setError('Please fill in all required fields. Comment must be at least 10 characters.')
      return
    }
    if (comment.trim().length > 1000) {
      setError('Comment must be under 1,000 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/.netlify/functions/guestbook-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          country: country.trim(),
          role,
          comment: comment.trim(),
          rating: rating > 0 ? rating : null,
          anonymous,
          website, // honeypot
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
      setName('')
      setCountry('')
      setRole('')
      setComment('')
      setRating(0)
      setHoverRating(0)
      setAnonymous(false)
      setWebsite('')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleEntries = entries.slice(0, visibleCount)
  const hasMore = visibleCount < entries.length

  return (
    <section className="space-y-6">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl">
        <img src="/gelitup-content/catalog-heroes/guestbook-banner.webp" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[#D43790]/50 pointer-events-none" aria-hidden="true" />
        <div className="relative px-6 py-14 text-center sm:px-10 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">For Professional Use Only</p>
          <h1 className="heading-on-dark mt-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Join the GEL.IT.UP Global Guestbook
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-black sm:text-base">
            Tell us where you're from and connect with professionals worldwide! If you have tried GEL.IT.UP please give us your feedback and tell us which is your favourite product.
          </p>
        </div>
      </div>

      {/* ─── Submit Form ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">✍️ Sign the Guestbook</h2>
            <p className="mt-1 text-sm text-slate-500">Your entry will be visible after review.</p>
          </div>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 text-base font-bold text-emerald-800">Thank you — you are now part of the GEL.IT.UP community.</p>
            <p className="mt-1 text-sm text-emerald-600">Your entry will appear once reviewed by our team.</p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-4 text-sm font-semibold text-emerald-600 underline hover:text-emerald-800"
            >
              Submit another entry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Honeypot — hidden from real users */}
            <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Country *</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                  placeholder="e.g. South Africa"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
              >
                <option value="">Select your role…</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Rating <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(rating === s ? 0 : s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-2xl leading-none transition hover:scale-110"
                  >
                    <span className={(hoverRating || rating) >= s ? 'text-[#D43790]' : 'text-slate-300'}>★</span>
                  </button>
                ))}
                {(hoverRating || rating) > 0 && (
                  <span className="ml-2 text-xs text-slate-500">{STAR_LABELS[hoverRating || rating]}</span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Comment *</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                placeholder="Share your experience with GEL.IT.UP products…"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{comment.length}/1,000</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-200"
              />
              <span className="text-sm text-slate-600">I prefer to remain anonymous</span>
            </label>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !formValid}
              className="rounded-lg bg-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_14px_rgba(212,55,144,0.4)] transition duration-300 hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : '✍️ Sign the Guestbook'}
            </button>
          </form>
        )}
      </div>

      {/* ─── Rotating Incentive Banner (cycles monthly) ────────────── */}
      {(() => {
        const incentives = [
          { emoji: '📸', text: <>Every month, we feature <span className="font-extrabold">3 comments</span> on our Instagram{' '}<a href="https://www.instagram.com/gelitupinternational/" target="_blank" rel="noreferrer" className="font-bold underline transition hover:text-fuchsia-900">@gelitupinternational</a></> },
          { emoji: '🔁', text: <>Selected salons get <span className="font-extrabold">reposted</span> on{' '}<a href="https://www.instagram.com/gelitupinternational/" target="_blank" rel="noreferrer" className="font-bold underline transition hover:text-fuchsia-900">@gelitupinternational</a></> },
          { emoji: '🎁', text: <>Leave a comment → chance to <span className="font-extrabold">receive a sample pack</span></> },
        ]
        const idx = new Date().getMonth() % incentives.length
        const { emoji, text } = incentives[idx]
        return (
          <div className="rounded-2xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-violet-50 px-5 py-4 text-center sm:px-7">
            <p className="text-sm font-semibold text-fuchsia-700">
              {emoji} {text}
            </p>
          </div>
        )
      })()}

      {/* ─── All Entries ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-extrabold text-slate-900">Latest Messages</h2>

        {loading && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-slate-200" />
                    <div className="h-3 w-16 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-3 w-full rounded bg-slate-200" />
                  <div className="h-3 w-3/4 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && entries.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">No messages yet. Be the first to sign the guestbook!</p>
        )}

        {!loading && entries.length > 0 && (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {visibleEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} featured={entry.featured} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
