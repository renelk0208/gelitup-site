import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './embed.css'
import { hasWorldConfig } from './worldClient'
import { makeT, WORLD_LANGS } from './i18n'
import { detectWorldLang } from './lang'
import { canSeeWorld } from './access'
import { WORLD_SITE, countryName, flagEmoji } from './config'
import { fetchCurrentRound, fetchEntries, fetchLeader } from './api'
import { EntryCard, Hero, Tabs } from './components'

// The widget other GEL.IT.UP sites show through /world-embed.js.
// It is read-only: hearts and uploads open gelitup.com in a new tab (where the
// person signs in once), tagged with ?src=<site> so every vote and entry is
// credited to the site it came from.

const params = new URLSearchParams(window.location.search)
const COUNTRY = /^[A-Z]{2}$/.test((params.get('country') || '').toUpperCase()) ? params.get('country').toUpperCase() : ''
// Language follows the visitor's location; data-lang is only used when the location is unknown
const SITE_LANG = WORLD_LANGS.includes(params.get('lang')) ? params.get('lang') : 'en'
let LANG = 'en'
const SRC = (params.get('src') || 'partner').toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 80)
const LIMIT = Math.min(Math.max(parseInt(params.get('limit'), 10) || 9, 3), 24)
const SHOW_HERO = params.get('hero') !== '0'

const link = (path, extra = {}) => {
  const qs = new URLSearchParams({ src: SRC, ...extra })
  if (LANG !== 'en') qs.set('lang', LANG)
  return `${WORLD_SITE}${path}?${qs.toString()}`
}

function EmbedApp({ lang }) {
  const t = useMemo(() => makeT(lang), [lang])
  const [round, setRound] = useState(() => (hasWorldConfig ? undefined : null))
  const [scope, setScope] = useState(COUNTRY ? 'local' : 'global')
  const [sort, setSort] = useState('popular')
  const [entries, setEntries] = useState([])
  const [leader, setLeader] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!hasWorldConfig) return
    fetchCurrentRound().then(setRound).catch(() => setRound(null))
  }, [])

  useEffect(() => {
    if (!round) return
    const country = scope === 'local' ? COUNTRY : undefined
    fetchEntries({ roundId: round.id, country, sort, limit: LIMIT }).then(setEntries).catch(() => setEntries([]))
    fetchLeader(round.id, country).then(setLeader).catch(() => setLeader(null))
  }, [round, scope, sort])

  // Refresh counts every minute and when the visitor comes back from voting
  useEffect(() => {
    if (!round) return
    const refresh = () => {
      const country = scope === 'local' ? COUNTRY : undefined
      fetchEntries({ roundId: round.id, country, sort, limit: LIMIT }).then(setEntries).catch(() => {})
    }
    const id = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(id); window.removeEventListener('focus', refresh) }
  }, [round, scope, sort])

  // Tell the host page how tall we are so the iframe never scrolls
  useEffect(() => {
    const el = rootRef.current
    if (!el || !window.parent || window.parent === window) return
    const post = () => window.parent.postMessage({ type: 'gelitup-world:height', height: Math.ceil(el.getBoundingClientRect().height) }, '*')
    const ro = new ResizeObserver(post)
    ro.observe(el)
    post()
    return () => ro.disconnect()
  }, [])

  const closed = round && new Date(round.ends_at) <= new Date()

  return (
    <div ref={rootRef} className="mx-auto max-w-6xl p-1">
      {round === undefined && <p className="py-10 text-center text-sm text-neutral-400">…</p>}
      {round === null && <p className="py-10 text-center text-sm text-neutral-500">{t('noRound')}</p>}
      {round && (
        <>
          {SHOW_HERO && (
            <Hero compact round={round} lang={lang} t={t} leader={leader} country={COUNTRY} uploadHref={link('/world/upload')} />
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <Tabs value={sort} onChange={setSort} tabs={[['popular', t('tabPopular')], ['new', t('tabNew')]]} />
            {COUNTRY && (
              <div className="inline-flex self-start rounded-full border border-neutral-200 bg-white p-1 text-xs font-semibold">
                <button type="button" onClick={() => setScope('local')} className={`rounded-full px-3 py-1 ${scope === 'local' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}>
                  {flagEmoji(COUNTRY)} {countryName(COUNTRY)}
                </button>
                <button type="button" onClick={() => setScope('global')} className={`rounded-full px-3 py-1 ${scope === 'global' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}>
                  🌍 {t('allCountries')}
                </button>
              </div>
            )}
          </div>
          {entries.length === 0 && <p className="py-10 text-center text-sm text-neutral-500">{t('empty')}</p>}
          <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3">
            {entries.map((e, i) => (
              <EntryCard key={e.id} entry={e} t={t}
                rank={sort === 'popular' && e.vote_count > 0 ? i + 1 : null}
                href={link(`/world/${e.id}`)}
                linkProps={{ target: '_blank', rel: 'noopener' }}
                voteDisabled={closed}
                onVote={() => window.open(link(`/world/${e.id}`, { vote: '1' }), '_blank', 'noopener')} />
            ))}
          </div>
          <div className="mt-5 text-center">
            <a href={link('/world', scope === 'local' && COUNTRY ? { country: COUNTRY } : {})} target="_blank" rel="noopener"
              className="inline-block rounded-xl border border-neutral-900 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-neutral-900 hover:bg-neutral-900 hover:text-white">
              {t('viewAll')} →
            </a>
          </div>
        </>
      )}
    </div>
  )
}

Promise.all([
  detectWorldLang({ useExplicit: false, fallback: SITE_LANG }).catch(() => ({ lang: SITE_LANG })),
  canSeeWorld(),
])
  .then(([{ lang }, access]) => {
    // Before launch the widget shows nothing (except to admins) and takes no space
    if (!access.allowed) {
      try { window.parent.postMessage({ type: 'gelitup-world:height', height: 0 }, '*') } catch { /* ignore */ }
      return
    }
    LANG = lang
    createRoot(document.getElementById('world-embed')).render(
      <StrictMode>
        <EmbedApp lang={lang} />
      </StrictMode>,
    )
  })
