whereimport fs from 'node:fs'
import path from 'node:path'

const outputPathArg = process.argv.find((arg) => arg.startsWith('--output='))
const outputPath = outputPathArg ? outputPathArg.split('=')[1] : path.resolve(process.cwd(), 'ambassador-discount-codes.csv')
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL + SUPABASE_ANON_KEY) before running this export.')
  process.exit(1)
}

const query = 'select=code,ambassador_name,ambassador_email,discount_pct,commission_pct,active,max_redemptions,redemption_count,created_at,updated_at,notes'
const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/ambassador_codes?${query}&order=ambassador_name.asc.nullslast`

const response = await fetch(url, {
  method: 'GET',
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: 'count=exact',
  },
})

if (!response.ok) {
  const text = await response.text()
  console.error(`Failed to fetch ambassador codes (${response.status}): ${text}`)
  process.exit(1)
}

const rows = await response.json()

const headers = [
  'code',
  'ambassador_name',
  'ambassador_email',
  'discount_pct',
  'commission_pct',
  'active',
  'max_redemptions',
  'redemption_count',
  'created_at',
  'updated_at',
  'notes',
]

const toCsvValue = (value) => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

const csv = [headers.join(',')]
  .concat(
    rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(',')),
  )
  .join('\n')

fs.writeFileSync(outputPath, `${csv}\n`, 'utf8')
console.log(`Exported ${rows.length} ambassador codes to ${outputPath}`)
