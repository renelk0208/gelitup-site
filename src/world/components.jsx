import { useEffect, useState } from 'react'
import { COMPETITION_NAME, COUNTRIES, countryName, flagEmoji } from './config'
import { imageUrl } from './api'
import { localized } from './i18n'

// Shared building blocks for the /world pages and the embeddable widget.

export function Countdown({ endsAt, t }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = new Date(endsAt).getTime() - now
  if (!(ms > 0)) return <span>{t('closed')}</span>
  const s = Math.floor(ms / 1000)
  const parts = [
    [Math.floor(s / 86400), t('d')],
    [Math.floor((s % 86400) / 3600), t('h')],
    [Math.floor((s % 3600) / 60), t('m')],
    [s % 60, t('s')],
  ]
  return (
    <span className="tabular-nums">
      {t('closesIn')}{' '}
      {parts.map(([n, u]) => (
        <span key={u} className="mx-0.5 font-bold text-white">{n}{u}</span>
      ))}
    </span>
  )
}

export function HeartIcon({ filled, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.8 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </svg>
  )
}

export function Hero({ round, lang, t, leader, onUpload, uploadHref, country, compact = false }) {
  const [showRules, setShowRules] = useState(false)
  const open = round && new Date(round.ends_at) > new Date()
  const title = round ? (localized(round.title, lang) || t(`theme_${round.theme}`)) : ''
  const prizes = Array.isArray(round?.prizes) ? round.prizes : []
  const localPrizes = country && round?.local_prizes?.[country]
  const UploadTag = uploadHref ? 'a' : 'button'
  const uploadProps = uploadHref
    ? { href: uploadHref, target: '_blank', rel: 'noopener' }
    : { type: 'button', onClick: onUpload }

  return (
    <section className={`relative isolate overflow-hidden rounded-3xl bg-[#111] text-white ${compact ? 'px-5 py-7' : 'px-5 py-10 md:px-10 md:py-14'}`}>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(212,55,144,0.55),transparent_55%),radial-gradient(circle_at_90%_90%,rgba(212,55,144,0.25),transparent_50%)]" />
      <div className="mx-auto max-w-2xl text-center">
        <p className="inline-block rounded-full border border-white/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
          {t('kicker')}{round ? ` · ${t(`theme_${round.theme}`)}` : ''}
        </p>
        <h1 style={{ color: '#ffffff' }} className={`mt-4 font-black uppercase leading-[0.95] tracking-tight ${compact ? 'text-3xl' : 'text-4xl md:text-6xl'}`}>
          {COMPETITION_NAME.replace('GEL.IT.UP', '')}
          <span className="block" style={{ color: '#e55aa9' }}>GEL.IT.UP</span>
        </h1>
        {title && <p className="mt-3 text-lg font-semibold text-white">{title}</p>}
        <p className="mt-1 text-sm text-white/75">{t('tagline')}</p>

        {(localPrizes || prizes.length > 0) && (
          <div className="mt-5 flex items-end justify-center gap-4">
            {(localPrizes || prizes).slice(0, 3).map((p, i) => (
              <span key={i} className={`font-black ${i === 0 ? 'text-3xl text-[#e55aa9]' : 'text-xl text-white'}`}>{p}</span>
            ))}
          </div>
        )}
        {localPrizes && prizes.length > 0 && (
          <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-white/60">{t('prizesLocal')} · {t('prizesIntl')}: {prizes.join(' / ')}</p>
        )}

        {round && (
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/70">
            {open ? <Countdown endsAt={round.ends_at} t={t} /> : t('closed')}
          </p>
        )}

        {open && (
          <UploadTag
            {...uploadProps}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#D43790] px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_30px_rgba(212,55,144,0.45)] transition hover:bg-[#e04a9f]"
          >
            <CameraIcon /> {t('upload')}
          </UploadTag>
        )}

        <div className="mt-4">
          <button type="button" onClick={() => setShowRules(v => !v)} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 underline underline-offset-4 hover:text-white">
            {t('howItWorks')}
          </button>
        </div>
        {showRules && (
          <ul className="mx-auto mt-4 max-w-md space-y-2 border-t border-white/15 pt-4 text-left text-sm text-white/85">
            <li>• {t('rule1', { max: round?.max_entries_per_user || 3 })}</li>
            <li>• {t('rule2')}</li>
            <li>• {t('rule3')}</li>
          </ul>
        )}

        {leader && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/80">
            <span className="uppercase tracking-[0.15em] text-white/60">{t('leading')}</span>
            <span className="font-semibold text-white">{flagEmoji(leader.country)} {leader.profile?.display_name}</span>
            <span className="text-[#e55aa9]">♥ {leader.vote_count}</span>
          </p>
        )}
      </div>
    </section>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

export function Avatar({ name, className = 'h-9 w-9 text-xs' }) {
  const initials = String(name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D43790] to-[#5a1238] font-bold text-white ${className}`}>
      {initials}
    </span>
  )
}

export function EntryCard({ entry, t, voted, onVote, href, linkProps = {}, voteDisabled, rank }) {
  const [imgSrc, setImgSrc] = useState(() => imageUrl(entry.image_path, { thumb: true }))
  const p = entry.profile || {}
  return (
    <article className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={p.display_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{p.display_name}</p>
          <p className="truncate text-xs text-neutral-500">
            {flagEmoji(entry.country)} {countryName(entry.country)}
            {p.instagram ? <> · @{p.instagram}</> : null}
          </p>
        </div>
        {rank ? <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-bold text-white">#{rank}</span> : null}
      </div>
      <a href={href} {...linkProps} className="block aspect-[4/5] overflow-hidden bg-neutral-100">
        <img
          src={imgSrc}
          onError={() => setImgSrc(imageUrl(entry.image_path))}
          alt={entry.caption || `Nail look by ${p.display_name || ''}`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </a>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onVote}
          disabled={voteDisabled}
          aria-pressed={voted}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition disabled:opacity-50 ${
            voted ? 'bg-[#D43790] text-white' : 'border border-[#D43790] text-[#D43790] hover:bg-[#D43790]/10'
          }`}
        >
          <HeartIcon filled={voted} />
          {voted ? t('voted') : t('vote')} · {entry.vote_count}
        </button>
        {entry.caption && <p className="line-clamp-1 min-w-0 flex-1 text-xs text-neutral-500">{entry.caption}</p>}
      </div>
    </article>
  )
}

export function CountrySelect({ value, onChange, t, className = '', presentCountries, includeAll = true }) {
  const list = presentCountries
    ? COUNTRIES.filter(([c]) => presentCountries.has(c))
    : COUNTRIES
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} className={`rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 ${className}`}>
      {includeAll && <option value="">🌍 {t('allCountries')}</option>}
      {list.map(([code, name]) => (
        <option key={code} value={code}>{flagEmoji(code)} {name}</option>
      ))}
    </select>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition ${
            value === key ? 'border-[#D43790] text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
