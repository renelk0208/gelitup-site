import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import * as XLSX from 'xlsx'
import { PRODUCT_ALIAS_GROUPS } from '../data/productAliases.js'
import ambassadorLetterAttachmentUrl from '../lib/ambassadorletter/Gelitup Ambassador Letter.pdf?url'
import { buildAmbassadorContractPdf, buildAmbassadorFactoryPrepPdf, buildAmbassadorWelcomeLetterPdf } from '../lib/ambassadorContractPdf.js'

const REGISTRATIONS_TABLE = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || 'b2b_registrations'
const ORDERS_TABLE = import.meta.env.VITE_B2B_ORDERS_TABLE || 'b2b_orders'
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL || ''
const ORDER_INBOX_EMAIL = import.meta.env.VITE_B2B_ORDER_INBOX || 'distribution@gelitup.com'
const FROM_EMAIL = import.meta.env.VITE_EMAIL_FROM || 'GEL.IT.UP Distributors <distributors@gelitup.com>'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const AMBASSADOR_TABLE = import.meta.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
// Reuse the working distributors@ sender (guaranteed deliverability), branded for ambassadors.
// One address for everything — send from, and receive replies at, info@gelitup.com.
const AMBASSADOR_REPLY_TO = import.meta.env.VITE_AMBASSADOR_INBOX || 'info@gelitup.com'
const AMBASSADOR_FROM_EMAIL = import.meta.env.VITE_AMBASSADOR_EMAIL_FROM || 'GEL.IT.UP <info@gelitup.com>'
const AMBASSADOR_REMINDER_EMAIL = 'info@gelitup.com'
// Statuses that count as "needs review" (form inserts default to 'new').
const AMBASSADOR_PENDING_STATUSES = ['new', 'pending', 'submitted']
const AMBASSADOR_LETTER_ATTACHMENT_URL = ambassadorLetterAttachmentUrl
const SHIPMENT_EMAIL_LOCK_STORAGE_KEY = 'gelitup.admin.shipmentEmailLock.v1'
const ADMIN_TAB_STORAGE_KEY = 'gelitup.admin.activeTab.v1'
const ADMIN_TAB_KEYS = new Set(['registrations', 'orders', 'search', 'admins', 'pricing', 'ambassadors', 'guestbook', 'draft-carts'])

function buildDistributorAccessEmail(row) {
  const tierLabel = titleCaseTierLabel(row?.distributor_tier || '') || 'Distributor'
  const createPasswordLink = `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(row?.contact_email || '')}`
  const portalLink = `${window.location.origin}/portal/login?portal=distributor&email=${encodeURIComponent(row?.contact_email || '')}`

  return {
    subject: 'Your Distributor Tier Is Active - Portal Login Ready',
    html: `<p>Dear ${row?.contact_name || 'Partner'},</p><p>Your account for <strong>${row?.company_name || 'your company'}</strong> has been confirmed as a <strong>Distributor</strong>.</p><p>Your assigned tier: <strong>${tierLabel}</strong>.</p><p>To activate your access, first create or refresh your password using the secure link below.</p><p><a href="${createPasswordLink}" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;display:inline-block;">Set Password & Access Portal</a></p><p style="margin-top:12px;">After setting your password, sign in here: <a href="${portalLink}">${portalLink}</a></p><p>If you have questions, contact us at distribution@gelitup.com.</p><p>The GEL.IT.UP Distribution Team</p>`,
  }
}

function getRegistrationDisplayName(row) {
  const customerType = String(row?.customer_type || '').trim().toLowerCase()
  if (customerType === 'client') {
    return row?.contact_name || row?.company_name || 'Unknown client'
  }
  return row?.company_name || row?.contact_name || 'Unknown company'
}

const ORDER_STATUSES = ['submitted', 'processing', 'shipped', 'completed', 'cancelled']

const AMBASSADOR_PACKS_BY_TYPE = {
  standard_ambassador: {
    title: 'Standard Pack',
    items: [
      'Standard Sample Box',
      'Premium builder gel',
      '3-in-1 builder gel',
      'Nail file',
      'Photo Perfect / Cream / Cuticle Oil (based on current stock)',
    ],
  },
  super_ambassador: {
    title: 'Super Ambassador Pack',
    items: [
      'Standard Sample Pack',
      '2 x Premium Builder Gel (Clear / Colour)',
      'Multimix: 1 x 30g and 1 x 60g (based on current stock)',
      '3-in-1 Clear and 1 colour (based on current stock)',
      'All in One Liquid',
      'Nail file',
      'Cuticle oil',
      'Photo Perfect Cuticle Oil',
      '3 different Cat Eye shades',
      '1 shimmer shade',
      '1 metallic shade',
      'Chrome / mirror powder with a mirror top',
      'Any dual form box of tips',
      'Flexi tips',
      'Dual extension tip box',
      '3 nail tools - cuticle nipper, scissor and pusher',
    ],
  },
  extreme_ambassador: {
    title: 'Extreme Ambassador Pack',
    items: [
      'Everything in the Super Ambassador Pack',
      'Dust collector',
      'Nail lamp (for polygel)',
      '1 of each nail tool and a gel brush',
      'Polygel brush',
      'Nail art brush / French brush / ombre brush (whichever is available)',
    ],
  },
}

