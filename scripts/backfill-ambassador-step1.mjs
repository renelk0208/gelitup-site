// One-off copy of ambassador data out of admin_comment tags into the proper
// columns and the ambassador_shipments table added by
// supabase/sql/ambassador_step1_structured_data.sql.
//
//   node scripts/backfill-ambassador-step1.mjs          dry run: writes a report, changes nothing
//   node scripts/backfill-ambassador-step1.mjs --apply  copies the data across
//
// Needs SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
// admin_comment itself is never modified, so it stays as the backup.
// Re-running is safe: filled columns are left alone and shipped lines are
// keyed by their original text, so no package is inserted twice.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const reportArg = process.argv.find((arg) => arg.startsWith('--report='))
const reportPath = reportArg
  ? reportArg.split('=')[1]
  : path.resolve(process.cwd(), `backfill-ambassador-step1-${APPLY ? 'applied' : 'dry-run'}.json`)


// ── Parsing rules: the same ones AdminDashboard.jsx uses ────────────────────
const TYPES = ['standard_ambassador', 'super_ambassador', 'extreme_ambassador']
const TYPE_BY_LABEL = {
  'standard ambassador': 'standard_ambassador',
  'super ambassador': 'super_ambassador',
  'extreme ambassador': 'extreme_ambassador',
}
const METHOD_BY_LABEL = {
  'courier (tracked)': 'courier',
  'post office': 'post_office',
  other: 'other',
}

export const tagRaw = (comment, tag) => {
  const m = String(comment || '').match(new RegExp(`\\[${tag}:([^\\]]+)\\]`, 'i'))
  return String(m?.[1] || '').trim()
}

export const parseLabelDate = (label) => {
  const text = String(label || '').trim()
  if (!text) return null
  const d = new Date(text)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export const parseShippedLine = (line) => {
  const text = String(line || '')
  const stamp = text.match(/^\[([^\]]+)\]/)?.[1] || null
  const by = text.match(/^\[[^\]]+\]\s*\[([^\]]+)\]/)?.[1] || null
  const typeLabel = text.match(/Status:\s*([^·]+)/i)?.[1]?.trim().toLowerCase() || ''
  const methodLabel = text.match(/Method:\s*([^·]+)/i)?.[1]?.trim().toLowerCase() || ''
  const trackingNumber = text.match(/Tracking:\s*([^·]+)/i)?.[1]?.trim() || null
  const trackingUrl = text.match(/(https?:\/\/[^\s·]+)/i)?.[1] || null
  const itemsText = text.match(/(?:Items|Box):\s*(.+)$/i)?.[1]?.trim() || ''
  const items = itemsText && itemsText !== 'Not recorded'
    ? itemsText.split(/,\s*/).map((s) => s.trim()).filter(Boolean)
    : []
  return {
    sent_at: parseLabelDate(stamp),
    stamp,
    created_by: by,
    ambassador_type: TYPE_BY_LABEL[typeLabel] || null,
    method: METHOD_BY_LABEL[methodLabel] || 'courier',
    tracking_number: trackingNumber,
    tracking_url: trackingUrl,
    items,
  }
}

export const shippedLines = (comment) => String(comment || '')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /📦\s*Shipped\s*—/i.test(l))

export const planRow = (row) => {
  const comment = row.admin_comment || ''
  const columns = {}
  const warnings = []

  const type = tagRaw(comment, 'AMBASSADOR_TYPE').toLowerCase()
  if (!row.ambassador_type && TYPES.includes(type)) columns.ambassador_type = type

  const ack = tagRaw(comment, 'FACTORY_ACK')
  if (!row.factory_ack_at && ack) {
    const [by, on] = ack.split(/\s+on\s+/i)
    columns.factory_ack_by = (by || '').trim() || null
    columns.factory_ack_at = parseLabelDate(on) || row.reviewed_at || row.created_at
    if (!parseLabelDate(on)) warnings.push(`Factory acknowledgement date "${on || ''}" unreadable; used the review date instead`)
  }

  const pausedRaw = tagRaw(comment, 'AMBASSADOR_PROGRAMME_PAUSED')
  if (!row.paused_at && pausedRaw) {
    try {
      const p = JSON.parse(decodeURIComponent(pausedRaw))
      columns.paused_at = p.pausedAt || null
      columns.paused_by = p.pausedBy || null
      columns.paused_reason = [p.timeframe, p.performanceDetails].filter(Boolean).join(' — ') || null
    } catch (_) {
      warnings.push('Pause details could not be read')
    }
  }

  const nextAt = tagRaw(comment, 'SHIPMENT_NEXT_REMINDER_AT')
  if (!row.next_package_due && nextAt && String(row.status).toLowerCase() === 'approved') {
    const iso = parseLabelDate(nextAt)
    if (iso) columns.next_package_due = iso.slice(0, 10)
    else warnings.push(`Next package date "${nextAt}" unreadable`)
  }

  const shipments = shippedLines(comment).map((line) => {
    const parsed = parseShippedLine(line)
    if (!parsed.sent_at) warnings.push(`Shipped date "${parsed.stamp}" unreadable; package kept without a date`)
    return {
      application_id: row.id,
      status: 'sent',
      ambassador_type: parsed.ambassador_type,
      items: parsed.items,
      method: parsed.method,
      tracking_number: parsed.tracking_number,
      tracking_url: parsed.tracking_url,
      sent_at: parsed.sent_at,
      created_by: parsed.created_by,
      legacy_source: line,
    }
  })

  return { columns, shipments, warnings }
}

