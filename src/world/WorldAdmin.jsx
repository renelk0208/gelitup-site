import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ENTRY_SELECT, entryUrl, imageUrl, thumbPath } from './api'
import { COUNTRIES, THEMES, WORLD_BUCKET, WORLD_SITE, countryName, flagEmoji } from './config'
import { DEFAULT_FINALISTS, computeFinalists, computeWinners } from './winners'
import { reviewLink } from './products'
import { WORLD_LANGS } from './i18n'

// Admin page for World of GEL.IT.UP: rounds, approval of new looks, the jury
// final (top 10 by hearts + wildcards → 1st/2nd/3rd), embed codes.
// Uses the main (portal) Supabase client, so it works for anyone logged in
// through the portal admin login whose email is in b2b_admins.

const card = 'rounded-2xl border border-neutral-200 bg-white p-5'
const input = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm'
const h2 = 'text-sm font-black uppercase tracking-[0.14em] text-neutral-900'
const btn = 'rounded-lg px-3 py-1.5 text-xs font-bold'

const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

const emptyRound = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  return {
    slug: '', theme: 'everyday', titles: { en: '' }, starts_at: toLocalInput(start.toISOString()),
    ends_at: toLocalInput(end.toISOString()), prizes: '€1000, €500, €300', local_prizes: '',
    max_entries_per_user: 1, max_wildcards: 2, icon_month: '', is_published: true,
  }
}

function roundToForm(r) {
  return {
    id: r.id, slug: r.slug, theme: r.theme, titles: { ...r.title },
    starts_at: toLocalInput(r.starts_at), ends_at: toLocalInput(r.ends_at),
    prizes: (r.prizes || []).join(', '),
    local_prizes: Object.entries(r.local_prizes || {}).map(([c, list]) => `${c}: ${(list || []).join(', ')}`).join('\n'),
    max_entries_per_user: r.max_entries_per_user, max_wildcards: r.max_wildcards ?? 2,
    icon_month: r.icon_month ? String(r.icon_month).slice(0, 7) : '', is_published: r.is_published,
  }
}

function formToRow(f) {
  const split = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean)
  const local = {}
  for (const line of String(f.local_prizes || '').split('\n')) {
    const m = line.match(/^\s*([A-Za-z]{2})\s*:\s*(.+)$/)
    if (m) local[m[1].toUpperCase()] = split(m[2])
  }
  const titles = Object.fromEntries(Object.entries(f.titles || {}).filter(([, v]) => String(v || '').trim()))
  return {
    slug: f.slug.trim(), theme: f.theme, title: titles,
    starts_at: new Date(f.starts_at).toISOString(), ends_at: new Date(f.ends_at).toISOString(),
    prizes: split(f.prizes), local_prizes: local,
    max_entries_per_user: Number(f.max_entries_per_user) || 1,
    max_wildcards: Math.max(0, Number(f.max_wildcards) || 0),
    icon_month: f.icon_month ? `${f.icon_month}-01` : null,
    is_published: Boolean(f.is_published),
  }
}

