import { createClient } from '@supabase/supabase-js'
import { productUrl, receivedItems, suggestedCount } from '../../src/lib/reviewProducts.js'
import {
  GIVEAWAY_MAX_PRODUCTS,
  GIVEAWAY_MIN_REVIEWS,
  GIVEAWAY_MIN_PACKAGES,
  nextGiveawayAllowedFrom,
  openGiveawayRequest,
  packageCountsAsReceived,
  receivedPackageCount,
  recentApprovedGiveaway,
  upcomingGiveawayMonths,
} from '../../src/lib/giveaway.js'

// "Request a giveaway" card in the ambassador portal.
//
//   GET  (Authorization: Bearer <her portal session>)
//        -> { eligible, reasons[], reviewed[], months[], openRequest, lastGiveaway, allowedFrom }
//   POST { products: [handle…], preferredMonth, idea, followers, otherLinks, notes }
//        -> saves the request (status 'requested') after checking everything again.
//   GET ?view=reviews -> her "My reviews" list (reviewed / still to review), any time.
//   GET ?overview=1   -> admins: giveaway readiness of every approved ambassador.
//
// Admins (b2b_admins) can preview any ambassador with GET ?applicationId=<id>.
//
// "Reviewed" means a review written on shop.gelitup.com with her email address,
// read from Judge.me with the private API token (Netlify environment variables
// JUDGEME_PRIVATE_TOKEN and JUDGEME_SHOP_DOMAIN). The token never leaves this
// function.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const AMBASSADOR_TABLE = process.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
const JUDGEME_TOKEN = process.env.JUDGEME_PRIVATE_TOKEN || ''
// Judge.me needs the shop's own *.myshopify.com address. shop.gelitup.com's is
// 9tx96d-2b.myshopify.com (not "gel-it-up-2"); a different value set in Netlify
// is tried second.
const JUDGEME_SHOP_DOMAINS = [...new Set(['9tx96d-2b.myshopify.com', String(process.env.JUDGEME_SHOP_DOMAIN || '').trim()].filter(Boolean))]
let judgeMeDomain = null // the address that worked, remembered while the function is warm
const SHOP = 'https://shop.gelitup.com'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
})

const norm = (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '')
const clean = (v, max = 2000) => String(v ?? '').trim().slice(0, max)

async function userFromToken(token) {
  if (!token) return null
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY },
  })
  if (!res.ok) return null
  const user = await res.json().catch(() => null)
  return user?.email ? user : null
}

