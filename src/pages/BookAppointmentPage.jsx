import { useState } from 'react'

const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL
const EMAIL_WEBHOOK_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'gelitup.portal@gelitup.com'
const INBOX = 'info@gelitup.com'

const TOPICS = [
  'Become a Distributor',
  'Academy Training',
  'Product Information',
  'Existing Order Support',
  'Other',
]

async function sendEmail(payload) {
  if (!EMAIL_WEBHOOK_URL) throw new Error('Email is not configured.')
  const headers = { 'Content-Type': 'application/json' }
  if (EMAIL_WEBHOOK_ANON_KEY) {
    headers.apikey = EMAIL_WEBHOOK_ANON_KEY
    headers.Authorization = `Bearer ${EMAIL_WEBHOOK_ANON_KEY}`
  }
  const res = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: EMAIL_FROM,
      replyTo: payload.email,
      to: INBOX,
      subject: payload.subject,
      html: payload.html,
    }),
  })
  if (!res.ok) throw new Error('Failed to send. Please try again.')
}

export default function BookAppointmentPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [country, setCountry] = useState('')
  const [topic, setTopic] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const formValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    topic

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formValid) { setError('Please fill in all required fields.'); return }
    if (website) return // honeypot caught a bot
    setSubmitting(true)
    try {
      await sendEmail({
        email: email.trim(),
        subject: `📅 Appointment Request — ${topic} — ${name.trim()}`,
        html: `
          <h2>New Appointment Request</h2>
          <table style="border-collapse:collapse;font-family:sans-serif">
            <tr><td style="padding:6px 12px;font-weight:bold">Name</td><td style="padding:6px 12px">${esc(name.trim())}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px"><a href="mailto:${esc(email.trim())}">${esc(email.trim())}</a></td></tr>
            ${company ? `<tr><td style="padding:6px 12px;font-weight:bold">Company / Salon</td><td style="padding:6px 12px">${esc(company.trim())}</td></tr>` : ''}
            ${country ? `<tr><td style="padding:6px 12px;font-weight:bold">Country</td><td style="padding:6px 12px">${esc(country.trim())}</td></tr>` : ''}
            <tr><td style="padding:6px 12px;font-weight:bold">Topic</td><td style="padding:6px 12px">${esc(topic)}</td></tr>
            ${preferredDate ? `<tr><td style="padding:6px 12px;font-weight:bold">Preferred Date</td><td style="padding:6px 12px">${esc(preferredDate)}</td></tr>` : ''}
            ${preferredTime ? `<tr><td style="padding:6px 12px;font-weight:bold">Preferred Time</td><td style="padding:6px 12px">${esc(preferredTime)}</td></tr>` : ''}
            ${message ? `<tr><td style="padding:6px 12px;font-weight:bold">Message</td><td style="padding:6px 12px">${esc(message.trim())}</td></tr>` : ''}
          </table>
          <p style="margin-top:16px;font-size:12px;color:#888">Sent from gelitup.com Book Appointment page</p>
        `,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-gradient-to-br from-[#D43790] via-[#8e1650] to-[#1A1A1A]">
        <div className="px-6 py-14 text-center sm:px-10 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">For Professional Use Only</p>
          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Book a Consultation 📅
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Schedule a call or meeting with our team — distribution enquiries, academy training, or product support.
          </p>
        </div>
      </div>

      {/* ─── Form ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        {submitted ? (
          <div className="py-10 text-center">
            <p className="text-4xl">✅</p>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Request Received</h2>
            <p className="mt-2 text-sm text-slate-600">
              We'll get back to you within 24 hours to confirm your appointment.
            </p>
            <button
              type="button"
              onClick={() => { setSubmitted(false); setName(''); setEmail(''); setCompany(''); setCountry(''); setTopic(''); setPreferredDate(''); setPreferredTime(''); setMessage('') }}
              className="mt-6 text-sm font-semibold text-fuchsia-600 underline hover:text-fuchsia-800"
            >
              Book another
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-extrabold text-slate-900">Request an Appointment</h2>
            <p className="mt-1 text-sm text-slate-500">Fill in your details and we'll confirm your consultation time.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Honeypot */}
              <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                    placeholder="Your full name" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                    placeholder="you@company.com" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Company / Salon</label>
                  <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                    placeholder="Business name (optional)" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={100}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                    placeholder="e.g. South Africa" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Topic *</label>
                <select value={topic} onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200">
                  <option value="">Select a topic…</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Preferred Date</label>
                  <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Preferred Time</label>
                  <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200">
                    <option value="">No preference</option>
                    <option value="Morning (09:00–12:00)">Morning (09:00–12:00)</option>
                    <option value="Afternoon (12:00–16:00)">Afternoon (12:00–16:00)</option>
                    <option value="Evening (16:00–19:00)">Evening (16:00–19:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Additional Notes</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                  placeholder="Anything you'd like us to know…" />
              </div>

              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p>}

              <button type="submit" disabled={submitting || !formValid}
                className="w-full rounded-lg bg-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_14px_rgba(212,55,144,0.4)] transition duration-300 hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40">
                {submitting ? 'Sending…' : '📅 Request Appointment'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ─── Contact alternatives ─────────────────────────────────────── */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center sm:p-7">
        <p className="text-sm text-slate-600">
          Prefer to reach us directly?{' '}
          <a href="mailto:info@gelitup.com" className="font-semibold text-fuchsia-600 underline hover:text-fuchsia-800">info@gelitup.com</a>
          {' · '}
          <a href="https://wa.me/306940715234" target="_blank" rel="noreferrer" className="font-semibold text-fuchsia-600 underline hover:text-fuchsia-800">WhatsApp</a>
        </p>
      </div>
    </section>
  )
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
