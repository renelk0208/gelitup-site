import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const REGISTRATIONS_TABLE = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || 'b2b_registrations'
const ORDERS_TABLE = import.meta.env.VITE_B2B_ORDERS_TABLE || 'b2b_orders'
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL || ''
const FROM_EMAIL = import.meta.env.VITE_EMAIL_FROM || 'noreply@gelitup.com'

const ORDER_STATUSES = ['submitted', 'processing', 'shipped', 'completed', 'cancelled']

function statusBadge(status) {
  const map = {
    pending:    'bg-amber-100 text-amber-700',
    approved:   'bg-emerald-100 text-emerald-700',
    rejected:   'bg-rose-100 text-rose-700',
    submitted:  'bg-slate-100 text-slate-600',
    processing: 'bg-blue-100 text-blue-700',
    shipped:    'bg-indigo-100 text-indigo-700',
    completed:  'bg-emerald-100 text-emerald-700',
    cancelled:  'bg-rose-100 text-rose-700',
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
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState(null)
  const [commentMap, setCommentMap] = useState({})
  const [saving, setSaving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase
      .from(REGISTRATIONS_TABLE)
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
        ? 'Your GEL.IT.UP distributor application has been approved'
        : 'Update on your GEL.IT.UP distributor application'
      const html = status === 'approved'
        ? `<p>Hi ${row.contact_name},</p><p>Congratulations! Your distributor application has been <strong>approved</strong>. You can now log in to the distributor portal at <a href="https://gelitup.com/portal/login">gelitup.com/portal/login</a>.</p><p>Welcome to the GEL.IT.UP family!</p>`
        : `<p>Hi ${row.contact_name},</p><p>Thank you for applying to become a GEL.IT.UP distributor. Unfortunately your application has not been approved at this time.</p><p>If you have any questions please contact us at info@gelitup.com.</p>`
      fetch(EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: row.contact_email, subject, html, from: FROM_EMAIL }),
      }).catch(() => {})
    }
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

  const FILTERS = ['pending', 'approved', 'rejected', 'all']
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? rows.length : rows.filter(r => r.status === f).length
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
                </div>

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

  const FILTERS = ['all', 'submitted', 'processing', 'shipped', 'completed', 'cancelled']

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
          const isSubmitted = row.status === 'submitted'
          const isProcessing = row.status === 'processing'

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
                        {items.map((item, i) => (
                          <li key={i} className="flex items-center justify-between px-3 py-2">
                            <span className="text-slate-700">{item.name || item.displayName || item.sku || `Item ${i + 1}`}</span>
                            <span className="font-semibold text-slate-900">×{item.qty ?? item.quantity ?? 1}</span>
                          </li>
                        ))}
                      </ul>
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
            <p className="mt-1 text-xs text-slate-500">Manage distributor registrations and track orders.</p>
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
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {tab === 'registrations' && <RegistrationsPanel />}
        {tab === 'orders' && <OrdersPanel />}
      </div>
    </section>
  )
}
