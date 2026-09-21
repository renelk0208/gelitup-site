import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'

const REGISTRATIONS_TABLE = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || 'b2b_registrations'
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL
const EMAIL_WEBHOOK_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'info@gelitup.com'
const EMAIL_REPLY_TO = import.meta.env.VITE_EMAIL_REPLY_TO || import.meta.env.VITE_B2B_EMAIL || 'info@gelitup.com'
const KIT_INBOX_EMAIL = import.meta.env.VITE_CONTACT_INBOX_EMAIL || 'info@gelitup.com'

// Campaign targeting: EU markets served by the academy programme (Greece & Bulgaria excluded)
const KIT_COUNTRIES = [
  'Austria', 'Belgium', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland',
  'France', 'Germany', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
]

const STUDENT_RANGES = ['1–10', '11–25', '26–50', '51–100', '100+']

const KIT_CONTENTS = [
  { icon: '🎨', text: 'A curated selection of best-selling shades for your instructors to test' },
  { icon: '🧪', text: 'Base & top coat samples — HEMA-free, TPO-free formulas' },
  { icon: '📋', text: 'Full compliance pack: SDS documents, CPNP notification, EC 1223/2009' },
  { icon: '💶', text: 'Academy wholesale price list — no minimum order, free EU shipping' },
]

