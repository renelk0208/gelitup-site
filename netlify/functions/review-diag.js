// TEMPORARY diagnostic — remove after use.
import { createClient } from '@supabase/supabase-js'
import { buildStatus, loadShopProducts } from './giveaway-request.js'
const KEY = 'fd0eda69a11fe89290873a590653538f'
export const handler = async (event) => {
  if ((event.queryStringParameters || {}).k !== KEY) return { statusCode: 404, body: 'Not found' }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const ids = String(event.queryStringParameters.ids || '').split(',').map(Number).filter(Boolean)
  const { data: people } = await supabase.from('ambassador_applications').select('id, full_name, email, status, paused_at, instagram, ambassador_type, country, giveaway_invited_at').in('id', ids)
  const shopProducts = await loadShopProducts()
  const out = []
  for (const a of people || []) {
    try {
      const st = await buildStatus(supabase, a, { shopProducts, detail: true })
      out.push({ id: a.id, name: a.full_name, eligible: st.eligible, reasons: st.reasons, reviewed: (st.reviewed || []).map((p) => p.title), notReviewed: (st.notReviewed || []).map((p) => p.title), shopReviewsToCount: st.shopReviewsToCount, unmatched: (st.unmatchedLines || []).map((l) => l.line || l), reviews: (st.reviewDetails || st.reviews || []).map((r) => [r.title, r.received, r.shopReview]) })
    } catch (e) { out.push({ id: a.id, error: e.message }) }
  }
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) }
}
