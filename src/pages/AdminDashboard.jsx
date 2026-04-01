import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const REGISTRATIONS_TABLE = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || 'b2b_registrations'
const ORDERS_TABLE = import.meta.env.VITE_B2B_ORDERS_TABLE || 'b2b_orders'
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL || ''
const FROM_EMAIL = import.meta.env.VITE_EMAIL_FROM || 'noreply@gelitup.com'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const ORDER_STATUSES = ['submitted', 'processing', 'shipped', 'completed', 'cancelled']

function statusBadge(status) {
  const map = {
    pending:                 'bg-amber-100 text-amber-700',
    approved:                'bg-emerald-100 text-emerald-700',
    rejected:                'bg-rose-100 text-rose-700',
    received:                'bg-sky-100 text-sky-700',
    submitted:               'bg-slate-100 text-slate-600',
    processing:              'bg-blue-100 text-blue-700',
    shipped:                 'bg-indigo-100 text-indigo-700',
    completed:               'bg-emerald-100 text-emerald-700',
    cancelled:               'bg-rose-100 text-rose-700',
    cancellation_requested:  'bg-orange-100 text-orange-700',
  }
  const cls = map[String(status).toLowerCase()] || 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {status || '—'}
    </span>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
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

function RegistrationsPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [commentMap, setCommentMap] = useState({})
  const [saving, setSaving] = useState(null)
  const [emailStatus, setEmailStatus] = useState({}) // { [id]: { state: 'sending'|'sent'|'error', message: '' } }

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

  const updateStatus = async (id, status) => {
    setSaving(id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))

    // Send notification email
    const row = rows.find(r => r.id === id)
    if (row?.contact_email && EMAIL_WEBHOOK_URL) {
      const subject = status === 'approved'
        ? `🎉 You're Approved — Welcome to GEL.IT.UP, ${row.contact_name}!`
        : 'Update on your GEL.IT.UP distributor application'
      const portalLink = `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(row.contact_email || '')}`
      const html = status === 'approved'
        ? `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#f8f7ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8f7ff;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(168,85,247,0.10);">
      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#a855f7 0%,#7c3aed 50%,#4f46e5 100%);padding:40px 48px 32px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.75);text-transform:uppercase;">GEL.IT.UP by GIUP®</p>
        <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">You're Approved! 🎉</h1>
        <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">Welcome to the GEL.IT.UP Distributor Family</p>
      </td></tr>
      <!-- BODY -->
      <tr><td style="padding:40px 48px;">
        <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#1e1b4b;">Dear ${row.contact_name},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#374151;">We are thrilled to let you know that your application for <strong style="color:#7c3aed;">${row.company_name}</strong> has been <strong>approved</strong>. Welcome aboard — we are so excited to have you as part of the GEL.IT.UP distribution network!</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#374151;">Your exclusive distributor portal is ready and waiting. To get started, simply create your password using the button below — your email address is already prefilled for you.</p>
        <!-- CTA BUTTON -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
          <tr><td align="center">
            <a href="${portalLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(124,58,237,0.35);">Create Password &amp; Enter Portal →</a>
          </td></tr>
        </table>
        <!-- STEPS -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#faf5ff;border-radius:12px;padding:0;margin-bottom:28px;">
          <tr><td style="padding:24px 28px;">
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7c3aed;">Getting Started — 3 Easy Steps</p>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width:28px;vertical-align:top;padding-top:2px;"><span style="display:inline-block;width:22px;height:22px;background:#7c3aed;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;">1</span></td>
                <td style="padding-left:10px;padding-bottom:12px;font-size:14px;color:#374151;"><strong>Click the button above</strong> — your email is prefilled automatically.</td>
              </tr>
              <tr>
                <td style="width:28px;vertical-align:top;padding-top:2px;"><span style="display:inline-block;width:22px;height:22px;background:#7c3aed;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;">2</span></td>
                <td style="padding-left:10px;padding-bottom:12px;font-size:14px;color:#374151;"><strong>Create your password</strong>, confirm it, and tick <em>Remember me</em>.</td>
              </tr>
              <tr>
                <td style="width:28px;vertical-align:top;padding-top:2px;"><span style="display:inline-block;width:22px;height:22px;background:#7c3aed;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;">3</span></td>
                <td style="padding-left:10px;font-size:14px;color:#374151;"><strong>Log in</strong> to browse our full product catalogue and place wholesale orders.</td>
              </tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#374151;">We look forward to growing together and supporting your business with our premium gel polish collections. If you ever have questions, our team is always here for you.</p>
        <p style="margin:0;font-size:15px;line-height:1.65;color:#374151;">With warmth &amp; excitement,<br/><strong style="color:#1e1b4b;">The GEL.IT.UP Distribution Team</strong></p>
      </td></tr>
      <!-- FOOTER -->
      <tr><td style="background:#f3f0ff;padding:24px 48px;text-align:center;border-top:1px solid #ede9fe;">
        <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">Questions? Contact us at <a href="mailto:distribution@gelitup.com" style="color:#7c3aed;text-decoration:none;font-weight:600;">distribution@gelitup.com</a></p>
        <p style="margin:0;font-size:11px;color:#9ca3af;">GEL.IT.UP by GIUP® — Premium Gel Polish Distribution</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
        : `<p>Hi ${row.contact_name},</p><p>Thank you for applying to become a GEL.IT.UP distributor. Unfortunately your application has not been approved at this time.</p><p>If you have any questions please contact us at distribution@gelitup.com.</p>`
      setEmailStatus(prev => ({ ...prev, [id]: { state: 'sending', message: '' } }))
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
          setEmailStatus(prev => ({ ...prev, [id]: { state: 'sent', message: `Email sent to ${row.contact_email}` } }))
        } else {
          const errMsg = resJson?.error || `HTTP ${res.status}`
          setEmailStatus(prev => ({ ...prev, [id]: { state: 'error', message: errMsg } }))
        }
      } catch (emailErr) {
        setEmailStatus(prev => ({ ...prev, [id]: { state: 'error', message: emailErr.message || 'Network error' } }))
      }
    } else if (row?.contact_email && !EMAIL_WEBHOOK_URL) {
      setEmailStatus(prev => ({ ...prev, [id]: { state: 'error', message: 'VITE_EMAIL_WEBHOOK_URL is not configured — email not sent.' } }))
    }
  }

  const resendApprovalEmail = async (row) => {
    if (!row?.contact_email || !EMAIL_WEBHOOK_URL) return
    const subject = `🎉 You're Approved — Welcome to GEL.IT.UP, ${row.contact_name}!`
    const portalLink = `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(row.contact_email || '')}`
    const html = `<p>Dear ${row.contact_name},</p><p>Your GEL.IT.UP distributor application for <strong>${row.company_name}</strong> has been <strong>approved</strong>.</p><p>Click the link below to create your password and access the portal:</p><p><a href="${portalLink}" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;">Create Password &amp; Enter Portal →</a></p><p>If you have any questions, contact us at distribution@gelitup.com.</p><p>The GEL.IT.UP Distribution Team</p>`
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
      } else {
        const errMsg = resJson?.error || `HTTP ${res.status}`
        setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: errMsg } }))
      }
    } catch (emailErr) {
      setEmailStatus(prev => ({ ...prev, [row.id]: { state: 'error', message: emailErr.message || 'Network error' } }))
    }
  }

  const convertToB2B = async (row) => {
    if (!window.confirm(`Convert "${row.company_name}" from Distributor to B2B Client?\n\nThis will:\n• Set application_type → b2b_order\n• Set status → approved\n• Set prices_allocated → true`)) return
    setSaving(row.id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({
        application_type: 'b2b_order',
        status: 'approved',
        prices_allocated: true,
        notes: (row.notes ? row.notes + '\n' : '') + '[CONVERTED: distributor → b2b_order by admin]',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === row.id
      ? { ...r, application_type: 'b2b_order', status: 'approved', prices_allocated: true }
      : r))
  }

  const saveComment = async (id) => {
    setSaving(id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({ admin_comment: commentMap[id] ?? '' })
      .eq('id', id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, admin_comment: commentMap[id] ?? '' } : r))
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

  const updateTier = async (row, newTier) => {
    setSaving(row.id)
    const { error: err } = await supabase
      .from(REGISTRATIONS_TABLE)
      .update({ distributor_tier: newTier || null })
      .eq('id', row.id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, distributor_tier: newTier || null } : r))
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
        {rows.map(row => (
          <li key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
            >
              {statusBadge(row.status)}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{row.company_name}</span>
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
                  <div><span className="font-semibold text-slate-400">Application Type</span><br />{row.application_type || '—'}</div>
                  <div>
                    <span className="font-semibold text-slate-400">Distributor Tier</span><br />
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
                    </div>
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
                      onClick={() => updateStatus(row.id, 'approved')}
                      disabled={saving === row.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                  )}
                  {row.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(row.id, 'rejected')}
                      disabled={saving === row.id}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  )}
                  {row.status !== 'pending' && (
                    <button
                      onClick={() => updateStatus(row.id, 'pending')}
                      disabled={saving === row.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      ↩ Reset to Pending
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
                  {row.application_type === 'distributor' && (
                    <button
                      onClick={() => convertToB2B(row)}
                      disabled={saving === row.id}
                      className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                    >
                      ⇄ Convert to B2B Client
                    </button>
                  )}
                </div>

                {/* Prices visibility toggle — approved distributors only */}
                {row.status === 'approved' && row.application_type === 'distributor' && (
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

                {/* Internal comment */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">Internal Comment</label>
                  <textarea
                    rows={2}
                    value={commentMap[row.id] ?? (row.admin_comment || '')}
                    onChange={e => setCommentMap(prev => ({ ...prev, [row.id]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
                    placeholder="Internal note — not sent to applicant"
                  />
                  <button
                    onClick={() => saveComment(row.id)}
                    disabled={saving === row.id}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {saving === row.id ? 'Saving…' : 'Save Comment'}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Orders panel ─────────────────────────────────────────────────────────────

function OrdersPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [saving, setSaving] = useState(null)
  // per-order tracking draft state
  const [trackingDraft, setTrackingDraft] = useState({}) // { [id]: { number, url } }
  // per-order payment confirmation state (required before → processing)
  const [paymentConfirmed, setPaymentConfirmed] = useState({}) // { [id]: bool }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase
      .from(ORDERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter !== 'all') query = query.eq('status', filter)
    const { data, error: err } = await query
    setLoading(false)
    if (err) { setError(err.message); return }
    setRows(data || [])
  }, [filter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status, extra = {}) => {
    setSaving(id)
    const { error: err } = await supabase
      .from(ORDERS_TABLE)
      .update({ status, ...extra })
      .eq('id', id)
    setSaving(null)
    if (err) { alert(err.message); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r))
  }

  const markShipped = async (id) => {
    const draft = trackingDraft[id] || {}
    const trackingNumber = (draft.number || '').trim()
    const trackingUrl = (draft.url || '').trim()
    if (!trackingNumber) { alert('Please enter a tracking number before marking as shipped.'); return }
    await updateStatus(id, 'shipped', { tracking_number: trackingNumber, tracking_url: trackingUrl || null })
  }

  const markProcessing = async (id) => {
    if (!paymentConfirmed[id]) { alert('Please confirm payment has been received before marking as Processing.'); return }
    await updateStatus(id, 'processing', { payment_confirmed: true })
  }

  const FILTERS = ['all', 'received', 'submitted', 'cancellation_requested', 'processing', 'shipped', 'completed', 'cancelled']

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
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50">
          ↻ Refresh
        </button>
      </div>

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
          const items = Array.isArray(row.items) ? row.items : []
          const draft = trackingDraft[row.id] || {}
          const isShipped = row.status === 'shipped'
          const isSubmitted = row.status === 'submitted' || row.status === 'received'
          const isProcessing = row.status === 'processing'
          const isCancellationRequested = row.status === 'cancellation_requested'

          return (
            <li key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
              >
                {statusBadge(row.status)}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{row.customer_email || '—'}</span>
                <span className="shrink-0 text-xs text-slate-400">{row.total_units} units</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtDate(row.created_at)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded === row.id ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {expanded === row.id && (
                <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                  {/* Order details */}
                  <div className="grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
                    <div><span className="font-semibold text-slate-400">Customer</span><br />{row.customer_email || '—'}</div>
                    <div><span className="font-semibold text-slate-400">Consignee</span><br />{row.consignee_name || '—'}</div>
                    <div><span className="font-semibold text-slate-400">Phone</span><br />{row.consignee_phone || '—'}</div>
                    <div><span className="font-semibold text-slate-400">Payment confirmed</span><br />
                      <span className={row.payment_confirmed ? 'font-semibold text-emerald-600' : 'text-slate-400'}>
                        {row.payment_confirmed ? '✓ Yes' : 'Not yet'}
                      </span>
                    </div>
                    <div className="sm:col-span-2"><span className="font-semibold text-slate-400">Shipping Address</span><br />{row.shipping_address || '—'}</div>
                    {isShipped && (
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

                  {/* Items */}
                  {items.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-400">Items ({items.length})</p>
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
                        {items.map((item, i) => {
                          const label = typeof item === 'string'
                            ? item.replace(/ x\d+$/, '')
                            : (item.name || item.displayName || item.sku || `Item ${i + 1}`)
                          const qty = typeof item === 'string'
                            ? (item.match(/ x(\d+)$/)?.[1] ?? 1)
                            : (item.qty ?? item.quantity ?? 1)
                          return (
                            <li key={i} className="flex items-center justify-between px-3 py-2">
                              <span className="text-slate-700">{label}</span>
                              <span className="font-semibold text-slate-900">×{qty}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* ── Cancellation Request ── */}
                  {isCancellationRequested && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-orange-700">⚠ Cancellation Requested by Customer</p>
                      <p className="text-xs text-slate-600">The customer has requested to cancel this order. Confirm to cancel it, or reject to keep it active.</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateStatus(row.id, 'cancelled')}
                          disabled={saving === row.id}
                          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {saving === row.id ? 'Saving…' : '✕ Confirm Cancellation'}
                        </button>
                        <button
                          onClick={() => updateStatus(row.id, 'submitted')}
                          disabled={saving === row.id}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          ↩ Reject — Keep Order Active
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Mark as Processing (requires payment confirmation) ── */}
                  {isSubmitted && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-blue-700">Mark as Processing</p>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentConfirmed[row.id] || false}
                          onChange={e => setPaymentConfirmed(prev => ({ ...prev, [row.id]: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Payment received (full or part payment confirmed)
                      </label>
                      <button
                        onClick={() => markProcessing(row.id)}
                        disabled={saving === row.id || !paymentConfirmed[row.id]}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        {saving === row.id ? 'Saving…' : '→ Mark as Processing'}
                      </button>
                    </div>
                  )}

                  {/* ── Mark as Shipped (requires tracking number) ── */}
                  {isProcessing && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-indigo-700">Mark as Shipped</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tracking Number <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            value={draft.number || ''}
                            onChange={e => setTrackingDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], number: e.target.value } }))}
                            placeholder="e.g. DHL1234567890"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tracking URL (optional)</label>
                          <input
                            type="url"
                            value={draft.url || ''}
                            onChange={e => setTrackingDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], url: e.target.value } }))}
                            placeholder="https://track.dhl.com/..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => markShipped(row.id)}
                        disabled={saving === row.id}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving === row.id ? 'Saving…' : '→ Mark as Shipped'}
                      </button>
                    </div>
                  )}

                  {/* Other status transitions */}
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-400">Other Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {isShipped && (
                        <button
                          onClick={() => updateStatus(row.id, 'completed')}
                          disabled={saving === row.id}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          ✓ Mark Completed
                        </button>
                      )}
                      {row.status !== 'cancelled' && row.status !== 'completed' && (
                        <button
                          onClick={() => updateStatus(row.id, 'cancelled')}
                          disabled={saving === row.id}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          ✕ Cancel Order
                        </button>
                      )}
                      {(row.status === 'cancelled' || row.status === 'completed') && (
                        <button
                          onClick={() => updateStatus(row.id, 'submitted')}
                          disabled={saving === row.id}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          ↩ Reset to Submitted
                        </button>
                      )}
                    </div>
                  </div>
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
      setFeedback({ type: 'error', message: data?.error || err?.message || 'Failed to create admin.' })
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
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFeedback(null) }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="Min. 8 characters"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm Password
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFeedback(null) }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="Repeat password"
            />
          </label>
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

// ─── Tier Pricing panel ───────────────────────────────────────────────────────

const TIER_PRICING_DATA = [
  { key: 'b2b',          label: 'B2B (Salon)',               multiplier: 1.0,   colour: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'authority',    label: 'Authority Distributor',     multiplier: 0.22,  colour: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' },
  { key: 'professional', label: 'Professional Distributor',  multiplier: 0.37,  colour: 'bg-pink-100 text-pink-700 border-pink-200' },
  { key: 'sales',        label: 'Sales Representative',      multiplier: 0.85,  colour: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'country',      label: 'Level 2 Country Tier',      multiplier: 0.264, colour: 'bg-sky-100 text-sky-700 border-sky-200' },
]

const B2B_PRICE_MULTIPLIER = 1.2

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
        for (const { name, price } of items) {
          if (price == null || Number(price) <= 0) continue
          const b2bPrice = Math.ceil(Number(price) * B2B_PRICE_MULTIPLIER * 10) / 10
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
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gelitup-tier-pricing-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Admin Dashboard shell ────────────────────────────────────────────────────

export default function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState('registrations')

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

        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={() => setTab('registrations')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'registrations' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Registrations
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'orders' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Orders
          </button>
          <button
            onClick={() => setTab('admins')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'admins' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Admins
          </button>
          <button
            onClick={() => setTab('pricing')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'pricing' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Tier Pricing
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {tab === 'registrations' && <RegistrationsPanel />}
        {tab === 'orders' && <OrdersPanel />}
        {tab === 'admins' && <AdminsPanel />}
        {tab === 'pricing' && <TierPricingPanel />}
      </div>
    </section>
  )
}