export async function loadShopProducts() {
  const out = []
  for (let page = 1; page <= 20; page += 1) {
    const res = await fetch(`${SHOP}/products.json?limit=250&page=${page}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`shop feed ${res.status}`)
    const list = (await res.json())?.products || []
    for (const p of list) {
      out.push({
        id: String(p.id || ''),
        handle: p.handle,
        title: String(p.title || '').replace(/\s*-\s*HTF\s*$/i, '').trim(),
        image: p.images?.[0]?.src || '',
      })
    }
    if (list.length < 250) break
  }
  return out
}

// Reviews she wrote on the shop, from Judge.me.
// Returns { reviews, emailChecked } — emailChecked is true when Judge.me's
// answer carries the reviewer's email, so we could confirm each one is hers.
async function fetchJudgeMePage(domain, page) {
  const qs = new URLSearchParams({ api_token: JUDGEME_TOKEN, shop_domain: domain, per_page: '100', page: String(page) })
  const res = await fetch(`https://api.judge.me/api/v1/reviews?${qs}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160)
    const err = new Error(`Judge.me ${res.status}${text ? `: ${text}` : ''}`)
    err.status = res.status
    throw err
  }
  return (await res.json())?.reviews || []
}

// Every review in the store, kept for 5 minutes while the function is warm.
// Ambassadors who "Continue with Shop" when writing a review end up with their
// Shop app email on it, so reviews are matched to her by email OR by name,
// instead of asking Judge.me for one email only.
let storeReviews = null // { at, list }
async function loadStoreReviews() {
  if (storeReviews && Date.now() - storeReviews.at < 5 * 60 * 1000) return storeReviews.list
  if (!JUDGEME_TOKEN) throw new Error('JUDGEME_PRIVATE_TOKEN is not set in Netlify')
  const domains = judgeMeDomain ? [judgeMeDomain] : JUDGEME_SHOP_DOMAINS
  let lastError = null
  for (const domain of domains) {
    try {
      const all = []
      for (let page = 1; page <= 50; page += 1) {
        const list = await fetchJudgeMePage(domain, page)
        all.push(...list)
        if (list.length < 100) break
      }
      judgeMeDomain = domain
      storeReviews = { at: Date.now(), list: all }
      return all
    } catch (err) {
      lastError = err
      console.error(`giveaway-request: Judge.me failed for ${domain}:`, err.message)
      if (err.status && err.status >= 500) break
    }
  }
  throw lastError || new Error('Judge.me unavailable')
}

const normName = (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, ' ').trim()

// Her reviews: same email, or the same full name (first + last, any order).
async function loadJudgeMeReviews(ambassador) {
  const want = String(ambassador?.email || '').trim().toLowerCase()
  const nameKey = normName(ambassador?.full_name).split(' ').filter(Boolean).sort().join(' ')
  const all = await loadStoreReviews()
  const mine = all.filter((r) => {
    const email = String(r?.reviewer?.email || r?.reviewer_email || '').trim().toLowerCase()
    if (want && email === want) return true
    const rn = normName(r?.reviewer?.name || r?.reviewer_name).split(' ').filter(Boolean).sort().join(' ')
    return Boolean(nameKey && nameKey.includes(' ') && rn === nameKey)
  })
  // Spam or hidden reviews don't count.
  const counted = mine.filter((r) => r?.hidden !== true && String(r?.curated || '').toLowerCase() !== 'spam')
  return { reviews: counted, emailChecked: true }
}

function productForReview(r, products) {
  const byHandle = new Map(products.map((p) => [p.handle, p]))
  const byId = new Map(products.map((p) => [p.id, p]))
  const byTitle = new Map(products.map((p) => [norm(p.title), p]))
  return byHandle.get(r?.product_handle)
    || byId.get(String(r?.product_external_id || ''))
    || byTitle.get(norm(String(r?.product_title || '').replace(/\s*-\s*HTF\s*$/i, '')))
    || null
}

function reviewedProducts(reviews, products) {
  const out = new Map()
  for (const r of reviews) {
    const p = productForReview(r, products)
    if (p && !out.has(p.handle)) out.set(p.handle, { handle: p.handle, title: p.title, image: p.image })
  }
  return [...out.values()].sort((a, b) => a.title.localeCompare(b.title))
}

// Admin view: every review she wrote, with stars and text.
function reviewDetails(reviews, products, receivedProducts, credits = []) {
  const creditBy = new Map((credits || []).map((c) => [String(c.judgeme_review_id), c.product_handle]))
  const byHandle = new Map(products.map((p) => [p.handle, p]))
  return reviews.map((r) => {
    const p = productForReview(r, products)
    const credited = creditBy.get(String(r?.id))
    return {
      id: String(r?.id || ''),
      shopReview: !p && !r?.product_external_id && !r?.product_handle,
      creditedTo: credited ? (byHandle.get(credited)?.title || credited) : '',
      reviewerName: String(r?.reviewer?.name || ''),
      title: p?.title || String(r?.product_title || 'Unknown product'),
      handle: p?.handle || '',
      received: Boolean(p && receivedProducts.has(p.handle)),
      rating: Number(r?.rating || 0) || null,
      heading: String(r?.title || ''),
      body: String(r?.body || '').slice(0, 1500),
      created_at: r?.created_at || '',
      published: r?.published !== false,
    }
  }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}

export async function buildStatus(supabase, ambassador, { detail = false, shopProducts = null } = {}) {
  const [{ data: shipments, error: shipErr }, { data: requests, error: reqErr }, { data: credits }, { data: reported }] = await Promise.all([
    supabase.from('ambassador_shipments').select('items, sent_at, delivered_at, lost_at, status').eq('application_id', ambassador.id),
    supabase.from('ambassador_giveaway_requests').select('*').eq('application_id', ambassador.id).order('created_at', { ascending: false }),
    supabase.from('ambassador_review_credits').select('judgeme_review_id, product_handle').eq('application_id', ambassador.id),
    supabase.from('ambassador_reported_items').select('id, line, product_handle, product_title, created_at').eq('application_id', ambassador.id),
  ])
  if (shipErr) throw new Error(shipErr.message)
  if (reqErr) throw new Error(reqErr.message)

  const products = shopProducts || await loadShopProducts()
  const { reviews, emailChecked } = await loadJudgeMeReviews(ambassador)
  // Every exact shop product from the packages she has received. Generic
  // package lines ("3 different Cat Eye shades") can't be checked until the
  // admin completes them with "Edit contents".
  const receivedShipments = (shipments || []).filter((s) => packageCountsAsReceived(s))
  const receivedProducts = new Map()
  const lineItems = receivedItems(receivedShipments, products, { expandStarter: true })
  for (const it of lineItems) {
    for (const p of it.matches) if (!receivedProducts.has(p.handle)) receivedProducts.set(p.handle, p)
  }
  // Products she told us she got for a general line ("3 different Cat Eye shades").
  const productByHandle = new Map(products.map((p) => [p.handle, p]))
  for (const r of reported || []) {
    const p = productByHandle.get(r.product_handle)
    if (p && !receivedProducts.has(p.handle)) receivedProducts.set(p.handle, p)
  }
  // General lines from her confirmed packages that don't name exact products yet.
  const unmatchedLines = lineItems
    .filter((it) => !it.matches.length)
    .map((it) => ({
      line: it.item,
      max: Math.min(10, Math.max(3, suggestedCount(it.item))),
      picked: (reported || []).filter((r) => r.line === it.item).map((r) => ({ handle: r.product_handle, title: productByHandle.get(r.product_handle)?.title || r.product_title || r.product_handle })),
    }))
  let reviewed = reviewedProducts(reviews, products)
  // Shop reviews (no product) an admin credited to a product she received.
  const byHandleAll = new Map(products.map((p) => [p.handle, p]))
  for (const c of credits || []) {
    const p = byHandleAll.get(c.product_handle)
    if (p && !reviewed.some((x) => x.handle === p.handle)) reviewed.push({ handle: p.handle, title: p.title, image: p.image })
  }
  reviewed.sort((a, b) => a.title.localeCompare(b.title))
  // Prize products must be ones she received in her packages AND reviewed.
  // (This also means nobody can offer a product someone else reviewed.)
  reviewed = reviewed.filter((p) => receivedProducts.has(p.handle))
  void emailChecked
  // Rule: at least 10 products she received AND reviewed (the 10 prize items
  // are chosen from these). Unreviewed ones are listed so she can review them.
  const reviewedHandles = new Set(reviewed.map((p) => p.handle))
  const notReviewed = [...receivedProducts.values()]
    .filter((p) => !reviewedHandles.has(p.handle))
    .map((p) => ({ handle: p.handle, title: p.title, image: p.image, reviewUrl: productUrl(p.handle) }))
    .sort((a, b) => a.title.localeCompare(b.title))

  const packages = receivedPackageCount(shipments || [])
  const openRequest = openGiveawayRequest(requests || [])
  const lastGiveaway = recentApprovedGiveaway(requests || [])
  const reasons = []
  if (String(ambassador.status || '').toLowerCase() !== 'approved' || ambassador.paused_at) reasons.push('not_active')
  if (packages < GIVEAWAY_MIN_PACKAGES) reasons.push('packages')
  if (reviewed.length < GIVEAWAY_MIN_REVIEWS) reasons.push('reviews')
  if (lastGiveaway) reasons.push('recent_giveaway')
  if (openRequest) reasons.push('open_request')

  let admin = null
  if (detail) {
    // Everything René needs to decide: packages and contents, every review,
    // orders with her code, past giveaways.
    const { data: codes } = await supabase.from('ambassador_codes').select('code').ilike('ambassador_email', ambassador.email)
    const codeList = (codes || []).map((c) => String(c.code || '').toUpperCase()).filter(Boolean)
    const { data: orders } = codeList.length
      ? await supabase.from('ambassador_redemptions').select('created_at, order_total_eur, commission_amount_eur, source, country, code').in('code', codeList)
      : { data: [] }
    admin = {
      packages: [...(shipments || [])]
        .filter((s) => s.sent_at && String(s.status || 'sent').toLowerCase() === 'sent')
        .sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at)))
        .map((s) => ({ sent_at: s.sent_at, delivered_at: s.delivered_at, lost: Boolean(s.lost_at), items: s.items || [] })),
      receivedProductCount: receivedProducts.size,
      reviews: reviewDetails(reviews, products, receivedProducts, credits),
      // Products from every package sent (confirmed or not), for crediting shop reviews.
      receivedList: (() => {
        const m = new Map()
        for (const it of receivedItems((shipments || []).filter((sh) => sh.sent_at && !sh.lost_at), products, { expandStarter: true })) for (const p of it.matches) m.set(p.handle, { handle: p.handle, title: p.title })
        return [...m.values()].sort((a, b) => a.title.localeCompare(b.title))
      })(),
      codeOrders: {
        count: (orders || []).length,
        totalEur: Math.round((orders || []).reduce((n, o) => n + Number(o.order_total_eur || 0), 0) * 100) / 100,
        creditEur: Math.round((orders || []).reduce((n, o) => n + Number(o.commission_amount_eur || 0), 0) * 100) / 100,
        last: [...(orders || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5),
      },
      pastGiveaways: (requests || []).filter((r) => r.status === 'approved').map((r) => ({ slot_start: r.slot_start, slot_end: r.slot_end, products: r.products })),
      profile: { instagram: ambassador.instagram || '', tiktok: ambassador.tiktok || '', followers: ambassador.followers || '', type: ambassador.ambassador_type || '', country: ambassador.country || '' },
    }
  }

  return {
    admin,
    eligible: reasons.length === 0,
    reasons,
    packagesReceived: packages,
    packagesNeeded: GIVEAWAY_MIN_PACKAGES,
    reviewed,
    notReviewed,
    unmatchedLines,
    reportedItems: (reported || []).map((r) => ({ id: r.id, line: r.line, handle: r.product_handle, title: productByHandle.get(r.product_handle)?.title || r.product_title || r.product_handle, created_at: r.created_at })),
    invited: Boolean(ambassador.giveaway_invited_at),
    maxProducts: GIVEAWAY_MAX_PRODUCTS,
    minReviews: GIVEAWAY_MIN_REVIEWS,
    months: upcomingGiveawayMonths(3),
    openRequest: openRequest
      ? { id: openRequest.id, status: openRequest.status, created_at: openRequest.created_at, preferred_month: openRequest.preferred_month, products: openRequest.products }
      : null,
    lastGiveaway: lastGiveaway ? { slot_start: lastGiveaway.slot_start, slot_end: lastGiveaway.slot_end, products: lastGiveaway.products } : null,
    allowedFrom: nextGiveawayAllowedFrom(lastGiveaway),
    upcoming: (requests || []).find((r) => r.status === 'approved' && r.slot_end && r.slot_end >= new Date().toISOString().slice(0, 10)) || null,
  }
}

