import { useMemo, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

// ────────────────────────────────────────────────────────────────────────────
// Colour catalogue for the Custom Bottle Branding Programme.
// Codes sourced from the Studio One private-label colour PDF.
// ────────────────────────────────────────────────────────────────────────────
const COLOUR_CODES = [
  127,130,131,132,133,134,137,140,141,142,107,108,109,114,115,117,119,121,122,126,
  75,78,79,84,85,86,87,88,94,96,11,14,16,50,52,53,60,61,62,63,
  2051,2052,2055,2057,2060,2062,2135,2136,2137,2138,1929,1930,1933,1934,1947,2034,2045,2046,2049,2050,
  704,706,1804,1808,1809,1814,1815,1816,1820,1927,143,144,145,146,147,150,151,152,153,156,
  2528,2529,'AD01','AD02','N006','N007','N018','R27','R29','R32',
  2442,2444,2458,2461,2511,2515,2523,2525,2526,2527,2222,2223,2224,2227,2228,2230,2231,2232,2233,2305,
  2139,2140,2141,2142,2211,2212,2214,2216,2217,2221,
]

const ESSENTIALS = [
  { code: 'B2B01', name: 'Non-Wipe Top Coat', price: 4.5 },
  { code: 'B2B03', name: '5-in-1 Base Clear', price: 4.5 },
  { code: '15', name: 'Primer', price: 3.9 },
]

const COLOUR_PRICE = 5.9 // per bottle, private-label colour
const MIN_ORDER_EUR = 200

const emptyForm = {
  first_name: '', last_name: '', company_name: '', email: '', phone: '',
  address: '', city: '', postal_code: '', country: '',
}

export default function PrivateLabelPage() {
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [cart, setCart] = useState({}) // { [code]: { qty, price, name } }
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const subtotal = useMemo(
    () => Object.values(cart).reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  )
  const meetsMinimum = subtotal >= MIN_ORDER_EUR

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function addToCart(code, name, price) {
    setCart(prev => {
      const existing = prev[code]
      return { ...prev, [code]: { qty: (existing?.qty || 0) + 1, price, name } }
    })
  }

  function removeFromCart(code) {
    setCart(prev => {
      const existing = prev[code]
      if (!existing) return prev
      if (existing.qty <= 1) {
        const next = { ...prev }
        delete next[code]
        return next
      }
      return { ...prev, [code]: { ...existing, qty: existing.qty - 1 } }
    })
  }

  const formValid =
    form.first_name.trim() && form.last_name.trim() && form.email.trim() &&
    form.address.trim() && form.city.trim() && form.postal_code.trim() && form.country.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!formValid) { setError('Please fill in all required fields.'); return }
    if (!logoFile) { setError('Please upload your logo.'); return }
    if (!meetsMinimum) { setError(`Minimum order is €${MIN_ORDER_EUR}. Your current subtotal is €${subtotal.toFixed(2)}.`); return }
    if (!hasSupabaseConfig) { setError('Ordering is temporarily unavailable. Please try again shortly.'); return }

    setSubmitting(true)
    try {
      const ext = logoFile.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('private-label-logos')
        .upload(path, logoFile)
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('private-label-logos')
        .getPublicUrl(path)

      const cartJson = Object.entries(cart).map(([code, item]) => ({
        code, name: item.name, qty: item.qty, price: item.price,
      }))

      const { error: insertError } = await supabase
        .from('private_label_requests')
        .insert({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          company_name: form.company_name.trim() || null,
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          address: form.address.trim(),
          city: form.city.trim(),
          postal_code: form.postal_code.trim(),
          country: form.country.trim(),
          logo_url: publicUrlData?.publicUrl || null,
          cart_json: cartJson,
          subtotal_eur: subtotal,
        })
      if (insertError) throw insertError

      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError('Something went wrong submitting your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-[#D43790] mb-4">Request received!</h1>
        <p className="text-[#4A4A4A] mb-2">
          Thank you — your private label request and logo have been submitted for review.
        </p>
        <p className="text-[#4A4A4A]">
          Our team will review your logo and get back to you at <strong>{form.email}</strong> with a secure
          checkout link once approved. This usually takes 1–2 business days.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Your Brand. Our Signature.</h1>
        <p className="text-[#4A4A4A] max-w-2xl mx-auto">
          The same superior, HEMA-free, EU-certified gel formula your clients already trust — now with
          your logo on every bottle. Minimum order €{MIN_ORDER_EUR}.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-12">
        {/* Left column: registration + logo */}
        <div>
          <h2 className="text-xl font-semibold mb-4">1. Your details</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input required placeholder="First name" className="border rounded-lg p-3"
              value={form.first_name} onChange={e => updateField('first_name', e.target.value)} />
            <input required placeholder="Last name" className="border rounded-lg p-3"
              value={form.last_name} onChange={e => updateField('last_name', e.target.value)} />
          </div>
          <input placeholder="Salon / company name" className="border rounded-lg p-3 w-full mb-3"
            value={form.company_name} onChange={e => updateField('company_name', e.target.value)} />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input required type="email" placeholder="Email" className="border rounded-lg p-3"
              value={form.email} onChange={e => updateField('email', e.target.value)} />
            <input placeholder="Phone" className="border rounded-lg p-3"
              value={form.phone} onChange={e => updateField('phone', e.target.value)} />
          </div>
          <input required placeholder="Address" className="border rounded-lg p-3 w-full mb-3"
            value={form.address} onChange={e => updateField('address', e.target.value)} />
          <div className="grid grid-cols-3 gap-3 mb-6">
            <input required placeholder="City" className="border rounded-lg p-3"
              value={form.city} onChange={e => updateField('city', e.target.value)} />
            <input required placeholder="Postal code" className="border rounded-lg p-3"
              value={form.postal_code} onChange={e => updateField('postal_code', e.target.value)} />
            <input required placeholder="Country" className="border rounded-lg p-3"
              value={form.country} onChange={e => updateField('country', e.target.value)} />
          </div>

          <h2 className="text-xl font-semibold mb-4">2. Upload your logo</h2>
          <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-[#D43790] transition">
            <input type="file" accept="image/*,.ai,.eps,.pdf" className="hidden" onChange={handleLogoChange} />
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="max-h-32 mx-auto object-contain" />
            ) : (
              <span className="text-[#4A4A4A]">Click to upload your logo (PNG, SVG, AI, EPS, PDF)</span>
            )}
          </label>
          <p className="text-xs text-black/50 mt-2">
            Your logo will be reviewed by our team before checkout is enabled.
          </p>
        </div>

        {/* Right column: colour & product cart */}
        <div>
          <h2 className="text-xl font-semibold mb-4">3. Choose your bases, tops &amp; primers</h2>
          <div className="grid grid-cols-1 gap-2 mb-8">
            {ESSENTIALS.map(item => (
              <div key={item.code} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-black/50">€{item.price.toFixed(2)} / bottle</div>
                </div>
                <CartStepper
                  qty={cart[item.code]?.qty || 0}
                  onAdd={() => addToCart(item.code, item.name, item.price)}
                  onRemove={() => removeFromCart(item.code)}
                />
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-4">4. Choose your colours</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6 max-h-96 overflow-y-auto pr-1">
            {COLOUR_CODES.map(code => (
              <div key={code} className="border rounded-lg p-2 text-center">
                <div className="text-xs font-semibold mb-1">{code}</div>
                <div className="text-[10px] text-black/50 mb-1">€{COLOUR_PRICE.toFixed(2)}</div>
                <CartStepper
                  compact
                  qty={cart[code]?.qty || 0}
                  onAdd={() => addToCart(code, `Colour ${code}`, COLOUR_PRICE)}
                  onRemove={() => removeFromCart(code)}
                />
              </div>
            ))}
          </div>

          <div className="border-t pt-4 sticky bottom-0 bg-white">
            <div className="flex justify-between font-semibold mb-1">
              <span>Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className={`text-xs mb-4 ${meetsMinimum ? 'text-green-600' : 'text-[#D43790]'}`}>
              {meetsMinimum
                ? 'Minimum order met ✓'
                : `Add €${(MIN_ORDER_EUR - subtotal).toFixed(2)} more to reach the €${MIN_ORDER_EUR} minimum`}
            </div>

            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#D43790] text-white font-semibold rounded-lg py-3 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit for logo approval'}
            </button>
            <p className="text-[10px] text-black/40 mt-2 text-center">
              You won't be charged now — we'll email you a checkout link once your logo is approved.
              Terms and conditions apply.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}

function CartStepper({ qty, onAdd, onRemove, compact }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${compact ? '' : 'mt-1'}`}>
      <button type="button" onClick={onRemove} disabled={qty === 0}
        className="w-6 h-6 rounded-full border flex items-center justify-center disabled:opacity-30">−</button>
      <span className="w-5 text-center text-sm">{qty}</span>
      <button type="button" onClick={onAdd}
        className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-[#D43790] hover:text-white">+</button>
    </div>
  )
}
