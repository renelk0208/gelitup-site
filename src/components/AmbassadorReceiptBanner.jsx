import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Top of the ambassador profile: her latest package isn't confirmed yet.
// Rule: her next package is on hold until she confirms she received this one.

const fmt = (v) => {
  if (!v) return ''
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00Z` : v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AmbassadorReceiptBanner({ onConfirmed }) {
  const [pkg, setPkg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    if (!supabase) return undefined
    supabase.rpc('get_my_unconfirmed_ambassador_shipment').then(({ data, error: err }) => {
      if (!alive || err) return
      const row = Array.isArray(data) ? data[0] : data
      if (!row?.id) return
      // Only once it should have arrived (expected delivery date, or 3 days after sending).
      const due = row.expected_delivery
        ? new Date(`${row.expected_delivery}T00:00:00Z`).getTime()
        : new Date(row.sent_at).getTime() + 3 * 24 * 60 * 60 * 1000
      if (Date.now() >= due) setPkg(row)
    })
    return () => { alive = false }
  }, [])

  if (done) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-[13px] text-emerald-800">
        ✓ Thank you! Your package is confirmed as received.
      </div>
    )
  }
  if (!pkg) return null

  const confirm = async () => {
    setBusy(true)
    setError('')
    const { data, error: err } = await supabase.rpc('confirm_my_ambassador_shipment', { p_shipment_id: pkg.id })
    setBusy(false)
    if (err || data !== true) { setError('Could not save — please try again.'); return }
    setDone(true)
    if (onConfirmed) onConfirmed(pkg.id)
  }

  return (
    <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-[13px] text-amber-900">
      <p className="font-bold">📦 Please confirm you received your package</p>
      <p className="mt-1">
        Your PR package sent on <strong>{fmt(pkg.sent_at)}</strong>{(pkg.items || []).length ? <> ({(pkg.items || []).slice(0, 4).join(', ')}{(pkg.items || []).length > 4 ? '…' : ''})</> : null} hasn't been confirmed yet.
      </p>
      <p className="mt-1 font-semibold">Your next package can only be sent once you confirm you received this one.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={confirm} disabled={busy} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
          {busy ? 'Saving…' : "✅ I've received my package"}
        </button>
        <span className="text-[12px] text-amber-800">Not arrived yet? Reply to your tracking email or write to ambassadors@gelitup.com.</span>
      </div>
      {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}
    </div>
  )
}