export default function WorldAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => (supabase ? null : false))
  const [rounds, setRounds] = useState([])
  const [form, setForm] = useState(null)
  const [roundId, setRoundId] = useState('')
  const [status, setStatus] = useState('pending')
  const [ranked, setRanked] = useState([])          // approved looks of the round, most hearts first
  const [wildcardIds, setWildcardIds] = useState([])
  const [placements, setPlacements] = useState([])  // [{ entry_id, place }]
  const [country, setCountry] = useState('')
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [msg, setMsg] = useState('')
  const [embed, setEmbed] = useState({ country: 'GR', lang: 'el', limit: 9 })

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('world_is_admin').then(({ data }) => setIsAdmin(Boolean(data))).catch(() => setIsAdmin(false))
  }, [])

  const loadRounds = useCallback(async () => {
    const { data } = await supabase.from('world_rounds').select('*').order('starts_at', { ascending: false })
    setRounds(data || [])
    setRoundId(id => id || data?.[0]?.id || '')
  }, [])

  const loadEntries = useCallback(async () => {
    if (!roundId) return
    let q = supabase.from('world_entries').select(`${ENTRY_SELECT}, report_count`).eq('round_id', roundId)
    if (status) q = q.eq('status', status)
    if (country) q = q.eq('country', country)
    const { data } = await q.order('vote_count', { ascending: false }).limit(500)
    setEntries(data || [])
  }, [roundId, status, country])

  const loadJudging = useCallback(async () => {
    if (!roundId) return
    const [r, w, p] = await Promise.all([
      supabase.from('world_entries').select(ENTRY_SELECT).eq('round_id', roundId).eq('status', 'published')
        .order('vote_count', { ascending: false }).order('created_at', { ascending: true }).limit(1000),
      supabase.from('world_wildcards').select('entry_id').eq('round_id', roundId),
      supabase.from('world_placements').select('entry_id, place').eq('round_id', roundId),
    ])
    setRanked(r.data || [])
    setWildcardIds((w.data || []).map(x => x.entry_id))
    setPlacements(p.data || [])
  }, [roundId])

  useEffect(() => {
    if (!isAdmin) return
    loadRounds()
    supabase.rpc('world_admin_stats').then(({ data }) => setStats(data || null))
  }, [isAdmin, loadRounds])
  useEffect(() => { if (isAdmin) loadEntries() }, [isAdmin, loadEntries])
  useEffect(() => { if (isAdmin) loadJudging() }, [isAdmin, loadJudging])
  const refresh = () => { loadEntries(); loadJudging(); supabase.rpc('world_admin_stats').then(({ data }) => setStats(data || null)) }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const saveRound = async (e) => {
    e.preventDefault()
    const row = formToRow(form)
    const res = form.id
      ? await supabase.from('world_rounds').update(row).eq('id', form.id)
      : await supabase.from('world_rounds').insert(row)
    if (res.error) { flash(`Could not save: ${res.error.message}`); return }
    flash('Round saved')
    setForm(null)
    loadRounds()
  }

  const setEntryStatus = async (entry, next) => {
    const { error } = await supabase.from('world_entries').update({ status: next }).eq('id', entry.id)
    if (error) flash(error.message); else refresh()
  }

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete this look by ${entry.profile?.display_name}? This cannot be undone.`)) return
    const { error } = await supabase.from('world_entries').delete().eq('id', entry.id)
    if (error) { flash(error.message); return }
    await supabase.storage.from(WORLD_BUCKET).remove([entry.image_path, thumbPath(entry.image_path)]).catch(() => {})
    refresh()
  }

  const round = rounds.find(r => r.id === roundId) || null
  const finalists = useMemo(
    () => computeFinalists(ranked, wildcardIds, round?.finalists || DEFAULT_FINALISTS),
    [ranked, wildcardIds, round],
  )
  const finalistIds = useMemo(() => new Set(finalists.all.map(e => e.id)), [finalists])
  const topIds = useMemo(() => new Set(finalists.top.map(e => e.id)), [finalists])
  const winners = useMemo(() => computeWinners(ranked, placements), [ranked, placements])
  const winnersByCountry = Object.values(winners.byCountry)
  const placeOf = (id) => placements.find(p => p.entry_id === id)?.place || ''
  const roundClosed = round ? new Date(round.ends_at) <= new Date() : false

  const toggleWildcard = async (entry) => {
    const on = wildcardIds.includes(entry.id)
    const res = on
      ? await supabase.from('world_wildcards').delete().eq('entry_id', entry.id)
      : await supabase.from('world_wildcards').insert({ entry_id: entry.id, round_id: entry.round_id })
    if (res.error) flash(res.error.message.includes('WILDCARD_LIMIT') ? `Maximum ${round?.max_wildcards ?? 2} wildcards for this round` : res.error.message)
    else loadJudging()
  }

  const setPlace = async (entry, value) => {
    const place = Number(value) || 0
    // Clear this look's current place and whoever holds the chosen place, then set it
    await supabase.from('world_placements').delete().eq('entry_id', entry.id)
    if (place) {
      await supabase.from('world_placements').delete().eq('round_id', entry.round_id).eq('place', place)
      const { error } = await supabase.from('world_placements').insert({ round_id: entry.round_id, entry_id: entry.id, place })
      if (error) flash(error.message.includes('FIRST_PRIZE_NOT_QUALIFIED')
        ? '1st place needs the 1st-prize claim with verified reviews (tick “Verify reviews” first)'
        : error.message)
    }
    loadJudging()
  }

  const setRoundFlag = async (field, value, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    const { error } = await supabase.from('world_rounds').update({ [field]: value }).eq('id', roundId)
    if (error) flash(error.message); else { flash('Saved'); loadRounds() }
  }

  const setReviewsVerified = async (entry, value) => {
    const { error } = await supabase.from('world_entries').update({ reviews_verified: value }).eq('id', entry.id)
    if (error) flash(error.message); else refresh()
  }

  const exportCsv = () => {
    const rows = [['rank', 'name', 'handle', 'instagram', 'country', 'hearts', 'reports', 'status', 'source_site', 'link']]
    entries.forEach((e, i) => rows.push([
      i + 1, e.profile?.display_name, e.profile?.handle, e.profile?.instagram || '', e.country,
      e.vote_count, e.report_count, e.status, e.source_site || '', entryUrl(e.id),
    ]))
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `world-entries-${rounds.find(r => r.id === roundId)?.slug || 'round'}.csv`
    a.click()
  }

  const embedCode = `<div data-gelitup-world data-country="${embed.country}" data-lang="${embed.lang}" data-limit="${embed.limit}"></div>\n<script src="${WORLD_SITE}/world-embed.js" async></script>`

  if (isAdmin === null) return <p className="py-20 text-center text-sm text-neutral-400">…</p>
  if (!isAdmin) {
    return (
      <p className="py-20 text-center text-sm text-neutral-600">
        Admins only. <Link to="/portal/admin-login" className="text-[#D43790] underline">Log in as admin</Link>, then come back to /world/admin.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tight">World of GEL.IT.UP: admin</h1>
        <Link to="/world" className="text-xs font-bold text-[#D43790] underline">Open the competition</Link>
      </div>
      {msg && <p className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white">{msg}</p>}

      {stats && (
        <section className={card}>
          <h2 className={h2}>Overview</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-6">
            {[['Waiting for approval', stats.pending ?? 0], ['Creators', stats.profiles], ['Looks', stats.entries], ['Hearts', stats.votes], ['Competition emails opted in', stats.competition_emails_opt_in], ['Marketing opted in', stats.marketing_opt_in]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-neutral-50 p-3"><p className="text-xl font-black">{v}</p><p className="text-xs text-neutral-500">{k}</p></div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 text-xs text-neutral-600 sm:grid-cols-3">
            <p><b>Sign-ups by site:</b> {Object.entries(stats.profiles_by_source || {}).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p>
            <p><b>Hearts by site:</b> {Object.entries(stats.votes_by_source || {}).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p>
            <p><b>Emails sent:</b> {Object.entries(stats.emails_sent || {}).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</p>
          </div>
        </section>
      )}

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className={h2}>Rounds</h2>
          <button type="button" onClick={() => setForm(emptyRound())} className={`${btn} bg-[#D43790] text-white`}>New round</button>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase text-neutral-500"><tr><th className="py-1">Round</th><th>Theme</th><th>Dates</th><th>Live</th><th /></tr></thead>
          <tbody>
            {rounds.map(r => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="py-2 font-semibold">{r.title?.en || r.slug}</td>
                <td>{r.theme}</td>
                <td className="text-xs">{new Date(r.starts_at).toLocaleString()} → {new Date(r.ends_at).toLocaleString()}</td>
                <td>{r.is_published ? 'Yes' : 'No'}</td>
                <td className="text-right"><button type="button" onClick={() => setForm(roundToForm(r))} className={`${btn} border border-neutral-300`}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        {form && (
          <form onSubmit={saveRound} className="mt-5 grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">Slug (unique, e.g. 2026-11-movember)
              <input required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className={input} />
            </label>
            <label className="text-xs font-semibold">Theme
              <select value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })} className={input}>
                {THEMES.map(th => <option key={th} value={th}>{th}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Starts
              <input type="datetime-local" required value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} className={input} />
            </label>
            <label className="text-xs font-semibold">Ends
              <input type="datetime-local" required value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} className={input} />
            </label>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold">Title per language (English required; empty languages fall back to English, then to the theme name)</p>
              <div className="mt-1 grid gap-2 sm:grid-cols-3">
                {WORLD_LANGS.map(l => (
                  <input key={l} required={l === 'en'} placeholder={l.toUpperCase()} value={form.titles[l] || ''}
                    onChange={e => setForm({ ...form, titles: { ...form.titles, [l]: e.target.value } })} className={input} />
                ))}
              </div>
            </div>
            <label className="text-xs font-semibold">International prizes (comma separated)
              <input value={form.prizes} onChange={e => setForm({ ...form, prizes: e.target.value })} className={input} />
            </label>
            <label className="text-xs font-semibold">Looks per person
              <input type="number" min="1" max="10" value={form.max_entries_per_user} onChange={e => setForm({ ...form, max_entries_per_user: e.target.value })} className={input} />
            </label>
            <label className="text-xs font-semibold">Winners are the GEL.IT.UP Icons of (month)
              <input type="month" value={form.icon_month} onChange={e => setForm({ ...form, icon_month: e.target.value })} className={input} />
            </label>
            <label className="text-xs font-semibold">Jury wildcards allowed
              <input type="number" min="0" max="10" value={form.max_wildcards} onChange={e => setForm({ ...form, max_wildcards: e.target.value })} className={input} />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">Local prizes, one country per line (paid by that country), e.g. <code>GR: €300, €100, €50</code>
              <textarea rows={3} value={form.local_prizes} onChange={e => setForm({ ...form, local_prizes: e.target.value })} className={input} />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} /> Visible on the site
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setForm(null)} className={`${btn} border border-neutral-300`}>Cancel</button>
              <button type="submit" className={`${btn} bg-neutral-900 text-white`}>Save round</button>
            </div>
          </form>
        )}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={`${h2} mr-auto`}>Looks</h2>
          <select value={roundId} onChange={e => setRoundId(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs">
            {rounds.map(r => <option key={r.id} value={r.id}>{r.title?.en || r.slug}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs">
            <option value="pending">Waiting for approval</option>
            <option value="published">Approved (live)</option>
            <option value="hidden">Hidden</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
          <select value={country} onChange={e => setCountry(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs">
            <option value="">All countries</option>
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{flagEmoji(c)} {n}</option>)}
          </select>
          <button type="button" onClick={exportCsv} className={`${btn} border border-neutral-300`}>Export CSV</button>
        </div>

        {status === 'pending' && entries.length > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {entries.length} look{entries.length === 1 ? '' : 's'} waiting. Check the theme, that it is the entrant’s own work, a clear photo, and no other brands in the photo or caption. Then Approve or Reject.
          </p>
        )}
        {winnersByCountry.length > 0 && (
          <p className="mt-3 text-xs text-neutral-600">
            <b>Leading per country:</b>{' '}
            {winnersByCountry.map(e => `${flagEmoji(e.country)} ${e.profile?.display_name} (♥ ${e.vote_count})`).join(' · ')}
          </p>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-neutral-500">
              <tr><th className="py-1">#</th><th>Look</th><th>Creator</th><th>Country</th><th>Hearts</th><th>1st prize</th><th>Reports</th><th>Final</th><th /></tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className="border-t border-neutral-100 align-middle">
                  <td className="py-2 text-xs text-neutral-500">{i + 1}</td>
                  <td><a href={`/world/${e.id}`} target="_blank" rel="noopener"><img src={imageUrl(e.image_path, { thumb: true })} alt="" className="h-14 w-12 rounded object-cover" /></a></td>
                  <td><b>{e.profile?.display_name}</b><br /><span className="text-xs text-neutral-500">@{e.profile?.handle}{e.profile?.instagram ? ` · IG @${e.profile.instagram}` : ''}</span></td>
                  <td>{flagEmoji(e.country)} {countryName(e.country)}</td>
                  <td className="font-bold">{e.vote_count}</td>
                  <td className="text-xs">
                    {e.first_prize_claim ? (
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 font-semibold">
                          <input type="checkbox" checked={e.reviews_verified} onChange={ev => setReviewsVerified(e, ev.target.checked)} />
                          {e.reviews_verified ? 'Reviews verified' : 'Verify reviews'}
                        </label>
                        {(e.products || []).map(p => (
                          <a key={p.name} href={reviewLink(p)} target="_blank" rel="noopener" className="block truncate text-[#D43790] underline">{p.name}</a>
                        ))}
                      </div>
                    ) : <span className="text-neutral-400">not claimed</span>}
                  </td>
                  <td className={e.report_count ? 'font-bold text-rose-600' : ''}>{e.report_count}</td>
                  <td className="text-xs">
                    {e.status !== 'published' ? <span className="text-neutral-400">—</span>
                      : topIds.has(e.id) ? <span className="font-semibold text-emerald-700">Top {round?.finalists || DEFAULT_FINALISTS}</span>
                        : (
                          <button type="button" onClick={() => toggleWildcard(e)}
                            className={`${btn} ${wildcardIds.includes(e.id) ? 'bg-[#D43790] text-white' : 'border border-neutral-300'}`}>
                            {wildcardIds.includes(e.id) ? '★ Wildcard' : 'Make wildcard'}
                          </button>
                        )}
                  </td>
                  <td className="space-x-1 whitespace-nowrap text-right">
                    {e.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => setEntryStatus(e, 'published')} className={`${btn} bg-emerald-600 text-white`}>Approve</button>
                        <button type="button" onClick={() => setEntryStatus(e, 'rejected')} className={`${btn} border border-neutral-300`}>Reject</button>
                      </>
                    )}
                    {e.status === 'published' && <button type="button" onClick={() => setEntryStatus(e, 'hidden')} className={`${btn} border border-neutral-300`}>Hide</button>}
                    {(e.status === 'hidden' || e.status === 'rejected') && <button type="button" onClick={() => setEntryStatus(e, 'published')} className={`${btn} bg-emerald-600 text-white`}>Approve</button>}
                    <button type="button" onClick={() => deleteEntry(e)} className={`${btn} text-rose-600`}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <p className="py-6 text-center text-sm text-neutral-500">No looks here.</p>}
        </div>
      </section>

      {round && (
        <section className={card}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`${h2} mr-auto`}>Jury final · {round.title?.en || round.slug}</h2>
            <button type="button" onClick={() => setRoundFlag('wildcards_published', !round.wildcards_published, round.wildcards_published ? null : 'Show the jury wildcards publicly now?')}
              className={`${btn} ${round.wildcards_published ? 'bg-neutral-900 text-white' : 'border border-neutral-300'}`}>
              {round.wildcards_published ? 'Wildcards public ✓ (hide)' : 'Publish wildcards'}
            </button>
            <button type="button" onClick={() => setRoundFlag('results_published', !round.results_published, round.results_published ? null : 'Publish 1st, 2nd and 3rd place in the Hall of Fame now?')}
              className={`${btn} ${round.results_published ? 'bg-neutral-900 text-white' : 'bg-[#D43790] text-white'}`}>
              {round.results_published ? 'Results public ✓ (hide)' : 'Publish results'}
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            The final is the {round.finalists || DEFAULT_FINALISTS} approved looks with the most hearts plus up to {round.max_wildcards ?? 2} wildcards
            (choose them in the Looks table with “Make wildcard”). Pick 1st, 2nd and 3rd below. 1st place needs verified reviews.
            {!roundClosed && ' The round is still open, so hearts and the top list can still change.'}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-neutral-500">
                <tr><th className="py-1">Look</th><th>Creator</th><th>Hearts</th><th>In final as</th><th>1st prize eligible</th><th>Place</th></tr>
              </thead>
              <tbody>
                {finalists.all.map(e => (
                  <tr key={e.id} className="border-t border-neutral-100 align-middle">
                    <td className="py-2"><a href={`/world/${e.id}`} target="_blank" rel="noopener"><img src={imageUrl(e.image_path, { thumb: true })} alt="" className="h-14 w-12 rounded object-cover" /></a></td>
                    <td><b>{e.profile?.display_name}</b><br /><span className="text-xs text-neutral-500">{flagEmoji(e.country)} @{e.profile?.handle}</span></td>
                    <td className="font-bold">{e.vote_count}</td>
                    <td className="text-xs">{topIds.has(e.id) ? `Top ${round.finalists || DEFAULT_FINALISTS}` : '★ Wildcard'}</td>
                    <td className="text-xs">{e.first_prize_claim && e.reviews_verified ? 'Yes' : e.first_prize_claim ? 'Reviews not verified yet' : 'No (2nd/3rd only)'}</td>
                    <td>
                      <select value={placeOf(e.id)} onChange={ev => setPlace(e, ev.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1 text-xs">
                        <option value="">—</option>
                        <option value="1" disabled={!(e.first_prize_claim && e.reviews_verified)}>1st · {(round.prizes || [])[0] || ''}</option>
                        <option value="2">2nd · {(round.prizes || [])[1] || ''}</option>
                        <option value="3">3rd · {(round.prizes || [])[2] || ''}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {finalists.all.length === 0 && <p className="py-6 text-center text-sm text-neutral-500">No approved looks with hearts yet.</p>}
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            {winners.podium.map((e, i) => (
              <div key={i} className="rounded-xl bg-neutral-50 p-3">
                <p className="font-black uppercase tracking-[0.12em]">{i + 1}. place · {(round.prizes || [])[i] || ''}</p>
                <p className="mt-1">{e ? `${flagEmoji(e.country)} ${e.profile?.display_name} (♥ ${e.vote_count})` : 'Not chosen yet'}</p>
              </div>
            ))}
          </div>
          {placements.some(p => !finalistIds.has(p.entry_id)) && (
            <p className="mt-2 text-xs font-semibold text-rose-600">A placed look is no longer in the final (hearts changed or it was hidden). Check the places above.</p>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className={h2}>Embed code for country websites</h2>
        <p className="mt-1 text-sm text-neutral-600">Send this to each distributor. They paste it where the competition should appear; votes and sign-ups are credited to their site.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={embed.country} onChange={e => setEmbed({ ...embed, country: e.target.value })} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs">
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{flagEmoji(c)} {n}</option>)}
          </select>
          <select value={embed.lang} onChange={e => setEmbed({ ...embed, lang: e.target.value })} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs">
            {WORLD_LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
          <input type="number" min="3" max="24" value={embed.limit} onChange={e => setEmbed({ ...embed, limit: e.target.value })} className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs" />
        </div>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-900 p-4 text-xs text-white">{embedCode}</pre>
        <button type="button" onClick={() => navigator.clipboard.writeText(embedCode).then(() => flash('Embed code copied'))} className={`${btn} mt-2 bg-neutral-900 text-white`}>Copy code</button>
      </section>
    </div>
  )
}
