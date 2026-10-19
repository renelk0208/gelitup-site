import { createClient } from '@supabase/supabase-js'
import { winningIds } from '../../src/world/winners.js'

// Looks are not kept on the system after a round (competition rules, section 5).
// Once a round has been closed for CLEAN_AFTER_DAYS (time to confirm winners and
// for winners to reply within 7 days), every look that did not win a prize is
// deleted together with its photos. Winning looks stay for the Winners page.
// Runs daily; each round is cleaned once (world_rounds.cleaned_at).

export const config = {
  schedule: '40 3 * * *',
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const MAIN_SITE = 'https://gelitup.com'
const CLEAN_AFTER_DAYS = 30
const BUCKET = 'world-entries'

function isScheduledRun(event) {
  try { return Boolean(JSON.parse(event?.body || '{}')?.next_run) } catch { return false }
}

export async function handler(event) {
  if (!isScheduledRun(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This job only runs on its schedule.' }) }
  }
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) {
    return { statusCode: 200, body: JSON.stringify({ skipped: `not the main site (${siteUrl})` }) }
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Supabase settings' }) }
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const cutoff = new Date(Date.now() - CLEAN_AFTER_DAYS * 86400000).toISOString()
  const { data: rounds, error } = await db
    .from('world_rounds')
    .select('id, slug')
    .is('cleaned_at', null)
    .lt('ends_at', cutoff)
  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) }

  const report = []
  for (const round of rounds || []) {
    const { data: entries } = await db
      .from('world_entries')
      .select('id, country, vote_count, status, image_path, first_prize_claim, reviews_verified, created_at')
      .eq('round_id', round.id)
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10000)
    const { data: placements } = await db.from('world_placements').select('entry_id, place').eq('round_id', round.id)
    const { data: wildcards } = await db.from('world_wildcards').select('entry_id').eq('round_id', round.id)
    const keep = winningIds(entries || [], placements || [], (wildcards || []).map(w => w.entry_id))
    const remove = (entries || []).filter(e => !keep.has(e.id))

    for (let i = 0; i < remove.length; i += 100) {
      const batch = remove.slice(i, i + 100)
      const paths = batch.flatMap(e => [e.image_path, String(e.image_path).replace(/\.jpg$/i, '_t.jpg')])
      await db.storage.from(BUCKET).remove(paths).catch(() => {})
      await db.from('world_entries').delete().in('id', batch.map(e => e.id))
    }
    await db.from('world_rounds').update({ cleaned_at: new Date().toISOString() }).eq('id', round.id)
    report.push({ round: round.slug, kept: keep.size, removed: remove.length })
  }

  return { statusCode: 200, body: JSON.stringify({ cleaned: report }) }
}
