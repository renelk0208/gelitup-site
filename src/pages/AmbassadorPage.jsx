import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'
import { useLang } from '../lib/i18n'
import InstagramFeed from '../components/InstagramFeed'
import { AGREEMENT_SUMMARY, AGREEMENT_VERSION } from '../data/ambassadorAgreement'
import { buildAmbassadorContractPdf } from '../lib/ambassadorContractPdf'

// Non-negotiable eligibility gates. Answering "No" to any of these blocks the
// application and shows the friendly decline modal — the programme is only for
// qualified nail technicians who show their own work to a real audience.
const ELIGIBILITY_GATES = [
  {
    key: 'qualified',
    question: 'Are you a qualified nail technician?',
    help: 'You hold a recognised nail qualification or certification.',
  },
  {
    key: 'workShown',
    question: 'Is your own nail work shown on your social profiles?',
    help: 'Your profiles feature nail sets you have created yourself.',
  },
  {
    key: 'followers500',
    question: 'Do you have more than 500 followers?',
    help: 'On the profile where you post your nail work.',
  },
]

const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL
const EMAIL_WEBHOOK_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_FROM = import.meta.env.VITE_AMBASSADOR_EMAIL_FROM || 'GEL.IT.UP <info@gelitup.com>'
const ADMIN_INBOX = import.meta.env.VITE_AMBASSADOR_INBOX || 'info@gelitup.com'

const escapeHtml = (v) => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;')

// Emails the business inbox a new-application notification with the signed PDF attached.
// Best-effort: any failure is swallowed so it never blocks the applicant's success screen.
async function notifyAdminOfApplication(record, pdf) {
  if (!EMAIL_WEBHOOK_URL) return
  const rows = [
    ['Name', record.full_name],
    ['Email', record.email],
    ['Instagram', record.instagram ? '@' + record.instagram : '—'],
    ['TikTok', record.tiktok ? '@' + record.tiktok : '—'],
    ['Qualified nail tech', 'Yes'],
    ['Shows own work on profile', 'Yes'],
    ['500+ followers', 'Yes'],
    ['Country', record.country || '—'],
    ['Language', record.language || '—'],
    ['Agreement', `${record.agreement_version || ''} (signed)`],
  ]
  const html = `
    <h2 style="font-family:Arial,sans-serif;color:#1a1a1a">New ambassador application</h2>
    <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
      ${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${escapeHtml(k)}</td><td style="padding:4px 0;color:#1a1a1a"><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}
    </table>
    ${record.message ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#374151"><em>“${escapeHtml(record.message)}”</em></p>` : ''}
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#9ca3af">The applicant's signed agreement (English, governing version) is attached as a PDF.</p>
  `
  const headers = { 'Content-Type': 'application/json' }
  if (EMAIL_WEBHOOK_ANON_KEY) {
    headers.apikey = EMAIL_WEBHOOK_ANON_KEY
    headers.Authorization = `Bearer ${EMAIL_WEBHOOK_ANON_KEY}`
  }
  const body = {
    eventType: 'ambassador_application_submitted',
    to: ADMIN_INBOX,
    subject: `New ambassador application — ${record.full_name} (@${record.instagram})`,
    html,
    from: EMAIL_FROM,
    replyTo: record.email,
  }
  if (pdf?.base64) body.attachments = [{ filename: pdf.filename, content: pdf.base64, contentType: 'application/pdf' }]
  try {
    await fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch { /* best-effort */ }
}

// Countries served by a local GEL.IT.UP partner — applicants apply via the partner's
// Instagram instead of the main programme. Country is a free-text field, so `match` covers
// common spellings + ISO codes. Add a new entry here to onboard another country.
const PARTNER_COUNTRIES = [
  {
    key: 'greece',
    name: 'GEL.IT.UP Greece',
    handle: '@gelitupinternational',
    instagramUrl: 'https://instagram.com/gelitupinternational',
    flag: '🇬🇷',
    match: (c) =>
      ['gr', 'grc'].includes(c) || c.includes('greece') || c.includes('hellas') ||
      c.includes('griechenland') || c.includes('grecia') || c.includes('grèce') ||
      c.includes('grece') || c.includes('ελλαδ') || c.includes('ελλάδ'),
  },
  {
    key: 'italy',
    name: 'GEL.IT.UP Italy',
    handle: '@gel.it.upitaly',
    instagramUrl: 'https://instagram.com/gel.it.upitaly',
    flag: '🇮🇹',
    match: (c) =>
      ['it', 'ita'].includes(c) || c.includes('italy') || c.includes('italia') ||
      c.includes('italien') || c.includes('italie'),
  },
]

// Returns the partner-country config for a free-text country string, or null.
function matchPartnerCountry(country) {
  const c = String(country || '').trim().toLowerCase()
  if (!c) return null
  return PARTNER_COUNTRIES.find((p) => p.match(c)) || null
}

// Thanks the applicant for applying and redirects them to the local partner on Instagram.
// Best-effort: any failure is swallowed so it never blocks the applicant's success screen.
async function sendPartnerRedirectEmail(record, partner) {
  if (!EMAIL_WEBHOOK_URL || !record?.email || !partner) return
  const firstName = String(record.full_name || '').trim().split(' ')[0] || 'there'
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>Thank you so much for applying to the GEL.IT.UP Ambassador Programme — we love that you want to create with us.</p>
      <p>Applications from your country are handled by <strong>${escapeHtml(partner.name)}</strong>. To make your application, please get in touch with them directly on Instagram at <a href="${partner.instagramUrl}" style="color:#D43790;font-weight:bold">${escapeHtml(partner.handle)}</a> — that's where you'll need to apply.</p>
      <p>If you need anything else, just email us at <a href="mailto:info@gelitup.com" style="color:#D43790;font-weight:bold">info@gelitup.com</a>.</p>
      <p>Warm wishes,<br/>The GEL.IT.UP Team</p>
    </div>`
  const headers = { 'Content-Type': 'application/json' }
  if (EMAIL_WEBHOOK_ANON_KEY) {
    headers.apikey = EMAIL_WEBHOOK_ANON_KEY
    headers.Authorization = `Bearer ${EMAIL_WEBHOOK_ANON_KEY}`
  }
  const body = {
    eventType: 'ambassador_application_partner_redirect',
    to: record.email,
    subject: `Your GEL.IT.UP ambassador application — please apply via ${partner.name}`,
    html,
    from: EMAIL_FROM,
    replyTo: ADMIN_INBOX,
  }
  try {
    await fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch { /* best-effort */ }
}

