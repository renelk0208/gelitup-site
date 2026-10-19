import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useLang } from '../lib/i18n.js'
import { hasWorldConfig } from '../world/worldClient'
import { makeT, localized, WORLD_LANGS } from '../world/i18n'
import {
  COMPETITION_NAME, HASHTAG, INSTAGRAM_TAG, LANG_DEFAULT_COUNTRY, WINNER_TITLE,
  countryName, flagEmoji, productShopLink, shopFor,
} from '../world/config'
import * as api from '../world/api'
import { Avatar, CountrySelect, EntryCard, HeartIcon, Hero, Tabs } from '../world/components'
import { loadProducts, searchProducts } from '../world/products'

const WorldAdmin = lazy(() => import('../world/WorldAdmin.jsx'))

const PAGE = 24

// ─────────────────────────────────────────────────────────────────────────────
// Session + profile for the competition (separate from the B2B portal login)
// ─────────────────────────────────────────────────────────────────────────────
function useWorldAccount() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)

  const refreshProfile = useCallback(async (u) => {
    if (!u) { setProfile(null); return null }
    try {
      const p = await api.fetchMyProfile(u.id)
      setProfile(p)
      return p
    } catch {
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let active = true
    api.getSessionUser().then(async (u) => {
      if (!active) return
      setUser(u)
      await refreshProfile(u)
      if (active) setReady(true)
    })
    const off = api.onAuthChange(async (u) => {
      setUser(u)
      await refreshProfile(u)
    })
    return () => { active = false; off() }
  }, [refreshProfile])

  return { user, profile, setProfile, ready, refreshProfile }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign-in and profile modal
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 rounded-full p-2 text-neutral-500 hover:bg-neutral-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls = 'mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 focus:border-[#D43790] focus:outline-none focus:ring-2 focus:ring-[#D43790]/20'
const btnPrimary = 'inline-flex w-full items-center justify-center rounded-xl bg-[#D43790] px-5 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#e04a9f] disabled:opacity-50'

function SignInForm({ t, nextPath }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      await api.sendSignInLink(email, nextPath)
      setSent(true)
    } catch (ex) {
      setErr(t(api.errorKey(ex)))
    } finally { setBusy(false) }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#D43790]/10 text-2xl">✉️</div>
        <p className="text-sm text-neutral-700">{t('linkSent', { email })}</p>
      </div>
    )
  }
  return (
    <form onSubmit={submit}>
      <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">{t('signInTitle')}</h2>
      <p className="mt-1 text-sm text-neutral-600">{t('signInText')}</p>
      <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
        {t('email')}
        <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
      </label>
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      <button type="submit" disabled={busy || !email} className={`${btnPrimary} mt-5`}>{busy ? '…' : t('sendLink')}</button>
    </form>
  )
}

function suggestHandle(name, email) {
  const base = String(name || email || '').split('@')[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9._]+/g, '.').replace(/^\.+|\.+$/g, '')
  return base.slice(0, 24) || ''
}

