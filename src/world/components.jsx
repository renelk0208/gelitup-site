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
        <span key={u} className="mx-0.5 font-bold text-[#1A1A1A]">{n}{u}</span>
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

export const BRAND = {
  pink: '#D43790',
  black: '#1A1A1A',
  grey: '#4A4A4A',
  light: '#E8E8E8',
  gallery: '#F8F8F6',
}

const LOGO = '/NEW%20LOGO%202024-02.png'

export function Hero({ round, lang, t, leader, onUpload, uploadHref, country, compact = false, logoBase = '' }) {
  const [showRules, setShowRules] = useState(false)
  const open = round && new Date(round.ends_at) > new Date()
  const title = round ? (localized(round.title, lang) || t(`theme_${round.theme}`)) : ''
  const prizes = Array.isArray(round?.prizes) ? round.prizes : []
  const localPrizes = country && round?.local_prizes?.[country]
  const shownPrizes = (localPrizes || prizes).slice(0, 3)
  const UploadTag = uploadHref ? 'a' : 'button'
  const uploadProps = uploadHref
    ? { href: uploadHref, target: '_blank', rel: 'noopener' }
    : { type: 'button', onClick: onUpload }

  return (
    <section className="overflow-hidden rounded-3xl border border-[#E8E8E8] bg-white">
      <div aria-hidden="true" className="h-1.5 w-full bg-[#D43790]" />
      <div className={`mx-auto max-w-2xl text-center ${compact ? 'px-5 py-7' : 'px-5 py-10 md:px-10 md:py-12'}`}>
        <img src={`${logoBase}${LOGO}`} alt="GEL.IT.UP" className={`mx-auto w-auto ${compact ? 'h-12' : 'h-14 md:h-16'}`} />
        <p className="mt-4 inline-block rounded-full border border-[#1A1A1A] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
          {t('kicker')}{round ? ` · ${t(`theme_${round.theme}`)}` : ''}
        </p>
        <h1 style={{ color: BRAND.black, letterSpacing: '0.12em' }} className={`mt-4 font-black uppercase leading-[1.05] ${compact ? 'text-2xl' : 'text-3xl md:text-5xl'}`}>
          {COMPETITION_NAME.replace('GEL.IT.UP', '').trim()}{' '}
          <span style={{ color: BRAND.pink }}>GEL.IT.UP</span>
        </h1>
        {title && <p className="mt-3 text-base font-bold uppercase tracking-[0.14em] text-[#1A1A1A]">{title}</p>}
        <p className="mt-1 text-sm text-[#4A4A4A]">{t('tagline')}</p>

        {shownPrizes.length > 0 && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl bg-[#F8F8F6] px-4 py-4">
            <div className="flex items-end justify-center gap-5">
              {shownPrizes.map((p, i) => (
                <span key={i} className="flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4A4A4A]">{i + 1}.</span>
                  <span className={`font-black ${i === 0 ? 'text-3xl' : 'text-xl'}`} style={{ color: i === 0 ? BRAND.pink : BRAND.black }}>{p}</span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1A1A1A]">{t('prizesProducts')}</p>
            {localPrizes && prizes.length > 0 && (
              <p className="mt-1 text-[11px] text-[#4A4A4A]">{t('prizesLocal')} · {t('prizesIntl')}: {prizes.join(' / ')}</p>
            )}
          </div>
        )}

        {round && (
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-[#4A4A4A]">
            {open ? <Countdown endsAt={round.ends_at} t={t} /> : t('closed')}
          </p>
        )}

        {open && (
          <UploadTag
            {...uploadProps}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#D43790] px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] !text-white transition hover:bg-[#BF3182]"
          >
            <CameraIcon /> {t('upload')}
          </UploadTag>
        )}

        <div className="mt-4">
          <button type="button" onClick={() => setShowRules(v => !v)} className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1A1A1A] underline decoration-[#D43790] decoration-2 underline-offset-4">
            {t('howItWorks')}
          </button>
        </div>
        {showRules && (
          <ul className="mx-auto mt-4 max-w-md space-y-2 border-t border-[#E8E8E8] pt-4 text-left text-sm text-[#4A4A4A]">
            <li>• <strong className="text-[#1A1A1A]">{t('howEnter')}</strong> {t('rule1', { max: round?.max_entries_per_user || 1 })}</li>
            <li>• <strong className="text-[#1A1A1A]">{t('howVote')}</strong> {t('rule2')}</li>
            <li>• <strong className="text-[#1A1A1A]">{t('howWin')}</strong> {t('rule3', { p1: prizes[0] || '€1000', p2: prizes[1] || '€500', p3: prizes[2] || '€300' })}</li>
          </ul>
        )}

        {leader && (
          <p className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-4 py-1.5 text-xs text-[#4A4A4A]">
            <span className="font-bold uppercase tracking-[0.15em]">{t('leading')}</span>
            <span className="font-semibold text-[#1A1A1A]">{flagEmoji(leader.country)} {leader.profile?.display_name}</span>
            <span className="font-bold" style={{ color: BRAND.pink }}>♥ {leader.vote_count}</span>
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
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] font-bold text-white ${className}`}>
      {initials}
    </span>
  )
}

export function EntryCard({ entry, t, voted, onVote, href, linkProps = {}, voteDisabled, rank }) {
  const [imgSrc, setImgSrc] = useState(() => imageUrl(entry.image_path, { thumb: true }))
  const p = entry.profile || {}
  return (
    <article className="group overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white transition hover:border-[#D43790]">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={p.display_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{p.display_name}</p>
          <p className="truncate text-xs text-neutral-500">
            {flagEmoji(entry.country)} {countryName(entry.country)}
            {p.instagram ? <> · @{p.instagram}</> : null}
          </p>
        </div>
        {rank ? <span className="rounded-full bg-[#D43790] px-2 py-0.5 text-[11px] font-bold text-white">#{rank}</span> : null}
      </div>
      <a href={href} {...linkProps} className="relative block aspect-[4/5] overflow-hidden bg-neutral-100">
        {entry.status && entry.status !== 'published' && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-neutral-900 shadow">
            {t(entry.status === 'rejected' ? 'rejectedBadge' : 'pendingBadge')}
          </span>
        )}
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
          disabled={voteDisabled || (entry.status && entry.status !== 'published')}
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
