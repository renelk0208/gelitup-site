import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ENTRY_SELECT, entryUrl, imageUrl, thumbPath } from './api'
import { COUNTRIES, THEMES, WORLD_BUCKET, WORLD_SITE, countryName, flagEmoji, productShopLink } from './config'
import { computeWinners } from './winners'
import { WORLD_LANGS } from './i18n'

// Admin page for World of GEL.IT.UP: rounds, moderation, winners, embed codes.
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
    max_entries_per_user: 3, is_published: true,
  }
}

function roundToForm(r) {
  return {
    id: r.id, slug: r.slug, theme: r.theme, titles: { ...r.title },
    starts_at: toLocalInput(r.starts_at), ends_at: toLocalInput(r.ends_at),
    prizes: (r.prizes || []).join(', '),
    local_prizes: Object.entries(r.local_prizes || {}).map(([c, list]) => `${c}: ${(list || []).join(', ')}`).join('\n'),
    max_entries_per_user: r.max_entries_per_user, is_published: r.is_published,
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
    max_entries_per_user: Number(f.max_entries_per_user) || 3, is_published: Boolean(f.is_published),
  }
}

export default function WorldAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => (supabase ? null : false))
  const [rounds, setRounds] = useState([])
  const [form, setForm] = useState(null)
  const [roundId, setRoundId] = useState('')
  const [status, setStatus] = useState('published')
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

  useEffect(() => {
    if (!isAdmin) return
    loadRounds()
    supabase.rpc('world_admin_stats').then(({ data }) => setStats(data || null))
  }, [isAdmin, loadRounds])
  useEffect(() => { if (isAdmin) loadEntries() }, [isAdmin, loadEntries])

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
    if (error) flash(error.message); else loadEntries()
  }

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Delete this look by ${entry.profile?.display_name}? This cannot be undone.`)) return
    const { error } = await supabase.from('world_entries').delete().eq('id', entry.id)
    if (error) { flash(error.message); return }
    await supabase.storage.from(WORLD_BUCKET).remove([entry.image_path, thumbPath(entry.image_path)]).catch(() => {})
    loadEntries()
  }

  const winners = useMemo(() => computeWinners(entries), [entries])
  const winnersByCountry = Object.values(winners.byCountry)

  const setReviewsVerified = async (entry, value) => {
    const { error } = await supabase.from('world_entries').update({ reviews_verified: value }).eq('id', entry.id)
    if (error) flash(error.message); else loadEntries()
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
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {[['Creators', stats.profiles], ['Looks', stats.entries], ['Hearts', stats.votes], ['Competition emails opted in', stats.competition_emails_opt_in], ['Marketing opted in', stats.marketing_opt_in]].map(([k, v]) => (
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
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
            <option value="">All</option>
          </select>
          <select value={country} onChange={e => setCountry(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs">
            <option value="">All countries</option>
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{flagEmoji(c)} {n}</option>)}
          </select>
          <button type="button" onClick={exportCsv} className={`${btn} border border-neutral-300`}>Export CSV</button>
        </div>

        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          {winners.podium.map((e, i) => (
            <div key={i} className="rounded-xl bg-neutral-50 p-3">
              <p className="font-black uppercase tracking-[0.12em]">{i + 1}. place · {(rounds.find(r => r.id === roundId)?.prizes || [])[i] || ''}</p>
              <p className="mt-1">{e ? `${flagEmoji(e.country)} ${e.profile?.display_name} (♥ ${e.vote_count})` : (i === 0 ? 'No look with verified reviews yet' : '—')}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">1st prize only goes to looks that claimed it and whose reviews you have verified (column “1st prize”).</p>

        {winnersByCountry.length > 0 && (
          <p className="mt-3 text-xs text-neutral-600">
            <b>Leading per country:</b>{' '}
            {winnersByCountry.map(e => `${flagEmoji(e.country)} ${e.profile?.display_name} (♥ ${e.vote_count})`).join(' · ')}
          </p>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-neutral-500">
              <tr><th className="py-1">#</th><th>Look</th><th>Creator</th><th>Country</th><th>Hearts</th><th>1st prize</th><th>Reports</th><th>From</th><th /></tr>
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
                          <a key={p.name} href={productShopLink(p.name)} target="_blank" rel="noopener" className="block truncate text-[#D43790] underline">{p.name}</a>
                        ))}
                      </div>
                    ) : <span className="text-neutral-400">not claimed</span>}
                  </td>
                  <td className={e.report_count ? 'font-bold text-rose-600' : ''}>{e.report_count}</td>
                  <td className="text-xs">{e.source_site || '—'}</td>
                  <td className="space-x-1 whitespace-nowrap text-right">
                    {e.status === 'published'
                      ? <button type="button" onClick={() => setEntryStatus(e, 'hidden')} className={`${btn} border border-neutral-300`}>Hide</button>
                      : <button type="button" onClick={() => setEntryStatus(e, 'published')} className={`${btn} bg-emerald-600 text-white`}>Publish</button>}
                    <button type="button" onClick={() => deleteEntry(e)} className={`${btn} text-rose-600`}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <p className="py-6 text-center text-sm text-neutral-500">No looks here.</p>}
        </div>
      </section>

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