function ProfileForm({ t, lang, user, profile, onSaved }) {
  const [form, setForm] = useState(() => ({
    display_name: profile?.display_name || user?.user_metadata?.full_name || '',
    handle: profile?.handle || '',
    instagram: profile?.instagram || '',
    country: profile?.country || LANG_DEFAULT_COUNTRY[lang] || '',
    adult: Boolean(profile),
    competition_emails_opt_in: profile ? Boolean(profile.competition_emails_opt_in) : false,
    marketing_opt_in: profile ? Boolean(profile.marketing_opt_in) : false,
  }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleValid = /^[a-z0-9._]{2,30}$/.test(form.handle)
  const canSave = form.display_name.trim().length >= 2 && handleValid && form.country && form.adult

  const submit = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setBusy(true); setErr('')
    try {
      const saved = await api.saveMyProfile(user.id, {
        display_name: form.display_name.trim(),
        handle: form.handle,
        instagram: form.instagram.replace(/^@/, '').trim() || null,
        country: form.country,
        competition_emails_opt_in: form.competition_emails_opt_in,
        marketing_opt_in: form.marketing_opt_in,
        preferred_lang: lang,
      }, { isNew: !profile })
      onSaved(saved)
    } catch (ex) {
      setErr(t(api.errorKey(ex)))
    } finally { setBusy(false) }
  }

  const label = 'mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600'
  return (
    <form onSubmit={submit}>
      <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">{t('profileTitle')}</h2>
      <label className={label}>
        {t('displayName')}
        <input required value={form.display_name} maxLength={60}
          onChange={e => {
            const v = e.target.value
            setForm(f => ({ ...f, display_name: v, handle: f.handleTouched ? f.handle : suggestHandle(v) }))
          }}
          className={inputCls} />
      </label>
      <label className={label}>
        {t('handle')}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-neutral-400">@</span>
          <input required value={form.handle} maxLength={30}
            onChange={e => setForm(f => ({ ...f, handleTouched: true, handle: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') }))}
            className={`${inputCls} pl-7`} />
        </div>
        <span className="mt-1 block text-[11px] normal-case tracking-normal text-neutral-500">{t('handleHint')}</span>
      </label>
      <label className={label}>
        {t('instagram')}
        <input value={form.instagram} maxLength={31} onChange={e => set('instagram', e.target.value)} placeholder="@" className={inputCls} />
      </label>
      <label className={label}>
        {t('country')}
        <CountrySelect value={form.country} onChange={v => set('country', v)} t={t} includeAll={false} className="mt-1 w-full py-2.5" />
      </label>

      <div className="mt-5 space-y-3 rounded-2xl bg-neutral-50 p-4">
        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input type="checkbox" required checked={form.adult} onChange={e => set('adult', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D43790]" />
          <span>
            {t('adult')}{' '}
            <Link to="/world/terms" target="_blank" className="text-[#D43790] underline">({t('termsLink')})</Link>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input type="checkbox" checked={form.competition_emails_opt_in} onChange={e => set('competition_emails_opt_in', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D43790]" />
          <span>{t('emailsOptIn')}</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input type="checkbox" checked={form.marketing_opt_in} onChange={e => set('marketing_opt_in', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D43790]" />
          <span>{t('marketingOptIn')}</span>
        </label>
      </div>

      {err && <p className="mt-3 text-xs text-rose-600">{err}</p>}
      <button type="submit" disabled={busy || !canSave} className={`${btnPrimary} mt-5`}>{busy ? '…' : t('save')}</button>
    </form>
  )
}

/** Opens sign-in, then profile setup, then runs `then` once both are done. */
function useGate(account, t, lang) {
  const [gate, setGate] = useState(null) // { next, then }
  const location = useLocation()

  const require = useCallback((then, next) => {
    if (account.user && account.profile) { then?.(); return }
    setGate({ then, next: next || location.pathname + location.search })
  }, [account.user, account.profile, location.pathname, location.search])

  // Finish the gate as soon as the person is signed in with a profile
  useEffect(() => {
    if (gate && account.user && account.profile) {
      const fn = gate.then
      setGate(null)
      fn?.()
    }
  }, [gate, account.user, account.profile])

  const modal = gate ? (
    <Modal onClose={() => setGate(null)}>
      {!account.user
        ? <SignInForm t={t} nextPath={gate.next} />
        : <ProfileForm t={t} lang={lang} user={account.user} profile={account.profile} onSaved={account.setProfile} />}
    </Modal>
  ) : null

  return { require, modal }
}

// ─────────────────────────────────────────────────────────────────────────────
// Account strip: who is signed in, email preference, sign out
// ─────────────────────────────────────────────────────────────────────────────
function AccountBar({ account, t, onEditProfile }) {
  const [busy, setBusy] = useState(false)
  if (!account.user) return null
  const p = account.profile
  const toggleEmails = async () => {
    if (!p) return
    setBusy(true)
    try {
      await api.setCompetitionEmails(account.user.id, !p.competition_emails_opt_in)
      await account.refreshProfile(account.user)
    } finally { setBusy(false) }
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600">
      {p ? (
        <Link to={`/world/u/${p.handle}`} className="inline-flex items-center gap-2 font-semibold text-neutral-900">
          <Avatar name={p.display_name} className="h-6 w-6 text-[9px]" /> @{p.handle}
        </Link>
      ) : (
        <button type="button" onClick={onEditProfile} className="font-semibold text-[#D43790] underline">{t('profileTitle')}</button>
      )}
      {p && (
        <span className="inline-flex items-center gap-2">
          <span>{p.competition_emails_opt_in ? t('emailPrefsOn') : t('emailPrefsOff')}</span>
          <button type="button" disabled={busy} onClick={toggleEmails} className="rounded-full border border-neutral-300 px-2.5 py-0.5 font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
            {p.competition_emails_opt_in ? t('turnOff') : t('turnOn')}
          </button>
        </span>
      )}
      <button type="button" onClick={() => api.signOut()} className="ml-auto font-semibold text-neutral-500 hover:text-neutral-900">{t('signOut')}</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Voting helper shared by feed and entry page
// ─────────────────────────────────────────────────────────────────────────────
function useVoting(account, gate, t) {
  const [myVotes, setMyVotes] = useState(() => new Set())
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState('')
  // The vote can run after sign-in finishes, so read the latest account/votes from refs
  const accountRef = useRef(account)
  accountRef.current = account
  const votesRef = useRef(myVotes)
  votesRef.current = myVotes

  const loadVotes = useCallback(async (entries) => {
    if (!account.user) { setMyVotes(new Set()); return }
    const ids = entries.map(e => e.id)
    const got = await api.fetchMyVotes(account.user.id, ids)
    setMyVotes(prev => {
      const next = new Set(prev)
      ids.forEach(id => (got.has(id) ? next.add(id) : next.delete(id)))
      return next
    })
  }, [account.user])

  const toggle = useCallback((entry, onCount) => {
    gate.require(async () => {
      const uid = accountRef.current.user?.id
      if (!uid) return
      setBusyId(entry.id)
      let had = votesRef.current.has(entry.id)
      if (!had) {
        // Just signed in: check whether this account already voted for it
        const existing = await api.fetchMyVotes(uid, [entry.id])
        had = existing.has(entry.id)
        if (had) { setMyVotes(prev => new Set(prev).add(entry.id)); setBusyId(null); return }
      }
      try {
        if (had) await api.removeVote(uid, entry.id)
        else await api.castVote(uid, entry.id)
        setMyVotes(prev => { const n = new Set(prev); had ? n.delete(entry.id) : n.add(entry.id); return n })
        onCount?.(had ? -1 : 1)
      } catch (ex) {
        setToast(t(api.errorKey(ex)))
        setTimeout(() => setToast(''), 4000)
      } finally { setBusyId(null) }
    })
  }, [gate, t])

  const toastEl = toast ? (
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white shadow-xl">{toast}</div>
  ) : null

  return { myVotes, loadVotes, toggle, busyId, toastEl }
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed
// ─────────────────────────────────────────────────────────────────────────────
function Feed({ ctx }) {
  const { t, lang, account, gate, voting, round, navigate } = ctx
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const [tab, setTab] = useState(params.get('tab') || 'new')
  const [country, setCountry] = useState(params.get('country') || '')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [leader, setLeader] = useState(null)
  const [winners, setWinners] = useState(null)
  const [pastRounds, setPastRounds] = useState([])
  const [winnersRoundId, setWinnersRoundId] = useState('')

  // Keep tab/country in the URL so links can be shared
  useEffect(() => {
    const qs = new URLSearchParams(location.search)
    tab === 'new' ? qs.delete('tab') : qs.set('tab', tab)
    country ? qs.set('country', country) : qs.delete('country')
    const s = qs.toString()
    navigate({ search: s ? `?${s}` : '' }, { replace: true })
  }, [tab, country]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (offset = 0) => {
    if (!round) { setEntries([]); setLoading(false); return }
    setLoading(true)
    try {
      const opts = { roundId: round.id, country: country || undefined, sort: tab === 'popular' ? 'popular' : 'new', limit: PAGE, offset }
      if (tab === 'mine') {
        if (!account.user) { setEntries([]); setHasMore(false); return }
        opts.userIds = [account.user.id]
      }
      const rows = await api.fetchEntries(opts)
      setEntries(prev => (offset ? [...prev, ...rows] : rows))
      setHasMore(rows.length === PAGE)
      voting.loadVotes(rows)
    } catch {
      setEntries([])
    } finally { setLoading(false) }
  }, [round, country, tab, account.user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (tab !== 'winners') load(0) }, [load, tab])

  useEffect(() => {
    if (!round) return
    api.fetchLeader(round.id, country || undefined).then(setLeader).catch(() => setLeader(null))
  }, [round, country, entries.length])

  useEffect(() => {
    if (tab !== 'winners') return
    api.fetchPastRounds().then(rs => {
      setPastRounds(rs)
      setWinnersRoundId(id => id || rs[0]?.id || '')
    }).catch(() => setPastRounds([]))
  }, [tab])

  useEffect(() => {
    if (tab !== 'winners' || !winnersRoundId) { setWinners(null); return }
    api.fetchRoundWinners(winnersRoundId).then(setWinners).catch(() => setWinners(null))
  }, [tab, winnersRoundId])

  const updateCount = (id, delta) => setEntries(list => list.map(e => (e.id === id ? { ...e, vote_count: e.vote_count + delta } : e)))
  const closed = round && new Date(round.ends_at) <= new Date()

  return (
    <>
      <Hero round={round} lang={lang} t={t} leader={leader} country={country || account.profile?.country}
        onUpload={() => gate.require(() => navigate('/world/upload'), '/world/upload')} />
      <AccountBar account={account} t={t} onEditProfile={() => gate.require(null)} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={tab} onChange={setTab} tabs={[
          ['new', t('tabNew')], ['popular', t('tabPopular')],
          ...(account.user ? [['mine', t('tabMine')]] : []),
          ['winners', t('tabWinners')],
        ]} />
        {tab !== 'winners' && <CountrySelect value={country} onChange={setCountry} t={t} />}
      </div>

      {tab === 'winners' ? (
        <WinnersView t={t} lang={lang} rounds={pastRounds} roundId={winnersRoundId} setRoundId={setWinnersRoundId} winners={winners} />
      ) : (
        <>
          {!loading && entries.length === 0 && (
            <p className="py-16 text-center text-sm text-neutral-500">{round ? t('empty') : t('noRound')}</p>
          )}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e, i) => (
              <EntryCard key={e.id} entry={e} t={t}
                rank={tab === 'popular' && e.vote_count > 0 ? i + 1 : null}
                href={`/world/${e.id}`}
                linkProps={{ onClick: (ev) => { ev.preventDefault(); navigate(`/world/${e.id}`) } }}
                voted={voting.myVotes.has(e.id)}
                voteDisabled={closed || voting.busyId === e.id}
                onVote={() => voting.toggle(e, d => updateCount(e.id, d))} />
            ))}
          </div>
          {loading && <p className="py-8 text-center text-sm text-neutral-400">…</p>}
          {hasMore && !loading && (
            <div className="mt-6 text-center">
              <button type="button" onClick={() => load(entries.length)} className="rounded-xl border border-neutral-300 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-neutral-800 hover:bg-neutral-50">{t('loadMore')}</button>
            </div>
          )}
        </>
      )}
    </>
  )
}

function WinnersView({ t, lang, rounds, roundId, setRoundId, winners }) {
  if (!rounds.length) return <p className="py-16 text-center text-sm text-neutral-500">{t('noWinnersYet')}</p>
  const countries = winners ? Object.entries(winners.byCountry) : []
  return (
    <div className="mt-5">
      <select value={roundId} onChange={e => setRoundId(e.target.value)} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">
        {rounds.map(r => (
          <option key={r.id} value={r.id}>
            {localized(r.title, lang) || t(`theme_${r.theme}`)} · {new Date(r.ends_at).toLocaleDateString(lang, { month: 'long', year: 'numeric' })}
          </option>
        ))}
      </select>
      {winners && (
        <>
          <h2 className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-neutral-900">{t('winnersOverall')}</h2>
          <p className="text-xs text-neutral-500">{WINNER_TITLE}</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {winners.overall.map((e, i) => (
              <EntryCard key={e.id} entry={e} t={t} rank={i + 1} href={`/world/${e.id}`} voteDisabled onVote={() => {}} />
            ))}
          </div>
          {countries.length > 0 && (
            <>
              <h2 className="mt-8 text-sm font-black uppercase tracking-[0.16em] text-neutral-900">{t('winnersByCountry')}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {countries.map(([c, e]) => (
                  <Link key={c} to={`/world/${e.id}`} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                    <img src={api.imageUrl(e.image_path, { thumb: true })} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    <p className="truncate px-3 py-2 text-xs"><span className="mr-1">{flagEmoji(c)}</span><b>{e.profile?.display_name}</b> · ♥ {e.vote_count}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry page
// ─────────────────────────────────────────────────────────────────────────────
function ShareBox({ t, entry, isOwner }) {
  const [copied, setCopied] = useState('')
  const url = api.entryUrl(entry.id)
  const text = `${t('shareText')} ${url}`
  const caption = `${entry.caption ? `${entry.caption}\n\n` : ''}${t('shareText')}\n${url}\n\n${INSTAGRAM_TAG} ${HASHTAG}`
  const copy = async (value, key) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); setTimeout(() => setCopied(''), 2000) } catch { /* ignore */ }
  }
  const links = [
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(text)}`],
    ['Viber', `viber://forward?text=${encodeURIComponent(text)}`],
    ['Telegram', `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t('shareText'))}`],
  ]
  const nativeShare = typeof navigator !== 'undefined' && navigator.share
  return (
    <div className="rounded-2xl border border-[#D43790]/30 bg-[#D43790]/5 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D43790]">{isOwner ? t('voteForMe') : t('share')}</p>
      {isOwner && <p className="mt-1 text-sm text-neutral-700">{t('shareNudge')}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {nativeShare && (
          <button type="button" onClick={() => navigator.share({ title: COMPETITION_NAME, text: t('shareText'), url }).catch(() => {})}
            className="rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white">{t('share')}</button>
        )}
        {links.map(([name, href]) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">{name}</a>
        ))}
        <button type="button" onClick={() => copy(url, 'link')} className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
          {copied === 'link' ? t('copied') : t('copyLink')}
        </button>
        <button type="button" onClick={() => copy(caption, 'caption')} className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
          {copied === 'caption' ? t('copied') : t('copyCaption')}
        </button>
        <a href={api.imageUrl(entry.image_path)} download target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">{t('downloadPhoto')}</a>
      </div>
    </div>
  )
}

function ProductList({ t, products, country }) {
  const [images, setImages] = useState({})
  useEffect(() => {
    let active = true
    loadProducts().then(all => {
      if (!active) return
      const map = {}
      for (const p of products) map[p.name] = all.find(a => a.name.toLowerCase() === String(p.name).toLowerCase())?.image || ''
      setImages(map)
    })
    return () => { active = false }
  }, [products])
  if (!products?.length) return null
  const shop = shopFor(country)
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-900">{t('shopLook')} · {products.length}</p>
      <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
        {products.map((p, i) => (
          <li key={i}>
            <a href={productShopLink(p.name, country)} target="_blank" rel="noopener" className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50">
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {images[p.name] && <img src={images[p.name]} alt="" loading="lazy" className="h-full w-full object-contain" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">{p.name}</span>
              <span className="text-xs font-semibold text-[#D43790]">→</span>
            </a>
          </li>
        ))}
      </ul>
      <a href={shop.shopUrl} target="_blank" rel="noopener" className="mt-2 inline-block text-xs font-semibold text-neutral-600 underline">{t('shopAt', { shop: shop.label })}</a>
    </div>
  )
}

function EntryPage({ ctx }) {
  const { t, account, gate, voting, round, navigate } = ctx
  const { entryId } = useParams()
  const [entry, setEntry] = useState(undefined)
  const [reported, setReported] = useState(false)
  const search = new URLSearchParams(useLocation().search)
  const justPosted = search.get('posted') === '1'
  // Arriving from another GEL.IT.UP site's widget with ?vote=1: start the vote straight away
  const wantsVote = search.get('vote') === '1'
  const autoVoted = useRef(false)
  useEffect(() => {
    if (!wantsVote || autoVoted.current || !entry || !account.ready) return
    autoVoted.current = true
    if (!voting.myVotes.has(entry.id)) voting.toggle(entry, d => setEntry(e => ({ ...e, vote_count: e.vote_count + d })))
    navigate({ search: '' }, { replace: true })
  }, [wantsVote, entry, account.ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true
    api.fetchEntry(entryId).then(e => {
      if (!active) return
      setEntry(e || null)
      if (e) voting.loadVotes([e])
    }).catch(() => active && setEntry(null))
    return () => { active = false }
  }, [entryId, account.user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (entry === undefined) return <p className="py-20 text-center text-sm text-neutral-400">…</p>
  if (!entry) return <p className="py-20 text-center text-sm text-neutral-500">{t('err_ENTRY_UNAVAILABLE')} <Link to="/world" className="text-[#D43790] underline">{t('back')}</Link></p>

  const p = entry.profile || {}
  const isOwner = account.user?.id === entry.user_id
  const voted = voting.myVotes.has(entry.id)
  const entryRoundClosed = round && entry.round_id === round.id ? new Date(round.ends_at) <= new Date() : entry.round_id !== round?.id
  const viewerCountry = account.profile?.country || entry.country

  const doReport = () => gate.require(async () => {
    await api.reportEntry(account.user.id, entry.id).catch(() => {})
    setReported(true)
  })
  const doDelete = async () => {
    if (!window.confirm(t('confirmDelete'))) return
    await api.deleteMyEntry(entry).catch(() => {})
    navigate('/world?tab=mine')
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/world" className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 hover:text-neutral-900">← {COMPETITION_NAME}</Link>
      {justPosted && <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{t('success')}</p>}
      <div className="mt-4 grid gap-6 md:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-3xl bg-neutral-100 shadow-[0_20px_60px_rgba(212,55,144,0.18)]">
            <img src={api.imageUrl(entry.image_path)} alt={entry.caption || ''} className="w-full object-cover" />
          </div>
        </div>
        <div className="space-y-5">
          <Link to={`/world/u/${p.handle}`} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <Avatar name={p.display_name} className="h-11 w-11 text-sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-neutral-900">{p.display_name}</span>
              <span className="block truncate text-xs text-neutral-500">{flagEmoji(entry.country)} {countryName(entry.country)} · {new Date(entry.created_at).toLocaleDateString()}</span>
            </span>
            {p.instagram && (
              <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs font-semibold text-[#D43790]">@{p.instagram}</a>
            )}
          </Link>

          <button type="button" disabled={entryRoundClosed || voting.busyId === entry.id}
            onClick={() => voting.toggle(entry, d => setEntry(e => ({ ...e, vote_count: e.vote_count + d })))}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.14em] transition disabled:opacity-60 ${
              voted ? 'bg-[#D43790] text-white' : 'bg-neutral-900 text-white hover:bg-[#D43790]'
            }`}>
            <HeartIcon filled={voted} className="h-5 w-5" /> {voted ? t('voted') : t('vote')} · {entry.vote_count} {t('hearts')}
          </button>

          {entry.caption && <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{entry.caption}</p>}

          <ProductList t={t} products={entry.products || []} country={viewerCountry} />
          <ShareBox t={t} entry={entry} isOwner={isOwner} />

          <div className="flex items-center justify-between text-xs text-neutral-500">
            {reported ? <span>{t('reported')}</span> : (
              <button type="button" onClick={doReport} className="underline hover:text-neutral-800">{t('report')}</button>
            )}
            {isOwner && <button type="button" onClick={doDelete} className="font-semibold text-rose-600 hover:underline">{t('deleteLook')}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────
function UploadPage({ ctx }) {
  const { t, account, gate, round, navigate } = ctx
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [caption, setCaption] = useState('')
  const [picked, setPicked] = useState([])
  const [query, setQuery] = useState('')
  const [allProducts, setAllProducts] = useState([])
  const [used, setUsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  useEffect(() => { loadProducts().then(setAllProducts) }, [])
  useEffect(() => {
    if (!account.ready) return
    if (!account.user || !account.profile) gate.require(null, '/world/upload')
  }, [account.ready, account.user, account.profile]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (account.user && round) api.countMyEntries(account.user.id, round.id).then(setUsed)
  }, [account.user, round])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const results = useMemo(() => searchProducts(allProducts, query).filter(p => !picked.some(x => x.name === p.name)), [allProducts, query, picked])
  const max = round?.max_entries_per_user || 3
  const left = Math.max(0, max - used)
  const open = round && new Date(round.ends_at) > new Date()

  const choose = (f) => {
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file || !account.user || !round) return
    setBusy(true); setErr('')
    try {
      const id = await api.submitEntry({ userId: account.user.id, roundId: round.id, file, caption, products: picked })
      navigate(`/world/${id}?posted=1`)
    } catch (ex) {
      setErr(t(api.errorKey(ex)))
    } finally { setBusy(false) }
  }

  if (!round || !open) return <p className="py-20 text-center text-sm text-neutral-500">{round ? t('closed') : t('noRound')} · <Link to="/world" className="text-[#D43790] underline">{t('back')}</Link></p>

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl">
      <Link to="/world" className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 hover:text-neutral-900">← {COMPETITION_NAME}</Link>
      <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-neutral-900">{t('upload')}</h1>
      {account.user && (
        <p className={`mt-1 text-sm ${left ? 'text-neutral-600' : 'font-semibold text-rose-600'}`}>
          {left ? t('entriesLeft', { n: left, max }) : t('limitReached')}
        </p>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={e => choose(e.target.files?.[0])} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className="mt-5 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-500 hover:border-[#D43790] hover:text-[#D43790]">
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span>📷 {t('choosePhoto')}</span>}
      </button>
      {preview && <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-xs font-semibold text-neutral-600 underline">{t('changePhoto')}</button>}

      <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
        {t('caption')}
        <textarea value={caption} onChange={e => setCaption(e.target.value)} maxLength={600} rows={3} className={inputCls} />
      </label>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">{t('addProducts')}</p>
        {picked.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {picked.map(p => (
              <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full bg-[#D43790]/10 px-3 py-1 text-xs font-semibold text-[#9c1f63]">
                {p.name}
                <button type="button" aria-label="Remove" onClick={() => setPicked(list => list.filter(x => x.name !== p.name))}>✕</button>
              </span>
            ))}
          </div>
        )}
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('searchProducts')} className={inputCls} />
        {results.length > 0 && (
          <ul className="mt-1 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
            {results.map(p => (
              <li key={p.name}>
                <button type="button" onClick={() => { setPicked(list => [...list, p].slice(0, 15)); setQuery('') }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50">
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded bg-neutral-100">{p.image && <img src={p.image} alt="" className="h-full w-full object-contain" />}</span>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-neutral-500">{t('photoRights')}</p>
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
      <button type="submit" disabled={busy || !file || !left || !account.profile} className={`${btnPrimary} mt-4`}>
        {busy ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Creator profile
// ─────────────────────────────────────────────────────────────────────────────
function CreatorPage({ ctx }) {
  const { t, voting, navigate } = ctx
  const { handle } = useParams()
  const [profile, setProfile] = useState(undefined)
  const [entries, setEntries] = useState([])

  useEffect(() => {
    let active = true
    api.fetchProfileByHandle(handle).then(async (p) => {
      if (!active) return
      setProfile(p || null)
      if (p) {
        const rows = await api.fetchEntries({ userIds: [p.user_id], limit: 60 })
        if (active) { setEntries(rows); voting.loadVotes(rows) }
      }
    }).catch(() => active && setProfile(null))
    return () => { active = false }
  }, [handle]) // eslint-disable-line react-hooks/exhaustive-deps

  if (profile === undefined) return <p className="py-20 text-center text-sm text-neutral-400">…</p>
  if (!profile) return <p className="py-20 text-center text-sm text-neutral-500"><Link to="/world" className="text-[#D43790] underline">{t('back')}</Link></p>
  return (
    <div>
      <Link to="/world" className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 hover:text-neutral-900">← {COMPETITION_NAME}</Link>
      <div className="mt-4 flex items-center gap-4">
        <Avatar name={profile.display_name} className="h-16 w-16 text-lg" />
        <div>
          <h1 className="text-2xl font-black text-neutral-900">{profile.display_name}</h1>
          <p className="text-sm text-neutral-500">
            @{profile.handle} · {flagEmoji(profile.country)} {countryName(profile.country)}
            {profile.instagram && <> · <a href={`https://www.instagram.com/${profile.instagram}/`} target="_blank" rel="noopener noreferrer" className="text-[#D43790]">Instagram</a></>}
          </p>
        </div>
      </div>
      <h2 className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-neutral-900">{t('looksBy', { name: profile.display_name })}</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(e => (
          <EntryCard key={e.id} entry={e} t={t} href={`/world/${e.id}`}
            linkProps={{ onClick: (ev) => { ev.preventDefault(); navigate(`/world/${e.id}`) } }}
            voted={voting.myVotes.has(e.id)} voteDisabled={voting.busyId === e.id}
            onVote={() => voting.toggle(e, d => setEntries(l => l.map(x => (x.id === e.id ? { ...x, vote_count: x.vote_count + d } : x))))} />
        ))}
      </div>
      {entries.length === 0 && <p className="py-10 text-center text-sm text-neutral-500">{t('empty')}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Terms (English master text; country teams add local prize details)
// ─────────────────────────────────────────────────────────────────────────────
function TermsPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-2xl text-neutral-700">
      <Link to="/world" className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500 no-underline hover:text-neutral-900">← {COMPETITION_NAME}</Link>
      <h1 className="mt-3 text-2xl font-black text-neutral-900">{COMPETITION_NAME}: competition terms</h1>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
        <li>The competition is organised by GEL.IT.UP International (Thermitek Ltd). Local prizes are provided and fulfilled by the GEL.IT.UP distributor in the winner’s country; international prizes by GEL.IT.UP International.</li>
        <li>Entrants must be 18 or older. Anyone may enter, whether or not they currently use GEL.IT.UP products.</li>
        <li>Each entrant may upload up to the number of looks shown for the round. Entries must be the entrant’s own work and own photograph, and must not show other people’s faces without their consent.</li>
        <li>Votes are cast with one heart per account per look. Accounts or votes that appear automated, bought or otherwise manipulated may be removed, and the related entries disqualified.</li>
        <li>Winners are the looks with the most hearts when the round closes: the top look per country (local prize) and the top looks overall (international prizes). Winners are contacted by email and announced on GEL.IT.UP channels.</li>
        <li>By publishing, the entrant allows GEL.IT.UP and its official distributors to show the photo, name and Instagram handle on their websites and social media, with credit, for promotion of the competition and the brand.</li>
        <li>GEL.IT.UP may hide or remove entries that break these terms or that are inappropriate.</li>
        <li>Competition emails are only sent to people who opted in, and every email contains an unsubscribe link. Personal data is handled under the GEL.IT.UP <Link to="/privacy-policy">privacy policy</Link>.</li>
      </ol>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
export default function WorldPage() {
  const siteLang = useLang()
  // Visitors arriving from a country site's widget carry ?lang=xx
  const [lang] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('lang')
    return q && WORLD_LANGS.includes(q) ? q : siteLang
  })
  const t = useMemo(() => makeT(lang), [lang])
  const navigate = useNavigate()
  const account = useWorldAccount()
  const gate = useGate(account, t, lang)
  const voting = useVoting(account, gate, t)
  const [round, setRound] = useState(() => (hasWorldConfig ? undefined : null))

  useEffect(() => { api.currentSourceSite() }, []) // remember ?src= for vote/entry attribution
  useEffect(() => {
    if (!hasWorldConfig) return
    api.fetchCurrentRound().then(setRound).catch(() => setRound(null))
  }, [])
  useEffect(() => { document.title = `${COMPETITION_NAME} | GEL.IT.UP` }, [])

  if (!hasWorldConfig) return <p className="py-20 text-center text-sm text-neutral-500">{t('setupMissing')}</p>
  if (round === undefined) return <p className="py-20 text-center text-sm text-neutral-400">…</p>

  const ctx = { t, lang, account, gate, voting, round, navigate }
  return (
    <div className="pb-10">
      <Routes>
        <Route index element={<Feed ctx={ctx} />} />
        <Route path="upload" element={<UploadPage ctx={ctx} />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="u/:handle" element={<CreatorPage ctx={ctx} />} />
        <Route path="admin" element={<Suspense fallback={null}><WorldAdmin /></Suspense>} />
        <Route path=":entryId" element={<EntryPage ctx={ctx} />} />
      </Routes>
      {gate.modal}
      {voting.toastEl}
    </div>
  )
}