// Editable programme perks — tweak the copy freely, the layout adapts.
const PERKS = [
  {
    emoji: '📸',
    title: 'Featured on our Instagram',
    body: 'Your nail work reposted to @gelitupinternational — real exposure to thousands of pros and clients across Europe.',
  },
  {
    emoji: '🏷️',
    title: 'Your own discount code',
    body: 'A personal code to share privately with your nail-tech followers — 20% off GEL.IT.UP for the pros you recommend.',
  },
  {
    emoji: '🎁',
    title: 'Monthly PR packages',
    body: 'Get sent new colours and launches — a PR package about once a month, and more often around new drops.',
  },
]

const STEPS = [
  { n: '1', title: 'Apply', body: 'Fill in the quick form below with your socials.' },
  { n: '2', title: 'We review', body: 'We check out your work — open to professional nail technicians creating with gel.' },
  { n: '3', title: 'Create & get featured', body: 'Post your GEL.IT.UP looks, tag us, and get reposted.' },
]

function scrollToApply() {
  document.getElementById('ambassador-apply')?.scrollIntoView({ behavior: 'smooth' })
}

export default function AmbassadorPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    facebook: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    message: '',
  })
  // One entry per gate in ELIGIBILITY_GATES: '' | 'yes' | 'no'
  const [eligibility, setEligibility] = useState({ qualified: '', workShown: '', followers500: '' })
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | partner | error
  const [partnerCountry, setPartnerCountry] = useState(null) // partner config when country is served locally
  const [errorMsg, setErrorMsg] = useState('')
  const lang = useLang()

  useEffect(() => {
    document.title = 'Become an Ambassador | GEL.IT.UP by GIUP®'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        'Get your nail work featured on @gelitupinternational, earn a personal discount code and receive free product drops. Apply to become a GEL.IT.UP ambassador.',
      )
    }
  }, [])

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // True only when every non-negotiable gate is answered "yes".
  const eligible = ELIGIBILITY_GATES.every((g) => eligibility[g.key] === 'yes')
  // True as soon as any gate has been answered "no" → they can't be accepted.
  const ineligible = ELIGIBILITY_GATES.some((g) => eligibility[g.key] === 'no')

  const setGate = (key) => (v) => {
    setEligibility((e) => ({ ...e, [key]: v }))
    if (v === 'no') setShowDeclineModal(true)
  }

  const requiredFilled =
    form.fullName.trim() && form.email.trim() && form.phone.trim() && form.instagram.trim() &&
    form.address.trim() && form.city.trim() && form.postalCode.trim() &&
    form.country.trim() && agreed && eligible

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!eligible) { setShowDeclineModal(true); return }
    if (!requiredFilled) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const record = {
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        instagram: form.instagram.trim().replace(/^@+/, ''),
        tiktok: form.tiktok.trim().replace(/^@+/, '') || null,
        facebook: form.facebook.trim().replace(/^@+/, '') || null,
        address: form.address.trim(),
        city: form.city.trim(),
        postal_code: form.postalCode.trim(),
        country: form.country.trim(),
        message: form.message.trim() || null,
        is_qualified_tech: true,
        work_shown_on_profile: true,
        followers_over_500: true,
        agreed_terms: true,
        agreement_version: AGREEMENT_VERSION,
        language: lang || 'en',
      }
      if (hasSupabaseConfig && supabase) {
        const { error: insertError } = await supabase.from('ambassador_applications').insert(record)
        // 23505 = unique violation → they already applied with this handle.
        if (insertError && insertError.code !== '23505') throw insertError
      }
      // Build the signed PDF + notify the business inbox (best-effort — never blocks success).
      try {
        const pdf = await buildAmbassadorContractPdf({
          fullName: record.full_name,
          email: record.email,
          phone: record.phone,
          instagram: record.instagram,
          tiktok: record.tiktok,
          address: `${record.address}, ${record.city} ${record.postal_code}, ${record.country}`,
          country: record.country,
          qualifiedTech: true,
          workShown: true,
          followersOver500: true,
          agreementVersion: record.agreement_version,
          lang: record.language,
          signedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        })
        await notifyAdminOfApplication(record, pdf)
      } catch { /* notification is best-effort */ }
      // Countries with a local GEL.IT.UP partner are served via that partner's Instagram. We
      // still save + notify admin above, and additionally email the applicant to apply there.
      const partner = matchPartnerCountry(record.country)
      if (partner) {
        try { await sendPartnerRedirectEmail(record, partner) } catch { /* best-effort */ }
        setPartnerCountry(partner)
        setStatus('partner')
      } else {
        setStatus('success')
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong.')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#D43790] focus:ring-2 focus:ring-[#D43790]/40'
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60'

  return (
    <div className="-mx-3 -my-4 md:-mx-6 md:-my-10">
      {/* Hero */}
      <section className="px-5 py-16 text-center sm:py-24" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #2a1030 0%, #17111c 55%, #0e0b12 100%)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e879c4]">
          The GEL.IT.UP Ambassador Programme
        </p>
        <h1 className="heading-on-dark mx-auto mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
          Get your nails<br />on our page.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/75 sm:text-lg">
          Love creating with gel? Join our ambassadors and get featured to thousands,
          earn your own discount code, and receive free product drops.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={scrollToApply}
            className="inline-flex items-center gap-2 rounded-full bg-[#D43790] px-8 py-4 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_0_24px_rgba(212,55,144,0.5)] transition duration-300 hover:scale-[1.03] hover:bg-[#c22f82]"
          >
            Apply in 60 seconds
            <span aria-hidden="true">→</span>
          </button>
          <a
            href="https://www.instagram.com/gelitupinternational/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-8 py-4 text-sm font-bold uppercase tracking-[0.06em] text-white/85 transition duration-300 hover:bg-white/10 hover:text-white"
          >
            See @gelitupinternational
          </a>
        </div>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
          For professional nail technicians · Free to join
        </p>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">
          What you get
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PERKS.map((perk) => (
            <div key={perk.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="text-3xl">{perk.emoji}</div>
              <h3 className="mt-4 text-lg font-black text-[#1A1A1A]">{perk.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/65">{perk.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Where you'll be featured — live Instagram feed */}
      <section className="bg-[#F5F5F5] px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D43790]">
              This is where you&apos;ll be featured
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">
              Our @gelitupinternational feed
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-black/60">
              Every post below is an ambassador or artist creating with GEL.IT.UP.
              Yours could be next.
            </p>
          </div>
          <div className="mt-8">
            <InstagramFeed />
          </div>
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={scrollToApply}
              className="inline-flex items-center gap-2 rounded-full bg-[#D43790] px-7 py-3.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-lg transition duration-300 hover:scale-[1.03] hover:bg-[#c22f82]"
            >
              I want in — apply now
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-center text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#D43790] text-lg font-black text-white">
                {step.n}
              </div>
              <h3 className="mt-4 text-base font-black text-[#1A1A1A]">{step.title}</h3>
              <p className="mt-2 text-sm text-black/60">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section
        id="ambassador-apply"
        className="px-5 py-16 scroll-mt-24"
        style={{ background: 'radial-gradient(120% 120% at 50% 100%, #2a1030 0%, #17111c 55%, #0e0b12 100%)' }}
      >
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-2xl font-black tracking-tight text-white sm:text-3xl">
            Apply to become an ambassador
          </h2>
          <p className="mt-3 text-center text-sm text-white/65">
            Takes under a minute. We&apos;ll be in touch by email if it&apos;s a match.
          </p>

          {status === 'partner' && partnerCountry ? (
            <div className="mt-8 rounded-2xl border border-[#D43790]/40 bg-white/[0.04] p-8 text-center">
              <div className="text-4xl">{partnerCountry.flag}</div>
              <h3 className="mt-4 text-xl font-black text-white">Thank you for applying!</h3>
              <p className="mt-2 text-sm text-white/70">
                Thanks {form.fullName.split(' ')[0] || 'so much'} — applications from your country are handled by{' '}
                <span className="font-semibold text-[#e879c4]">{partnerCountry.name}</span>. Please make your application by
                contacting them on Instagram at <span className="font-semibold text-[#e879c4]">{partnerCountry.handle}</span>.
              </p>
              <p className="mt-2 text-sm text-white/70">
                If you need anything else, email us at{' '}
                <a href="mailto:info@gelitup.com" className="font-semibold text-[#e879c4] hover:underline">info@gelitup.com</a>.
              </p>
              <a
                href={partnerCountry.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex rounded-full bg-[#D43790] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c22f82]"
              >
                Message {partnerCountry.handle} on Instagram
              </a>
            </div>
          ) : status === 'success' ? (
            <div className="mt-8 rounded-2xl border border-[#D43790]/40 bg-white/[0.04] p-8 text-center">
              <div className="text-4xl">🎉</div>
              <h3 className="mt-4 text-xl font-black text-white">You&apos;re in the running!</h3>
              <p className="mt-2 text-sm text-white/70">
                Thanks {form.fullName.split(' ')[0] || 'so much'} — we&apos;ve got your application.
                Keep an eye on your inbox and keep tagging <span className="font-semibold text-[#e879c4]">@gelitupinternational</span>.
              </p>
              <NavLink
                to="/full-catalogue"
                className="mt-6 inline-flex rounded-full bg-[#D43790] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c22f82]"
              >
                Browse the catalogue
              </NavLink>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Full name *</label>
                  <input type="text" required value={form.fullName} onChange={update('fullName')} placeholder="Jane Doe" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Email *</label>
                  <input type="email" required value={form.email} onChange={update('email')} placeholder="you@email.com" className={inputClass} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Phone number *</label>
                  <input type="tel" required value={form.phone} onChange={update('phone')} placeholder="+49 170 1234567" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Instagram handle *</label>
                  <input type="text" required value={form.instagram} onChange={update('instagram')} placeholder="@yourhandle" className={inputClass} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>TikTok (optional)</label>
                  <input type="text" value={form.tiktok} onChange={update('tiktok')} placeholder="@yourhandle" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Facebook (optional)</label>
                  <input type="text" value={form.facebook} onChange={update('facebook')} placeholder="facebook.com/yourpage" className={inputClass} />
                </div>
              </div>

              {/* Eligibility gates — all three are non-negotiable */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#e879c4]">A few essentials first</p>
                <p className="mb-4 text-xs leading-relaxed text-white/50">
                  Our ambassadors are qualified nail technicians who share their own work. All three must be a yes.
                </p>
                <div className="space-y-4">
                  {ELIGIBILITY_GATES.map((gate) => (
                    <div key={gate.key}>
                      <label className={labelClass}>{gate.question} *</label>
                      <p className="mb-2 text-xs text-white/40">{gate.help}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }].map(({ v, l }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setGate(gate.key)(v)}
                            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                              eligibility[gate.key] === v
                                ? (v === 'yes' ? 'border-emerald-400 bg-emerald-400/15 text-white' : 'border-rose-400 bg-rose-400/15 text-white')
                                : 'border-white/20 bg-white/[0.04] text-white/70 hover:border-white/40'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {ineligible && (
                  <p className="mt-4 text-xs leading-relaxed text-rose-300">
                    Being a GEL.IT.UP ambassador is a serious professional venture, so all three essentials
                    above are required. Based on your answers we&apos;re not able to accept your application right now.
                  </p>
                )}
                <p className="mt-4 flex gap-2 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/45">
                  <span aria-hidden="true">🔍</span>
                  <span>
                    Every profile is personally reviewed before an application is approved, so we choose the
                    right people to represent our brand. Please make sure your social profiles are public.
                  </span>
                </p>
              </div>

              {/* Shipping details for sample & PR boxes */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#e879c4]">Where do we send your sample &amp; PR boxes?</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Street address *</label>
                    <input type="text" required value={form.address} onChange={update('address')} placeholder="Street and number" className={inputClass} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>City *</label>
                      <input type="text" required value={form.city} onChange={update('city')} placeholder="City" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Postal code *</label>
                      <input type="text" required value={form.postalCode} onChange={update('postalCode')} placeholder="12345" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Country *</label>
                    <input type="text" required value={form.country} onChange={update('country')} placeholder="Germany" className={inputClass} />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Why do you want to join? (optional)</label>
                <textarea rows={4} value={form.message} onChange={update('message')} placeholder="Tell us a little about your work…" className={inputClass} />
              </div>

              {/* Initial terms — summary + agree checkbox (full contract is sent on approval) */}
              <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e879c4]">
                    Initial Terms &amp; Conditions
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                  These are the initial terms for applying. If your application is approved, we&rsquo;ll email you your full GEL.IT.UP Ambassador Agreement to keep &mdash; in your language where possible, and in English.
                </p>
                <div className="mt-3 max-h-44 space-y-2.5 overflow-y-auto pr-2">
                  {AGREEMENT_SUMMARY.map((point, i) => (
                    <p key={i} className="flex gap-2.5 text-xs leading-relaxed text-white/70">
                      <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#D43790]" />
                      <span>{point}</span>
                    </p>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#D43790]"
                />
                <span>
                  I have read and agree to the initial terms and conditions above, and I understand the monthly posting commitment.
                </span>
              </label>

              <p className="text-xs text-white/45">
                Submitting signs this agreement as{' '}
                <span className="font-semibold text-white/70">{form.fullName.trim() || 'your full name above'}</span>
                {' '}on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
              </p>

              {status === 'error' && (
                <p className="text-sm text-red-400">
                  {errorMsg || 'Something went wrong.'} Please try again, or email us directly.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting' || !requiredFilled}
                className="w-full rounded-full bg-[#D43790] px-6 py-4 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_0_24px_rgba(212,55,144,0.4)] transition duration-300 hover:bg-[#c22f82] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'submitting' ? 'Sending…' : 'Sign & submit my application'}
              </button>
              <p className="text-center text-xs text-white/40">
                We also handle your data per our{' '}
                <NavLink to="/privacy-policy" className="underline hover:text-white/70">privacy policy</NavLink>.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Eligibility popup — shown when "No" is selected on any essential */}
      {showDeclineModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-5"
          onClick={() => setShowDeclineModal(false)}
        >
          <div
            className="max-w-sm rounded-2xl border border-white/10 bg-[#1b1420] p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl">💅</div>
            <h3 className="mt-3 text-lg font-black text-white">Not quite a match</h3>
            <p className="mt-2 text-sm text-white/70">
              We&apos;re so sorry! Being a GEL.IT.UP ambassador is a serious professional venture,
              so every ambassador must be a <span className="font-semibold text-white">qualified nail technician</span>,
              <span className="font-semibold text-white"> showing their own nail work</span> to an audience of
              <span className="font-semibold text-white"> more than 500 followers</span>.
            </p>
            <p className="mt-3 text-sm text-white/70">
              As that isn&apos;t the case right now, we&apos;re not able to accept your application — but you&apos;re
              always welcome to apply again once it is. 💕
            </p>
            <button
              type="button"
              onClick={() => setShowDeclineModal(false)}
              className="mt-5 rounded-full bg-[#D43790] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#c22f82]"
            >
              I understand
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