function statusBadge(status) {
  const map = {
    pending:                 'bg-amber-100 text-amber-700',
    pending_approval:        'bg-violet-100 text-violet-700',
    approved:                'bg-emerald-100 text-emerald-700',
    rejected:                'bg-rose-100 text-rose-700',
    received:                'bg-sky-100 text-sky-700',
    submitted:               'bg-slate-100 text-slate-600',
    processing:              'bg-blue-100 text-blue-700',
    shipped:                 'bg-indigo-100 text-indigo-700',
    completed:               'bg-emerald-100 text-emerald-700',
    cancelled:               'bg-rose-100 text-rose-700',
    cancellation_requested:  'bg-orange-100 text-orange-700',
    acknowledged_received:   'bg-cyan-100 text-cyan-700',
    in_progress:             'bg-blue-100 text-blue-700',
    payment_received:        'bg-emerald-100 text-emerald-700',
    tracking_placed:         'bg-violet-100 text-violet-700',
  }
  const normalized = normalizeOrderStatus(status)
  const cls = map[normalized] || 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {formatOrderStatusLabel(normalized || status)}
    </span>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function addOneMonth(iso) {
  const source = new Date(iso)
  if (Number.isNaN(source.getTime())) return null
  const next = new Date(source)
  next.setMonth(next.getMonth() + 1)
  return next.toISOString()
}

function parseDateLabelToIso(label) {
  const parsed = new Date(String(label || '').trim())
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function hashKey(value) {
  const text = String(value || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Delay revoke to avoid Safari/iOS aborting the download before it starts.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

const RLS_HINT_REGISTRATIONS = `-- Run once in Supabase SQL Editor:
create policy "Admins can read all registrations"
  on public.b2b_registrations for select to authenticated
  using (exists (
    select 1 from public.b2b_admins where email = auth.email()
  ));

create policy "Admins can update registrations"
  on public.b2b_registrations for update to authenticated
  using (exists (
    select 1 from public.b2b_admins where email = auth.email()
  ));

create policy "Admins can delete registrations"
  on public.b2b_registrations for delete to authenticated
  using (exists (
    select 1 from public.b2b_admins where email = auth.email()
  ));`

const RLS_HINT_ORDERS = `-- Run once in Supabase SQL Editor:
create policy "Admins can read all orders"
  on public.b2b_orders for select to authenticated
  using (exists (
    select 1 from public.b2b_admins where email = auth.email()
  ));

create policy "Admins can update orders"
  on public.b2b_orders for update to authenticated
  using (exists (
    select 1 from public.b2b_admins where email = auth.email()
  ));`

// ─── Registrations panel ──────────────────────────────────────────────────────

// Turns the HTML body of an outgoing email into readable plain text, so a copy
// of exactly what was sent can be stored in the shared interaction log without
// dumping raw markup.
function htmlToText(html) {
  return String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/gi, '"')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
    .trim()
}

// Parse admin_comment field: returns array of {text, timestamp, author} objects.
// Handles both legacy plain-text and new JSON-array format.
function parseComments(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch (_) { /* not JSON */ }
  // Legacy plain text — wrap as single entry
  return [{ text: raw, timestamp: null, author: null }]
}

function extractTaggedValue(notesValue, tagName) {
  const notes = String(notesValue || '')
  const match = notes.match(new RegExp(`\\[${tagName}:([^\\]]+)\\]`, 'i'))
  return String(match?.[1] || '').trim().toLowerCase()
}

function extractTaggedRawValue(notesValue, tagName) {
  const notes = String(notesValue || '')
  const match = notes.match(new RegExp(`\\[${tagName}:([^\\]]+)\\]`, 'i'))
  return String(match?.[1] || '').trim()
}

function getResolvedApplicationType(row) {
  const explicit = String(row?.application_type || '').trim().toLowerCase()
  const tagged = extractTaggedValue(row?.notes, 'APPLICATION_TYPE')
  // DB column wins when it's b2b_order — prevents a stale notes tag from
  // overriding a conversion that already happened (existing or future clients).
  if (explicit === 'b2b_order') return 'b2b_order'
  if (tagged === 'distributor' || tagged === 'b2b_order') return tagged
  if (explicit === 'distributor') return explicit
  return 'b2b_order'
}

function getDistributorAccessSummary(row) {
  const resolvedType = getResolvedApplicationType(row)
  if (resolvedType !== 'distributor') {
    return { ok: false, label: 'Not a distributor record', tone: 'text-slate-600' }
  }
  if (String(row?.status || '').trim().toLowerCase() !== 'approved') {
    return { ok: false, label: 'Pending approval', tone: 'text-amber-700' }
  }
  if (!row?.distributor_tier) {
    return { ok: false, label: 'Tier not assigned', tone: 'text-amber-700' }
  }
  if (!row?.prices_allocated) {
    return { ok: false, label: 'Tier pricing not allocated', tone: 'text-amber-700' }
  }
  return { ok: true, label: 'Distributor access enabled', tone: 'text-emerald-700' }
}

function titleCaseTierLabel(tier) {
  if (!tier) return 'Not assigned'
  if (tier === 'country') return 'Level 2 Country'
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

function ensureApplicationTypeTag(notesValue, typeValue) {
  const notes = String(notesValue || '')
  const cleaned = notes.replace(/\[APPLICATION_TYPE:[^\]]+\]/gi, '').trim()
  const prefix = cleaned ? `${cleaned}\n` : ''
  return `${prefix}[APPLICATION_TYPE:${typeValue}]`
}

function ensureTaggedValue(notesValue, tagName, tagValue) {
  const notes = String(notesValue || '')
  const cleaned = notes.replace(new RegExp(`\\[${tagName}:[^\\]]+\\]`, 'gi'), '').trim()
  if (!tagValue) return cleaned || null
  const prefix = cleaned ? `${cleaned}\n` : ''
  return `${prefix}[${tagName}:${tagValue}]`
}

function isReferralCheckoutRow(row) {
  const businessType = String(row?.business_type || '').trim().toLowerCase()
  const orderAction = String(row?.order_action || '').trim().toLowerCase()
  const notes = String(row?.notes || '')
  return businessType === 'country_referral_checkout'
    || orderAction === 'referred_to_local_distributor'
    || notes.includes('[DISTRIBUTOR_REFERRAL:')
}

function RegistrationsPanel({ onPreviewDistributor }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [commentMap, setCommentMap] = useState({}) // new comment being typed, keyed by row id
  const [saving, setSaving] = useState(null)
  const [emailStatus, setEmailStatus] = useState({}) // { [id]: { state: 'sending'|'sent'|'error', message: '' } }
  const [currentAdminEmail, setCurrentAdminEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentAdminEmail(data?.user?.email || '')
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase
      .from(REGISTRATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter === 'pending') query = query.in('status', ['pending', 'submitted'])
    else if (filter !== 'all') query = query.eq('status', filter)
    const { data, error: err } = await query
    setLoading(false)
    if (err) { setError(err.message); return }
    setRows(data || [])
  }, [filter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (row, status) => {
    const current = String(row?.status || '').toLowerCase()
    if (current === status) return
    const ok = window.confirm(`Are you sure you want to change status for "${getRegistrationDisplayName(row)}" from ${current || 'unknown'} to ${status}?`)
    if (!ok) return
    setSaving(row.id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status } : r))

    // Send notification email
    if (row?.contact_email && EMAIL_WEBHOOK_URL) {
      const approvalEmail = buildDistributorAccessEmail(row)
      const subject = status === 'approved'
        ? approvalEmail.subject
        : 'Update on your GEL.IT.UP distributor application'
      const html = status === 'approved'
        ? approvalEmail.html
        : `<p>Hi ${row.contact_name},</p><p>Thank you for applying to become a GEL.IT.UP distributor. Unfortunately your application has not been approved at this time.</p><p>If you have any questions please contact us at distribution@gelitup.com.</p>`
      setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'sending', message: '' } }))
      const emailHeaders = { 'Content-Type': 'application/json' }
      if (SUPABASE_ANON_KEY) {
        emailHeaders['apikey'] = SUPABASE_ANON_KEY
        emailHeaders['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`
      }
      try {
        const res = await fetch(EMAIL_WEBHOOK_URL, {
          method: 'POST',
          headers: emailHeaders,
          body: JSON.stringify({ to: row.contact_email, subject, html, from: FROM_EMAIL }),
        })
        const resJson = await res.json().catch(() => null)
        if (res.ok) {
          setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'sent', message: `Email sent to ${row.contact_email}` } }))
          logRegistrationSend(row, { to: row.contact_email, subject, html })
        } else {
          const errMsg = resJson?.error || `HTTP ${res.status}`
          setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: errMsg } }))
        }
      } catch (emailErr) {
        setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: emailErr.message || 'Network error' } }))
      }
    } else if (row?.contact_email && !EMAIL_WEBHOOK_URL) {
      setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: 'VITE_EMAIL_WEBHOOK_URL is not configured — email not sent.' } }))
    }
  }

  const deleteRegistration = async (row) => {
    const normalizedStatus = String(row?.status || '').trim().toLowerCase()
    if (normalizedStatus !== 'rejected') {
      alert('Only rejected registrations can be deleted from admin panel.')
      return
    }

    const firstConfirm = window.confirm(
      `Permanently delete rejected registration "${getRegistrationDisplayName(row)}" (${row.contact_email || 'no email'})?\n\nThis cannot be undone.`
    )
    if (!firstConfirm) return

    const typed = window.prompt('Type DELETE to confirm permanent removal:')
    if (typed !== 'DELETE') {
      alert('Delete cancelled. Confirmation text did not match.')
      return
    }

    setSaving(row.id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .delete()
      .eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }

    setRows(prev => prev.filter(r => r.id !== row.id))
    setExpanded(prev => (prev === row.id ? null : prev))
    setEmailStatus(prev => {
      const next = { ...prev }
      delete next[row.id]
      return next
    })
  }

  const resendApprovalEmail = async (row) => {
    if (!row?.contact_email || !EMAIL_WEBHOOK_URL) return
    const { subject, html } = buildDistributorAccessEmail(row)
    setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'sending', message: '' } }))
    const emailHeaders = { 'Content-Type': 'application/json' }
    if (SUPABASE_ANON_KEY) {
      emailHeaders['apikey'] = SUPABASE_ANON_KEY
      emailHeaders['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`
    }
    try {
      const res = await fetch(EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: emailHeaders,
        body: JSON.stringify({ to: row.contact_email, subject, html, from: FROM_EMAIL }),
      })
      const resJson = await res.json().catch(() => null)
      if (res.ok) {
        setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'sent', message: `Email resent to ${row.contact_email}` } }))
        logRegistrationSend(row, { to: row.contact_email, subject, html })
      } else {
        const errMsg = resJson?.error || `HTTP ${res.status}`
        setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: errMsg } }))
      }
    } catch (emailErr) {
      setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: emailErr.message || 'Network error' } }))
    }
  }

  const convertToB2B = async (row) => {
    if (!window.confirm(`Convert "${getRegistrationDisplayName(row)}" from Distributor to B2B Client?\n\nThis will:\n• Set application_type → b2b_order\n• Set status → approved\n• Set prices_allocated → true\n• Clear distributor_tier\n• Update [APPLICATION_TYPE] tag in notes`)) return
    setSaving(row.id)
    // Replace [APPLICATION_TYPE:distributor] tag in notes so it no longer overrides
    // the application_type column (getResolvedApplicationType checks notes tag first).
    const updatedNotes = (row.notes || '')
      .replace(/\[APPLICATION_TYPE:[^\]]*\]/gi, '[APPLICATION_TYPE:b2b_order]')
      .trimEnd()
      + '\n[CONVERTED: distributor → b2b_order by admin]'
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({
        application_type: 'b2b_order',
        status: 'approved',
        prices_allocated: true,
        distributor_tier: null,
        notes: updatedNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === row.id
      ? { ...r, application_type: 'b2b_order', status: 'approved', prices_allocated: true, distributor_tier: null, notes: updatedNotes }
      : r))
  }

  const reinstateReferralCheckout = async (row) => {
    if (!isReferralCheckoutRow(row)) return
    if (!window.confirm(
      `Reinstate "${getRegistrationDisplayName(row)}" on gelitup.com?\n\n` +
      'This will remove the distributor referral flag, keep the client details on the normal B2B path, and restore the record as an approved order.',
    )) return

    const nowIso = new Date().toISOString()
    const orderRef = `REF-${String(row?.id || 'order').replace(/[^A-Za-z0-9]+/g, '').toUpperCase()}-${Date.now()}`
    const shippingAddress = [
      row.shipping_address_line1,
      row.shipping_address_line2,
      row.shipping_area,
      row.shipping_region,
      row.shipping_postal_code,
    ].filter(Boolean).join(', ') || row.address || row.city || row.postal_code || row.country || ''
    const updatedNotes = [
      String(row.notes || '')
        .replace(/\[DISTRIBUTOR_REFERRAL:[^\]]+\]\s*/gi, '')
        .replace(/Captured from public checkout handoff\.\s*/gi, '')
        .replace(/Checkout blocked and referred to local distributor:[^\n]+\n?/gi, '')
        .trim(),
      `[REINSTATED_ORDER:${nowIso}] Restored to gelitup.com by admin.`,
    ].filter(Boolean).join('\n')

    const updatedBusinessType = String(row?.order_profile || '').trim().toLowerCase() === 'personal'
      ? 'B2B Order - Personal'
      : 'B2B Order - Business'

    setSaving(row.id)
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from(ORDERS_TABLE)
      .select('id, status, order_ref')
      .eq('registration_id', row.id)
      .maybeSingle()

    if (existingOrderError) {
      setSaving(null)
      alert(`Order reinstatement failed: ${existingOrderError.message}`)
      return
    }

    const previousOrderStatus = existingOrder?.status || 'received'
    const orderPayload = {
      registration_id: row.id,
      customer_email: row.contact_email || '',
      order_ref: existingOrder?.order_ref || orderRef,
      source: 'country_referral_checkout',
      module: 'products',
      // Reinstated referral orders should surface in the standard new orders queue.
      status: 'received',
      total_units: Number(String(row.notes || '').match(/Cart units:\s*(\d+)/i)?.[1] || 0),
      consignee_name: row.shipping_name || row.contact_name || row.company_name || null,
      consignee_phone: row.shipping_phone || row.phone || null,
      shipping_address: shippingAddress || null,
      items: [],
    }

    if (existingOrder?.id) {
      const { error: existingOrderUpdateError } = await supabase
        .from(ORDERS_TABLE)
        .update(orderPayload)
        .eq('id', existingOrder.id)
      if (existingOrderUpdateError) {
        setSaving(null)
        alert(`Order reinstatement failed: ${existingOrderUpdateError.message}`)
        return
      }
    } else {
      const { error: orderInsertError } = await supabase
        .from(ORDERS_TABLE)
        .insert([orderPayload])

      if (orderInsertError) {
        setSaving(null)
        alert(`Order reinstatement failed: ${orderInsertError.message}`)
        return
      }
    }

    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({
        application_type: 'b2b_order',
        business_type: updatedBusinessType,
        status: 'approved',
        prices_allocated: true,
        order_action: null,
        admin_comment: ensureTaggedValue(row.admin_comment, 'ORDER_REINSTATED', nowIso),
        notes: updatedNotes,
        reviewed_at: nowIso,
      })
      .eq('id', row.id)
    setSaving(null)
    if (err) {
      if (existingOrder?.id) {
        await supabase
          .from(ORDERS_TABLE)
          .update({ status: previousOrderStatus })
          .eq('id', existingOrder.id)
      } else {
        await supabase
          .from(ORDERS_TABLE)
          .delete()
          .eq('order_ref', orderRef)
      }
      alert(`Order reinstatement failed: ${err.message}`)
      return
    }
    setRows(prev => prev.map(r => r.id === row.id
      ? {
          ...r,
          application_type: 'b2b_order',
          business_type: updatedBusinessType,
          status: 'approved',
          prices_allocated: true,
          order_action: null,
          admin_comment: ensureTaggedValue(r.admin_comment, 'ORDER_REINSTATED', nowIso),
          notes: updatedNotes,
          reviewed_at: nowIso,
        }
      : r))
  }

  const saveComment = async (id) => {
    const newText = (commentMap[id] ?? '').trim()
    if (!newText) return
    const row = rows.find(r => r.id === id)
    const existing = parseComments(row?.admin_comment)
    const newEntry = { text: newText, timestamp: new Date().toISOString(), author: currentAdminEmail || null }
    const updated = [...existing, newEntry]
    const updatedJson = JSON.stringify(updated)
    setSaving(id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({ admin_comment: updatedJson })
      .eq('id', id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, admin_comment: updatedJson } : r))
    // Clear new-comment input so the save button hides
    setCommentMap(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  // Auto-append a record of an outgoing client email to the shared comment
  // thread so every admin can see the interaction — who emailed the client,
  // when, and exactly what was said. Best-effort: a logging failure never
  // affects the email that was already sent.
  const logRegistrationSend = async (row, { to, subject, html }) => {
    if (!row) return
    const bodyText = htmlToText(html)
    const text = `📧 Email sent to ${to} · “${subject}”${bodyText ? `\n\n${bodyText}` : ''}`
    const existing = parseComments(row?.admin_comment)
    const entry = { text, timestamp: new Date().toISOString(), author: currentAdminEmail || null, kind: 'sent' }
    const updatedJson = JSON.stringify([...existing, entry])
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({ admin_comment: updatedJson })
      .eq('id', row.id)
    if (!err) setRows(prev => prev.map(r => r.id === row.id ? { ...r, admin_comment: updatedJson } : r))
  }

  const togglePricesAllocated = async (row) => {
    const next = !row.prices_allocated
    setSaving(row.id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({ prices_allocated: next })
      .eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, prices_allocated: next } : r))
  }

  const syncRegistrationTierToOrders = async (row, newTier) => {
    const trimmedRegistrationId = String(row?.id || '').trim()
    const trimmedEmail = String(row?.contact_email || row?.customer_email || '').trim().toLowerCase()
    const orderPatch = {
      distributor_tier: newTier || null,
    }

    if (trimmedRegistrationId) {
      const { error } = await supabase
        .from(ORDERS_TABLE)
        .update(orderPatch)
        .eq('registration_id', trimmedRegistrationId)
      if (error) return { ok: false, message: error.message }
    }

    if (trimmedEmail) {
      const { error } = await supabase
        .from(ORDERS_TABLE)
        .update(orderPatch)
        .ilike('customer_email', trimmedEmail)
      if (error) return { ok: false, message: error.message }
    }

    return { ok: true }
  }

  const updateTier = async (row, newTier) => {
    const resolvedType = getResolvedApplicationType(row)
    const sameTier = (row.distributor_tier || '') === (newTier || '')
    const needsDistributorProvisioning = Boolean(newTier) && (
      resolvedType !== 'distributor' ||
      String(row?.status || '').toLowerCase() !== 'approved' ||
      !row?.prices_allocated
    )
    if (sameTier && !needsDistributorProvisioning) {
      const existingTierSync = await syncRegistrationTierToOrders(row, newTier)
      if (!existingTierSync.ok) {
        alert(`Tier is already set, but linked orders could not be synced: ${existingTierSync.message}`)
      }
      return
    }
    const currentTierLabel = titleCaseTierLabel(row.distributor_tier || '')
    const nextTierLabel = titleCaseTierLabel(newTier || '')
    const ok = window.confirm(
      `Are you sure you want to change ${getRegistrationDisplayName(row)} tier from "${currentTierLabel}" to "${nextTierLabel}"?\n\n` +
      (newTier
        ? (sameTier
          ? 'This will confirm distributor activation on the current tier, enable login-ready tier pricing, and send a confirmation email.'
          : 'This will also set the client as Approved Distributor, enable login-ready tier pricing, and send a confirmation email.')
        : 'This will remove distributor tier assignment.')
    )
    if (!ok) return

    const patch = {
      distributor_tier: newTier || null,
      reviewed_at: new Date().toISOString(),
    }

    if (newTier) {
      patch.application_type = 'distributor'
      patch.status = 'approved'
      patch.prices_allocated = true
      patch.notes = ensureApplicationTypeTag(row.notes, 'distributor')
    }

    setSaving(row.id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update(patch)
      .eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }

    const updatedRow = {
      ...row,
      distributor_tier: newTier || null,
      ...(newTier ? { application_type: 'distributor', status: 'approved', prices_allocated: true, notes: patch.notes } : {}),
    }
    setRows(prev => prev.map(r => r.id === row.id ? updatedRow : r))

    const orderTierSync = await syncRegistrationTierToOrders(updatedRow, newTier)
    if (!orderTierSync.ok) {
      alert(`Client tier was updated, but linked orders could not be synced: ${orderTierSync.message}`)
    }

    if (newTier && row?.contact_email && EMAIL_WEBHOOK_URL) {
      const tierEmail = buildDistributorAccessEmail({ ...row, distributor_tier: newTier || row.distributor_tier })
      const subject = tierEmail.subject
      const html = tierEmail.html
      setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'sending', message: '' } }))
      const emailHeaders = { 'Content-Type': 'application/json' }
      if (SUPABASE_ANON_KEY) {
        emailHeaders['apikey'] = SUPABASE_ANON_KEY
        emailHeaders['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`
      }
      try {
        const res = await fetch(EMAIL_WEBHOOK_URL, {
          method: 'POST',
          headers: emailHeaders,
          body: JSON.stringify({ to: row.contact_email, subject, html, from: FROM_EMAIL }),
        })
        const resJson = await res.json().catch(() => null)
        if (res.ok) {
          setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'sent', message: `Distributor access email sent to ${row.contact_email}` } }))
          logRegistrationSend(row, { to: row.contact_email, subject, html })
        } else {
          const errMsg = resJson?.error || `HTTP ${res.status}`
          setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: errMsg } }))
        }
      } catch (emailErr) {
        setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: emailErr.message || 'Network error' } }))
      }
    } else if (newTier && row?.contact_email && !EMAIL_WEBHOOK_URL) {
      setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: 'VITE_EMAIL_WEBHOOK_URL is not configured — distributor email not sent.' } }))
    }
  }

  const FILTERS = ['pending', 'approved', 'rejected', 'all']
  const counts = FILTERS.reduce((acc, f) => {
    if (f === 'all') acc[f] = rows.length
    else if (f === 'pending') acc[f] = rows.filter(r => r.status === 'pending' || r.status === 'submitted').length
    else acc[f] = rows.filter(r => r.status === f).length
    return acc
  }, {})

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {filter === f && rows.length > 0 && <span className="ml-1 opacity-60">({counts[f]})</span>}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50">
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Could not load registrations — RLS policy may be missing.</p>
          <p className="mt-1 text-xs">{error}</p>
          <pre className="mt-2 overflow-x-auto rounded bg-rose-100 p-2 text-xs leading-relaxed">{RLS_HINT_REGISTRATIONS}</pre>
        </div>
      )}

      {loading && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}

      {!loading && rows.length === 0 && !error && (
        <p className="py-6 text-center text-sm text-slate-400">
          No {filter === 'all' ? '' : filter + ' '}registrations found.
        </p>
      )}

      <ul className="space-y-2">
        {rows.map(row => {
          const resolvedType = getResolvedApplicationType(row)
          const access = getDistributorAccessSummary(row)
          const displayName = getRegistrationDisplayName(row)
          return (
          <li key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            >
              {statusBadge(row.status)}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{displayName}</span>
              <span className="hidden truncate text-xs text-slate-400 sm:block">{row.contact_email}</span>
              <span className="hidden text-xs text-slate-400 md:block">{row.country}</span>
              <span className="shrink-0 text-xs text-slate-400">{fmtDate(row.created_at)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded === row.id ? 'rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>

            {expanded === row.id && (
              <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                <div className="grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
                  <div><span className="font-semibold text-slate-400">Contact</span><br />{row.contact_name}</div>
                  <div><span className="font-semibold text-slate-400">Email</span><br />{row.contact_email}</div>
                  <div><span className="font-semibold text-slate-400">Phone</span><br />{row.phone || '—'}</div>
                  <div><span className="font-semibold text-slate-400">VAT</span><br />{row.vat_number || '—'}</div>
                  <div><span className="font-semibold text-slate-400">Business Type</span><br />{row.business_type || '—'}</div>
                  <div>
                    <span className="font-semibold text-slate-400">Application Type</span><br />
                    <span className="font-semibold capitalize">{resolvedType === 'b2b_order' ? 'B2B Client' : resolvedType}</span>
                    {resolvedType !== String(row.application_type || '').toLowerCase() && (
                      <span className="ml-1 text-[11px] text-amber-700">(resolved from notes tag)</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Distributor Tier</span><br />
                    {resolvedType === 'b2b_order' ? (
                      <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        B2B Client — no tier
                      </span>
                    ) : (
                    <div className="mt-1 flex items-center gap-2">
                      {row.distributor_tier && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          row.distributor_tier === 'authority' ? 'bg-fuchsia-100 text-fuchsia-700' :
                          row.distributor_tier === 'country' ? 'bg-sky-100 text-sky-700' :
                          row.distributor_tier === 'professional' ? 'bg-pink-100 text-pink-700' :
                          row.distributor_tier === 'sales' ? 'bg-slate-100 text-slate-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>{row.distributor_tier === 'country' ? 'Level 2 Country' : row.distributor_tier}</span>
                      )}
                      <select
                        value={row.distributor_tier || ''}
                        onChange={(e) => updateTier(row, e.target.value)}
                        disabled={saving === row.id}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none ring-slate-900/20 focus:ring disabled:opacity-50"
                      >
                        <option value="">— No tier —</option>
                        <option value="professional">Professional</option>
                        <option value="authority">Authority</option>
                        <option value="country">Level 2 Country Tier</option>
                        <option value="sales">Sales Representative</option>
                      </select>
                      {row.distributor_tier && access.ok === false && (
                        <button
                          type="button"
                          onClick={() => updateTier(row, row.distributor_tier)}
                          disabled={saving === row.id}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Confirm Distributor Access
                        </button>
                      )}
                    </div>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Distributor Access</span><br />
                    {resolvedType === 'b2b_order' ? (
                      <span className="font-semibold text-emerald-700">B2B Client — portal access active</span>
                    ) : (
                      <span className={`font-semibold ${access.tone}`}>{access.label}</span>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-400">Address</span><br />
                    {[row.address, row.city, row.postal_code, row.country].filter(Boolean).join(', ') || '—'}
                  </div>
                  {row.website && (
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-400">Website</span><br />
                      <a href={row.website} target="_blank" rel="noreferrer" className="text-fuchsia-600 hover:underline">{row.website}</a>
                    </div>
                  )}
                  {row.notes && (
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-400">Notes</span><br />{row.notes}
                    </div>
                  )}
                </div>

                {/* Approve / Reject */}
                <div className="flex flex-wrap gap-2">
                  {row.status !== 'approved' && (
                    <button
                      onClick={() => updateStatus(row, 'approved')}
                      disabled={saving === row.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                  )}
                  {row.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(row, 'rejected')}
                      disabled={saving === row.id}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  )}
                  {row.status !== 'pending' && (
                    <button
                      onClick={() => updateStatus(row, 'pending')}
                      disabled={saving === row.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      ↩ Reset to Pending
                    </button>
                  )}
                  {isReferralCheckoutRow(row) && (
                    <button
                      onClick={() => reinstateReferralCheckout(row)}
                      disabled={saving === row.id}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      ↺ Reinstate Order
                    </button>
                  )}
                  {row.status === 'approved' && (
                    <button
                      onClick={() => resendApprovalEmail(row)}
                      disabled={emailStatus[row.id]?.state === 'sending'}
                      className="rounded-lg border border-fuchsia-300 bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100 disabled:opacity-50"
                    >
                      {emailStatus[row.id]?.state === 'sending' ? '📨 Sending…' : '📧 Resend Approval Email'}
                    </button>
                  )}
                  {resolvedType === 'distributor' && (
                    <button
                      onClick={() => convertToB2B(row)}
                      disabled={saving === row.id}
                      className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                    >
                      ⇄ Convert to B2B Client
                    </button>
                  )}
                  {resolvedType === 'distributor' && typeof onPreviewDistributor === 'function' && (
                    <button
                      onClick={() => onPreviewDistributor({
                        tier: row.distributor_tier || null,
                        pricesAllocated: Boolean(row.prices_allocated),
                        email: row.contact_email || '',
                        companyName: row.company_name || '',
                      })}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      👁 Preview This Distributor
                    </button>
                  )}
                  {row.status === 'rejected' && (
                    <button
                      onClick={() => deleteRegistration(row)}
                      disabled={saving === row.id}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      🗑 Delete Rejected Account
                    </button>
                  )}
                </div>

                {/* Prices visibility toggle — approved distributors only */}
                {row.status === 'approved' && resolvedType === 'distributor' && (
                  <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${row.prices_allocated ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div>
                      <p className={`text-xs font-semibold ${row.prices_allocated ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {row.prices_allocated ? '✓ Prices Visible to Client' : '⏳ Prices Hidden from Client'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {row.prices_allocated
                          ? 'Distributor can see their tier pricing. Takes effect on their next login.'
                          : 'Distributor has portal access but prices are not shown yet. Toggle when ready.'}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePricesAllocated(row)}
                      disabled={saving === row.id}
                      className={`ml-4 shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        row.prices_allocated
                          ? 'border border-amber-300 bg-white text-amber-700 hover:bg-amber-50'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {saving === row.id ? 'Saving…' : row.prices_allocated ? 'Hide Prices' : 'Show Prices'}
                    </button>
                  </div>
                )}

                {/* Email status feedback */}
                {emailStatus[row.id] && (
                  <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    emailStatus[row.id].state === 'sent' ? 'bg-emerald-50 text-emerald-700' :
                    emailStatus[row.id].state === 'sending' ? 'bg-blue-50 text-blue-600' :
                    'bg-rose-50 text-rose-700'
                  }`}>
                    {emailStatus[row.id].state === 'sent' && '✓ '}
                    {emailStatus[row.id].state === 'error' && '⚠ Email failed: '}
                    {emailStatus[row.id].state === 'sending' && '📨 Sending email…'}
                    {emailStatus[row.id].message}
                  </div>
                )}

                {/* Internal comments thread */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Internal Comments</label>
                  {(() => {
                    const comments = parseComments(row.admin_comment)
                    return comments.length > 0 && (
                      <ul className="mb-2 space-y-1.5">
                        {comments.map((c, i) => (
                          <li key={c.timestamp || i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            <p className="whitespace-pre-wrap break-words">{c.text}</p>
                            {(c.timestamp || c.author) && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                {c.author && <span>{c.author}</span>}
                                {c.author && c.timestamp && <span> · </span>}
                                {c.timestamp && <span>{new Date(c.timestamp).toLocaleString()}</span>}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )
                  })()}
                  <textarea
                    rows={2}
                    value={commentMap[row.id] ?? ''}
                    onChange={e => setCommentMap(prev => ({ ...prev, [row.id]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
                    placeholder="Add internal note — not sent to applicant"
                  />
                  {(commentMap[row.id] ?? '').trim() && (
                    <button
                      onClick={() => saveComment(row.id)}
                      disabled={saving === row.id}
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {saving === row.id ? 'Saving…' : 'Save Comment'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        )})}
      </ul>
    </div>
  )
}

// ─── Orders panel ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  'pending_approval',
  'received',
  'acknowledged_received',
  'in_progress',
  'payment_received',
  'tracking_placed',
  'shipped',
  'completed',
  'cancelled',
  'cancellation_requested',
]
const STATUS_COLORS = {
  received: 'bg-sky-100 text-sky-700',
  acknowledged_received: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-blue-100 text-blue-700',
  payment_received: 'bg-emerald-100 text-emerald-700',
  tracking_placed: 'bg-violet-100 text-violet-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  cancellation_requested: 'bg-orange-100 text-orange-700',
}

function normalizeOrderStatus(status) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'submitted') return 'acknowledged_received'
  if (value === 'processing') return 'in_progress'
  return value
}

function formatOrderStatusLabel(status) {
  const normalized = normalizeOrderStatus(status)
  if (!normalized) return '—'
  return normalized.replace(/_/g, ' ')
}

function normalizeAdminSkuToken(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function normalizeAdminNameToken(value) {
  return normalizeAdminSkuToken(value)
    .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildBrushOnBuilderBiabAlias(value) {
  const normalized = normalizeAdminNameToken(value)
    .replace(/\b15ML\b/g, ' ')
    .replace(/\bHTF\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const match = normalized.match(/^BRUSH ON BUILDER GEL (.+)$/)
  if (!match) return ''

  return `BRUSH ON BUILDER BIAB ${match[1].trim()}`
}

function extractOrderItemSkuToken(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  const normalized = normalizeAdminSkuToken(text)

  const giupMatch = normalized.match(/\bGIUP[-\s]*[A-Z0-9]+(?:[-\s]*[A-Z0-9]+)*\b/)
  if (giupMatch) return normalizeAdminSkuToken(giupMatch[0].replace(/-/g, ' '))

  const seriesMatch = normalized.match(/\b([A-Z]{2,6})\s*(\d{1,4}[A-Z]?)\b/)
  if (seriesMatch) return `${seriesMatch[1]} ${seriesMatch[2]}`

  const numericMatch = normalized.match(/^\d{1,4}[A-Z]?$/)
  if (numericMatch) return numericMatch[0]

  return ''
}

function parseOrderItemEntry(rawItem, index = 0) {
  if (rawItem && typeof rawItem === 'object') {
    const qty = Math.max(1, Number(rawItem.qty ?? rawItem.quantity ?? 1) || 1)
    const explicitSku = normalizeAdminSkuToken(rawItem.sku || rawItem.code || '')
    const name = String(rawItem.name || rawItem.displayName || rawItem.description || explicitSku || `Item ${index + 1}`).trim()
    const sku = explicitSku || extractOrderItemSkuToken(name)
    return {
      sku,
      name,
      qty,
      unknown: !sku && normalizeAdminSkuToken(name) === 'SKU',
      rawLabel: name,
    }
  }

  const raw = String(rawItem || '').trim()
  const qtyMatch = raw.match(/\s+x(\d+)$/i)
  const qty = qtyMatch ? Math.max(1, Number(qtyMatch[1]) || 1) : 1
  const label = qtyMatch ? raw.replace(/\s+x\d+$/i, '').trim() : raw
  const sku = extractOrderItemSkuToken(label)
  const normLabel = normalizeAdminSkuToken(label)
  return {
    sku,
    name: label || `Item ${index + 1}`,
    qty,
    unknown: normLabel === 'SKU' || normLabel === 'ITEM' || (!sku && !label),
    rawLabel: raw,
  }
}

// ─── Manual SKU overrides ──────────────────────────────────────────────────────────────────
// Add entries here for items that are NOT in b2b-price-list.json.
// Key  : exact SKU/name as it appears in orders (will be upper-cased automatically).
// name : canonical Zoho product name shown in exports.
// price: BASE price (same scale as b2b-price-list.json — before the 1.2× markup).
//        Leave null to show the name but no price in exports.
// The standard markup formula   Math.ceil(price * 1.2 * 10) / 10 * tierMultiplier   still applies.
const SKU_OVERRIDE_MAP = {
  // ── Non-Wipe Top Coat (Milky) ──────────────────────────────────────
  // "Non Wipe Top Coat Milky 15ml -HTF" is in b2b-price-list.json at base 11.54 → B2B 13.9
  'NWTP':              { name: 'Non Wipe Top Coat Milky 15ml -HTF', price: 11.54 },
  'NWMT15':            { name: 'Non Wipe Top Coat Milky 15ml -HTF', price: 11.54 },

  // ── B2B Colour Series (same base price as standard gel polish) ────────
  'BRED0001':          { name: 'B2B Red 01',    price: 7.41 },
  'BYELLOW0002':       { name: 'B2B Yellow 02', price: 7.41 },

  // ── Superbond Nail Dehydrator (Acid-Free) ─────────────────────────
  // base 6.78 → B2B 8.2
  'GIUPSB':            { name: 'Superbond Nail Dehydrator 11ml - Acid Free -HTF', price: 6.78 },
  'GIUP SB':           { name: 'Superbond Nail Dehydrator 11ml - Acid Free -HTF', price: 6.78 },

  // ── 5-in-1 Superior Base 15ml — Serenity / Colour variants ────────
  // All at base 12.84 → B2B 15.5
  // "SB" in these codes = "Superior Base", NOT Superbond
  'GIUPSBPS':          { name: '5-in-1 Superior Base 15ml Peach Serenity -HTF',   price: 12.84 },
  'GIUP SBPS':         { name: '5-in-1 Superior Base 15ml Peach Serenity -HTF',   price: 12.84 },
  'GIUPSBBLUE':        { name: '5-in-1 Superior Base 15ml Blue Serenity -HTF',    price: 12.84 },
  'GIUP SBBLUE':       { name: '5-in-1 Superior Base 15ml Blue Serenity -HTF',    price: 12.84 },
  'GIUPSBLS':          { name: '5-in-1 Superior Base 15ml Lemon Serenity -HTF',   price: 12.84 },
  'GIUP SBLS':         { name: '5-in-1 Superior Base 15ml Lemon Serenity -HTF',   price: 12.84 },
  'GIUPSBMS':          { name: '5-in-1 Superior Base 15ml Mint Serenity -HTF',    price: 12.84 },
  'GIUP SBMS':         { name: '5-in-1 Superior Base 15ml Mint Serenity -HTF',    price: 12.84 },
  'GIUPSBPURS':        { name: '5-in-1 Superior Base 15ml Purple Serenity -HTF',  price: 12.84 },
  'GIUP SBPURS':       { name: '5-in-1 Superior Base 15ml Purple Serenity -HTF',  price: 12.84 },
  'GIUPSBCCLR':        { name: '5-in-1 Superior Base 15ml Clear -HTF',            price: 12.84 },
  'GIUP SBCCLR':       { name: '5-in-1 Superior Base 15ml Clear -HTF',            price: 12.84 },
  'GIUPSBCBP':         { name: '5-in-1 Superior Base 15ml Baby Pink -HTF',        price: 12.84 },
  'GIUP SBCBP':        { name: '5-in-1 Superior Base 15ml Baby Pink -HTF',        price: 12.84 },
  'GIUPSBCN':          { name: '5-in-1 Superior Base 15ml Nude -HTF',             price: 12.84 },
  'GIUP SBCN':         { name: '5-in-1 Superior Base 15ml Nude -HTF',             price: 12.84 },

  // ── Flexi Base Clear ──────────────────────────────────────────────
  // base 11.94 → B2B 14.4
  'GIUPFBCLR':         { name: 'Flexi Base Clear -HTF', price: 11.94 },
  'GIUP FBCLR':        { name: 'Flexi Base Clear -HTF', price: 11.94 },
  'FBCLR':             { name: 'Flexi Base Clear -HTF', price: 11.94 },

  // ── Clear Polygel ─────────────────────────────────────────────────
  // base 12.19 → B2B 14.7
  'POLYGELCLR':        { name: 'MultiMix Synthogel 30gr Clear -HTF', price: 12.19 },
  'POLYGEL CLR':       { name: 'MultiMix Synthogel 30gr Clear -HTF', price: 12.19 },
  'CLEAR POLYGEL':     { name: 'MultiMix Synthogel 30gr Clear -HTF', price: 12.19 },

  // ── MultiMix Synthogel short SKU aliases ──────────────────────────
  // These use short SKU codes that won't hit the price list lookup;
  // name-matching also fails because order names end in "color" vs price-list "Synthogel"
  // (COLOR is now stripped as a filler word, but belt-and-suspenders override here too)
  'MMSSPC':            { name: 'MultiMix Synthogel 30gr Super Soft Pink -HTF', price: 12.19 },
  'MMLNC':             { name: 'Multimix Synthogel 30g Light Nude -HTF',       price: 12.19 },

  // ── White Satin Cuticle Oil range (store brand → canonical price list name) ──────────
  // All 100ml variants at base 11.9 → B2B 14.3
  'WSCOILM':                           { name: 'Chilled Melon Cuticle Oil 100ml -HTF',   price: 11.9 },
  'WHITE SATIN CUTICLE OIL MELON':     { name: 'Chilled Melon Cuticle Oil 100ml -HTF',   price: 11.9 },
  'WSCOILP':                           { name: 'Perky Peach Cuticle Oil 100ml -HTF',     price: 11.9 },
  'WHITE SATIN CUTICLE OIL PEACH':     { name: 'Perky Peach Cuticle Oil 100ml -HTF',     price: 11.9 },
  'WSCOILC':                           { name: 'Cooling Coconut Cuticle Oil 100ml -HTF', price: 11.9 },
  'WHITE SATIN CUTICLE OIL COCONUT OIL': { name: 'Cooling Coconut Cuticle Oil 100ml -HTF', price: 11.9 },

  // ── Mirror Clear Powder ────────────────────────────────────────────────────────────
  // base 5.15 → B2B 6.2
  'MIRRORCLEAR':       { name: 'SP8001 Mirror Clear Powder', price: 5.15 },
  'MIRROR CLEAR':      { name: 'SP8001 Mirror Clear Powder', price: 5.15 },

  // ── All In One Liquid (replaces discontinued Cleanser / Sanitizer) ──
  // base 4.826 → B2B 5.8 (200ml) ; base 11.792 → B2B 14.2 (500ml)
  'CLEANSER':                { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'CLEANSER 200':            { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'CLEANSER 200ML':          { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'CLEANSER 200 ML':         { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'SANITIZER':               { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'SANITIZER 200ML':         { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'ALL IN ONE LIQUID':       { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'ALL IN ONE LIQUID 200ML': { name: 'All In One Liquid 200ml -HTF', price: 4.826 },
  'ALL IN ONE LIQUID 500ML': { name: 'All In One Liquid 500ml -HTF', price: 11.792 },
  // Unnamed "2026 NEW" consumables line stored in orders = All In One Liquid 200ml
  '2026-NEW-NEW-CONSUMABLES-200': { name: 'All In One Liquid 200ml -HTF', price: 4.826 },

  // ── Classic Base Coat ──────────────────────────────────────────────────────────────
  // base 10.48 → B2B 12.6
  'CLASSICBC':         { name: 'Base Coat 15ml -HTF', price: 10.48 },
  'CLASSIC BASE COAT': { name: 'Base Coat 15ml -HTF', price: 10.48 },

  // ── FLEXI Soak Off Nail Tips (not in b2b-price-list.json) ───────────────────────────
  // base 6.00 → B2B 7.2 — cover space / dash / GIUP-prefixed tile-key variants
  'FLEXI SHORT SQUARE':      { name: 'FLEXI Soak Off Nail Tips Medium Square -2025', price: 6.00 },
  'FLEXI-SHORT-SQUARE':      { name: 'FLEXI Soak Off Nail Tips Medium Square -2025', price: 6.00 },
  'GIUP FLEXI SHORT SQUARE': { name: 'FLEXI Soak Off Nail Tips Medium Square -2025', price: 6.00 },
  'FLEXI LONG ALMOND':       { name: 'FLEXI Soak Off Nail Tips Long Almond -2025',   price: 6.00 },
  'FLEXI-LONG-ALMOND':       { name: 'FLEXI Soak Off Nail Tips Long Almond -2025',   price: 6.00 },
  'GIUP FLEXI LONG ALMOND':  { name: 'FLEXI Soak Off Nail Tips Long Almond -2025',   price: 6.00 },
  'FLEXI SHORT ALMOND':      { name: 'FLEXI Soak Off Nail Tips Short Almond -2025',  price: 6.00 },
  'FLEXI-SHORT-ALMOND':      { name: 'FLEXI Soak Off Nail Tips Short Almond -2025',  price: 6.00 },
  'GIUP FLEXI SHORT ALMOND': { name: 'FLEXI Soak Off Nail Tips Short Almond -2025',  price: 6.00 },

  // ── GIUP-200 Gel Polish (Glitters) ────────────────────────────────────────────────
  // base 7.41 → B2B 8.9 (same as standard gel polish)
  'GIUP-200':          { name: 'GIUP-200 Gel Polish -HTF', price: 7.41 },
  'GIUP 200':          { name: 'GIUP-200 Gel Polish -HTF', price: 7.41 },

  // ── GIUP-70 series + GIUP-71 Gel Polish (Blue solid gel polish) ─────────────────────
  // base 7.41 → B2B 8.9 (standard gel polish)
  // Orders store the sub-dashed form "GIUP-70-N" / "GIUP 70 N", but the price list keys
  // this series by concatenated code ("705 Hang Ten -HTF" → map key "705"), so "70 5" never
  // matches "705". Every 70-1…70-8 shade needs an explicit override key here.
  'GIUP-70-1':         { name: 'GIUP-70-1 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 1':         { name: 'GIUP-70-1 Gel Polish -HTF', price: 7.41 },
  'GIUP-70-2':         { name: 'GIUP-70-2 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 2':         { name: 'GIUP-70-2 Gel Polish -HTF', price: 7.41 },
  'GIUP-70-3':         { name: 'GIUP-70-3 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 3':         { name: 'GIUP-70-3 Gel Polish -HTF', price: 7.41 },
  'GIUP-70-4':         { name: 'GIUP-70-4 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 4':         { name: 'GIUP-70-4 Gel Polish -HTF', price: 7.41 },
  'GIUP-70-5':         { name: 'GIUP-70-5 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 5':         { name: 'GIUP-70-5 Gel Polish -HTF', price: 7.41 },
  'GIUP-70-6':         { name: 'GIUP-70-6 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 6':         { name: 'GIUP-70-6 Gel Polish -HTF', price: 7.41 },
  'GIUP-70-7':         { name: 'GIUP-70-7 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 7':         { name: 'GIUP-70-7 Gel Polish -HTF', price: 7.41 },
  'GIUP-70-8':         { name: 'GIUP-70-8 Gel Polish -HTF', price: 7.41 },
  'GIUP 70 8':         { name: 'GIUP-70-8 Gel Polish -HTF', price: 7.41 },
  'GIUP-71':           { name: 'GIUP-71 Gel Polish -HTF', price: 7.41 },
  'GIUP 71':           { name: 'GIUP-71 Gel Polish -HTF', price: 7.41 },

  // ── Image/marketing assets — handled by hero.image regex in resolver, no keys needed ──

  // ── Mirror Powder Top Coat (2026 new listing) ──────────────────────────────────────
  // base 8.25 → B2B 9.9
  '2026-NEW-MIRROR-POWDER-TOP-COAT': { name: 'Mirror Powder Top Coat -HTF', price: 8.25 },
  'MIRROR POWDER TOP COAT':          { name: 'Mirror Powder Top Coat -HTF', price: 8.25 },
  'MIRRORPOWDERTOPCOAT':             { name: 'Mirror Powder Top Coat -HTF', price: 8.25 },
}
// ────────────────────────────────────────────────────────────────────────────────────────────

// Strips measurement units, variant suffixes and filler descriptor words from a price-list
// product name to produce a shorter "content key" that can match loosely-stored order item
// names (e.g. "Sugary Glitter pigment 3gr 01 -HTF" → "SUGARY GLITTER 01").
function simplifyProductNameForIndex(name) {
  const upper = normalizeAdminSkuToken(name)
  return upper
    .replace(/\s*-?\s*(HTF|HTE|HEMA[- ]FREE|NEW|-2025|2025)\s*$/i, '') // strip variant suffix
    .replace(/\b\d+\s*(ML|GR|G|MG|KG|L|S)\b/g, '')                     // strip measurements (100ml, 30gr, 1000s)
    .replace(/\b(BRUSH|SPATULA|PIGMENT|SYNTHOGEL|SYNTHOLIQUID|AND|OF|COLOR|COLOUR)\b/g, '') // strip filler words
    .replace(/-/g, ' ')       // normalize dashes (9-11 → 9 11)
    .replace(/\s+/g, ' ')
    .trim()
}

function buildOrderPriceLookupMap(items = []) {
  const map = new Map()
  const setIfMissing = (key, entry) => {
    if (!key || map.has(key)) return
    map.set(key, entry)
  }

  items.forEach(({ name, sku, price }) => {
    const adjustedBasePrice = getAdjustedB2bBasePrice(name, sku, price)
    if (adjustedBasePrice == null) return

    const unitPrice = Math.ceil(adjustedBasePrice * B2B_PRICE_MULTIPLIER * 10) / 10
    const entry = {
      name: String(name || '').trim(),
      sku: normalizeAdminSkuToken(sku || name || ''),
      unitPrice,
    }

    setIfMissing(normalizeAdminSkuToken(sku), entry)
    setIfMissing(normalizeAdminSkuToken(name), entry)
    setIfMissing(normalizeAdminNameToken(name), entry)

    const bobBiabAlias = buildBrushOnBuilderBiabAlias(name)
    if (bobBiabAlias) {
      setIfMissing(bobBiabAlias, entry)
      setIfMissing(`${bobBiabAlias} 1`, entry)
    }

    const numberPrefix = String(name || '').trim().match(/^(\d+[A-Z]?)\s/)
    if (numberPrefix) {
      const n = numberPrefix[1]
      setIfMissing(normalizeAdminSkuToken(n), entry)
      setIfMissing(normalizeAdminSkuToken(n.replace(/^0+(\d)/, '$1')), entry)
      setIfMissing(normalizeAdminSkuToken(n.padStart(2, '0')), entry)
      setIfMissing(normalizeAdminSkuToken(`GIUP ${n}`), entry)
      setIfMissing(normalizeAdminSkuToken(`GIUP ${n.replace(/^0+(\d)/, '$1')}`), entry)
      setIfMissing(normalizeAdminSkuToken(`GIUP ${n.padStart(2, '0')}`), entry)
    }

    // Index embedded alphanumeric series tokens so GIUP-prefixed order SKUs
    // like "GIUP C01" or "GIUP ODA01" resolve from names containing #C01/#ODA01.
    const embeddedSeriesMatches = [...normalizeAdminSkuToken(name).matchAll(/\b([A-Z]{1,5})(\d{1,4}[A-Z]?)\b/g)]
    for (const match of embeddedSeriesMatches) {
      const series = match[1]
      const num = match[2]
      const compact = `${series}${num}`
      const spaced = `${series} ${num}`
      setIfMissing(normalizeAdminSkuToken(compact), entry)
      setIfMissing(normalizeAdminSkuToken(spaced), entry)
      setIfMissing(normalizeAdminSkuToken(`GIUP ${compact}`), entry)
      setIfMissing(normalizeAdminSkuToken(`GIUP ${spaced}`), entry)
    }

    // Also index by the extracted short SKU token from the full product name.
    // This allows order items stored as "SH07" or "STF 01" to match price list
    // entries like "Shimmer Collection #SH07 -HTF" or "Shimmer Top Fairy #STF 01 -HTF".
    const shortToken = extractOrderItemSkuToken(name)
    if (shortToken) {
      setIfMissing(shortToken, entry)
      // Also add compact (no-space) variant so "SH07" and "SH 07" both hit the same entry
      const compact = normalizeAdminSkuToken(shortToken.replace(/\s+/g, ''))
      if (compact !== shortToken) setIfMissing(compact, entry)
    }

    // Also index by "WORD NUMBER" prefix for products like "Polygel 2 Brush and Spatula..."
    // so that order items stored as "POLYGEL 2" can find the price.
    const wordNumPrefix = normalizeAdminSkuToken(name).match(/^([A-Z][A-Z0-9]{1,})\s+(\d{1,4})\b/)
    if (wordNumPrefix) {
      setIfMissing(`${wordNumPrefix[1]} ${wordNumPrefix[2]}`, entry)
    }

    // ── Simplified-name indexing for loose-name matching ───────────────────────────────
    const simplified = simplifyProductNameForIndex(name)
    if (simplified && simplified !== normalizeAdminSkuToken(name)) {
      setIfMissing(simplified, entry)

      // For names starting with a single-letter + 3-4 digit code (e.g. "N008 If The Shoe...")
      // also index under just that short code so "GIUP N008" → strip GIUP → "N008" hits it.
      const nSeriesMatch = simplified.match(/^([A-Z]\d{3,4})\b/)
      if (nSeriesMatch) setIfMissing(nSeriesMatch[1], entry)

      // For names with a leading product code (SP8001, TR01, CM12 etc.) also add the name
      // without the code so "SP8001 Mirror Clear Powder" → "MIRROR CLEAR" is findable.
      const withoutLeadingCode = simplified.replace(/^[A-Z]{1,4}\d{3,5}\s*/, '').trim()
      if (withoutLeadingCode && withoutLeadingCode !== simplified) setIfMissing(withoutLeadingCode, entry)
    }

    // ── Cuticle oil word-reorder ─────────────────────────────────────────────────────────
    // Price list: "Cooling Coconut Cuticle Oil 100ml" → stored as "cuticle oil coconut".
    // Extract the flavor noun and index as "CUTICLE OIL [FLAVOR]".
    if (simplified.includes('CUTICLE') && simplified.includes('OIL')) {
      const flavorWord = simplified
        .replace(/\bCUTICLE\b/g, '').replace(/\bOIL\b/g, '')
        .replace(/\b(COOLING|CHILLED|PERKY|SATIN|WHITE|RICH)\b/g, '')
        .replace(/\s+/g, ' ').trim()
      if (flavorWord) setIfMissing(`CUTICLE OIL ${flavorWord}`, entry)
    }
  })

  // Apply shared alias table: for each group, look up the target name in the map
  // and register all alternate codes pointing to the same entry.
  for (const { codes, target } of PRODUCT_ALIAS_GROUPS) {
    const entry = map.get(normalizeAdminSkuToken(target)) ||
                  map.get(normalizeAdminNameToken(target))
    if (!entry) continue
    for (const c of codes) {
      setIfMissing(normalizeAdminSkuToken(c), entry)
    }
  }

  return map
}

const ADMIN_TIER_PRICE_MULTIPLIERS = {
  authority: 0.22,
  professional: 0.37,
  country: 0.264,
  sales: 0.85,
}

function getTierMultiplier(tier) {
  const normalized = String(tier || '').trim().toLowerCase()
  return ADMIN_TIER_PRICE_MULTIPLIERS[normalized] ?? 1.0
}

// Returns the authority per-item override multiplier if a rule matches name/sku, else null.
function getAuthorityItemMultiplier(name, sku, rules) {
  if (!rules?.length) return null
  const n = String(name || '').toLowerCase()
  const s = String(sku || '').toLowerCase()
  for (const rule of rules) {
    if (rule.patterns?.some(p => n.includes(String(p).toLowerCase()) || s.includes(String(p).toLowerCase()))) {
      return rule.multiplier
    }
  }
  return null
}

// Returns the effective per-item multiplier for a given order row and item.
// For authority orders created on or after effective_from, per-item overrides apply.
// All other tiers and older orders use the flat tier multiplier.
function getEffectiveItemMultiplier(tier, orderCreatedAt, itemName, itemSku, authorityOverrides) {
  const normalizedTier = String(tier || '').trim().toLowerCase()
  const base = getTierMultiplier(normalizedTier)
  if (normalizedTier !== 'authority' || !authorityOverrides?.rules?.length) return base
  const effectiveFrom = authorityOverrides?.effective_from
  if (effectiveFrom && orderCreatedAt && new Date(orderCreatedAt) < new Date(effectiveFrom)) return base
  return getAuthorityItemMultiplier(itemName, itemSku, authorityOverrides.rules) ?? base
}

// Delegates to resolveOrderItemPriceEntry so the UI uses the same full lookup logic
// (override map + simplified name + digit-strip) as the export functions.
function resolveOrderItemUnitPrice(item, priceLookupMap, tierMultiplier = 1.0) {
  return resolveOrderItemPriceEntry(item, priceLookupMap, tierMultiplier).unitPrice
}

// Resolves both unit price AND the canonical Zoho item name (includes -HTF suffix etc.)
// from the price list. Returns { unitPrice, resolvedName } where resolvedName is the
// full price-list name when a match is found, or null when no match.
function resolveOrderItemPriceEntry(item, priceLookupMap, tierMultiplier = 1.0) {
  if (!priceLookupMap && (!item?.sku && !item?.name)) {
    return { unitPrice: null, resolvedName: null, resolvedSku: null }
  }

  const sku = normalizeAdminSkuToken(item?.sku)
  const name = String(item?.name || '').trim()
  const nameNorm = normalizeAdminSkuToken(name)
  const extractedSkuFromName = extractOrderItemSkuToken(name)
  const extractedSkuFromSku = extractOrderItemSkuToken(sku)
  // Strip year+NEW campaign prefixes (e.g. "2026-NEW-...") before lookup.
  const skuWithoutCampaignPrefix = sku.replace(/^\d{4}[-\s]*NEW[-\s]*/i, '').trim()

  // Skip catalog hero/section image filenames — these are image assets, not products.
  if (/\.hero\.image|hero\.image\b/i.test(name) || /\.hero\.image|hero\.image\b/i.test(sku)) {
    return { unitPrice: null, resolvedName: `${name} (image — not a product)`, resolvedSku: null, isImageAsset: true }
  }

  // Check manual override map first (items not in b2b-price-list.json)
  for (const key of [sku, nameNorm, extractedSkuFromSku, extractedSkuFromName, skuWithoutCampaignPrefix]) {
    if (!key) continue
    const override = SKU_OVERRIDE_MAP[key]
    if (override) {
      const canonicalLookup =
        priceLookupMap?.get(normalizeAdminSkuToken(override.name || '')) ||
        priceLookupMap?.get(normalizeAdminNameToken(override.name || ''))
      const derivedSku =
        normalizeAdminSkuToken(item?.sku || '') ||
        normalizeAdminSkuToken(canonicalLookup?.sku || '') ||
        normalizeAdminSkuToken(override.name || '')
      const baseUnitPrice = override.price != null
        ? Math.ceil(override.price * 1.2 * 10) / 10
        : null
      return {
        unitPrice: baseUnitPrice != null ? Math.round(baseUnitPrice * tierMultiplier * 100) / 100 : null,
        resolvedName: override.name || null,
        resolvedSku: derivedSku || null,
      }
    }
  }

  if (!priceLookupMap || !priceLookupMap.size) {
    return { unitPrice: null, resolvedName: null, resolvedSku: null }
  }

  const candidates = [
    sku,
    nameNorm,
    extractedSkuFromSku,
    extractedSkuFromName,
    skuWithoutCampaignPrefix,
    normalizeAdminNameToken(name),
    // Some stored colour-series SKUs are saved as "GIUP-COL-01"; strip the
    // series label so they can fall through to the numeric shade key ("01").
    sku.replace(/^GIUP[\s-]*(?:COL(?:OR|OUR)?)[\s-]*/i, '').trim(),
    // Strip GIUP prefix from SKU: "GIUP 01" → "01", "GIUP N008" → "N008", "GIUP 8E" → "8E"
    sku.replace(/^GIUP\s*/i, '').trim(),
    nameNorm.replace(/^GIUP[\s-]*(?:COL(?:OR|OUR)?)[\s-]*/i, '').trim(),
    // Simplified version of name: strips measurements, filler words, normalizes dashes
    simplifyProductNameForIndex(name),
    // Strip 3–5 digit shade numbers from name: "LINE IT UP 0002 WHITE" → "LINE IT UP WHITE"
    nameNorm.replace(/\b\d{3,5}\b/g, '').replace(/\s+/g, ' ').trim(),
    // Strip duplicate suffixes from display names: "... SKY SPRINKLE (1)" → "... SKY SPRINKLE"
    nameNorm.replace(/\s+\d+$/, '').trim(),
  ].filter(Boolean)

  // Deduplicate while preserving order
  const seen = new Set()
  const uniqueCandidates = candidates.filter(c => { if (seen.has(c)) return false; seen.add(c); return true })

  for (const key of uniqueCandidates) {
    const hit = priceLookupMap.get(key)
    if (hit?.unitPrice != null) {
      return {
        unitPrice: Math.round(hit.unitPrice * tierMultiplier * 100) / 100,
        resolvedName: hit.name || null,
        resolvedSku: hit.sku || null,
      }
    }
  }

  const compactSkuMatch = sku.match(/^([A-Z]{2,6})\s*(\d{1,4}[A-Z]?)$/)
  if (compactSkuMatch) {
    const key = `${compactSkuMatch[1]} ${compactSkuMatch[2]}`
    const hit = priceLookupMap.get(key)
    if (hit?.unitPrice != null) {
      return {
        unitPrice: Math.round(hit.unitPrice * tierMultiplier * 100) / 100,
        resolvedName: hit.name || null,
        resolvedSku: hit.sku || null,
      }
    }
  }

  return { unitPrice: null, resolvedName: null, resolvedSku: null }
}

function buildOrderCsvPayload(row, parsedItems, priceLookupMap, tier, authorityOverrides) {
  const csvEsc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const orderId = row?.id ?? '-'
  const orderDate = row?.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : ''
  const customerEmail = row?.customer_email || ''
  const consignee = row?.consignee_name || ''
  const shippingAddress = row?.shipping_address || ''

  let orderTotal = 0
  const lines = parsedItems.map((item, index) => {
    const itemMult = getEffectiveItemMultiplier(tier, row?.created_at, item.name, item.sku, authorityOverrides)
    const { unitPrice, resolvedName, resolvedSku } = resolveOrderItemPriceEntry(item, priceLookupMap, itemMult)
    const lineTotal = unitPrice != null ? unitPrice * item.qty : null
    if (lineTotal != null) orderTotal += lineTotal
    // Use canonical Zoho product name (includes -HTF etc.) when available; fall back to stored name
    const exportName = resolvedName || item.name || `Item ${index + 1}`
    const exportSku = normalizeAdminSkuToken(item.sku || '') || normalizeAdminSkuToken(resolvedSku || '')

    return [
      csvEsc(orderId),
      csvEsc(orderDate),
      csvEsc(customerEmail),
      csvEsc(consignee),
      csvEsc(shippingAddress),
      csvEsc(row?.distributor_tier || 'b2b'),
      csvEsc(exportSku),
      csvEsc(exportName),
      csvEsc(item.qty),
      csvEsc(unitPrice != null ? unitPrice.toFixed(2) : ''),
      csvEsc(lineTotal != null ? lineTotal.toFixed(2) : ''),
      csvEsc(index === parsedItems.length - 1 && orderTotal > 0 ? orderTotal.toFixed(2) : ''),
    ].join(',')
  })

  const header = [
    'Order #',
    'Order Date',
    'Customer Email',
    'Consignee Name',
    'Shipping Address',
    'Pricing Tier',
    'SKU',
    'Item Name',
    'Qty',
    'Unit Price (EUR)',
    'Line Total (EUR)',
    'Order Total (EUR)',
  ].join(',')

  const csv = [header, ...lines].join('\r\n')
  return { csv, orderTotal }
}

function encodeCsvToBase64(csvText = '') {
  const bytes = new TextEncoder().encode(String(csvText || ''))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function OrdersPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [saving, setSaving] = useState(null)
  const [trackingDraft, setTrackingDraft] = useState({})
  const [priceLookupMap, setPriceLookupMap] = useState(new Map())
  const [priceCatalog, setPriceCatalog] = useState([])
  const [isPriceLookupLoaded, setIsPriceLookupLoaded] = useState(false)
  const [authorityOverrides, setAuthorityOverrides] = useState(null)
  const [emailingOrderId, setEmailingOrderId] = useState(null)
  const [emailingAllOrders, setEmailingAllOrders] = useState(false)
  // editing state
  const [editing, setEditing] = useState(null) // order id being edited
  const [editDraft, setEditDraft] = useState({})
  const [itemSearch, setItemSearch] = useState('') // product search inside the order editor

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase
      .from(ORDERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter === 'received') query = query.in('status', ['received', 'pending_approval'])
    else if (filter === 'acknowledged_received') query = query.in('status', ['acknowledged_received', 'submitted'])
    else if (filter === 'in_progress') query = query.in('status', ['in_progress', 'processing'])
    else if (filter !== 'all') query = query.eq('status', filter)
    const { data, error: err } = await query
    setLoading(false)
    if (err) { setError(err.message); return }
    const orderRows = Array.isArray(data) ? data : []
    if (!orderRows.length) {
      setRows([])
      return
    }

    // Enrich order rows with the live distributor tier from the registration,
    // and auto-heal stale tier values stored on the order rows themselves.
    const registrationIds = [...new Set(
      orderRows
        .map((row) => String(row?.registration_id || '').trim())
        .filter(Boolean),
    )]
    const customerEmails = [...new Set(
      orderRows
        .map((row) => String(row?.customer_email || '').trim().toLowerCase())
        .filter((email) => email && !/[,()]/.test(email)),
    )]

    const registrationById = new Map()
    const registrationByEmail = new Map()
    const indexRegistration = (reg) => {
      const idKey = String(reg?.id || '').trim()
      if (idKey && !registrationById.has(idKey)) registrationById.set(idKey, reg)
      const contactEmailKey = String(reg?.contact_email || '').trim().toLowerCase()
      if (contactEmailKey && !registrationByEmail.has(contactEmailKey)) registrationByEmail.set(contactEmailKey, reg)
    }

    // NOTE: b2b_registrations has NO customer_email column — selecting or filtering
    // on it makes the entire PostgREST query fail, so only contact_email is used here.
    if (registrationIds.length > 0) {
      const { data: regsById } = await supabase
        .from(REGISTRATIONS_TABLE)
        .select('id, contact_email, distributor_tier, prices_allocated, notes')
        .in('id', registrationIds)
      ;(regsById || []).forEach(indexRegistration)
    }

    if (customerEmails.length > 0) {
      // ilike gives a case-insensitive exact match per email.
      const { data: regsByContactEmail } = await supabase
        .from(REGISTRATIONS_TABLE)
        .select('id, contact_email, distributor_tier, prices_allocated, notes')
        .or(customerEmails.map((email) => `contact_email.ilike.${email}`).join(','))
      ;(regsByContactEmail || []).forEach(indexRegistration)
    }

    const staleTierFixes = []
    const staleStatusFixes = []
    const mergedRows = orderRows.map((row) => {
      const idKey = String(row?.registration_id || '').trim()
      const emailKey = String(row?.customer_email || '').trim().toLowerCase()
      const reg = (idKey && registrationById.get(idKey)) || (emailKey && registrationByEmail.get(emailKey)) || null
      const orderRef = String(row?.order_ref || '').trim().toUpperCase()
      const source = String(row?.source || '').trim().toLowerCase()
      const wasReinstated = source === 'country_referral_checkout' || orderRef.startsWith('REF-')
      if (filter === 'received' && row?.status === 'pending_approval' && !wasReinstated) {
        return null
      }
      if (!reg) {
        return (filter === 'received' && row?.status === 'pending_approval' && wasReinstated)
          ? { ...row, status: 'received' }
          : row
      }

      const regTier = String(reg.distributor_tier || '').trim().toLowerCase()
      const rowTier = String(row?.distributor_tier || '').trim().toLowerCase()
      if (regTier && regTier !== rowTier && row?.id) {
        staleTierFixes.push({ orderId: row.id, tier: regTier })
      }
      if (filter === 'received' && row?.status === 'pending_approval' && wasReinstated && row?.id) {
        staleStatusFixes.push(row.id)
      }

      return {
        ...row,
        status: filter === 'received' && row?.status === 'pending_approval' && wasReinstated
          ? 'received'
          : row.status,
        distributor_tier: reg.distributor_tier || row.distributor_tier || null,
        prices_allocated: typeof reg.prices_allocated === 'boolean' ? reg.prices_allocated : row.prices_allocated,
      }
    }).filter(Boolean)

    setRows(mergedRows)

    // Persist the corrected tier back onto the order rows (fire-and-forget).
    if (staleTierFixes.length > 0) {
      Promise.all(staleTierFixes.map(({ orderId, tier }) => (
        supabase.from(ORDERS_TABLE).update({ distributor_tier: tier }).eq('id', orderId)
      ))).catch(() => {})
    }

    if (staleStatusFixes.length > 0) {
      supabase
        .from(ORDERS_TABLE)
        .update({ status: 'received' })
        .in('id', staleStatusFixes)
        .then(() => {})
        .catch(() => {})
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let mounted = true

    const loadPriceLookup = async () => {
      try {
        const [priceRes, overridesRes] = await Promise.all([
          fetch('/gelitup-content/b2b-price-list.json'),
          fetch('/gelitup-content/authority-price-overrides.json'),
        ])
        if (!priceRes.ok) throw new Error('price list unavailable')
        const payload = await priceRes.json()
        const items = Array.isArray(payload?.items) ? payload.items : []
        const overridesPayload = overridesRes.ok ? await overridesRes.json() : null
        if (!mounted) return
        setPriceLookupMap(buildOrderPriceLookupMap(items))
        setPriceCatalog(items)
        setAuthorityOverrides(overridesPayload || null)
      }
      catch {
        if (!mounted) return
        setPriceLookupMap(new Map())
        setPriceCatalog([])
      }
      finally {
        if (mounted) setIsPriceLookupLoaded(true)
      }
    }

    void loadPriceLookup()
    return () => {
      mounted = false
    }
  }, [])

  const updateOrder = async (id, patch) => {
    setSaving(id)
    const { error: err } = await supabase
      .from(ORDERS_TABLE)
      .update(patch)
      .eq('id', id)
    setSaving(null)
    if (err) { alert(err.message); return false }
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    return true
  }

  const syncDistributorTierByRegistration = async (registrationId, email, tier) => {
    const trimmedRegistrationId = String(registrationId || '').trim()
    const trimmedEmail = String(email || '').trim().toLowerCase()
    const trimmedTier = String(tier || '').trim()

    if (!trimmedTier) {
      return { ok: true, skipped: true }
    }

    const syncPatch = {
      distributor_tier: trimmedTier,
      application_type: 'distributor',
      status: 'approved',
      prices_allocated: true,
      reviewed_at: new Date().toISOString(),
    }

    if (trimmedRegistrationId) {
      const { data, error } = await supabase
        .from(REGISTRATIONS_TABLE)
        .update(syncPatch)
        .eq('id', trimmedRegistrationId)
        .select('id')
      if (error) {
        return { ok: false, message: error.message }
      }
      if (Array.isArray(data) && data.length > 0) {
        return { ok: true }
      }
    }

    if (!trimmedEmail) {
      return { ok: false, message: 'No linked registration or customer email is available to sync the tier.' }
    }

    // b2b_registrations has no customer_email column — match on contact_email only.
    const { data, error } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update(syncPatch)
      .ilike('contact_email', trimmedEmail)
      .select('id')
    if (error) {
      return { ok: false, message: error.message }
    }
    if (Array.isArray(data) && data.length > 0) {
      return { ok: true }
    }

    return { ok: false, message: `No matching distributor registration was found for ${trimmedEmail}.` }
  }

  const deleteOrder = async (id) => {
    if (!window.confirm('Permanently delete this order? This cannot be undone.')) return
    setSaving(id)
    const { error: err } = await supabase
      .from(ORDERS_TABLE)
      .delete()
      .eq('id', id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.filter(r => r.id !== id))
    setExpanded(null)
  }

  const markTrackingPlaced = async (id) => {
    const draft = trackingDraft[id] || {}
    const trackingNumber = (draft.number || '').trim()
    const trackingUrl = (draft.url || '').trim()
    if (!trackingNumber) { alert('Please enter a tracking number before saving tracking details.'); return }
    const row = rows.find(r => r.id === id)
    const ok = await updateOrder(id, { status: 'tracking_placed', tracking_number: trackingNumber, tracking_url: trackingUrl || null })
    if (ok && row) {
      const emailResult = await sendTrackingEmail(row, trackingNumber, trackingUrl)
      if (!emailResult.ok && !emailResult.skipped) {
        alert(`Tracking saved, but the customer email failed to send: ${emailResult.message}`)
      }
    }
  }

  const markAcknowledged = async (id) => {
    await updateOrder(id, { status: 'acknowledged_received' })
  }

  const markInProgress = async (id) => {
    await updateOrder(id, { status: 'in_progress' })
  }

  const markPaymentReceived = async (id) => {
    await updateOrder(id, { status: 'payment_received', payment_confirmed: true })
  }

  const markShipped = async (id) => {
    await updateOrder(id, { status: 'shipped' })
  }

  const togglePaymentConfirmed = async (id, currentValue) => {
    await updateOrder(id, { payment_confirmed: !currentValue })
  }

  const reinstateOrder = async (id) => {
    await updateOrder(id, { status: 'received' })
  }

  const resolveRawItems = (row) => {
    if (Array.isArray(row?.items)) return row.items
    if (typeof row?.items === 'string') {
      try { return JSON.parse(row.items) } catch { /* fall through */ }
    }
    return []
  }

  const downloadOrderCsv = (row) => {
    try {
      const parsedItems = resolveRawItems(row).map((item, index) => parseOrderItemEntry(item, index))
      // Always generate the CSV — if no items, generate a header-only row with order metadata
      if (!parsedItems.length) {
        const csvEsc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
        const header = 'Order #,Order Date,Customer Email,Consignee Name,Shipping Address,Pricing Tier,SKU,Item Name,Qty,Unit Price (EUR),Line Total (EUR),Order Total (EUR)'
        const orderDate = row?.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : ''
        const dataRow = [csvEsc(row?.id), csvEsc(orderDate), csvEsc(row?.customer_email || ''), csvEsc(row?.consignee_name || ''), csvEsc(row?.shipping_address || ''), csvEsc(row?.distributor_tier || 'b2b'), '', '', '', '', '', ''].join(',')
        const csv = [header, dataRow].join('\r\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        triggerFileDownload(blob, `order-${row?.id || 'unknown'}.csv`)
        return
      }

      const { csv } = buildOrderCsvPayload(row, parsedItems, priceLookupMap, row?.distributor_tier, authorityOverrides)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      triggerFileDownload(blob, `order-${row?.id || 'unknown'}.csv`)
    } catch (err) {
      alert(`CSV download failed: ${err?.message || String(err)}\n\nOpen browser console (F12) for details.`)
      console.error('[downloadOrderCsv]', err)
    }
  }

  const downloadOrderXlsx = (row) => {
    try {
      const rawItems = resolveRawItems(row)

      // Sheet 1: Order metadata
      const meta = [{
        'Order #': row?.id ?? '',
        'Date': row?.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : '',
        'Status': row?.status || '',
        'Customer Email': row?.customer_email || '',
        'Consignee Name': row?.consignee_name || '',
        'Phone': row?.consignee_phone || '',
        'Shipping Address': row?.shipping_address || '',
        'Pricing Tier': row?.distributor_tier || 'b2b',
        'Total Units': row?.total_units || 0,
        'Payment Confirmed': row?.payment_confirmed ? 'Yes' : 'No',
        'Tracking #': row?.tracking_number || '',
        'Tracking URL': row?.tracking_url || '',
        'Zoho SO #': row?.zoho_salesorder_number || '',
        'Zoho Invoice #': row?.zoho_invoice_number || '',
        'Source': row?.source || '',
      }]

      // Sheet 2: Items with full raw + resolved data
      let orderTotal = 0
      const itemRows = rawItems.map((item, index) => {
        const parsed = parseOrderItemEntry(item, index)
        const rawSku = typeof item === 'object' && item !== null ? (item.sku || '') : ''
        const rawName = typeof item === 'object' && item !== null ? (item.name || '') : String(item || '')
        const itemMult = getEffectiveItemMultiplier(row?.distributor_tier, row?.created_at, parsed.name, parsed.sku, authorityOverrides)
        const { unitPrice, resolvedName } = resolveOrderItemPriceEntry(parsed, priceLookupMap, itemMult)
        const lineTotal = unitPrice != null ? unitPrice * parsed.qty : null
        if (lineTotal != null) orderTotal += lineTotal
        // Use canonical Zoho product name (includes -HTF etc.) when available; fall back to stored name
        const exportName = resolvedName || rawName || parsed.name
        return {
          'SKU': rawSku || parsed.sku || '',
          'Item Name': exportName,
          'Qty': parsed.qty,
          'Unit Price (EUR)': unitPrice != null ? unitPrice : '',
          'Line Total (EUR)': lineTotal != null ? lineTotal : '',
          'Resolved SKU Token': parsed.sku || '',
        }
      })
      if (itemRows.length > 0 && orderTotal > 0) {
        itemRows[itemRows.length - 1]['Order Total (EUR)'] = orderTotal
      }

      const wb = XLSX.utils.book_new()
      // Single sheet: order details block on top, full item list underneath,
      // so the whole order is visible as soon as the file opens.
      const metaEntries = Object.entries(meta[0])
      const aoa = [
        ...metaEntries.map(([label, value]) => [label, value]),
        [],
        ['SKU', 'Item Name', 'Qty', 'Unit Price (EUR)', 'Line Total (EUR)'],
      ]
      if (itemRows.length) {
        itemRows.forEach((item) => {
          aoa.push([
            item['SKU'],
            item['Item Name'],
            item['Qty'],
            item['Unit Price (EUR)'],
            item['Line Total (EUR)'],
          ])
        })
        aoa.push([])
        aoa.push(['', 'ORDER TOTAL (EUR)', '', '', orderTotal > 0 ? orderTotal : ''])
      } else {
        aoa.push(['No items stored for this order'])
      }
      const sheet = XLSX.utils.aoa_to_sheet(aoa)
      sheet['!cols'] = [{ wch: 22 }, { wch: 60 }, { wch: 8 }, { wch: 16 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(wb, sheet, 'Order')
      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      triggerFileDownload(blob, `order-${row?.id || 'unknown'}.xlsx`)
    } catch (err) {
      alert(`XLSX download failed: ${err?.message || String(err)}\n\nOpen browser console (F12) for details.`)
      console.error('[downloadOrderXlsx]', err)
    }
  }

  const emailOrderCsvToInbox = async (row) => {
    if (!EMAIL_WEBHOOK_URL) {
      alert('Email webhook is not configured. Set VITE_EMAIL_WEBHOOK_URL and retry.')
      return { ok: false, message: 'Email webhook not configured.' }
    }

    const parsedItems = resolveRawItems(row).map((item, index) => parseOrderItemEntry(item, index))
    if (!parsedItems.length) {
      return { ok: false, message: 'Order has no items.' }
    }

    const { csv, orderTotal } = buildOrderCsvPayload(row, parsedItems, priceLookupMap, row?.distributor_tier, authorityOverrides)
    const csvBase64 = encodeCsvToBase64(csv)
    const toEmail = ORDER_INBOX_EMAIL || 'distribution@gelitup.com'
    const subject = `B2B Order #${row.id || '-'} CSV Export`
    const html = `
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;margin:0 0 8px">Order <strong>#${String(row.id || '-')}</strong> CSV export attached for Zoho import.</p>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin:0">Customer: ${String(row.customer_email || '-')}<br/>Units: ${String(row.total_units || 0)}<br/>Estimated total: ${orderTotal > 0 ? `EUR ${orderTotal.toFixed(2)}` : 'Not available'}</p>
    `

    const headers = { 'Content-Type': 'application/json' }
    if (SUPABASE_ANON_KEY) {
      headers.apikey = SUPABASE_ANON_KEY
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
    }

    try {
      const response = await fetch(EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: toEmail,
          subject,
          html,
          attachments: [
            {
              filename: `order-${row.id || 'unknown'}.csv`,
              content: csvBase64,
              contentType: 'text/csv',
            },
          ],
        }),
      })

      const responsePayload = await response.json().catch(() => null)
      if (!response.ok) {
        return { ok: false, message: responsePayload?.error || `HTTP ${response.status}` }
      }

      return { ok: true, message: `Order #${row.id} emailed to ${toEmail}.` }
    }
    catch (err) {
      return { ok: false, message: err?.message || 'Network error while sending email.' }
    }
  }

  const sendTrackingEmail = async (row, trackingNumber, trackingUrl) => {
    const toEmail = row?.customer_email
    if (!toEmail) return { ok: false, skipped: true, message: 'Order has no customer email — tracking email not sent.' }
    if (!EMAIL_WEBHOOK_URL) return { ok: false, skipped: true, message: 'VITE_EMAIL_WEBHOOK_URL is not configured — tracking email not sent.' }

    const subject = `Your GEL.IT.UP order #${row.id || '-'} has shipped`
    const trackingLine = trackingUrl
      ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;margin:0 0 8px"><strong>Tracking number:</strong> ${String(trackingNumber)}<br/><a href="${String(trackingUrl)}" style="color:#7c3aed">Track your parcel →</a></p>`
      : `<p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;margin:0 0 8px"><strong>Tracking number:</strong> ${String(trackingNumber)}</p>`
    const html = `
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;margin:0 0 8px">Hi ${row?.consignee_name || 'there'},</p>
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;margin:0 0 8px">Your order <strong>#${String(row.id || '-')}</strong> is on its way. Here are your tracking details:</p>
      ${trackingLine}
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin:12px 0 0">Questions? Reply to this email or contact us at distribution@gelitup.com.</p>
    `

    const headers = { 'Content-Type': 'application/json' }
    if (SUPABASE_ANON_KEY) {
      headers.apikey = SUPABASE_ANON_KEY
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
    }

    try {
      const response = await fetch(EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ from: FROM_EMAIL, to: toEmail, subject, html }),
      })
      const responsePayload = await response.json().catch(() => null)
      if (!response.ok) {
        return { ok: false, message: responsePayload?.error || `HTTP ${response.status}` }
      }
      return { ok: true, message: `Tracking email sent to ${toEmail}.` }
    }
    catch (err) {
      return { ok: false, message: err?.message || 'Network error while sending tracking email.' }
    }
  }

  const emailAllHistoricalOrdersToInbox = async () => {
    const { data: allOrders, error: allOrdersError } = await supabase
      .from(ORDERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (allOrdersError) {
      alert(`Could not load all orders: ${allOrdersError.message}`)
      return
    }

    const sourceRows = Array.isArray(allOrders) ? allOrders : []
    if (!sourceRows.length) {
      alert('No orders found in the orders table.')
      return
    }

    const ok = window.confirm(`Email CSV attachments for ${sourceRows.length} current and past orders to ${ORDER_INBOX_EMAIL}? This may take several minutes.`)
    if (!ok) return

    setEmailingAllOrders(true)
    let success = 0
    const failures = []

    for (const row of sourceRows) {
      // Keep delivery safely below provider burst limits.
      await new Promise((resolve) => setTimeout(resolve, 550))
      const result = await emailOrderCsvToInbox(row)
      if (result.ok) success += 1
      else failures.push(`#${row.id}: ${result.message}`)
    }

    setEmailingAllOrders(false)
    if (!failures.length) {
      alert(`Done. Emailed ${success} order CSV attachments to ${ORDER_INBOX_EMAIL}.`)
      return
    }

    alert(`Completed with issues. Success: ${success}/${sourceRows.length}. Failures:\n${failures.slice(0, 8).join('\n')}${failures.length > 8 ? `\n...and ${failures.length - 8} more` : ''}`)
  }

  const startEdit = (row) => {
    setEditing(row.id)
    setItemSearch('')
    setEditDraft({
      customer_email: row.customer_email || '',
      consignee_name: row.consignee_name || '',
      consignee_phone: row.consignee_phone || '',
      shipping_address: row.shipping_address || '',
      tracking_number: row.tracking_number || '',
      tracking_url: row.tracking_url || '',
      status: normalizeOrderStatus(row.status),
      distributor_tier: row.distributor_tier || '',
      items: Array.isArray(row.items)
        ? row.items.map((it, index) => {
            // Reuse the shared parser + price-list resolver so SKUs stored as
            // plain strings (or missing from the object) are filled in here too.
            const parsed = parseOrderItemEntry(it, index)
            const resolved = resolveOrderItemPriceEntry(parsed, priceLookupMap, 1.0)
            const sku = String((it && typeof it === 'object' && it.sku) || resolved.resolvedSku || parsed.sku || '').trim()
            const text = String((it && typeof it === 'object' && it.name) || parsed.name || '').trim()
            return { text, sku, qty: Math.max(1, Number(parsed.qty) || 1) }
          })
        : [],
    })
  }

  const openOrderInPortal = (row) => {
    try {
      localStorage.setItem('giup_order_edit_handoff', JSON.stringify({
        orderId: row.id,
        customerEmail: row.customer_email || '',
        registrationId: row.registration_id || null,
        distributorTier: row.distributor_tier || null,
        pricesAllocated: typeof row.prices_allocated === 'boolean' ? row.prices_allocated : null,
        consigneeName: row.consignee_name || '',
        consigneePhone: row.consignee_phone || '',
        shippingAddress: row.shipping_address || '',
        items: Array.isArray(row.items) ? row.items : [],
        savedAt: Date.now(),
      }))
      window.open('/portal/dashboard/catalog', '_blank')
    }
    catch {
      window.alert('Could not open order in portal — localStorage unavailable.')
    }
  }

  const saveEdit = async (row) => {
    const id = row.id
    const previousStatus = normalizeOrderStatus(row.status)
    const items = editDraft.items
      .filter(it => it.text.trim() || it.sku.trim())
      .map(it => ({ name: it.text.trim(), sku: it.sku.trim(), qty: Math.max(1, Number(it.qty) || 1) }))
    const totalUnits = items.reduce((sum, it) => sum + it.qty, 0)
    const trackingNumber = editDraft.tracking_number.trim()
    const trackingUrl = editDraft.tracking_url.trim()
    let nextStatus = normalizeOrderStatus(editDraft.status)
    if (trackingNumber && (nextStatus === 'in_progress' || nextStatus === 'payment_received')) {
      nextStatus = 'tracking_placed'
    }
    if (!trackingNumber && nextStatus === 'tracking_placed') {
      nextStatus = 'payment_received'
    }
    const nextRow = {
      registration_id: row.registration_id || null,
      customer_email: editDraft.customer_email.trim() || null,
      consignee_name: editDraft.consignee_name.trim() || null,
      consignee_phone: editDraft.consignee_phone.trim() || null,
      shipping_address: editDraft.shipping_address.trim() || null,
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
      status: nextStatus,
      items,
      total_units: totalUnits,
      distributor_tier: editDraft.distributor_tier.trim() || null,
    }
    const ok = await updateOrder(id, nextRow)
    if (ok) {
      const tierSync = await syncDistributorTierByRegistration(nextRow.registration_id, nextRow.customer_email, nextRow.distributor_tier)
      if (!tierSync.ok && !tierSync.skipped) {
        alert(`Order saved, but the linked client tier could not be updated: ${tierSync.message}`)
      }
      setEditing(null)
      // Only email when this save is what newly moved the order into "tracking_placed" —
      // avoids re-sending the tracking email on every subsequent unrelated edit.
      if (nextStatus === 'tracking_placed' && previousStatus !== 'tracking_placed' && trackingNumber) {
        const emailResult = await sendTrackingEmail({ ...row, ...nextRow }, trackingNumber, trackingUrl)
        if (!emailResult.ok && !emailResult.skipped) {
          alert(`Order saved, but the customer email failed to send: ${emailResult.message}`)
        }
      }
    }
  }

  const FILTERS = [
    'all',
    'pending_approval',
    'received',
    'acknowledged_received',
    'in_progress',
    'payment_received',
    'tracking_placed',
    'cancellation_requested',
    'shipped',
    'completed',
    'cancelled',
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f === 'cancellation_requested' ? 'Cancel Req.' : f === 'pending_approval' ? 'Pending Approval' : formatOrderStatusLabel(f).replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50">
          ↻ Refresh
        </button>
        <button
          onClick={() => {
            if (!rows.length) { alert('No orders to export.'); return }
            const data = rows.map(r => {
              const items = Array.isArray(r.items) ? r.items : []
              return {
                'Order ID': r.id,
                'Date': r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
                'Status': r.status,
                'Customer Email': r.customer_email || '',
                'Consignee': r.consignee_name || '',
                'Phone': r.consignee_phone || '',
                'Shipping Address': r.shipping_address || '',
                'Total Units': r.total_units,
                'Items': items.map(it => typeof it === 'string' ? it : (it.name || it.sku || JSON.stringify(it))).join('; '),
                'Payment Confirmed': r.payment_confirmed ? 'Yes' : 'No',
                'Tracking #': r.tracking_number || '',
                'Tracking URL': r.tracking_url || '',
                'Zoho SO #': r.zoho_salesorder_number || '',
                'Zoho Invoice #': r.zoho_invoice_number || '',
              }
            })
            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Orders')
            const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
            const xlsxBlob = new Blob([xlsxBuffer], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
            triggerFileDownload(xlsxBlob, `gelitup-orders-${filter}-${new Date().toISOString().slice(0,10)}.xlsx`)
          }}
          disabled={!rows.length}
          className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
        >
          ↓ Export Excel
        </button>
        <button
          onClick={emailAllHistoricalOrdersToInbox}
          disabled={emailingAllOrders}
          className="rounded-full border border-fuchsia-200 px-3 py-1 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-40"
        >
          {emailingAllOrders ? 'Sending CSVs…' : '✉ Email CSVs (All Orders)'}
        </button>
      </div>

      {!isPriceLookupLoaded && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Loading price list for order CSV exports… unit price columns may be temporarily empty.</p>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Could not load orders — RLS policy may be missing.</p>
          <p className="mt-1 text-xs">{error}</p>
          <pre className="mt-2 overflow-x-auto rounded bg-rose-100 p-2 text-xs leading-relaxed">{RLS_HINT_ORDERS}</pre>
        </div>
      )}

      {loading && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}

      {!loading && rows.length === 0 && !error && (
        <p className="py-6 text-center text-sm text-slate-400">
          No {filter === 'all' ? '' : filter + ' '}orders found.
        </p>
      )}

      <ul className="space-y-2">
        {rows.map(row => {
          const items = resolveRawItems(row)
          const draft = trackingDraft[row.id] || {}
          const currentStatus = normalizeOrderStatus(row.status)
          const isShipped = currentStatus === 'shipped'
          const isReceived = currentStatus === 'received'
          const isAcknowledged = currentStatus === 'acknowledged_received'
          const isInProgress = currentStatus === 'in_progress'
          const isPaymentReceived = currentStatus === 'payment_received'
          const isTrackingPlaced = currentStatus === 'tracking_placed'
          const isCancellationRequested = currentStatus === 'cancellation_requested'
          const isPendingApproval = currentStatus === 'pending_approval'
          const isEditing = editing === row.id
          const missingPriceItems = items
            .map((item, i) => parseOrderItemEntry(item, i))
            .filter(parsed => {
              const itemMult = getEffectiveItemMultiplier(row.distributor_tier, row.created_at, parsed.name, parsed.sku, authorityOverrides)
              const resolved = resolveOrderItemPriceEntry(parsed, priceLookupMap, itemMult)
              return resolved.unitPrice == null && !resolved.isImageAsset
            })
          const hasMissingPrices = missingPriceItems.length > 0

          return (
            <li key={row.id} className={`overflow-hidden rounded-xl border bg-white ${hasMissingPrices ? 'border-amber-300' : 'border-slate-200'}`}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => { setExpanded(expanded === row.id ? null : row.id); if (editing === row.id) setEditing(null) }}
              >
                {statusBadge(row.status)}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{row.customer_email || '—'}</span>
                {hasMissingPrices && (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    ⚠ {missingPriceItems.length} no price
                  </span>
                )}
                <span className="shrink-0 text-xs text-slate-400">{row.total_units} units</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtDate(row.created_at)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded === row.id ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {expanded === row.id && (
                <div className="space-y-4 border-t border-slate-100 px-4 py-4">

                  {/* ── VIEW MODE ── */}
                  {!isEditing && (
                    <>
                      <div className="grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
                        <div><span className="font-semibold text-slate-400">Customer</span><br />{row.customer_email || '—'}</div>
                        <div>
                          <span className="font-semibold text-slate-400">Pricing Tier</span><br />
                          {row.distributor_tier ? (
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              row.distributor_tier === 'authority' ? 'bg-fuchsia-100 text-fuchsia-700' :
                              row.distributor_tier === 'professional' ? 'bg-pink-100 text-pink-700' :
                              row.distributor_tier === 'country' ? 'bg-sky-100 text-sky-700' :
                              row.distributor_tier === 'sales' ? 'bg-slate-100 text-slate-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>{row.distributor_tier === 'country' ? 'Level 2 Country' : row.distributor_tier}</span>
                          ) : <span className="text-slate-400">B2B (standard)</span>}
                        </div>
                        <div><span className="font-semibold text-slate-400">Consignee</span><br />{row.consignee_name || '—'}</div>
                        <div><span className="font-semibold text-slate-400">Phone</span><br />{row.consignee_phone || '—'}</div>
                        <div><span className="font-semibold text-slate-400">Payment confirmed</span><br />
                          <span className={row.payment_confirmed ? 'font-semibold text-emerald-600' : 'text-slate-400'}>
                            {row.payment_confirmed ? '✓ Yes' : 'Not yet'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePaymentConfirmed(row.id, row.payment_confirmed)}
                            disabled={saving === row.id}
                            className={`ml-2 rounded px-2 py-0.5 text-[10px] font-semibold transition ${row.payment_confirmed ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} disabled:opacity-40`}
                          >
                            {saving === row.id ? '…' : row.payment_confirmed ? 'Undo' : 'Confirm Payment'}
                          </button>
                        </div>
                        <div className="sm:col-span-2"><span className="font-semibold text-slate-400">Shipping Address</span><br />{row.shipping_address || '—'}</div>
                        {(row.tracking_number || isShipped) && (
                          <>
                            <div><span className="font-semibold text-slate-400">Tracking #</span><br />{row.tracking_number || '—'}</div>
                            <div><span className="font-semibold text-slate-400">Tracking URL</span><br />
                              {row.tracking_url
                                ? <a href={row.tracking_url} target="_blank" rel="noreferrer" className="text-fuchsia-600 hover:underline break-all">{row.tracking_url}</a>
                                : '—'}
                            </div>
                          </>
                        )}
                      </div>

                      {items.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold text-slate-400">Items ({items.length})</p>
                          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
                            {items.map((item, i) => {
                              const parsed = parseOrderItemEntry(item, i)
                              const rawSku = typeof item === 'object' && item !== null ? (item.sku || item.code || '') : ''
                              const itemMult = getEffectiveItemMultiplier(row.distributor_tier, row.created_at, parsed.name, parsed.sku, authorityOverrides)
                              const resolved = resolveOrderItemPriceEntry(parsed, priceLookupMap, itemMult)
                              const unitPrice = resolved.unitPrice
                              const isImageAsset = resolved.isImageAsset
                              const displaySku = normalizeAdminSkuToken(rawSku || parsed.sku || resolved.resolvedSku || '').replace(/\s+IMAGE$/i, '')
                              const skuMissing = !displaySku && !isImageAsset
                              const lineTotal = unitPrice != null ? unitPrice * parsed.qty : null
                              return (
                                <li key={i} className={`flex items-center justify-between px-3 py-2 ${unitPrice == null && !isImageAsset ? 'bg-amber-50' : ''}`}>
                                  <div className="min-w-0">
                                    <p className="truncate text-slate-700">{parsed.name || parsed.rawLabel || 'Unknown product'}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {isImageAsset
                                        ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-400">image asset — not billable</span>
                                        : skuMissing
                                          ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700">⚠ SKU missing — edit to fix</span>
                                          : <span className="font-mono text-[10px] text-slate-500">{displaySku}</span>
                                      }
                                      {!isImageAsset && (unitPrice != null
                                        ? <span className="text-[10px] text-slate-500">€{unitPrice.toFixed(2)} each</span>
                                        : <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">⚠ no price</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-slate-900">×{parsed.qty}</p>
                                    {lineTotal != null && (
                                      <p className="text-[11px] text-slate-500">€{lineTotal.toFixed(2)}</p>
                                    )}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                          {(() => {
                            let total = 0
                            let unpriced = 0
                            items.forEach((item, i) => {
                              const parsed = parseOrderItemEntry(item, i)
                              const itemMult = getEffectiveItemMultiplier(row.distributor_tier, row.created_at, parsed.name, parsed.sku, authorityOverrides)
                              const resolved = resolveOrderItemPriceEntry(parsed, priceLookupMap, itemMult)
                              if (resolved.isImageAsset) return
                              if (resolved.unitPrice != null) total += resolved.unitPrice * parsed.qty
                              else unpriced += 1
                            })
                            return (
                              <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                <span className="font-semibold text-slate-500">
                                  Order total{unpriced > 0 && <span className="ml-2 font-normal text-amber-600">({unpriced} item{unpriced === 1 ? '' : 's'} without price not included)</span>}
                                </span>
                                <span className="text-sm font-bold text-slate-900">€{total.toFixed(2)}</span>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Download/email buttons — always visible regardless of items */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => downloadOrderXlsx(row)}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          ↓ Download Order XLSX
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadOrderCsv(row)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          ↓ Download Order CSV
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setEmailingOrderId(row.id)
                            const result = await emailOrderCsvToInbox(row)
                            setEmailingOrderId(null)
                            if (!result.ok) {
                              alert(`Could not email order CSV: ${result.message}`)
                              return
                            }
                            alert(result.message)
                          }}
                          disabled={emailingOrderId === row.id}
                          className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100 disabled:opacity-50"
                        >
                          {emailingOrderId === row.id ? 'Sending…' : '✉ Email CSV to Inbox'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── EDIT MODE ── */}
                  {isEditing && (
                    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                      <p className="text-xs font-semibold text-amber-700">Editing Order #{row.id}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Customer Email</label>
                          <input type="email" value={editDraft.customer_email} onChange={e => setEditDraft(d => ({ ...d, customer_email: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Consignee Name</label>
                          <input type="text" value={editDraft.consignee_name} onChange={e => setEditDraft(d => ({ ...d, consignee_name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                          <input type="text" value={editDraft.consignee_phone} onChange={e => setEditDraft(d => ({ ...d, consignee_phone: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                          <select value={editDraft.status} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200">
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Pricing Tier</label>
                          <select value={editDraft.distributor_tier} onChange={e => setEditDraft(d => ({ ...d, distributor_tier: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200">
                            <option value="">B2B (standard)</option>
                            <option value="sales">Sales</option>
                            <option value="professional">Professional</option>
                            <option value="country">Level 2 Country</option>
                            <option value="authority">Authority</option>
                          </select>
                          <p className="mt-1 text-[10px] text-slate-500">This also updates the linked distributor registration tier when a matching email is found.</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-slate-600">Shipping Address</label>
                          <textarea value={editDraft.shipping_address} onChange={e => setEditDraft(d => ({ ...d, shipping_address: e.target.value }))} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tracking Number</label>
                          <input type="text" value={editDraft.tracking_number} onChange={e => setEditDraft(d => ({ ...d, tracking_number: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tracking URL</label>
                          <input type="url" value={editDraft.tracking_url} onChange={e => setEditDraft(d => ({ ...d, tracking_url: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        </div>
                      </div>

                      {/* Editable items list */}
                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-600">Items</p>
                        <ul className="space-y-1">
                          {editDraft.items.map((it, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={it.text}
                                onChange={e => {
                                  const updated = [...editDraft.items]
                                  updated[i] = { ...updated[i], text: e.target.value }
                                  setEditDraft(d => ({ ...d, items: updated }))
                                }}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
                                placeholder="Product name"
                              />
                              <input
                                type="text"
                                value={it.sku}
                                onChange={e => {
                                  const updated = [...editDraft.items]
                                  updated[i] = { ...updated[i], sku: e.target.value }
                                  setEditDraft(d => ({ ...d, items: updated }))
                                }}
                                className="w-24 shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
                                placeholder="SKU"
                              />
                              <input
                                type="number"
                                min="1"
                                value={it.qty}
                                onChange={e => {
                                  const updated = [...editDraft.items]
                                  updated[i] = { ...updated[i], qty: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                  setEditDraft(d => ({ ...d, items: updated }))
                                }}
                                onFocus={e => e.target.select()}
                                className="w-16 shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-200"
                              />
                              <button
                                type="button"
                                onClick={() => setEditDraft(d => ({ ...d, items: d.items.filter((_, j) => j !== i) }))}
                                className="shrink-0 rounded px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
                              >✕</button>
                            </li>
                          ))}
                        </ul>
                        {/* Product search — pick items straight from the price list */}
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">Add product from price list</p>
                          <input
                            type="text"
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                            placeholder="Search by name or SKU…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
                          />
                          {itemSearch.trim().length >= 2 && (() => {
                            // Normalize away dashes/spacing so SKUs like "GIUP-SBCIMF" and
                            // "GIUP SBCIMF" match price-list entries regardless of formatting.
                            const normalize = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '')
                            const terms = itemSearch.trim().toLowerCase().split(/\s+/)
                            const normQuery = normalize(itemSearch)
                            let matches = priceCatalog
                              .filter(p => {
                                const hay = `${p.name || ''} ${p.sku || ''}`.toLowerCase()
                                const normHay = normalize(hay)
                                return terms.every(t => hay.includes(t)) || (normQuery && normHay.includes(normQuery))
                              })
                              .slice(0, 12)
                            // Fall back to the same SKU resolver used for pricing, so aliases
                            // and short codes (e.g. "GIUP-SBCIMF", "SH07") still find the product.
                            if (!matches.length) {
                              const q = itemSearch.trim()
                              const resolved = resolveOrderItemPriceEntry({ sku: q, name: q }, priceLookupMap, 1.0)
                              if (resolved?.resolvedName) {
                                const hit = priceCatalog.find(p => (p.name || '') === resolved.resolvedName)
                                matches = [hit || { name: resolved.resolvedName, sku: resolved.resolvedSku || '', price: null }]
                              }
                            }
                            if (!matches.length) return <p className="mt-1 px-1 text-[11px] text-slate-400">No products match “{itemSearch.trim()}”.</p>
                            return (
                              <ul className="mt-1 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                                {matches.map((p, idx) => (
                                  <li key={`${p.sku || p.name}-${idx}`}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditDraft(d => ({ ...d, items: [...d.items, { text: p.name || p.sku || '', sku: p.sku || '', qty: 1 }] }))
                                        setItemSearch('')
                                      }}
                                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-amber-50"
                                    >
                                      <span className="min-w-0 flex-1 truncate text-slate-700">{p.name || p.sku}</span>
                                      <span className="shrink-0 font-mono text-[10px] text-slate-400">{p.sku}</span>
                                      {Number.isFinite(Number(p.price)) && (
                                        <span className="shrink-0 text-[11px] font-semibold text-slate-500">€{Number(p.price).toFixed(2)}</span>
                                      )}
                                      <span className="shrink-0 text-emerald-600">＋</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditDraft(d => ({ ...d, items: [...d.items, { text: '', sku: '', qty: 1 }] }))}
                          className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                        >+ Add blank item</button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => saveEdit(row)}
                          disabled={saving === row.id}
                          className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                        >{saving === row.id ? 'Saving…' : '✓ Save Changes'}</button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* ── Pending Approval (below minimum order) ── */}
                  {isPendingApproval && !isEditing && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-violet-700">⏳ Below Minimum Order — Awaiting Approval</p>
                      <p className="text-xs text-slate-600">This order is below the €100 NET minimum. Approve to accept and process it, or reject to cancel.</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateOrder(row.id, { status: 'received' })}
                          disabled={saving === row.id}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {saving === row.id ? 'Saving…' : '✓ Approve Order'}
                        </button>
                        <button
                          onClick={() => updateOrder(row.id, { status: 'cancelled' })}
                          disabled={saving === row.id}
                          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {saving === row.id ? 'Saving…' : '✕ Reject Order'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Cancellation Request ── */}
                  {isCancellationRequested && !isEditing && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-orange-700">⚠ Cancellation Requested by Customer</p>
                      <p className="text-xs text-slate-600">The customer has requested to cancel this order. Confirm to cancel it, or reject to keep it active.</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateOrder(row.id, { status: 'cancelled' })}
                          disabled={saving === row.id}
                          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {saving === row.id ? 'Saving…' : '✕ Confirm Cancellation'}
                        </button>
                        <button
                          onClick={() => updateOrder(row.id, { status: 'acknowledged_received' })}
                          disabled={saving === row.id}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          ↩ Reject — Keep Order Active
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Step 1: Acknowledge as received ── */}
                  {isReceived && !isEditing && (
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-cyan-700">Step 1: Acknowledge as Received</p>
                      <button
                        onClick={() => markAcknowledged(row.id)}
                        disabled={saving === row.id}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-40"
                      >
                        {saving === row.id ? 'Saving…' : '→ Acknowledge'}
                      </button>
                    </div>
                  )}

                  {/* ── Step 2: In Progress ── */}
                  {isAcknowledged && !isEditing && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-blue-700">Step 2: Move to In Progress</p>
                      <button
                        onClick={() => markInProgress(row.id)}
                        disabled={saving === row.id}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        {saving === row.id ? 'Saving…' : '→ Mark In Progress'}
                      </button>
                    </div>
                  )}

                  {/* ── Step 3: Payment received ── */}
                  {isInProgress && !isEditing && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-emerald-700">Step 3: Confirm Payment Received</p>
                      <button
                        onClick={() => markPaymentReceived(row.id)}
                        disabled={saving === row.id}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        {saving === row.id ? 'Saving…' : '→ Mark Payment Received'}
                      </button>
                    </div>
                  )}

                  {/* ── Step 4: Tracking number placed ── */}
                  {isPaymentReceived && !isEditing && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-violet-700">Step 4: Place Tracking Number</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tracking Number <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            value={draft.number || ''}
                            onChange={e => setTrackingDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], number: e.target.value } }))}
                            placeholder="e.g. DHL1234567890"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tracking URL (optional)</label>
                          <input
                            type="url"
                            value={draft.url || ''}
                            onChange={e => setTrackingDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], url: e.target.value } }))}
                            placeholder="https://track.dhl.com/..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => markTrackingPlaced(row.id)}
                        disabled={saving === row.id}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {saving === row.id ? 'Saving…' : '→ Save Tracking'}
                      </button>
                    </div>
                  )}

                  {/* ── Step 5: Shipped ── */}
                  {isTrackingPlaced && !isEditing && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-indigo-700">Step 5: Mark as Shipped</p>
                      <button
                        onClick={() => markShipped(row.id)}
                        disabled={saving === row.id}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving === row.id ? 'Saving…' : '→ Mark Shipped'}
                      </button>
                    </div>
                  )}

                  {/* ── Actions toolbar ── */}
                  {!isEditing && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-400">Actions</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openOrderInPortal(row)}
                          className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          ✎ Edit Order (Portal)
                        </button>
                        {isShipped && (
                          <button
                            onClick={() => updateOrder(row.id, { status: 'completed' })}
                            disabled={saving === row.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            ✓ Mark Completed
                          </button>
                        )}
                        {currentStatus !== 'cancelled' && currentStatus !== 'completed' && (
                          <button
                            onClick={() => updateOrder(row.id, { status: 'cancelled' })}
                            disabled={saving === row.id}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            ✕ Cancel Order
                          </button>
                        )}
                        {(currentStatus === 'cancelled' || currentStatus === 'completed') && (
                          <button
                            onClick={() => reinstateOrder(row.id)}
                            disabled={saving === row.id}
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            ↩ Reinstate Order
                          </button>
                        )}
                        <button
                          onClick={() => deleteOrder(row.id)}
                          disabled={saving === row.id}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Admins panel ────────────────────────────────────────────────────────────

const ADMINS_TABLE = import.meta.env.VITE_B2B_ADMINS_TABLE || 'b2b_admins'

function AdminsPanel() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'ok'|'error', message }
  const [removing, setRemoving] = useState(null)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from(ADMINS_TABLE)
      .select('id, email, created_at')
      .order('created_at', { ascending: true })
    setLoading(false)
    if (err) { setError(err.message); return }
    setAdmins(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFeedback(null)
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    if (password.length < 8) {
      setFeedback({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase.functions.invoke('create-admin', {
      body: { action: 'create', email: email.trim().toLowerCase(), password },
    })
    setSaving(false)
    if (err || data?.error) {
      let detail = data?.error || ''
      if (!detail && err?.context instanceof Response) {
        try { const body = await err.context.json(); detail = body?.error || '' } catch {}
      }
      setFeedback({ type: 'error', message: detail || err?.message || 'Failed to create admin.' })
      return
    }
    setFeedback({ type: 'ok', message: `Admin account created for ${email.trim().toLowerCase()}.` })
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    load()
  }

  const handleRemove = async (adminEmail) => {
    if (!window.confirm(`Remove admin access for ${adminEmail}?`)) return
    setRemoving(adminEmail)
    setFeedback(null)
    const { data, error: err } = await supabase.functions.invoke('create-admin', {
      body: { action: 'remove', email: adminEmail },
    })
    setRemoving(null)
    if (err || data?.error) {
      setFeedback({ type: 'error', message: data?.error || err?.message || 'Failed to remove admin.' })
      return
    }
    setFeedback({ type: 'ok', message: `${adminEmail} removed from admins.` })
    load()
  }

  return (
    <div className="space-y-6">
      {/* Create new admin */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Create New Admin Account</h3>
        <form onSubmit={handleCreate} className="space-y-3 max-w-sm">
          <label className="block text-sm font-medium text-slate-700">
            Email Address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFeedback(null) }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="newadmin@gelitup.com"
            />
          </label>
          <div className="block text-sm font-medium text-slate-700">
            Password
            <div className="relative mt-1">
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFeedback(null) }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Min. 8 characters"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
              </button>
            </div>
          </div>
          <div className="block text-sm font-medium text-slate-700">
            Confirm Password
            <div className="relative mt-1">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFeedback(null) }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Repeat password"
              />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1} aria-label={showConfirmPw ? 'Hide password' : 'Show password'}>
                {showConfirmPw ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Admin Account'}
          </button>
          {feedback && (
            <p className={`text-xs font-medium ${feedback.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {feedback.message}
            </p>
          )}
        </form>
      </div>

      {/* Current admins list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Current Admins</h3>
        {loading && <p className="text-xs text-slate-400">Loading…</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {!loading && !error && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.email}</p>
                  <p className="text-xs text-slate-400">Added {fmtDate(a.created_at)}</p>
                </div>
                <button
                  onClick={() => handleRemove(a.email)}
                  disabled={removing === a.email}
                  className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  {removing === a.email ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
            {admins.length === 0 && (
              <li className="px-4 py-3 text-xs text-slate-400">No admins found.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Guestbook Moderation panel ───────────────────────────────────────────────

const GUESTBOOK_TABLE = 'guestbook'

function GuestbookPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'pending' | 'approved' | 'featured' | 'all'

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from(GUESTBOOK_TABLE).select('*').order('created_at', { ascending: false }).limit(100)
    if (filter === 'pending') query = query.eq('approved', false)
    else if (filter === 'approved') query = query.eq('approved', true)
    else if (filter === 'featured') query = query.eq('featured', true)
    const { data } = await query
    setRows(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id) => {
    await supabase.from(GUESTBOOK_TABLE).update({ approved: true }).eq('id', id)
    load()
  }

  const handleToggleFeatured = async (id, current) => {
    await supabase.from(GUESTBOOK_TABLE).update({ featured: !current }).eq('id', id)
    load()
  }

  const handleReject = async (id) => {
    await supabase.from(GUESTBOOK_TABLE).delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">Guestbook Moderation</h2>
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' }, { key: 'featured', label: 'Featured' }, { key: 'all', label: 'All' }].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-slate-500">{filter === 'pending' ? 'No pending messages.' : 'No messages found.'}</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className={`rounded-xl border p-4 ${row.featured ? 'border-fuchsia-200 bg-fuchsia-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                    {row.role && (
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {row.role}
                      </span>
                    )}
                    {row.featured && <span className="text-xs">⭐</span>}
                  </div>
                  <p className="text-xs text-slate-400">
                    {row.country && <span>{row.country} · </span>}
                    {fmtDate(row.created_at)}
                    {row.approved && <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Approved</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {!row.approved && (
                    <button
                      onClick={() => handleApprove(row.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Approve
                    </button>
                  )}
                  {row.approved && (
                    <button
                      onClick={() => handleToggleFeatured(row.id, row.featured)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${row.featured ? 'bg-amber-500 hover:bg-amber-400' : 'bg-violet-600 hover:bg-violet-500'}`}
                    >
                      {row.featured ? 'Unfeature' : '⭐ Feature'}
                    </button>
                  )}
                  <button
                    onClick={() => handleReject(row.id)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">"{row.message}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tier Pricing panel ───────────────────────────────────────────────────────

const TIER_PRICING_DATA = [
  { key: 'b2b',          label: 'B2B (Salon)',               multiplier: 1.0,   colour: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'authority',    label: 'Authority Distributor',     multiplier: 0.22,  colour: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' },
  { key: 'professional', label: 'Professional Distributor',  multiplier: 0.37,  colour: 'bg-pink-100 text-pink-700 border-pink-200' },
  { key: 'sales',        label: 'Sales Representative',      multiplier: 0.85,  colour: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'country',      label: 'Level 2 Country Tier',      multiplier: 0.264, colour: 'bg-sky-100 text-sky-700 border-sky-200' },
]

const B2B_PRICE_MULTIPLIER = 1.2
const PERFECT_SHAPE_TOP_COAT_UPLIFT = 1.06
function isPerfectShapeTopCoatProduct(name, sku) {
  const normalizedName = String(name || '').toLowerCase()
  const normalizedSku = String(sku || '').toLowerCase()
  return normalizedName.includes('top coat perfect shape')
    || normalizedName.includes('perfect shape top coat')
    || normalizedSku.includes('nwpt15')
}
function getAdjustedB2bBasePrice(name, sku, rawPrice) {
  const numericPrice = Number(rawPrice)
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) return null
  return isPerfectShapeTopCoatProduct(name, sku)
    ? numericPrice * PERFECT_SHAPE_TOP_COAT_UPLIFT
    : numericPrice
}

// Map price-list item names to display categories
function classifyProduct(name) {
  const n = (name || '').toUpperCase()
  if (/\bSOLID GEL POLISH\b|SOLID\s*\d|^\d{1,4}[A-Z]?\s/.test(n)) return 'SOLID GEL POLISH'
  if (/CAT\s*EYE|GCE\b/.test(n)) return 'CAT EYE'
  if (/GLITTER/i.test(n)) return 'GLITTERS'
  if (/GLASS\s*EFFECT/i.test(n)) return 'GLASS EFFECT'
  if (/SHIMMER/i.test(n)) return 'SHIMMER'
  if (/METALLIC/i.test(n)) return 'METALLIC'
  if (/\bPEARL\b/i.test(n)) return 'PEARL'
  if (/\bJELLY\b/i.test(n)) return 'JELLY'
  if (/SNOWFLAKE/i.test(n)) return 'SNOWFLAKE'
  if (/\bPMA\b/i.test(n)) return 'PMA'
  if (/NEW\s*YORK|NYP/i.test(n)) return 'NEW YORK'
  if (/BY\s*THE\s*OCEAN|BTO/i.test(n)) return 'BY THE OCEAN'
  if (/SPIX|SPEX/i.test(n)) return 'SPIX & SPEX'
  if (/TUTTI\s*FRUTTI/i.test(n)) return 'TUTTI FRUTTI'
  if (/\bFRENCH\b/i.test(n)) return 'FRENCH'
  if (/BUILDER\s*GEL|BUILD/i.test(n)) return 'BUILDER GEL'
  if (/ACRYLIC/i.test(n)) return 'ACRYLICS'
  if (/\bBASE\b|FLEXI\s*BASE|SUPERIOR\s*BASE/i.test(n)) return 'BASES'
  if (/\bTOP\s*COAT\b|\bTOP\b.*\b(MATTE|GLOSS|WIPE|MILKY|SHIMMER)\b/i.test(n)) return 'TOPS'
  if (/MAGNET|LAMP|LED|FILE|BUFFER|DRILL/i.test(n)) return 'EQUIPMENT'
  if (/BRUSH/i.test(n)) return 'BRUSHES'
  if (/NAIL\s*ART|FOIL|STICKER|STAMP/i.test(n)) return 'NAIL ART'
  if (/REMOVER|CLEANSER|ACETONE|WIPE|PAD/i.test(n)) return 'CONSUMABLES'
  if (/HAND|FOOT|CREAM|OIL|CUTICLE/i.test(n)) return 'NAIL HAND & FOOT CARE'
  if (/SUPERBOND|DEHYDRAT|PRIMER|PREP/i.test(n)) return 'NAIL PREPARATIONS'
  if (/LIQUID|MONOMER/i.test(n)) return 'LIQUIDS'
  if (/DUAL\s*FORM|NAIL\s*TIP/i.test(n)) return 'TOOLS'
  return 'OTHER'
}

function TierPricingPanel() {
  const [priceData, setPriceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedCat, setExpandedCat] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/gelitup-content/b2b-price-list.json')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json()
        const items = Array.isArray(payload?.items) ? payload.items : []
        // Group by category
        const groups = {}
        const isMultimix30g = (n) => /multimix/i.test(n) && /\b30\s*g/i.test(n)
        for (const { name, sku, price } of items) {
          const adjustedBasePrice = getAdjustedB2bBasePrice(name, sku, price)
          if (adjustedBasePrice == null) continue
          const surcharge = isMultimix30g(name) ? 1.1 : 1
          const b2bPrice = Math.ceil(adjustedBasePrice * B2B_PRICE_MULTIPLIER * surcharge * 10) / 10
          const cat = classifyProduct(name)
          if (!groups[cat]) groups[cat] = { products: [], min: Infinity, max: -Infinity, total: 0 }
          groups[cat].products.push({ name, b2bPrice })
          groups[cat].min = Math.min(groups[cat].min, b2bPrice)
          groups[cat].max = Math.max(groups[cat].max, b2bPrice)
          groups[cat].total += b2bPrice
        }
        if (mounted) { setPriceData(groups); setLoading(false) }
      } catch (e) {
        if (mounted) { setError(e.message); setLoading(false) }
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <p className="text-xs text-slate-400">Loading B2B price data…</p>
  if (error) return <p className="text-xs text-rose-600">Failed to load prices: {error}</p>
  if (!priceData) return null

  const CATEGORY_ORDER = [
    'SOLID GEL POLISH', 'CAT EYE', 'GLITTERS', 'GLASS EFFECT', 'SHIMMER', 'METALLIC', 'PEARL', 'JELLY',
    'SNOWFLAKE', 'PMA', 'NEW YORK', 'BY THE OCEAN', 'SPIX & SPEX', 'TUTTI FRUTTI', 'FRENCH',
    'BUILDER GEL', 'ACRYLICS', 'BASES', 'TOPS', 'EQUIPMENT', 'BRUSHES', 'NAIL ART',
    'CONSUMABLES', 'NAIL HAND & FOOT CARE', 'NAIL PREPARATIONS', 'LIQUIDS', 'TOOLS', 'OTHER',
  ]
  const sortedCategories = Object.keys(priceData).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })

  return (
    <div>
      <h2 className="text-sm font-bold text-slate-900 mb-1">Distributor Tier Pricing — Live B2B Prices</h2>
      <p className="text-xs text-slate-500 mb-2">Prices are sourced from the B2B price list. Each tier multiplier is applied to the actual B2B wholesale price.</p>

      {/* Tier multiplier legend */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TIER_PRICING_DATA.map(t => (
          <span key={t.key} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${t.colour}`}>
            {t.label}: ×{t.multiplier}
            {t.multiplier < 1 ? ` (−${((1 - t.multiplier) * 100).toFixed(0)}%)` : ''}
          </span>
        ))}
      </div>

      {/* Category pricing table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5 text-left">Category</th>
              <th className="px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5 text-right">B2B Price Range</th>
              {TIER_PRICING_DATA.filter(t => t.key !== 'b2b').map(t => (
                <th key={t.key} className="px-3 py-2.5 text-right">{t.label.split(' ')[0]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedCategories.map(cat => {
              const g = priceData[cat]
              const isExpanded = expandedCat === cat
              return [
                <tr
                  key={cat}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpandedCat(isExpanded ? null : cat)}
                >
                  <td className="px-3 py-2.5 text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                    {cat}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">{g.products.length}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                    €{g.min.toFixed(2)}{g.min !== g.max ? ` – €${g.max.toFixed(2)}` : ''}
                  </td>
                  {TIER_PRICING_DATA.filter(t => t.key !== 'b2b').map(t => (
                    <td key={t.key} className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                      €{(g.min * t.multiplier).toFixed(2)}{g.min !== g.max ? ` – €${(g.max * t.multiplier).toFixed(2)}` : ''}
                    </td>
                  ))}
                </tr>,
                // Expanded: individual products
                ...(isExpanded ? g.products
                  .sort((a, b) => a.b2bPrice - b.b2bPrice)
                  .map((p, i) => (
                    <tr key={`${cat}-${i}`} className="bg-slate-50/60">
                      <td className="pl-8 pr-3 py-1.5 text-[11px] text-slate-600 truncate max-w-[200px]" title={p.name}>{p.name}</td>
                      <td className="px-3 py-1.5" />
                      <td className="px-3 py-1.5 text-right font-mono text-[11px] text-slate-600">€{p.b2bPrice.toFixed(2)}</td>
                      {TIER_PRICING_DATA.filter(t => t.key !== 'b2b').map(t => (
                        <td key={t.key} className="px-3 py-1.5 text-right font-mono text-[11px] text-slate-500">€{(p.b2bPrice * t.multiplier).toFixed(2)}</td>
                      ))}
                    </tr>
                  )) : []),
              ]
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Click a category row to expand individual product pricing. Level 2 Country Tier is admin-assigned only.</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => downloadCSV(priceData, sortedCategories)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
        >
          ↓ Download CSV
        </button>
      </div>
    </div>
  )
}

function downloadCSV(priceData, sortedCategories) {
  const tiers = TIER_PRICING_DATA.filter(t => t.key !== 'b2b')
  const headers = ['Category', 'Product', 'B2B Price (€)', ...tiers.map(t => `${t.label} (€)`)]
  const rows = [headers.join(',')]

  for (const cat of sortedCategories) {
    const g = priceData[cat]
    const sorted = [...g.products].sort((a, b) => a.b2bPrice - b.b2bPrice)
    for (const p of sorted) {
      const escapeName = `"${p.name.replace(/"/g, '""')}"`
      const tierPrices = tiers.map(t => (p.b2bPrice * t.multiplier).toFixed(2))
      rows.push([`"${cat}"`, escapeName, p.b2bPrice.toFixed(2), ...tierPrices].join(','))
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerFileDownload(blob, `gelitup-tier-pricing-${new Date().toISOString().slice(0, 10)}.csv`)
}

// ─── Draft Carts panel ────────────────────────────────────────────────────────

const DRAFT_CARTS_TABLE = 'b2b_draft_carts'

function normalizeDraftCartItems(cart) {
  const rawItems = cart?.items
  if (!rawItems) return []
  if (typeof rawItems === 'string') {
    try {
      return normalizeDraftCartItems({ ...cart, items: JSON.parse(rawItems) })
    } catch {
      return []
    }
  }

  if (Array.isArray(rawItems)) {
    return rawItems
      .map((item) => ({
        name: String(item?.name || item?.displayName || item?.code || item?.sku || 'Item').trim(),
        sku: String(item?.sku || item?.code || '').trim(),
        qty: Math.max(1, Number(item?.qty || item?.quantity || 1) || 1),
      }))
      .filter((item) => item.name || item.sku)
  }

  if (Array.isArray(rawItems?.products) || Array.isArray(rawItems?.packages)) {
    const products = Array.isArray(rawItems.products) ? rawItems.products : []
    const packages = Array.isArray(rawItems.packages) ? rawItems.packages : []
    return [
      ...products.map((item) => ({
        name: String(item?.name || item?.code || 'Item').trim(),
        sku: String(item?.code || item?.sku || '').trim(),
        qty: Math.max(1, Number(item?.qty || 1) || 1),
      })),
      ...packages.map((item) => ({
        name: String(item?.name || item?.sku || 'Item').trim(),
        sku: String(item?.sku || '').trim(),
        qty: Math.max(1, Number(item?.qty || 1) || 1),
      })),
    ].filter((item) => item.name || item.sku)
  }

  if (typeof rawItems === 'object') {
    return Object.entries(rawItems)
      .map(([key, qty]) => {
        const [namePart, skuPart] = String(key || '').split('::')
        const name = String(namePart || skuPart || 'Item').trim()
        const sku = String(skuPart || '').trim()
        const normalizedQty = Math.max(1, Number(qty) || 1)
        return { name, sku, qty: normalizedQty }
      })
      .filter((item) => item.name || item.sku)
  }

  return []
}

function buildRecoveredOrderPayload(cart) {
  const items = normalizeDraftCartItems(cart)
  const totalUnits = items.reduce((sum, item) => sum + Math.max(1, Number(item.qty) || 1), 0)
  const seed = String(cart?.id || cart?.user_id || cart?.customer_email || Date.now()).replace(/[^A-Za-z0-9]+/g, '').toUpperCase()
  return {
    customer_email: String(cart?.customer_email || '').trim() || null,
    consignee_name: String(cart?.consignee_name || cart?.customer_name || '').trim() || null,
    consignee_phone: String(cart?.consignee_phone || '').trim() || null,
    shipping_address: String(cart?.shipping_address || '').trim() || null,
    items,
    total_units: totalUnits || items.length,
    source: String(cart?.source || '').toLowerCase() === 'portal' ? 'portal_checkout' : 'catalogue_checkout',
    module: 'products',
    status: 'received',
    order_ref: `RCV-${seed.slice(0, 12) || 'CART'}-${Date.now().toString().slice(-5)}`,
  }
}

async function recoverDraftCartAsOrder(cart) {
  const orderPayload = buildRecoveredOrderPayload(cart)
  if (!orderPayload.customer_email) {
    return { ok: false, message: 'Draft cart has no customer email.' }
  }

  const { error: orderError } = await supabase
    .from(ORDERS_TABLE)
    .insert([orderPayload])

  if (orderError) {
    return { ok: false, message: orderError.message }
  }

  const cartId = cart?.id
  if (cartId != null) {
    const { error: deleteError } = await supabase
      .from(DRAFT_CARTS_TABLE)
      .delete()
      .eq('id', cartId)
    if (deleteError) {
      return { ok: true, message: `Order recovered, but draft cart cleanup failed: ${deleteError.message}` }
    }
  }

  return { ok: true, message: `Recovered as order ${orderPayload.order_ref}` }
}

function getDraftCartCustomerActionLabel(cart) {
  const action = String(cart?.customer_action || '').trim().toLowerCase()
  if (action === 'delete') return 'Customer asked to delete cart contents'
  if (action === 'keep') return 'Customer chose to check out later'
  return ''
}

function isDraftCartCustomerActionCurrent(cart) {
  const action = String(cart?.customer_action || '').trim().toLowerCase()
  if (!action) return false
  const actionTime = new Date(cart?.customer_action_at || '').getTime()
  const updatedTime = new Date(cart?.updated_at || cart?.created_at || '').getTime()
  return Number.isFinite(actionTime) && Number.isFinite(updatedTime) && actionTime >= updatedTime
}

function hasRecoverableDraftCartItems(cart) {
  return Number(cart?.total_units || 0) > 0 && normalizeDraftCartItems(cart).length > 0
}

function DraftCartsPanel() {
  const [carts, setCarts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [recovering, setRecovering] = useState(null)

  const fetchCarts = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from(DRAFT_CARTS_TABLE)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200)
    if (err) setError(`Could not load draft carts: ${err.message}`)
    else setCarts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCarts() }, [fetchCarts])

  const recoverCart = async (cart) => {
    const ok = window.confirm(`Recover draft cart for ${cart.customer_email || 'this client'} into a live order?`)
    if (!ok) return
    setRecovering(cart.id)
    const result = await recoverDraftCartAsOrder(cart)
    setRecovering(null)
    if (!result.ok) {
      alert(`Could not recover draft cart: ${result.message}`)
      return
    }
    alert(result.message)
    fetchCarts()
  }

  function renderItems(items, source) {
    if (!items) return <span className="text-xs text-slate-400">No items</span>
    if (source === 'catalogue') {
      // quickCart shape: { "name::code": qty }
      const entries = Object.entries(items)
      if (!entries.length) return <span className="text-xs text-slate-400">Empty cart</span>
      return (
        <ul className="space-y-1">
          {entries.map(([key, qty]) => {
            const [name, code] = key.split('::')
            return (
              <li key={key} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-500">{code || '—'}</span>
                <span className="flex-1 truncate text-slate-700">{name}</span>
                <span className="font-semibold text-slate-900">×{qty}</span>
              </li>
            )
          })}
        </ul>
      )
    }
    // portal shape: { products: [{code, qty}], packages: [{sku, name, qty, group}] }
    const products = items.products || []
    const packages = items.packages || []
    if (!products.length && !packages.length) return <span className="text-xs text-slate-400">Empty cart</span>
    return (
      <ul className="space-y-1">
        {products.map((p, i) => (
          <li key={`p-${i}`} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-slate-500">{p.code}</span>
            <span className="font-semibold text-slate-900">×{p.qty}</span>
          </li>
        ))}
        {packages.map((p, i) => (
          <li key={`k-${i}`} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-slate-500">{p.sku}</span>
            <span className="flex-1 truncate text-slate-700">{p.name}</span>
            <span className="font-semibold text-slate-900">×{p.qty}</span>
            {p.group && <span className="text-[10px] text-slate-400">{p.group}</span>}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Draft / Abandoned Carts</h2>
        <button onClick={fetchCarts} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Refresh</button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Live carts from clients who have not yet submitted. Updated every time a client changes their cart. Customer reminder-email choices are also logged here for admin review.</p>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {loading ? (
        <p className="mt-6 text-center text-sm text-slate-400">Loading…</p>
      ) : carts.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">No active draft carts.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {carts.map((cart) => (
            <div key={cart.id} className="rounded-xl border border-slate-200 bg-slate-50">
              <button
                onClick={() => setExpanded(expanded === cart.id ? null : cart.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cart.source === 'portal' ? 'bg-blue-100 text-blue-700' : 'bg-fuchsia-100 text-fuchsia-700'}`}>
                  {cart.source}
                </span>
                <span className="flex-1 truncate text-sm font-semibold text-slate-800">{cart.customer_email || '—'}</span>
                {isDraftCartCustomerActionCurrent(cart) && getDraftCartCustomerActionLabel(cart) && (
                  <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold md:inline-flex ${String(cart?.customer_action || '').trim().toLowerCase() === 'delete' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {getDraftCartCustomerActionLabel(cart)}
                  </span>
                )}
                <span className="text-xs text-slate-500">{cart.total_units} unit{cart.total_units !== 1 ? 's' : ''}</span>
                <span className="text-xs text-slate-400">{fmtDate(cart.updated_at)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded === cart.id ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              {expanded === cart.id && (
                <div className="border-t border-slate-200 px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-slate-400">Customer</span>
                    <span className="text-slate-700">{cart.customer_email || '—'}</span>
                    <span className="text-slate-400">Source</span>
                    <span className="text-slate-700">{cart.source}</span>
                    <span className="text-slate-400">Units</span>
                    <span className="text-slate-700">{cart.total_units}</span>
                    <span className="text-slate-400">Last updated</span>
                    <span className="text-slate-700">{cart.updated_at ? new Date(cart.updated_at).toLocaleString() : '—'}</span>
                    <span className="text-slate-400">Created</span>
                    <span className="text-slate-700">{cart.created_at ? new Date(cart.created_at).toLocaleString() : '—'}</span>
                    <span className="text-slate-400">Customer reply</span>
                    <span className="text-slate-700">{getDraftCartCustomerActionLabel(cart) || '—'}</span>
                    <span className="text-slate-400">Reply recorded</span>
                    <span className="text-slate-700">{cart.customer_action_at ? new Date(cart.customer_action_at).toLocaleString() : '—'}</span>
                  </div>
                  {cart.customer_action_note && (
                    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${String(cart?.customer_action || '').trim().toLowerCase() === 'delete' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                      <strong>Admin note:</strong> {cart.customer_action_note}
                      {!isDraftCartCustomerActionCurrent(cart) && (
                        <span className="block pt-1 text-[11px] text-slate-500">The cart was updated after this response, so the reply is now historical.</span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 rounded-lg bg-white p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cart Items</p>
                    {renderItems(cart.items, cart.source)}
                  </div>
                  <div className="mt-3 flex justify-end">
                    {hasRecoverableDraftCartItems(cart) ? (
                      <button
                        type="button"
                        onClick={() => recoverCart(cart)}
                        disabled={recovering === cart.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {recovering === cart.id ? 'Recovering…' : 'Recover as Order'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">This cart no longer has recoverable items.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function buildSearchIndex(row) {
  try {
    return JSON.stringify(row || {}).toLowerCase()
  } catch {
    return String(row || '').toLowerCase()
  }
}

function SearchPanel({ onOpenTab }) {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState({ orders: [], carts: [], registrations: [] })

  const runSearch = useCallback(async (rawQuery) => {
    const normalizedQuery = String(rawQuery || '').trim().toLowerCase()
    setSubmittedQuery(String(rawQuery || '').trim())
    setError('')

    if (!normalizedQuery) {
      setResults({ orders: [], carts: [], registrations: [] })
      setError('Enter an email, VAT number, client name, order ref, or item name.')
      return
    }

    setLoading(true)
    const [ordersRes, cartsRes, registrationsRes] = await Promise.all([
      supabase.from(ORDERS_TABLE).select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from(DRAFT_CARTS_TABLE).select('*').order('updated_at', { ascending: false }).limit(300),
      supabase.from(REGISTRATIONS_TABLE).select('*').order('created_at', { ascending: false }).limit(300),
    ])

    const terms = normalizedQuery.split(/\s+/).filter(Boolean)
    const matches = (row) => {
      const haystack = buildSearchIndex(row)
      return terms.every((term) => haystack.includes(term))
    }

    const nextResults = {
      orders: (ordersRes.data || []).filter(matches),
      carts: (cartsRes.data || []).filter(matches),
      registrations: (registrationsRes.data || []).filter(matches),
    }

    setResults(nextResults)
    const firstError = [ordersRes.error, cartsRes.error, registrationsRes.error].find(Boolean)
    setError(firstError ? firstError.message : '')
    setLoading(false)
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Search Orders / Draft Carts</h2>
        <p className="mt-1 text-xs text-slate-500">Searches orders, draft carts, and registrations by email, VAT number, client name, order ref, or item text.</p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          void runSearch(query)
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, VAT, name, order ref, or product…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {submittedQuery && !loading && !error && (
        <p className="text-xs text-slate-500">
          Results for <span className="font-semibold text-slate-700">{submittedQuery}</span>
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      )}

      {loading && <p className="text-sm text-slate-400">Searching…</p>}

      {!loading && submittedQuery && !results.orders.length && !results.carts.length && !results.registrations.length && !error && (
        <p className="text-sm text-slate-400">No matches found.</p>
      )}

      {!loading && results.orders.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Orders ({results.orders.length})</h3>
            <button type="button" onClick={() => onOpenTab('orders')} className="text-xs font-semibold text-fuchsia-700 hover:underline">
              Open Orders tab
            </button>
          </div>
          <div className="space-y-2">
            {results.orders.slice(0, 20).map((row) => (
              <div key={`order-${row.id}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(row.status)}
                  <span className="font-semibold text-slate-800">Order #{row.id}</span>
                  {row.order_ref && <span className="font-mono text-slate-500">{row.order_ref}</span>}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><span className="font-semibold text-slate-400">Customer</span><br />{row.customer_email || '—'}</div>
                  <div><span className="font-semibold text-slate-400">Source</span><br />{row.source || '—'}</div>
                  <div><span className="font-semibold text-slate-400">Consignee</span><br />{row.consignee_name || '—'}</div>
                  <div><span className="font-semibold text-slate-400">Created</span><br />{fmtDateTime(row.created_at)}</div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500">{row.total_units || 0} units</span>
                  <button type="button" onClick={() => onOpenTab('orders')} className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                    Go to Orders
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.carts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Draft Carts ({results.carts.length})</h3>
            <button type="button" onClick={() => onOpenTab('draft-carts')} className="text-xs font-semibold text-fuchsia-700 hover:underline">
              Open Draft Carts tab
            </button>
          </div>
          <div className="space-y-2">
            {results.carts.slice(0, 20).map((cart) => (
              <div key={`cart-${cart.id}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cart.source === 'portal' ? 'bg-blue-100 text-blue-700' : 'bg-fuchsia-100 text-fuchsia-700'}`}>
                    {cart.source || 'draft'}
                  </span>
                  <span className="font-semibold text-slate-800">Cart #{cart.id}</span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><span className="font-semibold text-slate-400">Customer</span><br />{cart.customer_email || '—'}</div>
                  <div><span className="font-semibold text-slate-400">Updated</span><br />{fmtDateTime(cart.updated_at)}</div>
                  <div><span className="font-semibold text-slate-400">Created</span><br />{fmtDateTime(cart.created_at)}</div>
                  <div><span className="font-semibold text-slate-400">Units</span><br />{cart.total_units || 0}</div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500">Draft cart record</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onOpenTab('draft-carts')} className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                      Go to Draft Carts
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = window.confirm(`Recover draft cart for ${cart.customer_email || 'this client'} into a live order?`)
                      if (!ok) return
                      const result = await recoverDraftCartAsOrder(cart)
                      if (!result.ok) {
                        alert(`Could not recover draft cart: ${result.message}`)
                        return
                      }
                      alert(result.message)
                    }}
                    className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  >
                    Recover as Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.registrations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Registrations ({results.registrations.length})</h3>
            <button type="button" onClick={() => onOpenTab('registrations')} className="text-xs font-semibold text-fuchsia-700 hover:underline">
              Open Registrations tab
            </button>
          </div>
          <div className="space-y-2">
            {results.registrations.slice(0, 20).map((row) => (
              <div key={`reg-${row.id}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {row.status || 'unknown'}
                  </span>
                  <span className="font-semibold text-slate-800">{row.contact_name || row.company_name || 'Unknown client'}</span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><span className="font-semibold text-slate-400">Email</span><br />{row.contact_email || '—'}</div>
                  <div><span className="font-semibold text-slate-400">VAT</span><br />{row.vat_number || '—'}</div>
                  <div><span className="font-semibold text-slate-400">Country</span><br />{row.country || '—'}</div>
                  <div><span className="font-semibold text-slate-400">Created</span><br />{fmtDateTime(row.created_at)}</div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500">{row.application_type || 'registration'}</span>
                  <button type="button" onClick={() => onOpenTab('registrations')} className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                    Go to Registrations
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Ambassador applications ──────────────────────────────────────────────────

function ambassadorStatusPill(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (s === 'rejected') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700' // new / pending / submitted
}

const AMBASSADOR_DECLINE_PRESETS = [
  'Not a professional nail technician',
  'Application did not meet our current criteria',
  'Portfolio / content was insufficient or unclear',
  'Follower count below our current threshold',
  'Location not currently served by the programme',
]

const escAmb = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

function buildAmbassadorDeclineEmail(row, reasonText) {
  const name = row?.full_name?.trim() || 'there'
  const reasonBlock = reasonText
    ? `<p style="margin-top:14px"><strong>Reason:</strong><br/><span style="white-space:pre-line">${escAmb(reasonText)}</span></p>`
    : ''
  return {
    subject: 'Update on your GEL.IT.UP ambassador application',
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>Hi ${escAmb(name)},</p>
      <p>Thank you for applying to become a GEL.IT.UP ambassador and for sharing your work with us.</p>
      <p>After review, we're not able to move forward with your application at this time.</p>
      ${reasonBlock}
      <p>You're welcome to apply again in the future. Wishing you all the best,<br/>The GEL.IT.UP Team</p>
    </div>`,
  }
}

function buildAmbassadorShipmentEmail(row, ship, setPasswordLink, nextPackageIso) {
  const name = (row?.full_name?.trim() || 'there').replace(/\b\w/g, (c) => c.toUpperCase())
  const discountCode = String(row?.discount_code || '').trim()
  const parts = []
  // NOTE: shipment_details ("what's in the box") is internal-only — not included here.
  if (ship.tracking_number) parts.push(`<p><strong>Tracking number:</strong> ${escAmb(ship.tracking_number)}</p>`)
  if (ship.tracking_url) parts.push(`<p><a href="${escAmb(ship.tracking_url)}" style="color:#D43790">Track your parcel →</a></p>`)
  if (discountCode) parts.push(`<p><strong>Your ambassador code:</strong> <span style="font-size:15px;color:#D43790">${escAmb(discountCode)}</span><br/>This code can only be used on the <a href="https://www.gelitup.com" style="color:#D43790">www.gelitup.com</a> website.</p>`)
  if (setPasswordLink) parts.push(`<p><a href="${escAmb(setPasswordLink)}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 16px;border-radius:9999px;text-decoration:none;font-weight:700">Set password & access your ambassador portal</a></p>`)
  // Next package date range (±1 week) — shown when we have a reminder date.
  if (nextPackageIso) {
    const center = new Date(nextPackageIso)
    const earliest = new Date(center); earliest.setDate(earliest.getDate() - 7)
    const latest = new Date(center); latest.setDate(latest.getDate() + 7)
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    parts.push(`<p>📦 Your next GEL.IT.UP package is expected to ship around <strong>${fmt(earliest)} – ${fmt(latest)}</strong>. We'll email you again with tracking details as soon as it's on its way.</p>`)
  }
  // NOTE: admin_comment is intentionally NOT included — it is an internal-only note.
  return {
    subject: 'Your GEL.IT.UP PR package is on the way 📦',
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>Hi ${escAmb(name)},</p>
      <p>Great news — your GEL.IT.UP PR package is on its way! 🎉</p>
      ${parts.join('')}
      <p>📎 We've attached a short <strong>"About Us"</strong> letter — please have a read before you film, so you know a little about the brand and what to mention.</p>
      <p>Tag <strong>@gelitupinternational</strong> and send your looks to our WhatsApp/Viber so we can feature you.</p>
      <p>The GEL.IT.UP Team</p>
    </div>`,
  }
}

// Welcome email sent automatically when an application is approved. The signed
// Ambassador Agreement PDF is attached so every ambassador has their contract.
function buildAmbassadorWelcomeEmail(row) {
  const name = String(row?.full_name || '').trim().split(' ')[0] || 'there'
  const discountCode = String(row?.discount_code || '').trim()
  const codeBlock = discountCode
    ? `<p><strong>Your personal ambassador code:</strong> <span style="font-size:15px;color:#D43790">${escAmb(discountCode)}</span><br/>Share it publicly with your nail-tech followers — it gives them 20% off GEL.IT.UP on the <a href="https://www.gelitup.com" style="color:#D43790">www.gelitup.com</a> website only.</p>`
    : ''
  return {
    subject: 'Welcome to the GEL.IT.UP Ambassador Programme 🎉',
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>Hi ${escAmb(name)},</p>
      <p>Great news — your GEL.IT.UP ambassador application has been <strong>approved</strong>! Welcome to the programme. 🎉</p>
      ${codeBlock}
      <p>📎 Your <strong>Ambassador Agreement</strong> is attached to this email as a PDF for your records.</p>
      <p>Your PR package is being prepared — we'll email you again with the tracking details as soon as it ships.</p>
      <p>If you have any questions in the meantime, just reply to this email.</p>
      <p>With love,<br/>The GEL.IT.UP Team</p>
    </div>`,
  }
}

function buildAmbassadorCodeUpdateEmail(row, previousCode, nextCode) {
  const name = String(row?.full_name || '').trim().split(' ')[0] || 'there'
  const oldCode = String(previousCode || '').trim()
  const newCode = String(nextCode || '').trim()
  return {
    subject: 'Your GEL.IT.UP ambassador code has been updated',
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>Hi ${escAmb(name)},</p>
      <p>We’ve updated your GEL.IT.UP ambassador code.</p>
      ${oldCode ? `<p><strong>Previous code:</strong> ${escAmb(oldCode)}</p>` : ''}
      <p><strong>New code:</strong> <span style="font-size:15px;color:#D43790">${escAmb(newCode)}</span></p>
      <p>Please use this new code from now on when sharing your ambassador link or promotion. It can only be used on the <a href="https://www.gelitup.com" style="color:#D43790">www.gelitup.com</a> website.</p>
      <p>If you have any questions, just reply to this email.</p>
      <p>With love,<br/>The GEL.IT.UP Team</p>
    </div>`,
  }
}

function buildAmbassadorPasswordReminderEmail(row) {
  const firstName = String(row?.full_name || '').trim().split(' ')[0] || 'there'
  const discountCode = String(row?.discount_code || '').trim()
  const createPasswordLink = `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(String(row?.email || '').trim())}`
  return {
    subject: 'Reminder: set your GEL.IT.UP password',
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>Hi ${escAmb(firstName)},</p>
      <p>Your GEL.IT.UP ambassador account is already waiting for you.</p>
      ${discountCode ? `<p><strong>Your ambassador code:</strong> <span style="font-size:15px;color:#D43790">${escAmb(discountCode)}</span><br/>It can only be used on the <a href="https://www.gelitup.com" style="color:#D43790">www.gelitup.com</a> website.</p>` : ''}
      <p>Please create your password for your existing account so you can sign in and see the discount progress generated by your followers.</p>
      <p><a href="${escAmb(createPasswordLink)}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;border-radius:9999px;text-decoration:none;font-weight:700">Create your password</a></p>
      <p>If you already created your password, you can ignore this reminder and log in as usual.</p>
      <p>With love,<br/>The GEL.IT.UP Team</p>
    </div>`,
  }
}

// Builds the Ambassador Agreement PDF attachment from an application row.
async function buildContractAttachmentForRow(row) {
  const address = [row?.address, [row?.city, row?.postal_code].filter(Boolean).join(' '), row?.country]
    .filter(Boolean).join(', ')
  const signedDate = row?.created_at
    ? new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const pdf = await buildAmbassadorContractPdf({
    fullName: row?.full_name,
    email: row?.email,
    phone: row?.phone,
    instagram: row?.instagram,
    tiktok: row?.tiktok,
    address,
    country: row?.country,
    qualifiedTech: row?.is_qualified_tech ?? true,
    workShown: row?.work_shown_on_profile ?? true,
    followersOver500: row?.followers_over_500 ?? true,
    agreementVersion: row?.agreement_version,
    lang: row?.language,
    signedDate,
  })
  return { filename: pdf.filename, content: pdf.base64, contentType: 'application/pdf' }
}

async function buildPdfAttachment(pdfUrl, fallbackFilename) {
  const response = await fetch(pdfUrl)
  if (!response.ok) {
    throw new Error(`Could not load PDF attachment (${response.status})`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  const rawName = pdfUrl.split('/').pop() || fallbackFilename || 'attachment.pdf'
  return {
    filename: decodeURIComponent(rawName),
    content: btoa(binary),
    contentType: 'application/pdf',
  }
}

// Sends an email (optionally with a PDF attachment) via the webhook. Returns {ok, error}.
async function sendAmbassadorEmail({ to, subject, html, attachments, replyTo }) {
  if (!EMAIL_WEBHOOK_URL) return { ok: false, error: 'VITE_EMAIL_WEBHOOK_URL is not configured — email not sent.' }
  const headers = { 'Content-Type': 'application/json' }
  if (SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
  }
  const body = { to, subject, html, from: AMBASSADOR_FROM_EMAIL, replyTo: replyTo || AMBASSADOR_REPLY_TO }
  if (attachments?.length) body.attachments = attachments
  try {
    const res = await fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers, body: JSON.stringify(body) })
    const json = await res.json().catch(() => null)
    return res.ok ? { ok: true } : { ok: false, error: json?.error || `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, error: err.message || 'Network error' }
  }
}

async function ensureAmbassadorPortalAccount(row) {
  const email = String(row?.email || '').trim().toLowerCase()
  if (!email) {
    throw new Error('Approval blocked: ambassador email is missing.')
  }

  const tempPass = `${crypto.randomUUID()}-Amb!${Date.now()}`
  const fullName = String(row?.full_name || '').trim()
  const companyName = fullName ? `${fullName} (Ambassador)` : 'GEL.IT.UP Ambassador'
  const firstName = fullName.split(' ')[0] || ''
  const lastName = fullName.split(' ').slice(1).join(' ')

  const { error } = await supabase.auth.signUp({
    email,
    password: tempPass,
    options: {
      emailRedirectTo: `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(email)}`,
      data: {
        role: 'buyer',
        account_type: 'b2b_buyer',
        full_name: fullName || email,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        contact_email: email,
      },
    },
  })

  if (error && !/already registered|already been registered|user already registered/i.test(String(error.message || ''))) {
    throw new Error(`Could not create ambassador portal account: ${error.message}`)
  }
}

function AmbassadorApplicationsPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')
  const [saving, setSaving] = useState(null)
  const [emailStatus, setEmailStatus] = useState({}) // { [id]: { state, message } }
  const [declineRow, setDeclineRow] = useState(null)
  const [declinePresets, setDeclinePresets] = useState([])
  const [declineNote, setDeclineNote] = useState('')
  const [msgRow, setMsgRow] = useState(null)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [ship, setShip] = useState({}) // { [id]: { shipment_details, tracking_number, tracking_url } }
  const [noteDraft, setNoteDraft] = useState({}) // { [id]: 'new internal note being typed' }
  const [packAdditionDraft, setPackAdditionDraft] = useState({}) // { [id]: 'extra pack items to consider' }
  const [codePerformanceByCode, setCodePerformanceByCode] = useState({})
  const [currentAdminEmail, setCurrentAdminEmail] = useState('')
  const [reminderDateDraft, setReminderDateDraft] = useState({})
  const [reminderNoteDraft, setReminderNoteDraft] = useState({})
const [shipDatePrompt, setShipDatePrompt] = useState(null) // { rowId, alsoEmail, date } forces a next-ship date before tracking saves
  const [openIds, setOpenIds] = useState(() => new Set()) // which applicant cards are expanded
  const [shipmentPanelOpen, setShipmentPanelOpen] = useState({})
  const [nextPackageMode, setNextPackageMode] = useState({})
  const [sectionOpenState, setSectionOpenState] = useState({})
  const [shipmentEntryOpen, setShipmentEntryOpen] = useState({})
  const [factoryPdfBusy, setFactoryPdfBusy] = useState(false)
  const reminderSweepStartedRef = useRef(false)
  const [shipmentEmailLock, setShipmentEmailLock] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SHIPMENT_EMAIL_LOCK_STORAGE_KEY) || '{}')
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (_) {
      return {}
    }
  })

  const toggleOpen = (id) => setOpenIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const sectionStateKey = (rowId, key) => `${rowId}:${key}`
  const isSectionOpen = (rowId, key, defaultOpen = false) => {
    const stateKey = sectionStateKey(rowId, key)
    if (Object.prototype.hasOwnProperty.call(sectionOpenState, stateKey)) {
      return Boolean(sectionOpenState[stateKey])
    }
    return defaultOpen
  }
  const toggleSection = (rowId, key) => {
    const stateKey = sectionStateKey(rowId, key)
    setSectionOpenState((prev) => ({ ...prev, [stateKey]: !prev[stateKey] }))
  }
  const shipmentEntryStateKey = (rowId, idx) => `${rowId}:${idx}`
  const isShipmentEntryOpen = (rowId, idx, defaultOpen = false) => {
    const stateKey = shipmentEntryStateKey(rowId, idx)
    if (Object.prototype.hasOwnProperty.call(shipmentEntryOpen, stateKey)) {
      return Boolean(shipmentEntryOpen[stateKey])
    }
    return defaultOpen
  }
  const toggleShipmentEntry = (rowId, idx) => {
    const stateKey = shipmentEntryStateKey(rowId, idx)
    setShipmentEntryOpen((prev) => ({ ...prev, [stateKey]: !prev[stateKey] }))
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user || null
      setCurrentAdminEmail(user?.email || '')
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const normalizeLookupKey = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
    const normalizeHandle = (value) => String(value || '').replace(/^@+/, '').trim().toLowerCase()
    const getRowEmail = (row) => String(row?.email || row?.contact_email || '').trim().toLowerCase()
    const getRowName = (row) => String(row?.full_name || row?.contact_name || '').trim()
    const getRowInstagram = (row) => String(row?.instagram || row?.instagram_handle || '').trim()
    const firstNameKey = (value) => normalizeLookupKey(String(value || '').trim().split(/\s+/)[0] || '')
    const extractInstagramFromNotes = (notes) => {
      const m = String(notes || '').match(/instagram:\s*(@?[a-z0-9._]+)/i)
      return m ? normalizeHandle(m[1]) : ''
    }
    const extractCodeStem = (code) => {
      const stem = String(code || '').toUpperCase().replace(/\d+.*$/, '')
      return normalizeLookupKey(stem)
    }
    let query = supabase
      .from(AMBASSADOR_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter === 'pending') query = query.in('status', AMBASSADOR_PENDING_STATUSES)
    else if (filter !== 'all') query = query.eq('status', filter)
    const { data, error: err } = await query
    setLoading(false)
    if (err) { setError(err.message); return }
    let nextRows = (data || []).map((row) => ({
      ...row,
      email: getRowEmail(row),
      full_name: getRowName(row),
      instagram: getRowInstagram(row),
    }))
    const emailLocalKey = (value) => normalizeLookupKey(String(value || '').split('@')[0] || '')
    const { data: codeRows, error: codeErr } = await supabase
      .from('ambassador_codes')
      .select('code, ambassador_name, ambassador_email, notes, active')
      .limit(1000)
    if (!codeErr && Array.isArray(codeRows) && codeRows.length > 0) {
      const byEmail = new Map()
      const byEmailLocal = new Map()
      const byName = new Map()
      const byInstagram = new Map()
      const byFirstName = new Map()
      for (const c of codeRows) {
        const emailKey = normalizeLookupKey(c?.ambassador_email)
        const emailLocal = emailLocalKey(c?.ambassador_email)
        const nameKey = normalizeLookupKey(c?.ambassador_name)
        const firstKey = firstNameKey(c?.ambassador_name)
        const igKey = extractInstagramFromNotes(c?.notes)
        const codeStemKey = extractCodeStem(c?.code)
        if (emailKey && !byEmail.has(emailKey)) byEmail.set(emailKey, c.code)
        if (emailLocal && !byEmailLocal.has(emailLocal)) byEmailLocal.set(emailLocal, c.code)
        if (nameKey && !byName.has(nameKey)) byName.set(nameKey, c.code)
        if (igKey && !byInstagram.has(igKey)) byInstagram.set(igKey, c.code)
        if (firstKey && !byFirstName.has(firstKey)) byFirstName.set(firstKey, c.code)
        if (codeStemKey && !byFirstName.has(codeStemKey)) byFirstName.set(codeStemKey, c.code)
      }
      nextRows = nextRows.map((row) => {
        if (row.discount_code) return row
        const emailKey = normalizeLookupKey(getRowEmail(row))
        const rowEmailLocal = emailLocalKey(getRowEmail(row))
        const nameKey = normalizeLookupKey(getRowName(row))
        const igKey = normalizeHandle(getRowInstagram(row))
        const firstKey = firstNameKey(getRowName(row))
        const fallbackCode =
          byEmail.get(emailKey)
          || byEmailLocal.get(rowEmailLocal)
          || byName.get(nameKey)
          || byInstagram.get(igKey)
          || byFirstName.get(firstKey)
          || null
        return fallbackCode ? { ...row, discount_code: fallbackCode } : row
      })
    } else if (codeErr) {
      setError((prev) => prev || `Could not load ambassador discount codes: ${codeErr.message}`)
    }
    const distinctCodes = [...new Set(
      nextRows
        .map((row) => String(row?.discount_code || '').trim().toUpperCase())
        .filter(Boolean),
    )]
    if (distinctCodes.length > 0) {
      let redemptionRows = null
      let redemptionErr = null
      const redemptionSelectFallbacks = [
        'code, order_total_eur, commission_amount_eur, created_at',
        'code, order_total, commission_amount_eur, created_at',
        'code, order_total_eur, created_at',
        'code, order_total, created_at',
        'code, created_at',
      ]
      for (const selectColumns of redemptionSelectFallbacks) {
        const result = await supabase
          .from('ambassador_redemptions')
          .select(selectColumns)
          .in('code', distinctCodes)
        if (!result.error) {
          redemptionRows = result.data || []
          redemptionErr = null
          break
        }
        const missingColumn = /column .* does not exist/i.test(String(result.error.message || ''))
        if (!missingColumn) {
          redemptionErr = result.error
          break
        }
        redemptionErr = result.error
      }
      if (redemptionErr && !redemptionRows) {
        setError((prev) => prev || `Could not load ambassador code performance: ${redemptionErr.message}`)
      } else {
        const perf = {}
        ;(redemptionRows || []).forEach((entry) => {
          const key = String(entry?.code || '').trim().toUpperCase()
          if (!key) return
          if (!perf[key]) {
            perf[key] = { orders: 0, orderValueEur: 0, commissionEur: 0, lastRedemptionAt: '' }
          }
          perf[key].orders += 1
          const orderValue = Number(entry?.order_total_eur ?? entry?.order_total ?? 0)
          perf[key].orderValueEur += Number.isFinite(orderValue) ? orderValue : 0
          perf[key].commissionEur += Number(entry?.commission_amount_eur || 0)
          const createdAt = String(entry?.created_at || '')
          if (createdAt && (!perf[key].lastRedemptionAt || new Date(createdAt).getTime() > new Date(perf[key].lastRedemptionAt).getTime())) {
            perf[key].lastRedemptionAt = createdAt
          }
        })
        setCodePerformanceByCode(perf)
      }
    } else {
      setCodePerformanceByCode({})
    }
    setRows(nextRows)
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (reminderSweepStartedRef.current) return
    reminderSweepStartedRef.current = true
    void sweepAmbassadorPasswordReminders()
  }, [])

  const patchRow = (id, patch) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  const setEmail = (id, state, message) => setEmailStatus(prev => ({ ...prev, [id]: { state, message } }))
  const normalizeAmbassadorStatus = (status) => String(status || '').trim().toLowerCase()
  const getShipmentDraft = (row) => ({
    shipment_details: shipVal(row, 'shipment_details').trim() || '',
    tracking_number: shipVal(row, 'tracking_number').trim() || '',
    tracking_url: shipVal(row, 'tracking_url').trim() || '',
  })
  const shipmentSignature = (row) => JSON.stringify(getShipmentDraft(row))
  const persistShipmentEmailLock = (updater) => {
    setShipmentEmailLock((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(SHIPMENT_EMAIL_LOCK_STORAGE_KEY, JSON.stringify(next))
      } catch (_) {
        // Ignore localStorage errors; UI lock still works for this session.
      }
      return next
    })
  }
  const openReminderDraft = (row, sentAtIso, sentAtLabel, nextReminderAtIso, nextReminderNoteText) => {
    const dueLabel = nextReminderAtIso ? fmtDate(nextReminderAtIso) : 'in 1 month'
    const body = [
      `Ambassador: ${row?.full_name || '-'}`,
      `Email: ${row?.email || '-'}`,
      `Instagram: @${row?.instagram || '-'}`,
      `Last shipment email sent: ${sentAtLabel || (sentAtIso ? fmtDateTime(sentAtIso) : 'Unknown')}`,
      `Next sample kit due: ${dueLabel}`,
      `What to send: ${String(nextReminderNoteText || '').trim() || '(not set)'}`,
      '',
      'Please prepare and send the next sample kit follow-up.',
    ].join('\n')
    const subject = `Reminder: Send next GEL.IT.UP sample kit to ${row?.full_name || row?.email || 'ambassador'}`
    const href = `mailto:${encodeURIComponent(AMBASSADOR_REMINDER_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = href
  }
  const startNextPackageFlow = async (row) => {
    persistShipmentEmailLock((prev) => {
      const next = { ...prev }
      delete next[row.id]
      return next
    })
    const metaResult = await saveShipmentMeta(row, { sentAt: '', nextReminderAt: '', nextReminderNote: '' })
    if (!metaResult.ok) {
      alert(`Could not reset closed shipment flow: ${metaResult.error}`)
      return
    }
    setReminderDateDraft((prev) => ({ ...prev, [row.id]: '' }))
    setReminderNoteDraft((prev) => ({ ...prev, [row.id]: '' }))
    setNextPackageMode((prev) => ({ ...prev, [row.id]: true }))
    setShipmentPanelOpen((prev) => ({ ...prev, [row.id]: true }))
  }
  const saveReminderDetails = async (row, sentAtIso, fallbackReminderAtIso) => {
    const rawDate = String(reminderDateVal(row, fallbackReminderAtIso) || '').trim()
    const parsedReminderAt = rawDate ? new Date(`${rawDate}T10:00:00Z`) : null
    if (parsedReminderAt && Number.isNaN(parsedReminderAt.getTime())) {
      setEmail(row.id, 'error', 'Reminder date is invalid.')
      return
    }
    const nextReminderAt = parsedReminderAt ? parsedReminderAt.toISOString() : (sentAtIso ? addOneMonth(sentAtIso) : '')
    const nextReminderNote = reminderNoteVal(row)
    setSaving(row.id)
    const result = await saveShipmentMeta(row, { nextReminderAt, nextReminderNote })
    setSaving(null)
    if (!result.ok) {
      setEmail(row.id, 'error', `Could not save reminder details: ${result.error}`)
      alert(`Could not save reminder details: ${result.error}`)
      return
    }
    setReminderDateDraft((prev) => ({ ...prev, [row.id]: nextReminderAt ? nextReminderAt.slice(0, 10) : '' }))
    setReminderNoteDraft((prev) => ({ ...prev, [row.id]: nextReminderNote }))
    setEmail(row.id, 'sent', 'Reminder details saved')
    await load()
  }

  // Sends the welcome email with the Ambassador Agreement PDF attached.
  // Used automatically on approval and manually via the "Send contract" button.
  const sendWelcomeContractEmail = async (row) => {
    const email = String(row?.email || '').trim()
    if (!email) {
      setEmail(row.id, 'error', 'Welcome email blocked: ambassador email is missing.')
      return false
    }
    setEmail(row.id, 'sending', '')
    let attachment
    try {
      attachment = await buildContractAttachmentForRow(row)
    } catch (e) {
      setEmail(row.id, 'error', `Could not build the agreement PDF: ${e.message || e}`)
      return false
    }
    const { subject, html } = buildAmbassadorWelcomeEmail(row)
    const res = await sendAmbassadorEmail({ to: email, subject, html, attachments: [attachment] })
    setEmail(row.id, res.ok ? 'sent' : 'error', res.ok ? `Welcome email + agreement sent to ${email}` : res.error)
    if (res.ok) await logAmbassadorSend(row, { to: email, subject, body: 'Welcome email with Ambassador Agreement PDF attached.' })
    return res.ok
  }

  async function sendAmbassadorPasswordReminder(row) {
    const email = String(row?.email || '').trim().toLowerCase()
    if (!email) return false
    const { subject, html } = buildAmbassadorPasswordReminderEmail(row)
    setEmail(row.id, 'sending', '')
    const res = await sendAmbassadorEmail({ to: email, subject, html })
    if (!res.ok) {
      setEmail(row.id, 'error', res.error || 'Failed to send password reminder.')
      return false
    }
    const reminderSentAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from(AMBASSADOR_TABLE)
      .update({ portal_account_reminder_sent_at: reminderSentAt })
      .eq('id', row.id)
    if (!updateError) patchRow(row.id, { portal_account_reminder_sent_at: reminderSentAt })
    logAmbassadorSend(row, { to: email, subject, body: htmlToText(html) })
    setEmail(row.id, 'sent', `Password reminder sent to ${email}`)
    return true
  }

  async function sweepAmbassadorPasswordReminders() {
    if (!EMAIL_WEBHOOK_URL) return
    const cutoffMs = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const { data, error } = await supabase
      .from(AMBASSADOR_TABLE)
      .select('id,full_name,email,instagram,discount_code,discount_code_created_at,reviewed_at,created_at,portal_account_created_at,portal_account_reminder_sent_at,status')
      .eq('status', 'approved')
    if (error) {
      console.error('Could not scan ambassador password reminders.', error)
      setError((prev) => prev || `Could not scan ambassador password reminders: ${error.message}`)
      return
    }
    const dueRows = (data || []).filter((row) => {
      if (row.portal_account_created_at || row.portal_account_reminder_sent_at) return false
      const issuedAt = row.discount_code_created_at || row.reviewed_at || row.created_at
      const issuedTime = issuedAt ? new Date(issuedAt).getTime() : NaN
      return Number.isFinite(issuedTime) && issuedTime <= cutoffMs
    })
    for (const row of dueRows) {
      await sendAmbassadorPasswordReminder(row)
    }
  }

  // APPROVE → set status + allocate/attach code, then automatically send the
  // welcome email with the Ambassador Agreement PDF attached. Shipment/tracking
  // details are still emailed separately later.
  const approveRow = async (row) => {
    if (String(row?.status || '').toLowerCase() === 'approved') return
    if (!window.confirm(`Approve ${row.full_name} (@${row.instagram})?\n\nThis allocates/links their ambassador code and immediately emails them a welcome message with their Ambassador Agreement PDF attached.`)) return
    setSaving(row.id)
    const { data, error: err } = await supabase.rpc('approve_ambassador_application', { p_application_id: row.id })
    if (err) {
      if (isAmbassadorDiscountCodeCollisionError(err)) {
        try {
          await approveAmbassadorWithFallback(row)
          setSaving(null)
          return
        } catch (fallbackErr) {
          setSaving(null)
          alert(fallbackErr.message || String(fallbackErr))
          return
        }
      }
      setSaving(null)
      alert(err.message)
      return
    }
    const approved = Array.isArray(data) ? data[0] : data
    const reviewedAt = approved?.reviewed_at || new Date().toISOString()
    const discountCode = approved?.discount_code || row.discount_code || null
    patchRow(row.id, { status: 'approved', reviewed_at: reviewedAt, discount_code: discountCode })
    const updatedRow = { ...row, status: 'approved', reviewed_at: reviewedAt, discount_code: discountCode }
    await sendWelcomeContractEmail(updatedRow)
    try {
      const factorySubject = `New GEL.IT.UP Ambassador approved — ${updatedRow.full_name || 'New ambassador'}`
      const factoryHtml = `<p>A new ambassador has been approved and a PR package needs preparing.</p><p><strong>Name:</strong> ${updatedRow.full_name || ''}<br/><strong>Instagram:</strong> ${updatedRow.instagram || ''}<br/><strong>Country:</strong> ${updatedRow.country || ''}<br/><strong>Address:</strong> ${updatedRow.address || ''}, ${updatedRow.city || ''} ${updatedRow.postal_code || ''}<br/><strong>Ambassador code:</strong> ${discountCode || ''}</p><p>Please mark it acknowledged in the admin panel once you've seen this.</p>`
      await Promise.all(['leeukopf@gmail.com', 'acc1.leeukopf@gmail.com'].map((to) => sendAmbassadorEmail({ to, subject: factorySubject, html: factoryHtml })))
    } catch (_) {}
    setSaving(null)
  }

  const openMessage = (row) => { setMsgRow(row); setMsgSubject('A message from GEL.IT.UP'); setMsgBody('') }

  // Free-form message to the ambassador. Reply-to points at the Zoho inbox so replies come back to you.
  const sendMessage = async () => {
    const row = msgRow
    if (!row) return
    if (!msgSubject.trim() || !msgBody.trim()) { alert('Add a subject and a message.'); return }
    setSaving(row.id)
    const firstName = String(row.full_name || '').split(' ')[0] || 'there'
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>Hi ${escAmb(firstName)},</p>
      <div style="white-space:pre-line">${escAmb(msgBody.trim())}</div>
      <p>The GEL.IT.UP Team</p>
    </div>`
    setEmail(row.id, 'sending', '')
    const res = await sendAmbassadorEmail({ to: row.email, subject: msgSubject.trim(), html, replyTo: AMBASSADOR_REPLY_TO })
    setEmail(row.id, res.ok ? 'sent' : 'error', res.ok ? `Message sent to ${row.email} (replies go to ${AMBASSADOR_REPLY_TO})` : res.error)
    if (res.ok) logAmbassadorSend(row, { to: row.email, subject: msgSubject.trim(), body: msgBody.trim() })
    if (res.ok) setMsgRow(null)
    setSaving(null)
  }

  const openDecline = (row) => { setDeclineRow(row); setDeclinePresets([]); setDeclineNote('') }

  // DECLINE → set status + store reason, email the applicant why.
  const submitDecline = async () => {
    const row = declineRow
    if (!row) return
    const reasonText = [...declinePresets, declineNote.trim()].filter(Boolean).join('\n')
    if (!reasonText) { alert('Please select at least one reason or add an explanation.'); return }
    setSaving(row.id)
    const { error: err } = await supabase
      .from(AMBASSADOR_TABLE)
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), decline_reason: reasonText })
      .eq('id', row.id)
    if (err) { setSaving(null); alert(err.message); return }
    patchRow(row.id, { status: 'rejected', decline_reason: reasonText })
    setDeclineRow(null)
    setEmail(row.id, 'sending', '')
    const { subject, html } = buildAmbassadorDeclineEmail(row, reasonText)
    const res = await sendAmbassadorEmail({ to: row.email, subject, html })
    setEmail(row.id, res.ok ? 'sent' : 'error', res.ok ? `Decline email sent to ${row.email}` : res.error)
    if (res.ok) logAmbassadorSend(row, { to: row.email, subject, body: `Declined — ${reasonText}` })
    setSaving(null)
  }

  // Follow-up: PR box details, tracking + comments.
  const shipVal = (row, field) => (ship[row.id]?.[field] ?? row[field] ?? '')
const requestShipmentSave = (row, alsoEmail) => {
  const trackingNumber = String(shipVal(row, 'tracking_number') || '').trim()
  const trackingUrl = String(shipVal(row, 'tracking_url') || '').trim()
  if (alsoEmail && (!trackingNumber || !trackingUrl)) {
    setEmail(row.id, 'error', 'Enter both tracking number and tracking URL before completing this shipment flow.')
    alert('To complete this shipment flow, enter both the tracking number and tracking URL first.')
    return
  }
  setShipDatePrompt({ rowId: row.id, alsoEmail, date: String(reminderDateVal(row, null) || '').trim() })
}
  const setShipField = (id, field, value) => setShip(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  const NOTE_AUTHOR_SWATCHES = [
    { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
    { bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC' },
    { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
    { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
    { bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
    { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' },
  ]
  const getAdminDisplayLabel = () => String(currentAdminEmail || '').trim() || 'admin@unknown'
  const parseNoteLine = (line) => {
    const raw = String(line || '').trim()
    const match = raw.match(/^\[([^\]]+)\]\s*(?:\[([^\]]+)\]\s*)?(.*)$/)
    if (!match) return { raw, stamp: null, author: null, text: raw }
    return {
      raw,
      stamp: match[1] || null,
      author: String(match[2] || '').trim() || null,
      text: String(match[3] || '').trim(),
    }
  }
  const authorSwatch = (author) => NOTE_AUTHOR_SWATCHES[hashKey(String(author || 'unknown')) % NOTE_AUTHOR_SWATCHES.length]
const renderAmbassadorMessageLine = (line) => {
const text = String(line || '')
const m = text.match(/ by ([^\s\u00b7]+@[^\s\u00b7]+)/)
if (!m) return text
const email = m[1]
const swatch = authorSwatch(email)
const idx = text.indexOf(m[0])
const before = text.slice(0, idx)
const after = text.slice(idx + m[0].length)
return (<>{before} by <span className="rounded border px-1 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: swatch.bg, color: swatch.text, borderColor: swatch.border }}>{email}</span>{after}</>)
}
  const readMetaTag = (row, tagName) => extractTaggedRawValue(row?.admin_comment, tagName)
  const decodeReminderNote = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    try { return decodeURIComponent(raw) } catch (_) { return raw }
  }
  const encodeReminderNote = (value) => {
    const raw = String(value || '').trim()
    return raw ? encodeURIComponent(raw) : ''
  }
  const buildCommentWithMeta = (row, patch) => {
    let nextComment = String(row?.admin_comment || '')
    if (Object.prototype.hasOwnProperty.call(patch, 'sentAt')) {
      nextComment = ensureTaggedValue(nextComment, 'SHIPMENT_SENT_AT', patch.sentAt || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'nextReminderAt')) {
      nextComment = ensureTaggedValue(nextComment, 'SHIPMENT_NEXT_REMINDER_AT', patch.nextReminderAt || '')
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'nextReminderNote')) {
      nextComment = ensureTaggedValue(nextComment, 'SHIPMENT_REMINDER_NOTE', encodeReminderNote(patch.nextReminderNote))
    }
    return nextComment
  }
  const saveShipmentMeta = async (row, patch) => {
    const nextComment = buildCommentWithMeta(row, patch)
    const { error: err } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: nextComment || null }).eq('id', row.id)
    if (err) return { ok: false, error: err.message }
    patchRow(row.id, { admin_comment: nextComment || null })
    return { ok: true, comment: nextComment || null }
  }
  const reminderNoteVal = (row) => {
    if (Object.prototype.hasOwnProperty.call(reminderNoteDraft, row.id)) return reminderNoteDraft[row.id]
    return decodeReminderNote(readMetaTag(row, 'SHIPMENT_REMINDER_NOTE'))
  }
  const reminderDateVal = (row, fallbackIso) => {
    if (Object.prototype.hasOwnProperty.call(reminderDateDraft, row.id)) return reminderDateDraft[row.id]
    const tagged = readMetaTag(row, 'SHIPMENT_NEXT_REMINDER_AT') || fallbackIso || ''
    return tagged ? String(tagged).slice(0, 10) : ''
  }
  const getAmbassadorType = (row) => extractTaggedValue(row?.admin_comment, 'AMBASSADOR_TYPE')
  const setAmbassadorType = async (row, type) => {
    const normalized = String(type || '').trim().toLowerCase()
    const value = ['standard_ambassador', 'super_ambassador', 'extreme_ambassador'].includes(normalized) ? normalized : ''
    const nextComment = ensureTaggedValue(row.admin_comment, 'AMBASSADOR_TYPE', value ? value.toUpperCase() : '')
    setSaving(row.id)
    const { error: err } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: nextComment }).eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    patchRow(row.id, { admin_comment: nextComment })
  }
  const getFactoryAck = (row) => extractTaggedValue(row?.admin_comment, 'FACTORY_ACK')
  const formatAmbassadorAddress = (row) => [
    row?.address,
    [row?.city, row?.postal_code].filter(Boolean).join(' '),
    row?.country,
  ].filter(Boolean).join(', ')
  const exportFactoryPrepPdfForRow = async (row) => {
    if (factoryPdfBusy) return
    setFactoryPdfBusy(true)
    try {
      if (!row || !row.id) {
        throw new Error('Ambassador record is missing.')
      }
      if (normalizeAmbassadorStatus(row?.status) !== 'approved') {
        alert('Approve this ambassador before printing a factory prep sheet.')
        setFactoryPdfBusy(false)
        return
      }

      const ambassadorType = getAmbassadorType(row)
      const selectedPack = AMBASSADOR_PACKS_BY_TYPE[ambassadorType] || null
      const ambassadors = [{
        fullName: String(row?.full_name || '').trim() || 'Unknown ambassador',
        instagram: String(row?.instagram || '').trim(),
        email: String(row?.email || '').trim().toLowerCase(),
        discountCode: String(row?.discount_code || '').trim().toUpperCase(),
        ambassadorType: ambassadorType || 'not_set',
        packTitle: selectedPack?.title || 'Pack type not set',
        packItems: selectedPack?.items || [],
        address: formatAmbassadorAddress(row) || 'Address not provided',
        status: normalizeAmbassadorStatus(row?.status) || 'unknown',
        createdAt: String(row?.created_at || ''),
      }]

      const { blob, filename } = await buildAmbassadorFactoryPrepPdf({
        ambassadors,
        generatedAt: new Date().toISOString(),
      })
      triggerFileDownload(blob, filename)
      alert(`Factory prep sheet downloaded for ${row.full_name || 'ambassador'}.`)
    } catch (err) {
      alert(`Factory PDF export failed: ${err?.message || String(err)}`)
    }
    setFactoryPdfBusy(false)
  }
  const isAmbassadorDiscountCodeCollisionError = (err) => {
    const message = String(err?.message || '')
    return /duplicate key value violates unique constraint/i.test(message)
      && /idx_ambassador_(applications|codes)_discount_code|discount_code/i.test(message)
  }
  const makeAmbassadorCodePrefix = (row) => {
    const cleanToken = (value) => String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^@+/, '')
      .replace(/[^A-Za-z0-9]+/g, '')
      .toUpperCase()
    const handle = cleanToken(row?.instagram)
    const firstName = cleanToken(String(row?.full_name || '').trim().split(/\s+/)[0] || '')
    const source = handle || firstName || 'AMB'
    return source.slice(0, 6) || 'AMB'
  }
  const makeAmbassadorCodeCandidate = (row) => {
    const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    let suffix = ''
    for (let i = 0; i < bytes.length; i += 1) {
      suffix += alphabet[bytes[i] % alphabet.length]
    }
    return `${makeAmbassadorCodePrefix(row)}-${suffix.slice(0, 4)}`
  }
  const generateUniqueAmbassadorCode = async (row) => {
    const [codesRes, appsRes] = await Promise.all([
      supabase.from('ambassador_codes').select('code'),
      supabase.from(AMBASSADOR_TABLE).select('discount_code'),
    ])
    if (codesRes.error) throw codesRes.error
    if (appsRes.error) throw appsRes.error
    const used = new Set([
      ...(codesRes.data || []).map((r) => String(r.code || '').trim().toUpperCase()).filter(Boolean),
      ...(appsRes.data || []).map((r) => String(r.discount_code || '').trim().toUpperCase()).filter(Boolean),
    ])
    let code = makeAmbassadorCodeCandidate(row)
    let attempts = 0
    while (used.has(code.toUpperCase()) && attempts < 50) {
      code = makeAmbassadorCodeCandidate(row)
      attempts += 1
    }
    if (used.has(code.toUpperCase())) {
      throw new Error('Could not generate a unique ambassador code.')
    }
    return code
  }
  const approveAmbassadorWithFallback = async (row) => {
    const reviewedAt = new Date().toISOString()
    const notes = `Auto-created from approved ambassador application #${row.id}`
    let discountCode = null
    let lastCodeErr = null
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = await generateUniqueAmbassadorCode(row)
      const { error: codeErr } = await supabase.from('ambassador_codes').insert({
        code: candidate,
        ambassador_name: row.full_name,
        ambassador_email: row.email,
        discount_pct: 20,
        commission_pct: 20,
        active: true,
        notes,
      })
      if (!codeErr) {
        discountCode = candidate
        break
      }
      lastCodeErr = codeErr
      if (!isAmbassadorDiscountCodeCollisionError(codeErr)) throw codeErr
    }
    if (!discountCode) throw lastCodeErr || new Error('Could not create ambassador code.')
    const { error: appErr } = await supabase
      .from(AMBASSADOR_TABLE)
      .update({
        status: 'approved',
        reviewed_at: reviewedAt,
        reviewed_by: currentAdminEmail || null,
        discount_code: discountCode,
        discount_code_created_at: reviewedAt,
      })
      .eq('id', row.id)
    if (appErr) throw appErr
    const updatedRow = { ...row, status: 'approved', reviewed_at: reviewedAt, discount_code: discountCode }
    patchRow(row.id, { status: 'approved', reviewed_at: reviewedAt, discount_code: discountCode, discount_code_created_at: reviewedAt })
    await sendWelcomeContractEmail(updatedRow)
    try {
      const factorySubject = `New GEL.IT.UP Ambassador approved — ${updatedRow.full_name || 'New ambassador'}`
      const factoryHtml = `<p>A new ambassador has been approved and a PR package needs preparing.</p><p><strong>Name:</strong> ${updatedRow.full_name || ''}<br/><strong>Instagram:</strong> ${updatedRow.instagram || ''}<br/><strong>Country:</strong> ${updatedRow.country || ''}<br/><strong>Address:</strong> ${updatedRow.address || ''}, ${updatedRow.city || ''} ${updatedRow.postal_code || ''}<br/><strong>Ambassador code:</strong> ${discountCode || ''}</p><p>Please mark it acknowledged in the admin panel once you've seen this.</p>`
      await Promise.all(['leeukopf@gmail.com', 'acc1.leeukopf@gmail.com'].map((to) => sendAmbassadorEmail({ to, subject: factorySubject, html: factoryHtml })))
    } catch (_) {}
  }
  const acknowledgeFactory = async (row) => {
    const value = `${getAdminDisplayLabel()} on ${fmtDate(new Date().toISOString())}`
    const nextComment = ensureTaggedValue(row.admin_comment, 'FACTORY_ACK', value)
    setSaving(row.id)
    const { error: err } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: nextComment }).eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    patchRow(row.id, { admin_comment: nextComment })
  }

  // Internal notes log — appends a timestamped entry to admin_comment and clears the input.
  const addNote = async (row) => {
    const note = (noteDraft[row.id] || '').trim()
    if (!note) return
    const stamp = fmtDate(new Date().toISOString())
    const entry = `[${stamp}] [${getAdminDisplayLabel()}] ${note}`
    const newLog = row.admin_comment ? `${row.admin_comment}\n${entry}` : entry
    setSaving(row.id)
    const { error: err } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: newLog }).eq('id', row.id)
    if (err) { setSaving(null); alert(err.message); return }
    patchRow(row.id, { admin_comment: newLog })
    setNoteDraft(prev => ({ ...prev, [row.id]: '' }))
    setSaving(null)
  }

  // A sent-message log line is marked with the 📧 glyph. Historically these were
  // appended into admin_comment; we now keep them out of the editable notes and
  // surface them (plus the new message_log column) in the Messages section.
  const isAmbassadorMsgLine = (line) => String(line).includes('📧')
  const isMetaLine = (line) => /^\[(AMBASSADOR_TYPE|SHIPMENT_SENT_AT|SHIPMENT_NEXT_REMINDER_AT|SHIPMENT_REMINDER_NOTE):[^\]]+\]$/i.test(String(line).trim())

  const noteLines = (row) => String(row.admin_comment || '').split('\n').filter((l) => l.trim() && !isAmbassadorMsgLine(l) && !isMetaLine(l))
  const noteEntries = (row) => noteLines(row).map((line) => parseNoteLine(line))

  // Outbound message trail (separate from internal notes). Merges the dedicated
  // message_log column with any legacy 📧 lines still living in admin_comment so
  // every admin sees the full communication history, old and new.
  const messageLines = (row) => {
    const historical = String(row.admin_comment || '').split('\n').filter((l) => l.trim() && isAmbassadorMsgLine(l))
    const fromLog = String(row.message_log || '').split('\n').filter((l) => l.trim())
    const seen = new Set()
    return [...historical, ...fromLog].filter((l) => { if (seen.has(l)) return false; seen.add(l); return true })
  }
  const latestShipmentHistory = (row) => {
    const lines = messageLines(row).filter((l) => /PR package is on the way/i.test(String(l)))
    const latest = lines.length ? lines[lines.length - 1] : null
    if (!latest) return { sentAtIso: null, sentAtLabel: null }
    const stampMatch = String(latest).match(/^\[([^\]]+)\]/)
    const sentAtLabel = stampMatch?.[1] || null
    const sentAtIso = parseDateLabelToIso(sentAtLabel)
    return { sentAtIso, sentAtLabel }
  }
  const shipmentHistoryEntries = (row) => String(row.admin_comment || '')
    .split('\n')
    .filter((line) => /📦\s*Shipped\s*—/i.test(String(line)))
    .map((line) => {
      const text = String(line || '')
      const stamp = text.match(/^\[([^\]]+)\]/)?.[1] || null
      const trackingNumber = text.match(/Tracking:\s*([^·]+)/i)?.[1]?.trim() || ''
      const trackingUrl = text.match(/(https?:\/\/[^\s·]+)/i)?.[1] || ''
      const boxContents = text.match(/Box:\s*(.+)$/i)?.[1]?.trim() || ''
      return { raw: text, stamp, trackingNumber, trackingUrl, boxContents }
    })
    .reverse()
  const hasWelcomeContractSent = (row) => messageLines(row).some((line) => {
    const text = String(line)
    return /Welcome email with Ambassador Agreement PDF attached\./i.test(text)
      || /Welcome to the GEL\.IT\.UP Ambassador Programme/i.test(text)
  })

  // Auto-log an outgoing email to the shared message trail so every admin can
  // see the interaction (who emailed the ambassador, when, and what was said).
  // Stored as one line, kept apart from the editable internal notes.
  // Best-effort: a logging failure never affects the email already sent.
  const logAmbassadorSend = async (row, { to, subject, body }) => {
    if (!row) return
    const stamp = fmtDate(new Date().toISOString())
    const who = currentAdminEmail ? ` by ${currentAdminEmail}` : ''
    const flat = String(body || '').replace(/\s*\n\s*/g, ' ⏎ ').trim()
    const entry = `[${stamp}] 📧 Sent to ${to}${who} · “${subject}”${flat ? ` — ${flat}` : ''}`
    const newLog = row.message_log ? `${row.message_log}\n${entry}` : entry
    const { error: err } = await supabase.from(AMBASSADOR_TABLE).update({ message_log: newLog }).eq('id', row.id)
    if (!err) { patchRow(row.id, { message_log: newLog }); return }
    // Fallback: the message_log column may not exist yet (migration not run).
    // Append the 📧 line to admin_comment instead — the Messages section reads
    // those legacy lines and the internal notes list filters them out, so the
    // message still shows for every admin regardless of the migration state.
    const newComment = row.admin_comment ? `${row.admin_comment}\n${entry}` : entry
    const { error: err2 } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: newComment }).eq('id', row.id)
    if (!err2) patchRow(row.id, { admin_comment: newComment })
  }

  const saveNotes = async (row, lines) => {
    // Preserve any legacy 📧 message lines so editing/deleting a note never drops
    // the historical communication trail from admin_comment.
    const preserved = String(row.admin_comment || '').split('\n').filter((l) => {
      const trimmed = String(l).trim()
      return trimmed && (isAmbassadorMsgLine(trimmed) || isMetaLine(trimmed))
    })
    const newLog = [...preserved, ...lines].join('\n') || null
    setSaving(row.id)
    const { error: err } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: newLog }).eq('id', row.id)
    if (err) { setSaving(null); alert(err.message); return }
    patchRow(row.id, { admin_comment: newLog })
    setSaving(null)
  }

  const editNote = async (row, idx) => {
    const lines = noteLines(row)
    const original = parseNoteLine(lines[idx])
    const edited = window.prompt('Edit note:', original.text || original.raw)
    if (edited === null) return
    if (!edited.trim()) {
      lines.splice(idx, 1)
    } else if (original.stamp || original.author) {
      const stamp = original.stamp || fmtDate(new Date().toISOString())
      const author = ` [${original.author || getAdminDisplayLabel()}]`
      lines[idx] = `[${stamp}]${author} ${edited.trim()}`
    } else {
      lines[idx] = `[${fmtDate(new Date().toISOString())}] [${getAdminDisplayLabel()}] ${edited.trim()}`
    }
    await saveNotes(row, lines)
  }

  const deleteNote = async (row, idx) => {
    if (!window.confirm('Delete this note?')) return
    const lines = noteLines(row)
    lines.splice(idx, 1)
    await saveNotes(row, lines)
  }

  const saveShipment = async (row, alsoEmail, overrideReminderDate) => {
  const currentDraft = getShipmentDraft(row)
  const hasShipmentInfo = Boolean(currentDraft.tracking_number || currentDraft.tracking_url || currentDraft.shipment_details)
  const draft = {
    shipment_details: currentDraft.shipment_details || null,
    tracking_number: currentDraft.tracking_number || null,
    tracking_url: currentDraft.tracking_url || null,
  }
  setSaving(row.id)
  const { error: err } = await supabase.from(AMBASSADOR_TABLE).update(draft).eq('id', row.id)
  if (err) { setSaving(null); alert(err.message); return }
  patchRow(row.id, draft)
  // Track the latest admin_comment so subsequent saveShipmentMeta calls don't overwrite the archive line.
  let latestAdminComment = row.admin_comment
  if (hasShipmentInfo) {
    const shippedStamp = fmtDate(new Date().toISOString())
    const archiveLine = `[${shippedStamp}] [${getAdminDisplayLabel()}] 📦 Shipped — ${[
      currentDraft.tracking_number ? `Tracking: ${currentDraft.tracking_number}` : null,
      currentDraft.tracking_url || null,
      currentDraft.shipment_details ? `Box: ${currentDraft.shipment_details}` : null,
    ].filter(Boolean).join(' · ')}`
    const loggedComment = latestAdminComment ? `${latestAdminComment}\n${archiveLine}` : archiveLine
    const { error: logErr } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: loggedComment }).eq('id', row.id)
    if (!logErr) { patchRow(row.id, { admin_comment: loggedComment }); latestAdminComment = loggedComment }
    if (!alsoEmail) {
      setShip((prev) => ({ ...prev, [row.id]: { ...prev[row.id], shipment_details: '', tracking_number: '', tracking_url: '' } }))
    }
  }
  if (alsoEmail) {
    const updatedRow = { ...row, ...draft }
    const fullName = String(updatedRow?.full_name || '').trim()
    const discountCode = String(updatedRow?.discount_code || '').trim()
    const normalizedEmail = String(updatedRow?.email || '').trim().toLowerCase()
    const setPasswordLink = `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(normalizedEmail)}`
    if (!fullName) { setSaving(null); setEmail(row.id, 'error', 'Shipment email blocked: ambassador name is missing.'); return }
    if (!discountCode) { setSaving(null); setEmail(row.id, 'error', 'Shipment email blocked: discount code is missing.'); return }
    if (!normalizedEmail) { setSaving(null); setEmail(row.id, 'error', 'Shipment email blocked: ambassador email is missing.'); return }
    setEmail(row.id, 'sending', '')
    try { await ensureAmbassadorPortalAccount(updatedRow) } catch (e) { setSaving(null); setEmail(row.id, 'error', e.message || 'Could not provision ambassador portal account.'); return }
    const chosenReminderRaw = String(overrideReminderDate || reminderDateVal(row, null) || '').trim()
    if (!chosenReminderRaw) {
      setSaving(null)
      setEmail(row.id, 'error', 'Set a next package reminder date before completing this shipment flow.')
      alert('Set a next package reminder date before completing this shipment flow.')
      return
    }
    const chosenReminderAt = new Date(`${chosenReminderRaw}T10:00:00Z`)
    if (Number.isNaN(chosenReminderAt.getTime())) {
      setSaving(null)
      setEmail(row.id, 'error', 'Reminder date is invalid.')
      alert('Reminder date is invalid.')
      return
    }
    const { subject, html } = buildAmbassadorShipmentEmail(updatedRow, draft, setPasswordLink, chosenReminderAt.toISOString())
    let attachments = []
    try {
      const letterPdf = await buildAmbassadorWelcomeLetterPdf({ fullName: updatedRow.full_name, discountCode: updatedRow.discount_code })
      attachments = [{ filename: letterPdf.filename, content: letterPdf.base64, contentType: 'application/pdf' }]
    } catch (e) { setSaving(null); setEmail(row.id, 'error', e.message || 'Could not build personalised welcome letter PDF.'); return }
    const res = await sendAmbassadorEmail({ to: row.email, subject, html, attachments })
    setEmail(row.id, res.ok ? 'sent' : 'error', res.ok ? `Shipment email + About Us letter sent to ${row.email}` : res.error)
    if (res.ok) {
      const sentAt = new Date().toISOString()
      const nextReminderAt = chosenReminderAt.toISOString()
      const nextReminderNote = reminderNoteVal(row) || currentDraft.shipment_details || ''
      setShip((prev) => ({ ...prev, [row.id]: { ...prev[row.id], shipment_details: '', tracking_number: '', tracking_url: '' } }))
      persistShipmentEmailLock((prev) => ({ ...prev, [row.id]: { signature: JSON.stringify(currentDraft), sentAt }, }))
      const metaResult = await saveShipmentMeta(row, { sentAt, nextReminderAt, nextReminderNote })
      if (!metaResult.ok) { setEmail(row.id, 'error', `Shipment email sent, but reminder metadata failed to save: ${metaResult.error}`); setSaving(null); return }
      setReminderDateDraft((prev) => ({ ...prev, [row.id]: nextReminderAt ? nextReminderAt.slice(0, 10) : '' }))
      setReminderNoteDraft((prev) => ({ ...prev, [row.id]: nextReminderNote }))
      setNextPackageMode((prev) => ({ ...prev, [row.id]: false }))
      setShipmentPanelOpen((prev) => ({ ...prev, [row.id]: false }))
      logAmbassadorSend(updatedRow, { to: row.email, subject, body: htmlToText(html) })
      openReminderDraft(updatedRow, sentAt, fmtDateTime(sentAt), nextReminderAt, nextReminderNote)
    }
  } else {
    const chosenReminderRawB = String(overrideReminderDate || reminderDateVal(row, null) || '').trim()
    if (chosenReminderRawB) {
      const chosenIso = new Date(`${chosenReminderRawB}T10:00:00Z`).toISOString()
      await saveShipmentMeta({ ...row, admin_comment: latestAdminComment }, { nextReminderAt: chosenIso, nextReminderNote: reminderNoteVal(row) })
      setReminderDateDraft((prev) => ({ ...prev, [row.id]: chosenIso.slice(0, 10) }))
    }
    setEmail(row.id, 'sent', hasShipmentInfo ? 'Shipment logged — box & tracking cleared for the next parcel' : 'Follow-up details saved')
  }
  setSaving(null)
} 
const resendShipmentEmail = async (row, nextReminderAt) => {
  const trackingNumber = String(row?.tracking_number || '').trim()
  const trackingUrl = String(row?.tracking_url || '').trim()
  if (!trackingNumber || !trackingUrl) {
    alert('Tracking number and tracking URL must be saved on this record before resending.')
    return
  }
  const fullName = String(row?.full_name || '').trim()
  const discountCode = String(row?.discount_code || '').trim()
  const normalizedEmail = String(row?.email || '').trim().toLowerCase()
  if (!fullName || !discountCode || !normalizedEmail) {
    alert('Ambassador name, discount code, and email are all required to resend the tracking email.')
    return
  }
  if (!window.confirm(`Resend tracking email (with welcome letter) to ${normalizedEmail}?`)) return
  setSaving(row.id)
  setEmail(row.id, 'sending', '')
  try { await ensureAmbassadorPortalAccount(row) } catch (e) { setSaving(null); setEmail(row.id, 'error', e.message || 'Could not provision ambassador portal account.'); return }
  const setPasswordLink = `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(normalizedEmail)}`
  const reminderIso = nextReminderAt ? new Date(`${String(nextReminderAt).slice(0, 10)}T10:00:00Z`).toISOString() : null
  const draft = { tracking_number: trackingNumber, tracking_url: trackingUrl }
  const { subject, html } = buildAmbassadorShipmentEmail(row, draft, setPasswordLink, reminderIso)
  let attachments = []
  try {
    const letterPdf = await buildAmbassadorWelcomeLetterPdf({ fullName: row.full_name, discountCode: row.discount_code })
    attachments = [{ filename: letterPdf.filename, content: letterPdf.base64, contentType: 'application/pdf' }]
  } catch (e) { setSaving(null); setEmail(row.id, 'error', e.message || 'Could not build welcome letter PDF.'); return }
  const res = await sendAmbassadorEmail({ to: normalizedEmail, subject, html, attachments })
  if (res.ok) {
    const resendStamp = `[${fmtDateTime(new Date().toISOString())}] [${getAdminDisplayLabel()}] 📧 Tracking email resent to ${normalizedEmail}`
    const updatedComment = row.admin_comment ? `${row.admin_comment}\n${resendStamp}` : resendStamp
    await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: updatedComment }).eq('id', row.id)
    patchRow(row.id, { admin_comment: updatedComment })
    setEmail(row.id, 'sent', `Tracking email + welcome letter resent to ${normalizedEmail}`)
  } else {
    setEmail(row.id, 'error', res.error || 'Failed to resend tracking email.')
  }
  setSaving(null)
}

const updateAmbassadorCodeAndNotify = async (row) => {
  const previousCode = String(row?.discount_code || '').trim()
  const normalizedEmail = String(row?.email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    alert('Ambassador email is required before updating the code.')
    return
  }
  const nextCode = await generateUniqueAmbassadorCode(row)
  if (!window.confirm(`Update ${row.full_name || 'this ambassador'}'s code from ${previousCode || 'unassigned'} to ${nextCode} and email the change now?`)) return
  setSaving(row.id)
  setEmail(row.id, 'sending', '')

  const codeUpdate = {
    code: nextCode,
    ambassador_name: row.full_name,
    ambassador_email: row.email,
    active: true,
  }
  const { error: codeErr } = await supabase
    .from('ambassador_codes')
    .update(codeUpdate)
    .eq('code', previousCode || nextCode)
  if (codeErr) {
    setSaving(null)
    setEmail(row.id, 'error', codeErr.message || 'Could not update ambassador code.')
    alert(codeErr.message)
    return
  }

  const reviewedAt = new Date().toISOString()
  const { error: appErr } = await supabase
    .from(AMBASSADOR_TABLE)
    .update({
      discount_code: nextCode,
      discount_code_created_at: reviewedAt,
    })
    .eq('id', row.id)
  if (appErr) {
    setSaving(null)
    setEmail(row.id, 'error', appErr.message || 'Could not update ambassador application.')
    alert(appErr.message)
    return
  }

  const updatedRow = { ...row, discount_code: nextCode, discount_code_created_at: reviewedAt }
  patchRow(row.id, { discount_code: nextCode, discount_code_created_at: reviewedAt })
  const { subject, html } = buildAmbassadorCodeUpdateEmail(row, previousCode, nextCode)
  const res = await sendAmbassadorEmail({ to: normalizedEmail, subject, html })
  setEmail(row.id, res.ok ? 'sent' : 'error', res.ok ? `Code updated and confirmation sent to ${normalizedEmail}` : res.error)
  if (res.ok) logAmbassadorSend(updatedRow, { to: normalizedEmail, subject, body: htmlToText(html) })
  setSaving(null)
}

const deleteApplication = async (row) => {
  if (String(row?.status || '').toLowerCase() !== 'rejected') {
    alert('Only rejected applications can be deleted.')
      return
    }
    if (!window.confirm(`Permanently delete rejected application from "${row.full_name}" (${row.email})?\n\nThis cannot be undone.`)) return
    if (window.prompt('Type DELETE to confirm:') !== 'DELETE') { alert('Delete cancelled.'); return }
    setSaving(row.id)
    const { error: err } = await supabase.from(AMBASSADOR_TABLE).delete().eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.filter(r => r.id !== row.id))
  }

  const FILTERS = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900">Ambassador Applications</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-slate-500">{filter === 'pending' ? 'No applications waiting for review. 🎉' : 'No applications found.'}</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => {
            const es = emailStatus[row.id]
            const isOpen = openIds.has(row.id)
            const normalizedStatus = normalizeAmbassadorStatus(row.status)
            const isApproved = normalizedStatus === 'approved'
            const isRejected = normalizedStatus === 'rejected'
            const shipmentLockRaw = shipmentEmailLock[row.id]
            const shipmentLock = (shipmentLockRaw && typeof shipmentLockRaw === 'object')
              ? shipmentLockRaw
              : (typeof shipmentLockRaw === 'string' ? { signature: shipmentLockRaw, sentAt: null } : null)
            const isShipmentLocked = shipmentLock?.signature === shipmentSignature(row)
            const sentAtMeta = readMetaTag(row, 'SHIPMENT_SENT_AT')
            const reminderAtMeta = readMetaTag(row, 'SHIPMENT_NEXT_REMINDER_AT')
            const shipmentHistory = latestShipmentHistory(row)
            const sentAt = shipmentLock?.sentAt || sentAtMeta || shipmentHistory.sentAtIso || null
            const sentAtLabel = sentAt ? fmtDateTime(sentAt) : (shipmentHistory.sentAtLabel || null)
            const shipmentPreviouslySent = Boolean(sentAt || shipmentHistory.sentAtLabel)
            const nextReminderAt = reminderAtMeta || (sentAt ? addOneMonth(sentAt) : null)
            const nextReminderNote = reminderNoteVal(row)
            const contractAlreadySent = hasWelcomeContractSent(row)
            const ambassadorType = getAmbassadorType(row)
            const factoryAckValue = getFactoryAck(row)
            const ambassadorTypeLabel = ambassadorType === 'super_ambassador'
              ? 'Super Ambassador'
              : ambassadorType === 'extreme_ambassador'
                ? 'Extreme Ambassador'
              : ambassadorType === 'standard_ambassador'
                ? 'Standard Ambassador'
                : 'Not set'
            const selectedPack = AMBASSADOR_PACKS_BY_TYPE[ambassadorType] || null
            const isNextPackageMode = Boolean(nextPackageMode[row.id])
            const isShipmentClosed = shipmentPreviouslySent && !isNextPackageMode
            const isShipmentPanelExpanded = shipmentPanelOpen[row.id] ?? !isShipmentClosed
            const isReminderDue = Boolean(nextReminderAt && new Date(nextReminderAt).getTime() <= Date.now())
            const setupSectionComplete = isApproved && contractAlreadySent && Boolean(ambassadorType) && shipmentPreviouslySent
            const shipmentEntries = shipmentHistoryEntries(row)
            const discountCodeKey = String(row?.discount_code || '').trim().toUpperCase()
            const codePerformance = discountCodeKey ? codePerformanceByCode[discountCodeKey] : null
            const hasTrackingNumber = Boolean(String(shipVal(row, 'tracking_number') || '').trim())
            const hasTrackingUrl = Boolean(String(shipVal(row, 'tracking_url') || '').trim())
            const trackingFlowReady = hasTrackingNumber && hasTrackingUrl
            const isMessagesSectionOpen = isSectionOpen(row.id, 'messages', false)
            const isShipmentSectionOpen = isSectionOpen(row.id, 'shipment', !setupSectionComplete)
            const isHistorySectionOpen = isSectionOpen(row.id, 'history', shipmentEntries.length <= 1)
            return (
              <div key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* Collapsible header — click anywhere to open/close */}
                <button
                  type="button"
                  onClick={() => toggleOpen(row.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-semibold text-slate-900">{row.full_name}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${ambassadorStatusPill(row.status)}`}>
                      {row.status || 'new'}
                    </span>
                    <span className="text-xs text-fuchsia-700">@{row.instagram}</span>
                    <span className="text-[11px] text-slate-400">{row.country ? `${row.country} · ` : ''}{fmtDate(row.created_at)}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] font-medium text-slate-400">{isOpen ? 'Close' : 'Open'}</span>
                </button>

                {isOpen && (
                <div className="border-t border-slate-200 p-4">
                <div className="space-y-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                      <a href={`https://instagram.com/${row.instagram}`} target="_blank" rel="noreferrer" className="font-medium text-fuchsia-700 hover:underline">@{row.instagram}</a>
                      {row.tiktok && <a href={`https://tiktok.com/@${row.tiktok}`} target="_blank" rel="noreferrer" className="font-medium text-slate-700 hover:underline">TikTok @{row.tiktok}</a>}
                      {row.followers && <span>{row.followers} followers</span>}
                      <a href={`mailto:${row.email}`} className="hover:underline">{row.email}</a>
                      {row.phone && <a href={`tel:${row.phone}`} className="hover:underline">📞 {row.phone}</a>}
                      {row.facebook && <a href={`https://facebook.com/${row.facebook}`} target="_blank" rel="noreferrer" className="hover:underline">FB {row.facebook}</a>}
                    </div>
                    {(() => {
                      const ship = [row.address, [row.city, row.postal_code].filter(Boolean).join(' '), row.country].filter(Boolean).join(', ')
                      return ship
                        ? <p className="mt-1 text-xs text-slate-600">📦 <span className="font-medium">{ship}</span></p>
                        : <p className="mt-1 text-xs text-amber-600">📦 No shipping address on file (applied on the older form — ask them to re-apply)</p>
                    })()}
                    {row.message && (
                      <p className="mt-2 whitespace-pre-line text-xs italic text-slate-600">“{row.message}”</p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-fuchsia-700">
                      Discount code:{' '}
                      {row.discount_code
                        ? <span className="font-mono">{row.discount_code}</span>
                        : <span className="text-amber-700">Not assigned yet</span>}
                    </p>
                    {row.discount_code && (
                      <div className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600">
                        <p><strong>Code performance:</strong> {codePerformance?.orders || 0} order{(codePerformance?.orders || 0) === 1 ? '' : 's'} · €{Number(codePerformance?.orderValueEur || 0).toFixed(2)} sales value</p>
                        <p><strong>Estimated ambassador earnings:</strong> €{Number(codePerformance?.commissionEur || 0).toFixed(2)}</p>
                        <p><strong>Last order with this code:</strong> {codePerformance?.lastRedemptionAt ? fmtDateTime(codePerformance.lastRedemptionAt) : 'No redemptions yet'}</p>
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {row.agreed_terms
                        ? <>✓ Signed the Ambassador Agreement {row.agreement_version ? `(${row.agreement_version})` : ''} on {fmtDate(row.created_at)}</>
                        : <span className="text-rose-500">⚠ No agreement on record</span>}
                    </p>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => openMessage(row)}
                        disabled={saving === row.id}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                      >
                        ✉ Message
                      </button>
                      {isApproved && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Send the welcome email with the Ambassador Agreement PDF to ${row.full_name} (${row.email})?`)) return
                            setSaving(row.id)
                            await sendWelcomeContractEmail(row)
                            setSaving(null)
                          }}
                          disabled={saving === row.id || contractAlreadySent}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                            contractAlreadySent
                              ? 'border-slate-200 bg-slate-100 text-slate-400'
                              : 'border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50'
                          }`}
                        >
                          {contractAlreadySent ? '📄 Contract sent' : '📄 Send contract'}
                        </button>
                      )}
                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => exportFactoryPrepPdfForRow(row)}
                          disabled={factoryPdfBusy}
                          className="rounded-lg border border-fuchsia-300 bg-white px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-60"
                        >
                          {factoryPdfBusy ? 'Preparing sheet…' : '↓ Print Factory Sheet'}
                        </button>
                      )}
                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => updateAmbassadorCodeAndNotify(row)}
                          disabled={saving === row.id}
                          className="rounded-lg border border-fuchsia-300 bg-white px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-60"
                        >
                          ↻ Update code & notify
                        </button>
                      )}
                      {isApproved && (factoryAckValue ? (
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">🏭 Factory acknowledged</span>
                      ) : (
                        <button
                          onClick={() => acknowledgeFactory(row)}
                          disabled={saving === row.id}
                          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                        >
                          🏭 Mark factory acknowledged
                        </button>
                      ))}
                      {!isApproved && (
                        <button
                          onClick={() => approveRow(row)}
                          disabled={saving === row.id}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                        >
                          ✓ Approve
                        </button>
                      )}
                      {!isRejected && (
                        <button
                          onClick={() => openDecline(row)}
                          disabled={saving === row.id}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                        >
                          ✕ Decline
                        </button>
                      )}
                      {isRejected && (
                        <button
                          onClick={() => deleteApplication(row)}
                          disabled={saving === row.id}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {es && (
                      <p className={`mt-2 text-[11px] ${es.state === 'error' ? 'text-rose-600' : es.state === 'sent' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {es.state === 'sending' ? 'Sending email…' : es.message}
                      </p>
                    )}
                  </div>
                </div>
                {row.status === 'rejected' && row.decline_reason && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <strong>Decline reason:</strong>{'\n'}{row.decline_reason}
                  </p>
                )}
                {row.status === 'rejected' && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Reconsideration notes (private)</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Internal-only notes for future review. These are never emailed to the ambassador.</p>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      {noteEntries(row).length > 0 && (
                        <div className="mb-1.5 max-h-32 space-y-1 overflow-y-auto">
                          {noteEntries(row).map((entry, idx) => {
                            const swatch = authorSwatch(entry.author)
                            return (
                            <div key={idx} className="flex items-start justify-between gap-2 rounded bg-white px-2 py-1 text-[11px] text-slate-600">
                              <span className="min-w-0 whitespace-pre-line">
                                <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400">{entry.stamp || '—'}</span>
                                  <span
                                    className="rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{ backgroundColor: swatch.bg, color: swatch.text, borderColor: swatch.border }}
                                  >
                                    {entry.author || 'legacy note (email not recorded)'}
                                  </span>
                                </span>
                                <span>{entry.text || entry.raw}</span>
                              </span>
                              <span className="flex shrink-0 gap-1.5">
                                <button type="button" title="Edit" onClick={() => editNote(row, idx)} disabled={saving === row.id} className="text-slate-400 transition hover:text-slate-700 disabled:opacity-50">✎</button>
                                <button type="button" title="Delete" onClick={() => deleteNote(row, idx)} disabled={saving === row.id} className="text-slate-400 transition hover:text-rose-600 disabled:opacity-50">🗑</button>
                              </span>
                            </div>
                            )
                          })}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={noteDraft[row.id] || ''}
                          onChange={(e) => setNoteDraft(prev => ({ ...prev, [row.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(row) } }}
                          placeholder="Add future reconsideration note..."
                          className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                        />
                        <button onClick={() => addNote(row)} disabled={saving === row.id || !(noteDraft[row.id] || '').trim()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60">Add note</button>
                      </div>
                    </div>
                  </div>
                )}
                {!isApproved && !isRejected && (<div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Internal notes (private)</p>{noteEntries(row).length > 0 && (<div className="mb-1.5 max-h-32 space-y-1 overflow-y-auto">{noteEntries(row).map((entry, idx) => {const swatch = authorSwatch(entry.author);return (<div key={idx} className="flex items-start justify-between gap-2 rounded bg-white px-2 py-1 text-[11px] text-slate-600"><span className="min-w-0 whitespace-pre-line"><span className="mb-0.5 flex flex-wrap items-center gap-1.5"><span className="text-[10px] text-slate-400">{entry.stamp || '—'}</span><span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: swatch.bg, color: swatch.text, borderColor: swatch.border }}>{entry.author || 'legacy note (email not recorded)'}</span></span><span>{entry.text || entry.raw}</span></span><span className="flex shrink-0 gap-1.5"><button type="button" title="Edit" onClick={() => editNote(row, idx)} disabled={saving === row.id} className="text-slate-400 transition hover:text-slate-700 disabled:opacity-50">✎</button><button type="button" title="Delete" onClick={() => deleteNote(row, idx)} disabled={saving === row.id} className="text-slate-400 transition hover:text-rose-600 disabled:opacity-50">🗑</button></span></div>)})}</div>)}<div className="flex gap-2"><input value={noteDraft[row.id] || ''} onChange={(e) => setNoteDraft(prev => ({ ...prev, [row.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(row) } }} placeholder="Add a note…" className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" /><button onClick={() => addNote(row)} disabled={saving === row.id || !(noteDraft[row.id] || '').trim()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60">Add note</button></div></div>)}
{/* Messages sent to the ambassador — shared record, visible to every admin (read-only) */}
                {messageLines(row).length > 0 && (
                  <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
                    <button
                      type="button"
                      onClick={() => toggleSection(row.id, 'messages')}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Messages sent to ambassador (visible to all admins)</p>
                      <span className="text-[11px] font-semibold text-sky-700">{isMessagesSectionOpen ? 'Hide' : `Show (${messageLines(row).length})`}</span>
                    </button>
                    {isMessagesSectionOpen && (
                      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                        {messageLines(row).map((line, idx) => (
                          <div key={idx} className="whitespace-pre-line rounded bg-white px-2 py-1 text-[11px] text-slate-600">{renderAmbassadorMessageLine(line)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {isApproved && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <button
                      type="button"
                      onClick={() => toggleSection(row.id, 'shipment')}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">PR box &amp; follow-up</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {setupSectionComplete
                            ? 'Setup complete — contract sent, type selected, and first shipment done.'
                            : 'Only the tracking number & URL are emailed to the ambassador. Box contents and comments stay internal.'}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">{isShipmentSectionOpen ? 'Hide' : 'Show'}</span>
                    </button>
                    {isShipmentSectionOpen && (
                      <div className="space-y-2">
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Ambassador package type</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Selected type: <span className="font-semibold text-slate-700">{ambassadorTypeLabel}</span></p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
                        <label className="inline-flex items-center gap-1.5 text-slate-700">
                          <input
                            type="checkbox"
                            checked={ambassadorType === 'standard_ambassador'}
                            disabled={saving === row.id}
                            onChange={() => setAmbassadorType(row, ambassadorType === 'standard_ambassador' ? '' : 'standard_ambassador')}
                          />
                          Standard Ambassador
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-slate-700">
                          <input
                            type="checkbox"
                            checked={ambassadorType === 'super_ambassador'}
                            disabled={saving === row.id}
                            onChange={() => setAmbassadorType(row, ambassadorType === 'super_ambassador' ? '' : 'super_ambassador')}
                          />
                          Super Ambassador
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-slate-700">
                          <input
                            type="checkbox"
                            checked={ambassadorType === 'extreme_ambassador'}
                            disabled={saving === row.id}
                            onChange={() => setAmbassadorType(row, ambassadorType === 'extreme_ambassador' ? '' : 'extreme_ambassador')}
                          />
                          Extreme Ambassador
                        </label>
                      </div>
                      {selectedPack ? (
                        <div className="mt-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 px-2.5 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">{selectedPack.title} contents</p>
                          {selectedPack.items.length > 0 ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-700">
                              {selectedPack.items.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-[11px] text-slate-600">Pack details not added yet for this type.</p>
                          )}
                          <div className="mt-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Extra items to add</p>
                            <textarea
                              value={packAdditionDraft[row.id] || ''}
                              onChange={(e) => setPackAdditionDraft((prev) => ({ ...prev, [row.id]: e.target.value }))}
                              placeholder="Write anything extra to add to this pack..."
                              rows={2}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-slate-500">Select an ambassador type to view the pack contents.</p>
                      )}
                    </div>
                    {shipmentEntries.length > 0 && (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSection(row.id, 'history')}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Monthly package history</p>
                          <span className="text-[11px] font-semibold text-slate-600">{isHistorySectionOpen ? 'Hide' : `Show (${shipmentEntries.length})`}</span>
                        </button>
                        {isHistorySectionOpen && (
                          <div className="mt-2 space-y-1.5">
                            {shipmentEntries.map((entry, idx) => {
                              const rowIdx = idx + 1
                              const open = isShipmentEntryOpen(row.id, idx, idx === 0)
                              return (
                                <div key={`${row.id}-ship-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50">
                                  <button
                                    type="button"
                                    onClick={() => toggleShipmentEntry(row.id, idx)}
                                    className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
                                  >
                                    <span className="text-[11px] font-semibold text-slate-700">Package {rowIdx} · {entry.stamp || 'No date'}</span>
                                    <span className="text-[10px] font-semibold text-slate-500">{open ? 'Hide' : 'Show'}</span>
                                  </button>
                                  {open && (
                                    <div className="space-y-1 border-t border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                                      <p><strong>Tracking:</strong> {entry.trackingNumber || '—'}</p>
                                      <p><strong>URL:</strong> {entry.trackingUrl ? <a href={entry.trackingUrl} target="_blank" rel="noreferrer" className="text-fuchsia-700 hover:underline">{entry.trackingUrl}</a> : '—'}</p>
                                      <p><strong>Box:</strong> {entry.boxContents || '—'}</p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {isShipmentClosed && !isShipmentPanelExpanded && (
                      <div className="mt-2 rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-[11px]">
                        <p className="font-semibold text-emerald-700">✅ Shipment flow closed</p>
                        <p className="text-slate-600">Last shipment email sent: {sentAtLabel || 'Recorded in history'}</p>
                        <p className={`${isReminderDue ? 'font-semibold text-amber-700' : 'text-slate-600'}`}>
                          Next sample kit reminder: {nextReminderAt ? fmtDate(nextReminderAt) : 'Set when shipment date is available'}{isReminderDue ? ' (due now)' : ''}
                        </p>
                        <p className="text-slate-600">What to send: {nextReminderNote || 'Not set'}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button onClick={() => setShipmentPanelOpen((prev) => ({ ...prev, [row.id]: true }))} className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Expand details</button>
                          <button onClick={() => resendShipmentEmail(row, nextReminderAt)} disabled={saving === row.id} className="rounded-lg border border-sky-300 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60">Resend tracking email</button>
                          <button onClick={() => startNextPackageFlow(row)} className="rounded-lg border border-fuchsia-300 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50">Start next package</button>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <input
                            value={noteDraft[row.id] || ''}
                            onChange={(e) => setNoteDraft(prev => ({ ...prev, [row.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(row) } }}
                            placeholder="Add a note about this shipment…"
                            className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px]"
                          />
                          <button onClick={() => addNote(row)} disabled={saving === row.id || !(noteDraft[row.id] || '').trim()} className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60">Add note</button>
                        </div>
                      </div>
                    )}
                    {isShipmentPanelExpanded && (
                    <div className="mt-2 space-y-2">
                      {isShipmentClosed && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px]">
                          <p className="text-emerald-700">Closed shipment record: {sentAtLabel || 'Recorded in history'}</p>
                          <button onClick={() => setShipmentPanelOpen((prev) => ({ ...prev, [row.id]: false }))} className="rounded border border-emerald-300 px-2 py-0.5 font-semibold text-emerald-700 hover:bg-emerald-100">Collapse</button>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={shipVal(row, 'tracking_number')}
                          onChange={(e) => setShipField(row.id, 'tracking_number', e.target.value)}
                          placeholder="Tracking number"
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                        />
                        <input
                          value={shipVal(row, 'tracking_url')}
                          onChange={(e) => setShipField(row.id, 'tracking_url', e.target.value)}
                          placeholder="Tracking URL"
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Next package reminder</p>
                        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                          <input
                            type="date"
                            value={reminderDateVal(row, nextReminderAt)}
                            onChange={(e) => setReminderDateDraft((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => saveReminderDetails(row, sentAt, nextReminderAt)}
                            disabled={saving === row.id}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                          >
                            Save reminder details
                          </button>
                        </div>
                        <textarea
                          value={reminderNoteVal(row)}
                          onChange={(e) => setReminderNoteDraft((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          placeholder="What needs to be sent in the next sample kit?"
                          rows={2}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => requestShipmentSave(row, true)} disabled={saving === row.id || (isShipmentClosed && !isNextPackageMode) || !trackingFlowReady} className="rounded-lg bg-[#D43790] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#BF3182] disabled:opacity-60">Save &amp; send shipment email</button>
                        {isShipmentClosed && !isNextPackageMode && (
                          <>
                            <button onClick={() => resendShipmentEmail(row, nextReminderAt)} disabled={saving === row.id} className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60">Resend tracking email</button>
                            <button onClick={() => startNextPackageFlow(row)} className="rounded-lg border border-fuchsia-300 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50">Start next package</button>
                          </>
                        )}
                      </div>
                      {!trackingFlowReady && (
                        <p className="text-[11px] font-semibold text-amber-700">
                          To complete this flow, fill in both tracking number and tracking URL.
                        </p>
                      )}
                      {isShipmentLocked && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px]">
                          <p className="font-semibold text-emerald-700">✅ Email sent on {fmtDateTime(sentAt)}.</p>
                          <p className={`${isReminderDue ? 'text-amber-700 font-semibold' : 'text-slate-600'}`}>
                            Next package reminder: {fmtDate(nextReminderAt)}{isReminderDue ? ' (due now)' : ''}
                          </p>
                          <p className="text-slate-500">To send the next package, update shipment details or tracking and the send button will enable again.</p>
                        </div>
                      )}
                      {(() => {
                        const previewDraft = {
                          tracking_number: shipVal(row, 'tracking_number'),
                          tracking_url: shipVal(row, 'tracking_url'),
                        }
                        const preview = buildAmbassadorShipmentEmail(row, previewDraft, null, reminderDateVal(row, nextReminderAt) ? new Date(`${reminderDateVal(row, nextReminderAt)}T10:00:00Z`).toISOString() : null)
                        return (
                          <div className="rounded-lg border border-sky-200 bg-white p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">{isShipmentLocked ? 'Shipment email status' : 'Shipment email preview'}</p>
                            {isShipmentLocked && (
                              <p className="mt-1 text-[11px] font-semibold text-emerald-700">Email sent ✓</p>
                            )}
                            <p className="mt-1 text-[11px] text-slate-600"><strong>Subject:</strong> {preview.subject}</p>
                            <div className="mt-1 rounded border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700" dangerouslySetInnerHTML={{ __html: preview.html }} />
                          </div>
                        )
                      })()}

                      {/* Internal notes log (private, not emailed) */}
                      <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Internal notes (private)</p>
                        {noteEntries(row).length > 0 && (
                          <div className="mb-1.5 max-h-32 space-y-1 overflow-y-auto">
                            {noteEntries(row).map((entry, idx) => {
                              const swatch = authorSwatch(entry.author)
                              return (
                              <div key={idx} className="flex items-start justify-between gap-2 rounded bg-white px-2 py-1 text-[11px] text-slate-600">
                                <span className="min-w-0 whitespace-pre-line">
                                  <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400">{entry.stamp || '—'}</span>
                                    <span
                                      className="rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                                      style={{ backgroundColor: swatch.bg, color: swatch.text, borderColor: swatch.border }}
                                    >
                                      {entry.author || 'legacy note (email not recorded)'}
                                    </span>
                                  </span>
                                  <span>{entry.text || entry.raw}</span>
                                </span>
                                <span className="flex shrink-0 gap-1.5">
                                  <button type="button" title="Edit" onClick={() => editNote(row, idx)} disabled={saving === row.id} className="text-slate-400 transition hover:text-slate-700 disabled:opacity-50">✎</button>
                                  <button type="button" title="Delete" onClick={() => deleteNote(row, idx)} disabled={saving === row.id} className="text-slate-400 transition hover:text-rose-600 disabled:opacity-50">🗑</button>
                                </span>
                              </div>
                              )
                            })}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            value={noteDraft[row.id] || ''}
                            onChange={(e) => setNoteDraft(prev => ({ ...prev, [row.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(row) } }}
                            placeholder="Add a note…"
                            className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                          />
                          <button onClick={() => addNote(row)} disabled={saving === row.id || !(noteDraft[row.id] || '').trim()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60">Add note</button>
                        </div>
                      </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )}
                </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {shipDatePrompt && (<div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"><h3 className="text-base font-bold text-slate-900">When should the next package go out?</h3><p className="mt-1 text-xs text-slate-500">Pick the next ship date before saving these tracking details — this keeps follow-ups from being missed.</p><input type="date" value={shipDatePrompt.date || ''} onChange={(e) => setShipDatePrompt((prev) => ({ ...prev, date: e.target.value }))} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShipDatePrompt(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button onClick={() => { const row = rows.find((r) => r.id === shipDatePrompt.rowId); if (!row || !shipDatePrompt.date) return; setReminderDateDraft((prev) => ({ ...prev, [row.id]: shipDatePrompt.date })); const alsoEmail = shipDatePrompt.alsoEmail; const chosenDate = shipDatePrompt.date; setShipDatePrompt(null); saveShipment(row, alsoEmail, chosenDate) }} disabled={!shipDatePrompt.date} className="rounded-lg bg-[#D43790] px-3 py-2 text-sm font-semibold text-white hover:bg-[#BF3182] disabled:opacity-60">Confirm date &amp; save</button></div></div></div>)}
{msgRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={() => setMsgRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Message {msgRow.full_name}</h3>
            <p className="mt-1 text-xs text-slate-500">Sends to {msgRow.email}. Their reply comes back to {AMBASSADOR_REPLY_TO}.</p>
            <input
              type="text"
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="Subject"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder={`Write your message… (it opens with "Hi ${String(msgRow.full_name || '').split(' ')[0] || 'there'},")`}
              rows={6}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setMsgRow(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={sendMessage} disabled={saving === msgRow.id} className="rounded-lg bg-[#D43790] px-3 py-2 text-sm font-semibold text-white hover:bg-[#BF3182] disabled:opacity-60">Send message</button>
            </div>
          </div>
        </div>
      )}

      {declineRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={() => setDeclineRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Decline {declineRow.full_name}</h3>
            <p className="mt-1 text-xs text-slate-500">Select the reason(s) — the applicant is emailed this explanation.</p>
            <div className="mt-3 space-y-1.5">
              {AMBASSADOR_DECLINE_PRESETS.map((preset) => (
                <label key={preset} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={declinePresets.includes(preset)}
                    onChange={(e) => setDeclinePresets(prev => e.target.checked ? [...prev, preset] : prev.filter(p => p !== preset))}
                    className="mt-0.5"
                  />
                  <span>{preset}</span>
                </label>
              ))}
            </div>
            <textarea
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder="Add a personal explanation (optional)…"
              rows={3}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeclineRow(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={submitDecline} disabled={saving === declineRow.id} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60">Decline &amp; email</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Admin Dashboard shell ────────────────────────────────────────────────────

export default function AdminDashboard({ onLogout, onPreviewDistributor }) {
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem(ADMIN_TAB_STORAGE_KEY)
      return ADMIN_TAB_KEYS.has(saved) ? saved : 'registrations'
    } catch {
      return 'registrations'
    }
  })
  const [ambassadorPending, setAmbassadorPending] = useState(0)

  useEffect(() => {
    try { localStorage.setItem(ADMIN_TAB_STORAGE_KEY, tab) } catch {}
  }, [tab])

  useEffect(() => {
    let active = true
    supabase
      .from(AMBASSADOR_TABLE)
      .select('id', { count: 'exact', head: true })
      .in('status', AMBASSADOR_PENDING_STATUSES)
      .then(({ count }) => { if (active) setAmbassadorPending(count || 0) })
    return () => { active = false }
  }, [tab])

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">GEL.IT.UP</p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900">Admin Panel</h1>
            <p className="mt-1 text-xs text-slate-500">Manage distributor registrations, orders, and admin accounts.</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:flex sm:flex-wrap">
          <button
            onClick={() => setTab('registrations')}
            className={`w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'registrations' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Registrations
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'orders' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Orders
          </button>
          <button
            onClick={() => setTab('search')}
            className={`w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'search' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Search
          </button>
          <button
            onClick={() => setTab('admins')}
            className={`w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'admins' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Admins
          </button>
          <button
            onClick={() => setTab('pricing')}
            className={`w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'pricing' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Tier Pricing
          </button>
          <button
            onClick={() => setTab('ambassadors')}
            className={`relative w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'ambassadors' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Ambassadors
            {ambassadorPending > 0 && (
              <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-fuchsia-600 px-1.5 py-0.5 text-[10px] font-bold text-white align-middle">
                {ambassadorPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('guestbook')}
            className={`w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'guestbook' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Guestbook
          </button>
          <button
            onClick={() => setTab('draft-carts')}
            className={`w-full rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-tight transition sm:w-auto sm:px-4 sm:py-1.5 sm:text-sm ${tab === 'draft-carts' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Draft Carts
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {tab === 'registrations' && <RegistrationsPanel onPreviewDistributor={onPreviewDistributor} />}
        {tab === 'orders' && <OrdersPanel />}
        {tab === 'search' && <SearchPanel onOpenTab={setTab} />}
        {tab === 'admins' && <AdminsPanel />}
        {tab === 'pricing' && <TierPricingPanel />}
        {tab === 'ambassadors' && <AmbassadorApplicationsPanel />}
        {tab === 'guestbook' && <GuestbookPanel />}
        {tab === 'draft-carts' && <DraftCartsPanel />}
      </div>
    </section>
  )
}
