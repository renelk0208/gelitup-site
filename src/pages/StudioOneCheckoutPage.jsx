import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

export default function StudioOneCheckoutPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token || !hasSupabaseConfig) { setLoading(false); setNotFound(true); return }
      const { data, error: err } = await supabase
        .from('private_label_requests')
        .select('*')
        .eq('checkout_token', token)
        .maybeSingle()
      if (cancelled) return
      if (err || !data) {
        setNotFound(true)
      } else {
        setRequest(data)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token])

  async function handlePay() {
    if (!request) return
    setPaying(true)
    setError('')
    try {
      // Mark as checked out before handing off to Stripe's hosted page — this
      // codebase doesn't run a Stripe webhook, so payment confirmation here
      // follows the same manual-reconciliation pattern used elsewhere (admin
      // verifies the charge in the Stripe dashboard against this request).
      await supabase
        .from('private_label_requests')
        .update({ status: 'checked_out' })
        .eq('id', request.id)

      const res = await fetch('/.netlify/functions/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: String(request.id),
          amountEur: Number(request.subtotal_eur),
          email: String(request.email),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Payment session failed')
      if (!data.url) throw new Error('No checkout URL returned')
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Unable to start payment. Please try again.')
      setPaying(false)
    }
  }

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-24 text-center text-black/50">Loading your order…</div>
  }

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-3">Link not found</h1>
        <p className="text-black/60">
          This checkout link isn't valid. If you received it by email, please use the link from your most
          recent Studio One approval email, or contact us at distribution@gelitup.com.
        </p>
      </div>
    )
  }

  if (request.status === 'pending_review') {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-3">Still under review</h1>
        <p className="text-black/60">
          Your logo hasn't been approved yet. We'll email you a checkout link as soon as it is.
        </p>
      </div>
    )
  }

  if (request.status === 'rejected') {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-3">Logo not approved</h1>
        <p className="text-black/60">
          {request.admin_notes || 'Unfortunately your logo submission was not approved for this pilot programme.'}
        </p>
        <p className="text-black/60 mt-2">
          Contact us at distribution@gelitup.com if you'd like to submit a revised logo.
        </p>
      </div>
    )
  }

  if (request.status === 'checked_out') {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-3">Order already placed</h1>
        <p className="text-black/60">
          This order has already been checked out. If you believe this is a mistake, contact us at
          distribution@gelitup.com.
        </p>
      </div>
    )
  }

  // status === 'approved'
  const cartItems = Array.isArray(request.cart_json) ? request.cart_json : []

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-2">Your Studio One order is approved!</h1>
      <p className="text-black/60 mb-8">Review your order below and complete payment to confirm.</p>

      {request.logo_url && (
        <div className="mb-6 text-center">
          <img src={request.logo_url} alt="Your logo" className="max-h-24 mx-auto object-contain" />
        </div>
      )}

      <div className="border rounded-xl p-4 mb-6">
        <p className="font-semibold text-sm mb-3">Order summary</p>
        <ul className="space-y-1 mb-4">
          {cartItems.map((item, i) => (
            <li key={i} className="flex justify-between text-sm text-black/70">
              <span>{item.name} <span className="text-black/40">×{item.qty}</span></span>
              <span>€{(Number(item.price) * Number(item.qty)).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>€{Number(request.subtotal_eur).toFixed(2)}</span>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="w-full bg-[#D43790] text-white font-semibold rounded-lg py-3 disabled:opacity-50"
      >
        {paying ? 'Redirecting to payment…' : `Pay €${Number(request.subtotal_eur).toFixed(2)}`}
      </button>
    </div>
  )
}
