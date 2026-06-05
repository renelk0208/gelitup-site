import { useState, useEffect, useCallback } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'
import { useLang, it as itTranslations } from '../lib/i18n.js'

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
  const lang = useLang()
  const T = lang === 'it' ? itTranslations : null
  const starLabels = T ? T.guestbook.star_labels : STAR_LABELS
  const [expanded, setExpanded] = useState(false)
  const message = entry.message || ''
  const isLong = message.length > TRUNCATE_LENGTH
  const displayMessage = expanded || !isLong ? message : message.slice(0, TRUNCATE_LENGTH).trimEnd() + '…'

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${featured ? 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 shadow-[0_2px_20px_rgba(212,55,144,0.12)]' : 'border-slate-100 bg-white ring-1 ring-slate-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${entry.anonymous ? 'bg-slate-400' : colorFor(entry.name)}`}>
          {entry.anonymous ? '🙈' : initials(entry.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{entry.anonymous ? (T ? 'Anonimo' : 'Anonymous') : entry.name}</p>
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
              <span className="ml-1 text-[10px] text-slate-400">{starLabels[entry.rating]}</span>
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
          {expanded ? (T ? T.guestbook.show_less : 'Show less ▲') : (T ? T.guestbook.read_more : 'Read more ▼')}
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function GuestbookPage() {
  const lang = useLang()
  const T = lang === 'it' ? itTranslations : null
  const starLabels = T ? T.guestbook.star_labels : STAR_LABELS
  const roles = T ? T.guestbook.roles : ROLES
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [countryFilter, setCountryFilter] = useState('all')

  const FILTER_COUNTRIES = [
    { code: 'all', label: 'All', flag: '🌍' },
    { code: 'Greece', label: 'Greece', flag: '🇬🇷' },
    { code: 'Bulgaria', label: 'Bulgaria', flag: '🇧🇬' },
    { code: 'France', label: 'France', flag: '🇫🇷' },
    { code: 'Romania', label: 'Romania', flag: '🇷🇴' },
    { code: 'Italy', label: 'Italy', flag: '🇮🇹' },
  ]

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
      setError(T ? 'Compila tutti i campi obbligatori. Il commento deve avere almeno 10 caratteri.' : 'Please fill in all required fields. Comment must be at least 10 characters.')
      return
    }
    if (comment.trim().length > 1000) {
      setError(T ? 'Il commento deve essere inferiore a 1.000 caratteri.' : 'Comment must be under 1,000 characters.')
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
      if (!res.ok) throw new Error(data.error || (T ? 'Invio non riuscito' : 'Submission failed'))
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
      setError(err.message || (T ? 'Qualcosa è andato storto. Riprova.' : 'Something went wrong. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEntries = countryFilter === 'all'
    ? entries
    : entries.filter((e) => (e.country || '').toLowerCase() === countryFilter.toLowerCase())
  const visibleEntries = filteredEntries.slice(0, visibleCount)
  const hasMore = visibleCount < filteredEntries.length

  return (
    <section className="space-y-6">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl">
        <img src="/gelitup-content/catalog-heroes/guestbook-banner.webp" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[#D43790]/50 pointer-events-none" aria-hidden="true" />
        <div className="relative px-6 py-14 text-center sm:px-10 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Professionals in 15+ countries trust GEL.IT.UP</p>
          <h1 className="heading-on-dark mt-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            {T ? T.guestbook.hero_title : 'Join the GEL.IT.UP Global Guestbook'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Join thousands of nail professionals sharing their experience with GEL.IT.UP.
            Tell us where you work, what you love, and which product is your go-to.
          </p>
        </div>
      </div>

      {/* ─── Sample Pack Incentive ────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5 rounded-2xl p-7 text-center sm:flex-row sm:text-left" style={{ background: 'linear-gradient(135deg, #D43790 0%, #9333ea 100%)' }}>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-4xl">🎁</div>
        <div className="flex-1">
          <p className="text-base font-extrabold text-white sm:text-lg">Sign the guestbook, get a sample pack</p>
          <p className="mt-1 text-sm text-white/80">
            Leave a comment and you could receive a curated GEL.IT.UP sample pack — on us.
          </p>
        </div>
        <a
          href="#sign-guestbook"
          className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold transition hover:bg-white/90"
          style={{ color: '#D43790' }}
        >
          Sign Now →
        </a>
      </div>

      {/* ─── All Entries ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#D43790' }}>FROM THE GEL.IT.UP COMMUNITY</p>
        <p className="mt-1 text-xs text-slate-500">Real professionals. Real results. Every entry is verified before publishing.</p>

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
          <p className="mt-4 text-sm text-slate-500">{T ? T.guestbook.no_messages : 'No messages yet. Be the first to sign the guestbook!'}</p>
        )}

        {!loading && entries.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {FILTER_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setCountryFilter(c.code); setVisibleCount(PAGE_SIZE) }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `1px solid ${countryFilter === c.code ? '#D43790' : '#ddd'}`,
                    background: countryFilter === c.code ? '#D43790' : '#fff',
                    color: countryFilter === c.code ? '#fff' : '#555',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: countryFilter === c.code ? 600 : 400,
                  }}
                >
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
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
                  {T ? T.guestbook.load_more : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Submit Form ──────────────────────────────────────────────── */}
      <div id="sign-guestbook" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#D43790' }}>Add your voice</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Sign the GEL.IT.UP Guestbook</h2>
            <p className="mt-1 text-sm text-slate-500">Your entry will appear after a short review. Professionals in 15+ countries have already signed.</p>
          </div>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 text-base font-bold text-emerald-800">{T ? T.guestbook.success_title : 'Thank you — you are now part of the GEL.IT.UP community.'}</p>
            <p className="mt-1 text-sm text-emerald-600">{T ? T.guestbook.success_subtitle : 'Your entry will appear once reviewed by our team.'}</p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-4 text-sm font-semibold text-emerald-600 underline hover:text-emerald-800"
            >
              {T ? T.guestbook.submit_another : 'Submit another entry'}
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
                <label className="mb-1 block text-sm font-medium text-slate-700">{T ? T.guestbook.field_name : 'Name'} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                  placeholder={T ? T.guestbook.placeholder_name : 'Your name'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{T ? T.guestbook.field_country : 'Country'} *</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                  placeholder={T ? 'es. Italia' : 'e.g. South Africa'}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{T ? T.guestbook.field_role : 'Role'} *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
              >
                <option value="">{T ? T.guestbook.select_role : 'Select your role…'}</option>
                {ROLES.map((r, i) => <option key={r} value={r}>{roles[i] || r}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{T ? T.guestbook.field_rating : 'Rating'} <span className="text-slate-400 font-normal">{T ? T.guestbook.field_rating_optional : '(optional)'}</span></label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(rating === s ? 0 : s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl leading-none transition hover:scale-110 cursor-pointer"
                    style={{ color: (hoverRating || rating) >= s ? '#D43790' : '#d1d5db' }}
                  >
                    ★
                  </button>
                ))}
                {(hoverRating || rating) > 0 && (
                  <span className="ml-2 text-xs text-slate-500">{starLabels[hoverRating || rating]}</span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{T ? T.guestbook.field_comment : 'Comment'} *</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                placeholder={T ? T.guestbook.placeholder_comment : 'Share your experience with GEL.IT.UP products…'}
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
              <span className="text-sm text-slate-600">{T ? T.guestbook.field_anonymous : 'I prefer to remain anonymous'}</span>
            </label>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !formValid}
              className="rounded-lg bg-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_14px_rgba(212,55,144,0.4)] transition duration-300 hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (T ? T.guestbook.submitting : 'Submitting…') : (T ? T.guestbook.submit : '✍️ Sign the Guestbook')}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
