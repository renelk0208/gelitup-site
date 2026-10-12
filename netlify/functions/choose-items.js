import { createClient } from '@supabase/supabase-js'
import priceList from '../../public/gelitup-content/b2b-price-list.json'
import imageMap from '../../public/gelitup-content/product-image-map.json'
import outOfStock from '../../public/gelitup-content/out-of-stock.json'
import hidden from '../../public/gelitup-content/hidden-products.json'
import { buildChoiceCatalog, typeLimit } from '../../src/lib/ambassadorChoiceCatalog.js'
import { normItem } from '../../src/lib/packageItems.js'

// "Choose 5 products for your next PR package" page for ambassadors.
//   GET  /choose-items?t=<token>   -> the picker (or their choices if already sent)
//   POST /choose-items?t=<token>   -> JSON { items: [5 product names] }
// Rules: exactly 5 different products, and nothing they have already received
// (checked here and again in the database).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NEEDED = 5

const CATALOG = buildChoiceCatalog({ priceList, imageMap, outOfStock, hidden })
const CATALOG_BY_NAME = new Map(CATALOG.map((p) => [p.name, p]))

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const fmtDate = (v) => {
  const d = new Date(String(v || '').length === 10 ? `${v}T12:00:00Z` : v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function html(title, body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · GEL.IT.UP</title><meta name="robots" content="noindex">
<style>
*{box-sizing:border-box}body{margin:0;background:#0b0b0b;color:#fff;font-family:Arial,Helvetica,sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:20px 16px 140px}
.brand{letter-spacing:.18em;font-weight:700;font-size:13px;color:#d43790}
h1{font-size:24px;margin:10px 0 6px}p{color:#cfcfcf;line-height:1.55}
.card{background:#151515;border:1px solid #2a2a2a;border-radius:16px;padding:18px;margin:14px 0}
.received{font-size:13px;color:#bbb}.received span{display:inline-block;background:#222;border-radius:999px;padding:3px 9px;margin:3px 4px 0 0}
.tools{position:sticky;top:0;background:#0b0b0b;padding:10px 0;z-index:5}
input[type=search]{width:100%;padding:12px 14px;border-radius:12px;border:1px solid #333;background:#151515;color:#fff;font-size:15px}
.cats{display:flex;gap:6px;overflow-x:auto;padding:10px 0 2px}.cats button{flex:none;background:#1d1d1d;color:#ddd;border:1px solid #333;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}
.cats button.on{background:#d43790;border-color:#d43790;color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px}
.p{position:relative;background:#151515;border:2px solid #232323;border-radius:14px;padding:8px;cursor:pointer;text-align:left;color:#fff;font-size:13px}
.p img{width:100%;aspect-ratio:1;object-fit:contain;background:#fff;border-radius:10px}
.p .ph{width:100%;aspect-ratio:1;border-radius:10px;background:#222}
.p.sel{border-color:#d43790;box-shadow:0 0 0 2px #d43790 inset}.p.sel:after{content:'✓';position:absolute;top:6px;right:8px;background:#d43790;border-radius:999px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700}
.p.got{opacity:.35;cursor:not-allowed}.p.got .tag{position:absolute;top:8px;left:8px;background:#444;font-size:10px;padding:2px 6px;border-radius:6px}
.p .n{margin-top:6px;line-height:1.3}
.bar{position:fixed;left:0;right:0;bottom:0;background:#151515;border-top:1px solid #2a2a2a;padding:12px 16px}
.bar .in{max-width:1100px;margin:0 auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.chips{flex:1;min-width:200px;font-size:12px;color:#ddd}.chips span{display:inline-block;background:#2a1020;border:1px solid #d43790;border-radius:999px;padding:3px 9px;margin:2px}
.go{background:#16a34a;color:#fff;border:0;border-radius:999px;padding:13px 22px;font-size:15px;font-weight:700;cursor:pointer}.go:disabled{background:#333;color:#888;cursor:not-allowed}
.msg{color:#f9a8d4;font-size:13px}.empty{color:#888;padding:20px 0}
ul.done{line-height:1.9}
</style></head><body><div class="wrap"><div class="brand">GEL.IT.UP</div>${body}</div></body></html>`,
  }
}

// A due date in the past reads oddly to the ambassador ("planned for 1 October").
function plannedForText(due) {
  if (!due) return ''
  const d = new Date(`${String(due).slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.getTime() < Date.now() ? ', which we\'ll send very soon' : `, planned for around <strong>${esc(fmtDate(due))}</strong>`
}

function pickerPage(token, ctx) {
  const receivedKeys = new Set((ctx.received_items || []).map(normItem))
  const products = CATALOG.map((p) => ({ ...p, got: receivedKeys.has(normItem(p.name)), limit: typeLimit(p.type) }))
  const cats = ['All', ...new Set(products.map((p) => p.category))]
  const firstName = String(ctx.full_name || '').split(' ')[0]
  const received = (ctx.received_items || []).filter(Boolean)
  return html('Choose your 5 products', `
  <h1>Hi ${esc(firstName)}, choose ${NEEDED} products 💖</h1>
  <p>Pick the <strong>${NEEDED} products</strong> you'd most like to try and review in your next PR package${plannedForText(ctx.next_package_due)}.
  Choose <strong>one product of each type</strong> (for example one builder gel, one MultiMix, one base) — and up to <strong>3 gel polish colours or effects</strong> — so you can review a mix of products. Products you've already received are greyed out — each product is sent once.</p>
  ${received.length ? `<div class="card received"><strong>Already received:</strong><br>${received.map((r) => `<span>${esc(r)}</span>`).join('')}</div>` : ''}
  <div class="tools"><input id="q" type="search" placeholder="Search products, e.g. top coat, glitter, 2601…" autocomplete="off">
  <div class="cats" id="cats">${cats.map((c, i) => `<button type="button" data-c="${esc(c)}" class="${i ? '' : 'on'}">${esc(c)}</button>`).join('')}</div></div>
  <div class="grid" id="grid"></div><div class="empty" id="empty" hidden>No products match.</div>
  <div class="bar"><div class="in"><div class="chips" id="chips">Choose ${NEEDED} products</div><span class="msg" id="msg"></span><button class="go" id="go" disabled>Send my ${NEEDED} choices</button></div></div>
<script>
const P=${JSON.stringify(products).replace(/</g, '\\u003c')};const N=${NEEDED};const T=${JSON.stringify(token)};
let cat='All',q='',sel=[];const g=document.getElementById('grid'),e=document.getElementById('empty');
const h=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(){const qq=q.toLowerCase();const list=P.filter(p=>(cat==='All'||p.category===cat)&&(!qq||p.name.toLowerCase().includes(qq)||p.category.toLowerCase().includes(qq))).slice(0,400);
const typeCount={};sel.forEach(s=>{const t=(P.find(x=>x.name===s)||{}).type;typeCount[t]=(typeCount[t]||0)+1});
e.hidden=list.length>0;g.innerHTML=list.map(p=>{const taken=!sel.includes(p.name)&&(typeCount[p.type]||0)>=p.limit;return '<button type="button" class="p'+(p.got||taken?' got':'')+(sel.includes(p.name)?' sel':'')+'" data-n="'+h(p.name)+'"'+(p.got?' disabled':'')+'>'+(p.got?'<span class="tag">Already received</span>':taken?'<span class="tag">'+(p.limit>1?p.limit+' colours chosen':'1 per type chosen')+'</span>':'')+(p.image?'<img loading="lazy" alt="" src="'+encodeURI(p.image)+'">':'<div class="ph"></div>')+'<div class="n">'+h(p.name)+'</div></button>'}).join('');
document.getElementById('chips').innerHTML=sel.length?sel.map(s=>'<span>'+h(s)+'</span>').join(''):'Choose '+N+' products';
const go=document.getElementById('go');go.disabled=sel.length!==N;go.textContent=sel.length===N?'Send my '+N+' choices':(N-sel.length)+' more to choose';}
g.addEventListener('click',ev=>{const b=ev.target.closest('.p');if(!b||b.disabled)return;const n=b.dataset.n;const m=document.getElementById('msg');m.textContent='';
if(sel.includes(n))sel=sel.filter(x=>x!==n);else if(sel.length>=N){m.textContent='You can choose '+N+' — untick one first.';return}else{const p=P.find(x=>x.name===n);const same=sel.filter(s=>(P.find(x=>x.name===s)||{}).type===p.type);if(same.length>=p.limit){m.textContent=p.limit>1?'You already chose '+p.limit+' '+p.typeLabel+'s — untick one first to swap.':'You already chose '+same[0]+' — one '+p.typeLabel+' per package. Untick it first to swap.';return}sel.push(n)}draw()});
document.getElementById('q').addEventListener('input',ev=>{q=ev.target.value.trim();draw()});
document.getElementById('cats').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;cat=b.dataset.c;[...document.querySelectorAll('#cats button')].forEach(x=>x.classList.toggle('on',x===b));draw()});
document.getElementById('go').addEventListener('click',async()=>{const go=document.getElementById('go'),m=document.getElementById('msg');go.disabled=true;go.textContent='Sending…';
try{const r=await fetch('/choose-items?t='+encodeURIComponent(T),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:sel})});const j=await r.json().catch(()=>({}));
if(r.ok&&j.ok){location.reload();return}m.textContent=j.error||'Something went wrong — please try again.';}catch(err){m.textContent='Something went wrong — please try again.'}draw()});
draw();
</script>`)
}

async function notifyOffice(name, items) {
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_KEY) return
  try {
    await fetch(EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({
        to: 'acc1.leeukopf@gmail.com', // the admin team prepares the packages
        subject: `${name} chose their 5 PR products`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px"><p><strong>${esc(name)}</strong> chose these products for their next PR package. They are now in "What goes in this package" in the admin — please prepare them for the next package.</p><ol>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol></div>`,
        from: 'GEL.IT.UP <info@gelitup.com>',
        replyTo: 'info@gelitup.com',
      }),
    })
  } catch (err) {
    console.error('choose-items: office email failed', err?.message)
  }
}

export async function handler(event) {
  const token = String(event.queryStringParameters?.t || '').trim()
  const isPost = event.httpMethod === 'POST'
  const json = (status, body) => ({ statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) })
  if (!TOKEN_RE.test(token)) return isPost ? json(400, { error: 'This link is not valid.' }) : html('Link not valid', '<h1>This link isn\'t valid</h1><p>Please use the button in your email, or reply to it and we\'ll help.</p>', 400)
  if (!SUPABASE_URL || !SUPABASE_KEY) return isPost ? json(500, { error: 'Please try again later.' }) : html('Please try later', '<h1>Something went wrong</h1><p>Please try again later.</p>', 500)
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const { data, error } = await supabase.rpc('get_ambassador_choice_context', { p_token: token })
  const ctx = Array.isArray(data) ? data[0] : data
  if (error || !ctx) {
    console.error('choose-items: lookup failed', error?.message || 'no row')
    return isPost ? json(404, { error: 'We could not find your details.' }) : html('Link not valid', '<h1>We couldn\'t find your details</h1><p>Please reply to the email and we\'ll help.</p>', 404)
  }
  if (String(ctx.status || '').toLowerCase() !== 'approved') {
    return isPost ? json(403, { error: 'This link is no longer active.' }) : html('Not active', '<h1>This link is no longer active</h1><p>Please reply to the email if you think this is a mistake.</p>', 403)
  }

  if (ctx.choice_submitted_at) {
    const list = (ctx.chosen_items || []).map((i) => `<li>${esc(i)}</li>`).join('')
    return isPost ? json(409, { error: 'Your choices were already sent.' })
      : html('Thank you', `<h1>Thank you${ctx.full_name ? `, ${esc(String(ctx.full_name).split(' ')[0])}` : ''}! 💖</h1><p>We've got your ${NEEDED} choices for your next PR package:</p><ul class="done">${list}</ul><p>Need to change something? Just reply to the email.</p>`)
  }

  if (!isPost) return pickerPage(token, ctx)

  let items = []
  try { items = JSON.parse(event.body || '{}').items } catch { items = [] }
  items = Array.isArray(items) ? [...new Set(items.map((i) => String(i || '').trim()).filter(Boolean))] : []
  if (items.length !== NEEDED) return json(400, { error: `Please choose exactly ${NEEDED} different products.` })
  if (items.some((i) => !CATALOG_BY_NAME.has(i))) return json(400, { error: 'One of the products is no longer available — please refresh the page.' })
  const receivedKeys = new Set((ctx.received_items || []).map(normItem))
  const repeat = items.find((i) => receivedKeys.has(normItem(i)))
  if (repeat) return json(400, { error: `You've already received ${repeat} — please choose something else.` })
  const typeSeen = new Map()
  for (const i of items) {
    const p = CATALOG_BY_NAME.get(i)
    const already = typeSeen.get(p.type) || []
    if (already.length >= typeLimit(p.type)) {
      return json(400, { error: typeLimit(p.type) > 1
        ? `Please choose no more than ${typeLimit(p.type)} gel polish colours or effects.`
        : `${already[0]} and ${i} are the same type (${p.typeLabel}) — please choose one product of each type.` })
    }
    typeSeen.set(p.type, [...already, i])
  }

  const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Europe/Athens' })
  const lines = items.map((text) => `[PACK_NOTE:${encodeURIComponent(JSON.stringify({ stamp, author: 'chosen by ambassador', text }))}]`)
  const { data: result, error: submitError } = await supabase.rpc('submit_ambassador_choices', { p_token: token, p_items: items, p_note_lines: lines })
  if (submitError || result !== 'ok') {
    console.error('choose-items: submit failed', submitError?.message || result)
    const r = String(result || '')
    const msg = r.startsWith('already_received:') ? `You've already received ${r.slice(17)} — please choose something else.`
      : r === 'already_submitted' ? 'Your choices were already sent.'
        : 'Something went wrong — please try again.'
    return json(400, { error: msg })
  }
  await notifyOffice(ctx.full_name || 'An ambassador', items)
  return json(200, { ok: true })
}
