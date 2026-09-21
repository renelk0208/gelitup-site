import { createClient } from '@supabase/supabase-js'

function getArg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] || null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const orderIdArg = getArg('--order-id')
const orderId = Number.parseInt(orderIdArg || '', 10)
if (!Number.isFinite(orderId) || orderId <= 0) {
  fail('Missing/invalid --order-id. Example: npm run replay:zoho-order -- --order-id 123')
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ordersTable = process.env.B2B_ORDERS_TABLE || 'b2b_orders'
const zohoWebhookUrl = process.env.ZOHO_SYNC_WEBHOOK_URL
const zohoAuthToken = process.env.ZOHO_SYNC_AUTH_TOKEN || ''
const dryRun = hasFlag('--dry-run')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  fail('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY')
}

if (!zohoWebhookUrl) {
  fail('Missing ZOHO_SYNC_WEBHOOK_URL')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

const { data: order, error } = await supabase
  .from(ordersTable)
  .select('*')
  .eq('id', orderId)
  .single()

if (error) {
  fail(`Failed to load order #${orderId} from ${ordersTable}: ${error.message}`)
}

const items = Array.isArray(order?.items) ? order.items : []
if (!items.length) {
  fail(`Order #${orderId} has no items[] in ${ordersTable}`)
}

const payload = {
  orderId: order.id,
  customerEmail: order.customer_email || null,
  items,
  totalUnits: Number(order.total_units || items.length),
  status: order.status || 'received',
  source: order.source || 'b2b_portal',
  shipping: {
    name: order.consignee_name || undefined,
    phone: order.consignee_phone || undefined,
    address: order.shipping_address || undefined,
  },
  emittedAt: new Date().toISOString(),
}

console.log(`Loaded order #${order.id} with ${items.length} line entries and total_units=${payload.totalUnits}.`)

if (dryRun) {
  console.log('Dry run mode enabled. Payload preview:')
  console.log(JSON.stringify(payload, null, 2))
  process.exit(0)
}

const headers = {
  'Content-Type': 'application/json',
}

if (zohoAuthToken) {
  headers.Authorization = `Bearer ${zohoAuthToken}`
}

const response = await fetch(zohoWebhookUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify(payload),
})

const responseText = await response.text().catch(() => '')
let responseJson = null
try {
  responseJson = responseText ? JSON.parse(responseText) : null
}
catch {
  responseJson = null
}

if (!response.ok) {
  console.error(`Zoho replay failed (${response.status}).`)
  if (responseJson) {
    console.error(JSON.stringify(responseJson, null, 2))
  }
  else {
    console.error(responseText || 'No response body')
  }
  process.exit(1)
}

console.log(`Zoho replay success for order #${order.id}.`)
if (responseJson) {
  console.log(JSON.stringify(responseJson, null, 2))
}
else if (responseText) {
  console.log(responseText)
}