// ── Run ─────────────────────────────────────────────────────────────────────
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY first.')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: apps, error } = await supabase
    .from('ambassador_applications')
    .select('id, full_name, email, status, admin_comment, created_at, reviewed_at, ambassador_type, factory_ack_at, paused_at, next_package_due')
    .order('id')
  if (error) {
    console.error(`Could not read ambassador_applications: ${error.message}`)
    console.error('Has supabase/sql/ambassador_step1_structured_data.sql been run yet?')
    process.exit(1)
  }

  const { data: existing } = await supabase
    .from('ambassador_shipments')
    .select('application_id, legacy_source')
    .not('legacy_source', 'is', null)
  const already = new Set((existing || []).map((s) => `${s.application_id}|${s.legacy_source}`))

  const { data: codes } = await supabase
    .from('ambassador_codes')
    .select('id, code, ambassador_name, ambassador_email, application_id, active')

  const report = {
    mode: APPLY ? 'apply' : 'dry-run',
    ranAt: new Date().toISOString(),
    totals: { ambassadors: apps.length, columnsFilled: 0, shipmentsToCopy: 0, shipmentsSkippedAlreadyCopied: 0, warnings: 0 },
    ambassadors: [],
    unlinkedCodes: [],
  }

  for (const row of apps) {
    const { columns, shipments, warnings } = planRow(row)
    const fresh = shipments.filter((s) => !already.has(`${row.id}|${s.legacy_source}`))
    report.totals.shipmentsSkippedAlreadyCopied += shipments.length - fresh.length
    if (!Object.keys(columns).length && !fresh.length && !warnings.length) continue
    report.totals.columnsFilled += Object.keys(columns).length
    report.totals.shipmentsToCopy += fresh.length
    report.totals.warnings += warnings.length
    report.ambassadors.push({
      id: row.id,
      name: row.full_name,
      status: row.status,
      columns,
      shipments: fresh.map(({ legacy_source, ...rest }) => rest),
      warnings,
    })

    if (APPLY) {
      if (Object.keys(columns).length) {
        const { error: upErr } = await supabase.from('ambassador_applications').update(columns).eq('id', row.id)
        if (upErr) warnings.push(`Column update failed: ${upErr.message}`)
      }
      if (fresh.length) {
        const { error: insErr } = await supabase.from('ambassador_shipments').insert(fresh)
        if (insErr) warnings.push(`Shipment copy failed: ${insErr.message}`)
      }
    }
  }

  // Codes the migration could not link by exact email are listed for a person
  // to confirm; nothing is linked by name guessing.
  const appsByName = new Map(apps.map((a) => [String(a.full_name || '').trim().toLowerCase(), a]))
  for (const c of codes || []) {
    if (c.application_id) continue
    const nameMatch = appsByName.get(String(c.ambassador_name || '').trim().toLowerCase())
    report.unlinkedCodes.push({
      code: c.code,
      ambassador_name: c.ambassador_name,
      ambassador_email: c.ambassador_email,
      active: c.active,
      possibleMatch: nameMatch ? { id: nameMatch.id, name: nameMatch.full_name, email: nameMatch.email } : null,
    })
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  const t = report.totals
  console.log(`${APPLY ? 'Applied' : 'Dry run'}: ${t.ambassadors} ambassadors checked, ${t.columnsFilled} fields ${APPLY ? 'filled' : 'to fill'}, ${t.shipmentsToCopy} packages ${APPLY ? 'copied' : 'to copy'} (${t.shipmentsSkippedAlreadyCopied} already copied), ${t.warnings} warnings, ${report.unlinkedCodes.length} codes not linked.`)
  console.log(`Report: ${reportPath}`)
  if (!APPLY) console.log('Nothing was changed. Re-run with --apply to copy the data.')
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/backfill-ambassador-step1.mjs')) {
  await main()
}