export async function handler(event) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json(500, { error: 'Server is not configured.' })
  if (!['GET', 'POST'].includes(event.httpMethod)) return json(405, { error: 'Method not allowed.' })

  const token = String(event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim()
  const user = await userFromToken(token)
  if (!user) return json(401, { error: 'Please log in again.' })
  const userEmail = String(user.email).trim().toLowerCase()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const fields = 'id, full_name, email, status, paused_at, followers, tiktok, instagram, ambassador_type, country, giveaway_invited_at'

  const qs = event.queryStringParameters || {}

  // ── Admin: giveaway readiness of every approved ambassador at a glance ──
  if (qs.overview && event.httpMethod === 'GET') {
    const { data: admin } = await supabase.from('b2b_admins').select('email').ilike('email', userEmail).maybeSingle()
    if (!admin) return json(403, { error: 'Admins only.' })
    const { data: people, error: peopleError } = await supabase.from(AMBASSADOR_TABLE)
      .select(`${fields}, opt_out_type`).ilike('status', 'approved').order('full_name')
    if (peopleError) return json(500, { error: peopleError.message })
    let shopProducts
    try { shopProducts = await loadShopProducts() } catch { return json(502, { error: 'Shop products unavailable right now.' }) }
    const out = new Array((people || []).length)
    let next = 0
    const worker = async () => {
      while (next < out.length) {
        const i = next++
        const a = people[i]
        const base = { id: a.id, full_name: a.full_name, country: a.country, instagram: a.instagram, paused: Boolean(a.paused_at), opt_out_type: a.opt_out_type || null }
        try {
          const st = await buildStatus(supabase, a, { shopProducts })
          out[i] = {
            ...base,
            eligible: st.eligible,
            reasons: st.reasons,
            packagesReceived: st.packagesReceived,
            reviewedCount: st.reviewed.length,
            notReviewedCount: st.notReviewed.length,
            openRequest: st.openRequest,
            upcoming: st.upcoming ? { slot_start: st.upcoming.slot_start, slot_end: st.upcoming.slot_end } : null,
            allowedFrom: st.allowedFrom,
            invitedAt: a.giveaway_invited_at || null,
          }
        } catch (err) {
          out[i] = { ...base, error: err.message }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(6, out.length) }, worker))
    return json(200, { ambassadors: out, needed: { packages: GIVEAWAY_MIN_PACKAGES, reviews: GIVEAWAY_MIN_REVIEWS } })
  }

  let ambassador = null
  const previewId = Number(qs.applicationId || 0)
  if (previewId && event.httpMethod === 'GET') {
    const { data: admin } = await supabase.from('b2b_admins').select('email').ilike('email', userEmail).maybeSingle()
    if (!admin) return json(403, { error: 'Admins only.' })
    const { data } = await supabase.from(AMBASSADOR_TABLE).select(fields).eq('id', previewId).maybeSingle()
    ambassador = data
  } else {
    const { data } = await supabase.from(AMBASSADOR_TABLE).select(fields).ilike('email', userEmail)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    ambassador = data
  }
  if (!ambassador) return json(404, { error: 'No ambassador profile found for this account.' })

  // ── Ambassador: "My reviews" in her profile (works whatever the giveaway switch) ──
  if (qs.view === 'reviews' && event.httpMethod === 'GET') {
    try {
      const st = await buildStatus(supabase, ambassador)
      return json(200, { reviewed: st.reviewed, notReviewed: st.notReviewed, unmatchedLines: st.unmatchedLines, reviewsNeeded: GIVEAWAY_MIN_REVIEWS })
    } catch (err) {
      console.error('giveaway-request: reviews view failed', err.message)
      return json(502, { error: 'We could not load your reviews right now.' })
    }
  }

  // ── Ambassador: "Which ones did you get?" for a general package line ──
  if (qs.action === 'report' && event.httpMethod === 'POST') {
    let body = {}
    try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid request.' }) }
    let st
    try { st = await buildStatus(supabase, ambassador) } catch { return json(502, { error: 'Please try again in a moment.' }) }
    const line = (st.unmatchedLines || []).find((l) => l.line === String(body.line || ''))
    if (!line) return json(400, { error: 'That package line is not waiting for products.' })
    let shop
    try { shop = await loadShopProducts() } catch { return json(502, { error: 'Shop products unavailable right now.' }) }
    const byH = new Map(shop.map((p) => [p.handle, p]))
    const handles = [...new Set((Array.isArray(body.handles) ? body.handles : []).map(String))].filter((h) => byH.has(h))
    if (!handles.length) return json(400, { error: 'Please choose at least one product.' })
    if (handles.length + line.picked.length > line.max) return json(400, { error: `Please choose up to ${line.max} products for this line.` })
    const rows = handles.map((h) => ({ application_id: ambassador.id, line: line.line, product_handle: h, product_title: byH.get(h).title }))
    const { error: insErr } = await supabase.from('ambassador_reported_items').upsert(rows, { onConflict: 'application_id,product_handle', ignoreDuplicates: true })
    if (insErr) return json(500, { error: 'Could not save. Please try again.' })
    return json(200, { ok: true })
  }

  // On/off switch (Shipments → Giveaway requests). While off, ambassadors see
  // nothing and can't send requests; the admin preview still works.
  if (!previewId) {
    const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'giveaway_card_visible').maybeSingle()
    // An ambassador René invited (she qualifies) sees the card anyway.
    if (setting?.value !== true && !ambassador.giveaway_invited_at) {
      return event.httpMethod === 'GET' ? json(200, { hidden: true }) : json(403, { error: 'Giveaway requests are not open yet.' })
    }
  }

  let status
  try {
    status = await buildStatus(supabase, ambassador, { detail: Boolean(previewId && event.httpMethod === 'GET') })
  } catch (err) {
    console.error('giveaway-request: status failed', err.message)
    return json(502, { error: 'We could not check your reviews right now. Please try again later.' })
  }

  if (event.httpMethod === 'GET') return json(200, status)

  // ── POST: save the request ───────────────────────────────────────────────
  if (!status.eligible) return json(409, { error: 'You are not able to request a giveaway right now.', ...status })
  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid request.' }) }

  const reviewedByHandle = new Map(status.reviewed.map((p) => [p.handle, p]))
  const picked = [...new Set((Array.isArray(body.products) ? body.products : []).map(String))]
  // 8 to 10 prize products, all received and reviewed by her.
  const most = Math.min(GIVEAWAY_MAX_PRODUCTS, status.reviewed.length)
  if (picked.length < GIVEAWAY_MIN_REVIEWS || picked.length > most) return json(400, { error: `Please choose between ${GIVEAWAY_MIN_REVIEWS} and ${most} products.` })
  if (picked.some((h) => !reviewedByHandle.has(h))) return json(400, { error: 'Only products you have received and reviewed can be given away.' })
  const month = clean(body.preferredMonth, 7)
  if (!status.months.includes(month)) return json(400, { error: 'Please choose a month.' })
  const idea = clean(body.idea)
  if (idea.length < 10) return json(400, { error: 'Please tell us a little about the look you will create.' })

  const row = {
    application_id: ambassador.id,
    products: picked.map((h) => reviewedByHandle.get(h)),
    preferred_month: month,
    idea,
    followers: clean(body.followers, 100) || clean(ambassador.followers, 100) || null,
    other_links: clean(body.otherLinks, 500) || null,
    notes: clean(body.notes, 1000) || null,
    status: 'requested',
  }
  const { data: saved, error } = await supabase.from('ambassador_giveaway_requests').insert(row).select('id, created_at, status, preferred_month, products').single()
  if (error) {
    if (String(error.code) === '23505') return json(409, { error: 'You already have a giveaway request waiting.' })
    console.error('giveaway-request: insert failed', error.message)
    return json(500, { error: 'Your request could not be saved. Please try again.' })
  }
  return json(200, { ok: true, request: saved })
}
