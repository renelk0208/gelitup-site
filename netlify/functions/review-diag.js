// TEMPORARY diagnostic — remove after use.
const KEY = 'fd0eda69a11fe89290873a590653538f'
export const handler = async (event) => {
  if ((event.queryStringParameters || {}).k !== KEY) return { statusCode: 404, body: 'Not found' }
  const token = process.env.JUDGEME_PRIVATE_TOKEN
  const all = []
  let meta = null
  for (let page = 1; page <= 50; page += 1) {
    const qs = new URLSearchParams({ api_token: token, shop_domain: '9tx96d-2b.myshopify.com', per_page: '100', page: String(page) })
    const res = await fetch('https://api.judge.me/api/v1/reviews?' + qs)
    const d = await res.json()
    if (page === 1) meta = { status: res.status, keys: Object.keys(d || {}), current_page: d.current_page, per_page: d.per_page }
    const list = d.reviews || []
    all.push(...list)
    if (list.length < 100) break
  }
  const sorted = [...all].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  const pick = (r) => ({ id: r.id, name: r.reviewer?.name, email: r.reviewer?.email, at: r.created_at, published: r.published, hidden: r.hidden, curated: r.curated, product: r.product_title, handle: r.product_handle, ext: r.product_external_id })
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ meta, total: all.length, newest: sorted.slice(0, 80).map(pick), oldest: all.slice(0, 3).map(pick) }) }
}