async function sendKitNotification({ subject, html }) {
  if (!EMAIL_WEBHOOK_URL) return { ok: false, skipped: true }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EMAIL_WEBHOOK_ANON_KEY ? { Authorization: `Bearer ${EMAIL_WEBHOOK_ANON_KEY}` } : {}),
      },
      body: JSON.stringify({
        eventType: 'academy_sample_kit_requested',
        to: KIT_INBOX_EMAIL,
        subject,
        html,
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return { ok: res.ok, skipped: false }
  } catch {
    return { ok: false, skipped: false }
  }
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;')

export default function AcademySampleKitPage() {
  const [form, setForm] = useState({
    academyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    studentsPerSeason: '',
    websiteOrInstagram: '',
  })
  const [consentGiven, setConsentGiven] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    document.title = 'Free Academy Sample Kit | GEL.IT.UP for Nail Academies'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Claim a free GEL.IT.UP sample kit for your nail academy. HEMA-free, TPO-free, EU-certified gel samples plus the full compliance pack — shipped free to your school.')
  }, [])

  // Pre-fill country from visitor geo (only if it's a campaign market)
  useEffect(() => {
    fetch('/.netlify/functions/geo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.countryName && KIT_COUNTRIES.includes(data.countryName)) {
          setForm((current) => (current.country ? current : { ...current, country: data.countryName }))
        }
      })
      .catch(() => {/* non-critical — silently ignore */})
  }, [])

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!form.academyName.trim()) { setErrorMessage('Please enter your academy name.'); return }
    if (!form.contactPerson.trim()) { setErrorMessage('Please enter a contact person.'); return }
    if (!form.phone.trim()) { setErrorMessage('Please enter a contact number.'); return }
    if (!form.email.trim()) { setErrorMessage('Please enter your email address.'); return }
    if (!form.address.trim()) { setErrorMessage('Please enter your academy address — that\'s where the kit ships.'); return }
    if (!form.city.trim()) { setErrorMessage('Please enter your city.'); return }
    if (!form.postalCode.trim()) { setErrorMessage('Please enter your postal code.'); return }
    if (!form.country) { setErrorMessage('Please select your country.'); return }
    if (!form.studentsPerSeason) { setErrorMessage('Please select roughly how many students you train per season.'); return }
    if (!consentGiven) { setErrorMessage('Please tick the consent box so we may contact you about your kit.'); return }
    if (!hasSupabaseConfig || !supabase) { setErrorMessage('The form is not available right now. Please email us at info@gelitup.com.'); return }

    setStatus('submitting')

    // Attribution — carries utm_* params from email/social links into the lead record
    const utm = window.location.search ? window.location.search.slice(1) : 'direct'

    const noteParts = [
      '[ACADEMY_SAMPLE_KIT] Free sample kit request.',
      `Students per season: ${form.studentsPerSeason}.`,
      form.websiteOrInstagram.trim() ? `Website/Instagram: ${form.websiteOrInstagram.trim()}.` : null,
      `Source: ${utm}`,
    ].filter(Boolean)

    const payload = {
      customer_type: 'company',
      company_name: form.academyName.trim(),
      vat_number: 'N/A',
      contact_name: form.contactPerson.trim(),
      contact_email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      shipping_type: 'road',
      address: form.address.trim(),
      city: form.city.trim(),
      postal_code: form.postalCode.trim(),
      country: form.country,
      business_type: 'Academy',
      application_type: 'academy_sample_kit',
      status: 'submitted',
      notes: noteParts.join(' '),
      order_profile: null,
      admin_comment: null,
      order_action: null,
      order_payment_status: null,
      order_shipping_status: null,
      tracking_number: null,
      tracking_url: null,
      action_updated_at: null,
      action_updated_by: null,
    }

    const { data: created, error } = await supabase
      .from(REGISTRATIONS_TABLE)
      .insert([payload])
      .select('id')
      .single()

    if (error) {
      setStatus('idle')
      setErrorMessage(error.message || 'Something went wrong saving your request. Please try again.')
      return
    }

    if (window.gtag) {
      window.gtag('event', 'generate_lead', { lead_source: 'academy_sample_kit' })
    }

    // Notify the team — non-blocking for the visitor; the lead is already saved
    await sendKitNotification({
      subject: `Academy Sample Kit #${created?.id} — ${form.academyName.trim()} (${form.country})`,
      html: [
        '<p>New free academy sample kit request.</p>',
        `<p><strong>Request ID:</strong> ${created?.id}</p>`,
        `<p><strong>Academy:</strong> ${escapeHtml(form.academyName)}</p>`,
        `<p><strong>Contact:</strong> ${escapeHtml(form.contactPerson)} · ${escapeHtml(form.phone)} · ${escapeHtml(form.email)}</p>`,
        `<p><strong>Ship to:</strong> ${escapeHtml(form.address)}, ${escapeHtml(form.city)}, ${escapeHtml(form.postalCode)}, ${escapeHtml(form.country)}</p>`,
        `<p><strong>Students per season:</strong> ${escapeHtml(form.studentsPerSeason)}</p>`,
        form.websiteOrInstagram.trim() ? `<p><strong>Website/Instagram:</strong> ${escapeHtml(form.websiteOrInstagram)}</p>` : '',
        `<p><strong>Source:</strong> ${escapeHtml(utm)}</p>`,
      ].join(''),
    })

    setStatus('success')
  }

  const inputClass = 'w-full rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400'
  const inputStyle = { border: '1px solid #d1d5db', backgroundColor: '#fff' }
  const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a1a1a', fontFamily: 'inherit' }}>

      {/* Minimal sticky header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#111' }}>
        <NavLink to="/">
          <img src="/gelitup_logo.png" alt="GEL.IT.UP" className="h-8 w-auto" />
        </NavLink>
        <NavLink
          to="/for-academies"
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#D43790' }}
        >
          For Academies
        </NavLink>
      </header>

      <section className="flex-1 px-5 py-10 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">

          {/* Left: the pitch */}
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#D43790' }}>
              GEL.IT.UP by GIUP® — For Nail Academies
            </p>
            <h1 className="heading-on-dark mt-4 text-4xl sm:text-5xl font-black leading-tight tracking-tight">
              Your free academy<br />sample kit
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Judge us the only way that matters — in your instructors&apos; hands.
              Tell us where to ship it and the kit is on us, including delivery.
            </p>

            <ul className="mt-8 space-y-4">
              {KIT_CONTENTS.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                  <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                <span className="font-bold text-white">One kit per academy · limited monthly allocation.</span>{' '}
                Kits ship to your academy&apos;s business address. No purchase, no obligation —
                if the products don&apos;t earn a place in your classroom, keep the compliance pack with our compliments.
              </p>
            </div>

            {/* Who we are — corroboration for cold traffic arriving from email/social */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
              <img
                src="/gelitup-content/catalog-heroes/academy-hero-image.webp"
                alt="Professional nail academy training with GEL.IT.UP products"
                className="h-36 w-full object-cover object-center"
                loading="lazy"
              />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#D43790' }}>New to GEL.IT.UP?</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  We&apos;re a professional gel brand by GIUP® — 1,000+ shades, builder gels and full systems,
                  supplied wholesale to nail technicians, salons and academies in 15+ countries.
                  Training schools like Nail Tales Academy already teach with our products.
                </p>
                <NavLink to="/for-academies" className="mt-3 inline-block text-sm font-bold text-white underline underline-offset-4 hover:opacity-80">
                  Meet the brand &rarr;
                </NavLink>
              </div>
            </div>

            <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              HEMA-free · TPO-free · CPNP Notified · EC 1223/2009 · Leaping Bunny Approved
            </p>
          </div>

          {/* Right: the form */}
          <div className="rounded-2xl bg-white p-6 sm:p-8 self-start">
            {status === 'success' ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: '#D43790' }}>
                  <span className="text-3xl text-white">✓</span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-900">Kit claimed!</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                  Thanks, {form.contactPerson.split(' ')[0] || 'there'} — we&apos;ve got your request.
                  We&apos;ll confirm your kit and shipping by email within 1–2 business days.
                </p>
                <div className="mt-7 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <NavLink
                    to="/full-catalogue"
                    className="rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                    style={{ backgroundColor: '#D43790' }}
                  >
                    Browse the Catalogue
                  </NavLink>
                  <NavLink
                    to="/for-academies"
                    className="rounded-xl px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    style={{ border: '1px solid #d1d5db' }}
                  >
                    Academy Programme
                  </NavLink>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h2 className="text-xl font-black text-slate-900">Where should we send it?</h2>
                <p className="mt-1 text-sm text-slate-500">Takes about a minute. Kits ship to academies only.</p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="kit-academy">Academy / school name</label>
                    <input id="kit-academy" type="text" className={inputClass} style={inputStyle} placeholder="e.g. Nail Art Academy Vienna"
                      value={form.academyName} onChange={(e) => setField('academyName', e.target.value)} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="kit-contact">Contact person</label>
                      <input id="kit-contact" type="text" className={inputClass} style={inputStyle} placeholder="Full name"
                        value={form.contactPerson} onChange={(e) => setField('contactPerson', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="kit-phone">Contact number</label>
                      <input id="kit-phone" type="tel" className={inputClass} style={inputStyle} placeholder="+49 …"
                        value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="kit-email">Email</label>
                    <input id="kit-email" type="email" className={inputClass} style={inputStyle} placeholder="you@youracademy.com"
                      value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="kit-address">Academy address</label>
                    <input id="kit-address" type="text" className={inputClass} style={inputStyle} placeholder="Street and number"
                      value={form.address} onChange={(e) => setField('address', e.target.value)} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label className={labelClass} htmlFor="kit-postal">Postal code</label>
                      <input id="kit-postal" type="text" className={inputClass} style={inputStyle} placeholder="1010"
                        value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="kit-city">City</label>
                      <input id="kit-city" type="text" className={inputClass} style={inputStyle} placeholder="City"
                        value={form.city} onChange={(e) => setField('city', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="kit-country">Country</label>
                      <select id="kit-country" className={inputClass} style={inputStyle}
                        value={form.country} onChange={(e) => setField('country', e.target.value)}>
                        <option value="">Select country…</option>
                        {KIT_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="kit-students">Students per teaching season</label>
                      <select id="kit-students" className={inputClass} style={inputStyle}
                        value={form.studentsPerSeason} onChange={(e) => setField('studentsPerSeason', e.target.value)}>
                        <option value="">On average…</option>
                        {STUDENT_RANGES.map((r) => <option key={r} value={r}>{r} students</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="kit-website">Website or Instagram <span className="font-normal normal-case text-slate-400">(optional — helps us prepare the right kit)</span></label>
                    <input id="kit-website" type="text" className={inputClass} style={inputStyle} placeholder="youracademy.com or @handle"
                      value={form.websiteOrInstagram} onChange={(e) => setField('websiteOrInstagram', e.target.value)} />
                  </div>

                  <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-600">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span>
                      I agree that GEL.IT.UP may contact me about my sample kit and academy wholesale offers.
                      See our <NavLink to="/privacy-policy" className="underline">Privacy Policy</NavLink>.
                    </span>
                  </label>

                  {errorMessage && (
                    <p className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ backgroundColor: '#fdf2f8', color: '#be185d' }}>
                      {errorMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full rounded-xl px-6 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: '#D43790' }}
                  >
                    {status === 'submitting' ? 'Claiming your kit…' : 'Claim My Free Sample Kit'}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    Free kit · free shipping · no purchase required
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="px-5 py-5 text-center text-xs" style={{ color: '#9ca3af', backgroundColor: '#111' }}>
        © {new Date().getFullYear()} GEL.IT.UP by GIUP® · gelitup.com ·{' '}
        <NavLink to="/privacy-policy" className="underline">Privacy</NavLink>
      </footer>
    </div>
  )
}
