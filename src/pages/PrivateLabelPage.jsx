import { useMemo, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'GEL.IT.UP Distributors <distributors@gelitup.com>'

// ────────────────────────────────────────────────────────────────────────────
// Colour catalogue for the Custom Bottle Branding Programme.
// Codes sourced from the Studio One private-label colour PDF.
// ────────────────────────────────────────────────────────────────────────────
// Real product-photo swatches, resolved from the existing catalogue image library
// (public/gelitup-content/product-images) via the product manifest — matches what
// ships, not an on-screen colour approximation.
const COLOUR_IMAGE = {
  '01': '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/White/GIUP-01.webp',
  15: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Black/GIUP-15.webp',
  127: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-127.webp',
  130: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-130.webp',
  131: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP131.webp',
  132: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-132.webp',
  133: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-133.webp',
  134: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-134.webp',
  137: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-137.webp',
  140: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-140.webp',
  141: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-141.webp',
  142: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-142.webp',
  107: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-107.webp',
  108: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-108.webp',
  109: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-109.webp',
  114: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-114.webp',
  115: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-115.webp',
  117: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-117.webp',
  119: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-119.webp',
  121: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-121.webp',
  122: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-122.webp',
  126: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-126.webp',
  75: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-75.webp',
  78: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-78.webp',
  79: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-79.webp',
  84: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-84.webp',
  85: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-85.webp',
  86: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-86.webp',
  87: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-87.webp',
  88: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-88.webp',
  94: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-94.webp',
  96: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-96.webp',
  11: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-11.webp',
  14: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-14.webp',
  16: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-16.webp',
  50: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-50.webp',
  52: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-52.webp',
  53: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-53.webp',
  60: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-60.webp',
  61: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-61.webp',
  62: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-62.webp',
  63: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-63.webp',
  2051: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2051.webp',
  2052: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2052.webp',
  2055: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Black/GIUP-2055.webp',
  2057: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Pink/GIUP-2057.webp',
  2060: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2060.webp',
  2062: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2062.webp',
  2135: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2135.webp',
  2136: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2136.webp',
  2137: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2137.webp',
  2138: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2138.webp',
  1929: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-1929.webp',
  1930: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-1930.webp',
  1933: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-1933.webp',
  1934: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-1934.webp',
  1947: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-1947.webp',
  2034: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-2034.webp',
  2045: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-2045.webp',
  2046: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2046.webp',
  2049: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2049.webp',
  2050: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2050.webp',
  704: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-704.webp',
  706: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-706.webp',
  1804: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-1804.webp',
  1808: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-1808.webp',
  1809: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-1809.webp',
  1814: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-1814.webp',
  1815: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-1815.webp',
  1816: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-1816.webp',
  1820: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-1820.webp',
  1927: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-1927.webp',
  143: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-143.webp',
  144: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-144.webp',
  145: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-145.webp',
  146: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-146.webp',
  147: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-147.webp',
  150: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-150.webp',
  151: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-151.webp',
  152: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-152.webp',
  153: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-153.webp',
  156: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-156.webp',
  2528: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2528.webp',
  2529: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-2529.webp',
  AD01: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-AD01.webp',
  AD02: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-AD02.webp',
  N006: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-N006.webp',
  N007: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-N007.webp',
  N018: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-N018.webp',
  R27: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-R027-brown.webp',
  R29: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-R029-red.webp',
  R32: '/gelitup-content/product-images/COLORS/RONE/GIUP-R032-blue.webp',
  2442: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2442.webp',
  2444: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-2444.webp',
  2458: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2458.webp',
  2461: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2461.webp',
  2511: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Coral Orange Peach/GIUP-2511.webp',
  2515: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-2515.webp',
  2523: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2523.webp',
  2525: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2525.webp',
  2526: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-2526.webp',
  2527: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-2527.webp',
  2222: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Coral Orange Peach/GIUP-2222.webp',
  2223: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2223.webp',
  2224: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2224.webp',
  2227: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Red/GIUP-2227.webp',
  2228: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-2228.webp',
  2230: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-2230.webp',
  2231: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-2231.webp',
  2232: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-2232.webp',
  2233: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Blue/GIUP-2233.webp',
  2305: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-2305.webp',
  2139: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2139.webp',
  2140: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2140.webp',
  2141: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2141.webp',
  2142: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Grey/GIUP-2142.webp',
  2211: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Purple/GIUP-2211.webp',
  2212: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-2212.webp',
  2214: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-2214.webp',
  2216: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-2216.webp',
  2217: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Green/GIUP-2217.webp',
  2221: '/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Brown Nude/GIUP-2221.webp',
}

const COLOUR_CODES = [
  '01', 11, 14, 15, 16, 50, 52, 53, 60, 61,
  62, 63, 75, 78, 79, 84, 85, 86, 87, 88,
  94, 96, 107, 108, 109, 114, 115, 117, 119, 121,
  122, 126, 127, 130, 131, 132, 133, 134, 137, 140,
  141, 142, 143, 144, 145, 146, 147, 150, 151, 152,
  153, 156, 704, 706, 1804, 1808, 1809, 1814, 1815, 1816,
  1820, 1927, 1929, 1930, 1933, 1934, 1947, 2034, 2045, 2046,
  2049, 2050, 2051, 2052, 2055, 2057, 2060, 2062, 2135, 2136,
  2137, 2138, 2139, 2140, 2141, 2142, 2211, 2212, 2214, 2216,
  2217, 2221, 2222, 2223, 2224, 2227, 2228, 2230, 2231, 2232,
  2233, 2305, 2442, 2444, 2458, 2461, 2511, 2515, 2523, 2525,
  2526, 2527, 2528, 2529, 'AD01', 'AD02', 'N006', 'N007', 'N018', 'R27',
  'R29', 'R32',
]

const ESSENTIALS = [
  { code: 'B2B01', name: 'Non-Wipe Top Coat', price: 12.225 },
  { code: 'B2B03', name: '5-in-1 Base Clear', price: 12.225 },
  { code: 'SUPERBOND', name: 'Superbond', price: 9.0 },
]

const COLOUR_PRICE = 9.7 // per bottle, private-label colour
const MIN_ORDER_EUR = 200

const EU_COUNTRIES = ['Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden']

const emptyForm = {
  first_name: '', last_name: '', company_name: '', email: '', phone: '',
  address: '', city: '', postal_code: '', country: '', vat_number: '',
}

export default function PrivateLabelPage() {
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [cart, setCart] = useState(() => {
    const initial = {}
    ESSENTIALS.forEach(item => {
      initial[item.code] = { qty: 1, price: item.price, name: item.name }
    })
    return initial
  }) // { [code]: { qty, price, name } }
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')

  const colourCodeSet = useMemo(() => new Set(COLOUR_CODES.map(c => String(c))), [])

  // Groups selected colours by family (derived from their image folder, e.g.
  // ".../SOLID GEL POLISH/Red/GIUP-50.webp" -> "Red") so the order summary
  // reads like "Reds: 3, Blues: 2" instead of a flat list of codes.
  const cartSummary = useMemo(() => {
    const essentialsChosen = []
    const colourGroups = {} // family -> [{ code, qty }]
    for (const [code, item] of Object.entries(cart)) {
      if (item.qty <= 0) continue
      if (colourCodeSet.has(String(code))) {
        const imgPath = COLOUR_IMAGE[code] || COLOUR_IMAGE[Number(code)] || ''
        const parts = imgPath.split('/')
        const family = parts.length >= 2 ? parts[parts.length - 2] : 'Other'
        if (!colourGroups[family]) colourGroups[family] = []
        colourGroups[family].push({ code, qty: item.qty, image: imgPath, price: item.price })
      } else {
        essentialsChosen.push({ code, name: item.name, qty: item.qty, price: item.price })
      }
    }
    const sortedFamilies = Object.entries(colourGroups)
      .map(([family, items]) => ({
        family,
        items: items.sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })),
        count: items.reduce((s, i) => s + i.qty, 0),
        total: items.reduce((s, i) => s + i.qty * i.price, 0),
      }))
      .sort((a, b) => a.family.localeCompare(b.family))
    return { essentialsChosen, colourFamilies: sortedFamilies }
  }, [cart, colourCodeSet])

  const subtotal = useMemo(
    () => Object.values(cart).reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  )
  const meetsMinimum = subtotal >= MIN_ORDER_EUR

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const [logoPreviewable, setLogoPreviewable] = useState(true)

  const [viesLoading, setViesLoading] = useState(false)
  const [viesResult, setViesResult] = useState(null) // { valid, name }
  const [viesError, setViesError] = useState('')

  async function verifyVat() {
    const vat = String(form.vat_number || '').trim().toUpperCase().replace(/[\s\-.]/g, '')
    if (vat.length < 4) { setViesError('Enter a full VAT number to verify'); return }
    setViesLoading(true)
    setViesError('')
    setViesResult(null)
    try {
      const res = await fetch('/.netlify/functions/validate-vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vatNumber: vat }),
      })
      const data = await res.json()
      if (!res.ok) { setViesError(data.error || 'VIES check failed'); return }
      setViesResult(data)
      if (!data.valid) setViesError('VAT number not found in VIES — please check and try again')
    } catch {
      setViesError('Unable to reach VAT validation service')
    } finally {
      setViesLoading(false)
    }
  }


  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewable = file.type.startsWith('image/') // PNG/JPG/GIF/WEBP/SVG render in <img>; PDF/AI/EPS do not
    setLogoFile(file)
    setLogoPreviewable(previewable)
    setLogoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return previewable ? URL.createObjectURL(file) : null
    })
  }

  function handleRemoveLogo() {
    setLogoFile(null)
    setLogoPreviewable(true)
    setLogoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
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
    const missingEssential = ESSENTIALS.find(item => !(cart[item.code]?.qty >= 1))
    if (missingEssential) {
      setError(`${missingEssential.name} is included for best results — please keep it in your order.`)
      alert(`It's preferable that our products are used together for the best performance and durability, so ${missingEssential.name} is included with every Studio One order.`)
      return
    }
    if (!logoFile) {
      setError('Please upload your logo.')
      alert('Please upload your logo before submitting.')
      return
    }
    if (!meetsMinimum) { setError(`Minimum order is €${MIN_ORDER_EUR}. Your current subtotal is €${subtotal.toFixed(2)}.`); return }
    if (!termsAccepted) { setError('Please accept the Studio One terms & conditions to continue.'); return }
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
          vat_number: form.vat_number.trim() || null,
          vat_verified: Boolean(viesResult?.valid),
          vat_verified_name: viesResult?.valid ? (viesResult.name || null) : null,
          logo_url: publicUrlData?.publicUrl || null,
          cart_json: cartJson,
          subtotal_eur: subtotal,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        })
      if (insertError) throw insertError

      // Send the customer an order-confirmation email — non-blocking, the
      // request itself is already saved even if this fails.
      if (EMAIL_WEBHOOK_URL) {
        try {
          const itemsHtml = cartJson.map(item =>
            `<li style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;">${item.name} × ${item.qty} — €${(item.price * item.qty).toFixed(2)}</li>`
          ).join('')
          const headers = { 'Content-Type': 'application/json' }
          if (SUPABASE_ANON_KEY) {
            headers.apikey = SUPABASE_ANON_KEY
            headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
          }
          await fetch(EMAIL_WEBHOOK_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              from: EMAIL_FROM,
              to: form.email.trim().toLowerCase(),
              subject: 'We\'ve received your Studio One order',
              html: `
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;margin:0 0 8px">Hi ${form.first_name || 'there'},</p>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;margin:0 0 8px">
                  Thanks for your Studio One order! Here's what you submitted:
                </p>
                <ul style="margin:0 0 12px;padding-left:18px">${itemsHtml}</ul>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;font-weight:700;margin:0 0 8px">Subtotal: €${subtotal.toFixed(2)}</p>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;margin:0 0 8px">
                  Our team will review your logo and email you a secure checkout link once approved
                  (usually within 1–2 business days). Shipping will be confirmed at that point.
                </p>
                <p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin:12px 0 0">Questions? Reply to this email or contact us at distribution@gelitup.com.</p>
              `,
            }),
          })
        } catch {
          // Email failed to send — the request itself was still recorded successfully.
        }
      }

      // Silently create (or reuse) a B2B portal account so the customer can log in
      // later. Non-blocking — if this fails, the Studio One request itself still stands.
      try {
        const randomPassword = crypto.randomUUID().slice(0, 16)
        await supabase.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: randomPassword,
          options: {
            data: {
              company_name: form.company_name.trim(),
              vat_number: form.vat_number.trim() || null,
              account_type: 'studio_one',
              full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
              contact_phone: form.phone.trim(),
              contact_email: form.email.trim().toLowerCase(),
              invoice_address_line1: form.address.trim(),
              invoice_area: form.city.trim(),
              invoice_country: form.country.trim(),
              invoice_postal_code: form.postal_code.trim(),
            },
            emailRedirectTo: `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(form.email.trim().toLowerCase())}`,
          },
        })
      } catch {
        // Account already exists, or signup silently failed — either way the
        // Studio One request has already been recorded, so don't block on this.
      }

      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError(`Something went wrong submitting your request: ${err?.message || 'please try again.'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-[#D43790] mb-4">Request received!</h1>
        <p className="text-[#4A4A4A] mb-2">
          Thank you — your Studio One request and logo have been submitted for review.
        </p>
        <p className="text-[#4A4A4A]">
          Our team will review your logo and get back to you at <strong>{form.email}</strong> with a secure
          checkout link once approved. This usually takes 1–2 business days.
        </p>
        <p className="text-[#4A4A4A] mt-2">
          We've also created you an account — check your email for a link to set your password so you
          can log in and track your order.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <header className="text-center mb-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-[#9B1268]">Studio One</p>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-neutral-900 sm:text-5xl">
          Your Brand <span className="font-serif italic text-[#9B1268]">&amp;</span> Our Signature
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-500">
          The same superior, HEMA-free, EU-certified gel formula your clients already trust — now with
          your logo on every bottle.
        </p>
        <p className="mt-3 text-[15px] text-neutral-500">Minimum order €{MIN_ORDER_EUR}</p>
        <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#9B1268]">
          Pilot programme runs 15 September – 15 November
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
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input required placeholder="City" className="border rounded-lg p-3"
              value={form.city} onChange={e => updateField('city', e.target.value)} />
            <input required placeholder="Postal code" className="border rounded-lg p-3"
              value={form.postal_code} onChange={e => updateField('postal_code', e.target.value)} />
            <select required className="border rounded-lg p-3 bg-white"
              value={form.country} onChange={e => updateField('country', e.target.value)}>
              <option value="" disabled>Country</option>
              {EU_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-black/70 mb-1">
              VAT number{' '}
              <span className="ml-1 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-normal text-black/50">
                for businesses — optional
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. EL123456789"
                className="flex-1 border rounded-lg p-3"
                value={form.vat_number}
                onChange={e => { updateField('vat_number', e.target.value); setViesResult(null); setViesError('') }}
              />
              <button
                type="button"
                onClick={verifyVat}
                disabled={viesLoading || !form.vat_number.trim()}
                className="shrink-0 rounded-lg bg-black/80 px-4 text-xs font-semibold text-white hover:bg-black disabled:opacity-40"
              >
                {viesLoading ? 'Checking…' : 'Verify'}
              </button>
            </div>
            {viesResult?.valid && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px]">✓</span>
                VAT verified{viesResult.name ? ` — ${viesResult.name}` : ''}
              </p>
            )}
            {viesError && <p className="mt-1.5 text-xs text-red-600">{viesError}</p>}
          </div>

          <h2 className="text-xl font-semibold mb-1">2. Upload your logo</h2>
          <p className="text-xs text-black/50 mb-3">
            Best results: a wide logo (roughly 2:1 to 3:1), PNG with a transparent background, at least 800×400px.
          </p>
          <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-[#D43790] transition">
            <input type="file" accept="image/*,.ai,.eps,.pdf" className="hidden" onChange={handleLogoChange} />
            {logoFile && logoPreviewable && logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="max-h-32 mx-auto object-contain" />
            ) : logoFile && !logoPreviewable ? (
              <div className="text-[#4A4A4A]">
                <div className="font-medium">{logoFile.name}</div>
                <div className="text-xs text-black/50 mt-1">File selected — no live preview available for this file type</div>
              </div>
            ) : (
              <span className="text-[#4A4A4A]">Click to upload your logo (PNG, SVG, AI, EPS, PDF)</span>
            )}
          </label>

          {logoFile && !logoPreviewable && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              PDF, AI, and EPS files can't show a live preview in your browser — but your file will still be
              uploaded and used for the real print. For a live bottle preview, upload a PNG, JPG, or SVG instead.
            </p>
          )}

          {logoFile ? (
            <div className="flex items-center justify-center gap-4 mt-2">
              <label className="text-xs font-medium text-[#D43790] cursor-pointer hover:underline">
                Try a different logo
                <input type="file" accept="image/*,.ai,.eps,.pdf" className="hidden" onChange={handleLogoChange} />
              </label>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="text-xs font-medium text-black/50 hover:text-black/70 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : null}
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
                  <div className="font-medium">{item.name} <span className="text-[10px] font-normal text-black/40">(included)</span></div>
                  <div className="text-xs text-black/50">€{item.price.toFixed(2)} / bottle</div>
                </div>
                <CartStepper
                  min={1}
                  qty={cart[item.code]?.qty || 1}
                  onAdd={() => addToCart(item.code, item.name, item.price)}
                  onRemove={() => removeFromCart(item.code)}
                />
              </div>
            ))}
          </div>

          {(cartSummary.essentialsChosen.length > 0 || cartSummary.colourFamilies.length > 0) && (
            <div className="border rounded-lg p-4 mb-6 bg-black/[0.02]">
              <p className="font-semibold text-sm mb-3">Your order so far</p>

              {cartSummary.essentialsChosen.length > 0 && (
                <div className="mb-3">
                  {cartSummary.essentialsChosen.map(item => (
                    <div key={item.code} className="flex justify-between text-xs text-black/70 py-0.5">
                      <span>{item.name} <span className="text-black/40">×{item.qty}</span></span>
                      <span>€{(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {cartSummary.colourFamilies.length > 0 && (
                <div className="space-y-2">
                  {cartSummary.colourFamilies.map(group => (
                    <div key={group.family}>
                      <div className="flex justify-between text-xs font-medium text-black/70 mb-1">
                        <span>{group.family}</span>
                        <span>{group.count} bottle{group.count === 1 ? '' : 's'} · €{group.total.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map(item => (
                          <div key={item.code} className="text-center">
                            <div className="relative w-8 h-8 rounded border bg-white overflow-hidden" title={`#${item.code} × ${item.qty}`}>
                              {item.image && (
                                <img src={item.image} alt={`Colour ${item.code}`} className="w-full h-full object-contain" />
                              )}
                              <span className="absolute -bottom-0.5 -right-0.5 bg-[#D43790] text-white text-[9px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                                {item.qty}
                              </span>
                            </div>
                            <div className="text-[9px] text-black/50 mt-0.5">€{(item.qty * item.price).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 className="text-xl font-semibold mb-1">4. Choose your colours</h2>
          <p className="text-xs text-black/50 mb-4">
            Official colour swatches — the physical dip sample that ships with your order remains the true reference.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6 max-h-[32rem] overflow-y-auto pr-1">
            {COLOUR_CODES.map(code => {
              const imgSrc = COLOUR_IMAGE[code]
              const inCart = (cart[code]?.qty || 0) > 0
              return (
                <div
                  key={code}
                  className={`border rounded-lg p-3 text-center transition overflow-hidden bg-white ${inCart ? 'border-[#D43790] ring-1 ring-[#D43790]' : ''}`}
                >
                  <div className="w-full aspect-square mx-auto mb-1 flex items-center justify-center overflow-hidden">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={`Colour ${code}`}
                        className="block max-w-full max-h-full object-contain"
                        loading="lazy"
                        onError={e => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <span className="text-xs text-black/30">N/A</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold mb-1">{code}</div>
                  <div className="text-xs text-black/50 mb-2">€{COLOUR_PRICE.toFixed(2)}</div>
                  <CartStepper
                    compact
                    qty={cart[code]?.qty || 0}
                    onAdd={() => addToCart(code, `Colour ${code}`, COLOUR_PRICE)}
                    onRemove={() => removeFromCart(code)}
                  />
                </div>
              )
            })}
          </div>

          <div className="border-t pt-4 bg-white">
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

            <div className="border rounded-lg p-3 mb-3 max-h-32 overflow-y-auto text-[11px] text-black/60 leading-relaxed bg-black/[0.02]">
              <p className="font-semibold text-black/70 mb-1">Studio One — Terms &amp; Conditions</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>This is a pilot programme running from 15 September to 15 November, and does not constitute a contract or ongoing commitment between Thermitek LTD and the client.</li>
                <li>Logos must be submitted in clear, print-ready format. Logos requiring design correction or adaptation may be rejected, delayed, and/or subject to an additional fee.</li>
                <li>Thermitek LTD reserves the right to reject any logo or order, in whole or in part, without providing a reason. In case of doubt or dispute, the Company holds the final decision.</li>
                <li>All colours and products are subject to availability — orders are fulfilled while stocks last. Approved orders are dispatched within 7–14 working days.</li>
                <li>Shipping costs are calculated separately by our team and confirmed before payment is requested.</li>
                <li>This service is not available to competing brands or businesses engaged in gel polish manufacture, private label, or wholesale distribution.</li>
                <li>Removal or alteration of labels once applied to bottles is strictly prohibited.</li>
                <li>It is the client's sole responsibility to ensure batch numbers and production dates remain visible and unaltered.</li>
                <li>Thermitek LTD is not responsible for any non-compliance, mislabeling, or alteration occurring after products have left the factory.</li>
                <li>Participation in this pilot does not entitle the client to future private label runs, pricing, or terms.</li>
              </ol>
            </div>

            <label className="flex items-start gap-2 mb-4 text-xs text-black/70 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-0.5"
              />
              I have read and agree to the Studio One Terms &amp; Conditions above.
            </label>

            <button
              type="submit"
              disabled={submitting || !termsAccepted}
              className="w-full bg-[#D43790] text-white font-semibold rounded-lg py-3 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit for logo approval'}
            </button>
            <p className="text-[10px] text-black/40 mt-2 text-center">
              You won't be charged now — we'll email you a checkout link once your logo is approved.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}

function CartStepper({ qty, onAdd, onRemove, compact, min = 0 }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${compact ? '' : 'mt-1'}`}>
      <button type="button" onClick={onRemove} disabled={qty <= min}
        className="w-6 h-6 rounded-full border flex items-center justify-center disabled:opacity-30">−</button>
      <span className="w-5 text-center text-sm">{qty}</span>
      <button type="button" onClick={onAdd}
        className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-[#D43790] hover:text-white">+</button>
    </div>
  )
}
