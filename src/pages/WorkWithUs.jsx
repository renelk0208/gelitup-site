import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'
import InstagramFeed from '../components/InstagramFeed'
import SocialProof from '../components/SocialProof'

const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL || ''
const EMAIL_WEBHOOK_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'GEL.IT.UP <info@gelitup.com>'
const EMAIL_REPLY_TO = import.meta.env.VITE_EMAIL_REPLY_TO || import.meta.env.VITE_B2B_EMAIL || 'info@gelitup.com'
const WORK_WITH_US_INBOX_EMAIL = 'info@gelitup.com'

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;')

// Notifies the team inbox of a new application. Best-effort: any failure here
// is swallowed so it never blocks the applicant's success screen — the lead
// is already safely stored in Supabase by the time this is called.
async function sendWorkWithUsNotification(record) {
  if (!EMAIL_WEBHOOK_URL) return
  const roleLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const rows = [
    ['Name', `${record.first_name} ${record.surname}`],
    ['Email', record.email],
    ['Phone', [record.phone_dial_code, record.phone_number].filter(Boolean).join(' ')],
    ['Country', record.country],
    ['Instagram', record.instagram_url || '—'],
    ['TikTok', record.tiktok_url || '—'],
    ['Interested in', (record.roles || []).map(roleLabel).concat(record.roles_other ? [record.roles_other] : []).join(', ') || '—'],
  ]
  const html = `
    <h2 style="font-family:Arial,sans-serif;color:#1a1a1a">New Work With Us application</h2>
    <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
      ${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${escapeHtml(k)}</td><td style="padding:4px 0;color:#1a1a1a"><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}
    </table>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#374151"><strong>Why interested:</strong><br/>${escapeHtml(record.why_interested)}</p>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#374151"><strong>Value they'd add:</strong><br/>${escapeHtml(record.value_add)}</p>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#374151"><strong>What they can offer:</strong><br/>${escapeHtml(record.what_offer)}</p>
  `
  const headers = { 'Content-Type': 'application/json' }
  if (EMAIL_WEBHOOK_ANON_KEY) {
    headers.apikey = EMAIL_WEBHOOK_ANON_KEY
    headers.Authorization = `Bearer ${EMAIL_WEBHOOK_ANON_KEY}`
  }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    await fetch(EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventType: 'work_with_us_application_submitted',
        to: WORK_WITH_US_INBOX_EMAIL,
        subject: `New Work With Us application — ${record.first_name} ${record.surname} (${record.country})`,
        html,
        from: EMAIL_FROM,
        replyTo: record.email || EMAIL_REPLY_TO,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
  } catch { /* best-effort */ }
}

// Same country list used across the site's registration forms (B2B, academy sample kit, etc.)
const COUNTRY_OPTIONS = [
  // Europe — EU
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France',
  'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
  // Europe — non-EU
  'Albania', 'Andorra', 'Belarus', 'Bosnia and Herzegovina', 'Georgia', 'Iceland', 'Kosovo', 'Liechtenstein',
  'Moldova', 'Monaco', 'Montenegro', 'North Macedonia', 'Norway', 'San Marino', 'Serbia', 'Switzerland',
  'Turkey', 'Ukraine', 'United Kingdom', 'Vatican City',
  // Americas
  'Antigua and Barbuda', 'Argentina', 'Bahamas', 'Barbados', 'Belize', 'Bolivia', 'Brazil', 'Canada', 'Chile',
  'Colombia', 'Costa Rica', 'Cuba', 'Dominica', 'Dominican Republic', 'Ecuador', 'El Salvador', 'Grenada',
  'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Suriname', 'Trinidad and Tobago',
  'United States', 'Uruguay', 'Venezuela',
  // Middle East & North Africa
  'Algeria', 'Bahrain', 'Egypt', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon', 'Libya',
  'Morocco', 'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Tunisia', 'United Arab Emirates', 'Yemen',
  // Sub-Saharan Africa
  'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon', 'Central African Republic',
  'Chad', 'Comoros', 'Congo (Brazzaville)', 'Congo (DRC)', "Côte d'Ivoire", 'Djibouti', 'Equatorial Guinea',
  'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho',
  'Liberia', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Mozambique', 'Namibia', 'Niger',
  'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
  'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Uganda', 'Zambia', 'Zimbabwe',
  // Asia — East & Southeast
  'Brunei', 'Cambodia', 'China', 'Indonesia', 'Japan', 'Laos', 'Malaysia', 'Mongolia', 'Myanmar', 'North Korea',
  'Philippines', 'Singapore', 'South Korea', 'Taiwan', 'Thailand', 'Timor-Leste', 'Vietnam',
  // Asia — South
  'Afghanistan', 'Bangladesh', 'Bhutan', 'India', 'Maldives', 'Nepal', 'Pakistan', 'Sri Lanka',
  // Asia — Central
  'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan',
  // Caucasus
  'Armenia', 'Azerbaijan',
  // Oceania
  'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'New Zealand', 'Palau',
  'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
].sort()

// International dialling codes for every country above, so the phone field can
// default its country-code dropdown from whatever the applicant picks in Country.
const COUNTRY_DIAL_CODES = {
  Austria: '+43', Belgium: '+32', Bulgaria: '+359', Croatia: '+385', Cyprus: '+357', 'Czech Republic': '+420',
  Denmark: '+45', Estonia: '+372', Finland: '+358', France: '+33', Germany: '+49', Greece: '+30', Hungary: '+36',
  Ireland: '+353', Italy: '+39', Latvia: '+371', Lithuania: '+370', Luxembourg: '+352', Malta: '+356',
  Netherlands: '+31', Poland: '+48', Portugal: '+351', Romania: '+40', Slovakia: '+421', Slovenia: '+386',
  Spain: '+34', Sweden: '+46', Albania: '+355', Andorra: '+376', Belarus: '+375', 'Bosnia and Herzegovina': '+387',
  Georgia: '+995', Iceland: '+354', Kosovo: '+383', Liechtenstein: '+423', Moldova: '+373', Monaco: '+377',
  Montenegro: '+382', 'North Macedonia': '+389', Norway: '+47', 'San Marino': '+378', Serbia: '+381',
  Switzerland: '+41', Turkey: '+90', Ukraine: '+380', 'United Kingdom': '+44', 'Vatican City': '+379',
  'Antigua and Barbuda': '+1268', Argentina: '+54', Bahamas: '+1242', Barbados: '+1246', Belize: '+501',
  Bolivia: '+591', Brazil: '+55', Canada: '+1', Chile: '+56', Colombia: '+57', 'Costa Rica': '+506', Cuba: '+53',
  Dominica: '+1767', 'Dominican Republic': '+1809', Ecuador: '+593', 'El Salvador': '+503', Grenada: '+1473',
  Guatemala: '+502', Guyana: '+592', Haiti: '+509', Honduras: '+504', Jamaica: '+1876', Mexico: '+52',
  Nicaragua: '+505', Panama: '+507', Paraguay: '+595', Peru: '+51', 'Saint Kitts and Nevis': '+1869',
  'Saint Lucia': '+1758', 'Saint Vincent and the Grenadines': '+1784', Suriname: '+597',
  'Trinidad and Tobago': '+1868', 'United States': '+1', Uruguay: '+598', Venezuela: '+58', Algeria: '+213',
  Bahrain: '+973', Egypt: '+20', Iran: '+98', Iraq: '+964', Israel: '+972', Jordan: '+962', Kuwait: '+965',
  Lebanon: '+961', Libya: '+218', Morocco: '+212', Oman: '+968', Palestine: '+970', Qatar: '+974',
  'Saudi Arabia': '+966', Syria: '+963', Tunisia: '+216', 'United Arab Emirates': '+971', Yemen: '+967',
  Angola: '+244', Benin: '+229', Botswana: '+267', 'Burkina Faso': '+226', Burundi: '+257', 'Cabo Verde': '+238',
  Cameroon: '+237', 'Central African Republic': '+236', Chad: '+235', Comoros: '+269',
  'Congo (Brazzaville)': '+242', 'Congo (DRC)': '+243', "Côte d'Ivoire": '+225', Djibouti: '+253',
  'Equatorial Guinea': '+240', Eritrea: '+291', Eswatini: '+268', Ethiopia: '+251', Gabon: '+241', Gambia: '+220',
  Ghana: '+233', Guinea: '+224', 'Guinea-Bissau': '+245', Kenya: '+254', Lesotho: '+266', Liberia: '+231',
  Madagascar: '+261', Malawi: '+265', Mali: '+223', Mauritania: '+222', Mauritius: '+230', Mozambique: '+258',
  Namibia: '+264', Niger: '+227', Nigeria: '+234', Rwanda: '+250', 'São Tomé and Príncipe': '+239',
  Senegal: '+221', Seychelles: '+248', 'Sierra Leone': '+232', Somalia: '+252', 'South Africa': '+27',
  'South Sudan': '+211', Sudan: '+249', Tanzania: '+255', Togo: '+228', Uganda: '+256', Zambia: '+260',
  Zimbabwe: '+263', Brunei: '+673', Cambodia: '+855', China: '+86', Indonesia: '+62', Japan: '+81', Laos: '+856',
  Malaysia: '+60', Mongolia: '+976', Myanmar: '+95', 'North Korea': '+850', Philippines: '+63', Singapore: '+65',
  'South Korea': '+82', Taiwan: '+886', Thailand: '+66', 'Timor-Leste': '+670', Vietnam: '+84',
  Afghanistan: '+93', Bangladesh: '+880', Bhutan: '+975', India: '+91', Maldives: '+960', Nepal: '+977',
  Pakistan: '+92', 'Sri Lanka': '+94', Kazakhstan: '+7', Kyrgyzstan: '+996', Tajikistan: '+992',
  Turkmenistan: '+993', Uzbekistan: '+998', Armenia: '+374', Azerbaijan: '+994', Australia: '+61', Fiji: '+679',
  Kiribati: '+686', 'Marshall Islands': '+692', Micronesia: '+691', Nauru: '+674', 'New Zealand': '+64',
  Palau: '+680', 'Papua New Guinea': '+675', Samoa: '+685', 'Solomon Islands': '+677', Tonga: '+676',
  Tuvalu: '+688', Vanuatu: '+678',
}

// All unique dial codes, each labelled with a representative country, for the phone
// country-code <select>. Sorted by the country list above so results stay predictable.
const DIAL_CODE_OPTIONS = COUNTRY_OPTIONS.map((country) => ({ country, code: COUNTRY_DIAL_CODES[country] })).filter((o) => o.code)

const ROLE_OPTIONS = [
  { key: 'nail_technician', label: 'Nail Technician' },
  { key: 'nail_artist', label: 'Nail Artist' },
  { key: 'nail_master', label: 'Nail Master / Competition Nail Artist' },
  { key: 'educator_trainer', label: 'Educator / Trainer' },
  { key: 'academy_owner', label: 'Academy Owner' },
  { key: 'salon_owner', label: 'Salon / Studio Owner' },
  { key: 'distributor', label: 'Distributor / Wholesaler' },
  { key: 'content_creator', label: 'Content Creator' },
  { key: 'other', label: 'Other' },
]

const WHY_ITEMS = [
  {
    badge: '/badges/hema-tpo-free.png',
    badgeAlt: 'HEMA & TPO Free certification badge',
    title: 'HEMA-free & TPO-free',
    body: 'Kinder to your clients and to you, every day at the desk.',
  },
  {
    badge: '/badges/cruelty-free-international-leaping-bunny.png',
    badgeAlt: 'Cruelty Free International — Leaping Bunny logo',
    title: 'Cruelty Free International approved',
    body: 'Ethically produced, start to finish.',
  },
  {
    badge: '/badges/eu-flag.svg',
    badgeAlt: 'Flag of the European Union',
    title: 'Made in the EU',
    body: 'Full compliance documentation available on request.',
  },
  {
    photo: '/gelitup-content/catalog-heroes/gel-polish-category-hero.jpg',
    photoAlt: 'GEL.IT.UP gel polish bottles — shade range',
    title: '1,000+ shades',
    body: 'Plus builder gels, polygel, bases and tops: one complete professional system.',
  },
]

const WAYS_TO_WORK = [
  {
    key: 'distribution',
    title: 'Distribution partners',
    body: "Bring GEL.IT.UP to your country or region. We're always looking for new distribution points around the world.",
    roles: ['distributor'],
    secondaryTo: '/distributor-packages',
    secondaryLabel: 'See distribution packages',
  },
  {
    key: 'educators',
    title: 'Educators & academies',
    body: 'Teach with a professional, HEMA-free system. Professionally approved gel systems, training materials and brand support for your students.',
    roles: ['educator_trainer', 'academy_owner'],
    secondaryTo: '/for-academies',
    secondaryLabel: 'Academy programme',
  },
  {
    key: 'masters',
    title: 'Nail masters & ambassadors',
    body: 'Competition winners, nail artists and techs whose work speaks for itself. Represent GEL.IT.UP professionally and grow with us.',
    roles: ['nail_master'],
  },
  {
    key: 'salons',
    title: 'Salons & studios',
    body: 'Work with a brand your clients can trust, with direct professional support.',
    roles: ['salon_owner'],
  },
]

const HOW_IT_WORKS_STEPS = [
  { n: '1', title: 'Tell us about you', body: 'Tell us about you and your work.' },
  { n: '2', title: 'A short call', body: "We'll be in touch for a short, personal call." },
  { n: '3', title: 'Find the right fit', body: 'Together we find the right way to work with GEL.IT.UP in your market.' },
]

const FAQS = [
  {
    q: 'Do I need to be a distributor to work with you?',
    a: 'No. Many of our partners are educators, nail masters and salon owners.',
  },
  {
    q: 'Which countries are you looking in?',
    a: "All of them. We're always looking for new distribution points and professionals worldwide.",
  },
  {
    q: 'Do you send free samples?',
    a: "We don't send free samples automatically — whether a trial or sample is offered depends on our conversation with you after you apply.",
  },
  {
    q: 'Who will contact me?',
    a: 'A member of our team will reach out personally after reviewing your details.',
  },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Strips a pasted Instagram/TikTok URL or "@handle" down to the bare handle.
function cleanSocialHandle(raw) {
  let v = String(raw || '').trim()
  if (!v) return ''
  if (/^(https?:\/\/)?(www\.)?(instagram|tiktok)\.com/i.test(v)) {
    try {
      const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
      const path = new URL(withProto).pathname.replace(/^\/+/, '')
      v = path.split('/')[0] || ''
    } catch { /* not a parseable URL — fall through to the raw value */ }
  }
  return v.replace(/^@+/, '').replace(/\s+/g, '')
}

function scrollToForm() {
  document.getElementById('work-with-us-apply')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToCatalogue() {
  if (typeof window !== 'undefined') window.location.href = '/full-catalogue'
}

export default function WorkWithUs() {
  const [form, setForm] = useState({
    firstName: '',
    surname: '',
    email: '',
    phoneDialCode: '',
    phoneNumber: '',
    instagramHandle: '',
    tiktokHandle: '',
    country: '',
    whyInterested: '',
    valueAdd: '',
    whatOffer: '',
    rolesOther: '',
  })
  const [roles, setRoles] = useState([])
  const [consent, setConsent] = useState(false)
  const [dialCodeTouched, setDialCodeTouched] = useState(false)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    document.title = 'Work With GEL.IT.UP | Distributors, Educators & Nail Masters Worldwide'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        "Wherever you work, if you set the standard in your market, we'd love to hear from you. GEL.IT.UP is a professional gel brand, made in the EU and trusted by nail technicians in more than 15 countries.",
      )
    }
  }, [])

  // Keep the phone country-code select in sync with Country, unless the applicant
  // has deliberately picked a different code themselves.
  useEffect(() => {
    if (dialCodeTouched) return
    const code = COUNTRY_DIAL_CODES[form.country]
    if (code) setForm((f) => ({ ...f, phoneDialCode: code }))
  }, [form.country, dialCodeTouched])

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const updateHandle = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: cleanSocialHandle(e.target.value) }))
    setErrors((er) => ({ ...er, social: undefined }))
  }

  const instagramUrl = form.instagramHandle ? `https://www.instagram.com/${form.instagramHandle}/` : ''
  const tiktokUrl = form.tiktokHandle ? `https://www.tiktok.com/@${form.tiktokHandle}` : ''

  const toggleRole = (key) => {
    setRoles((current) => (current.includes(key) ? current.filter((r) => r !== key) : [...current, key]))
    setErrors((er) => ({ ...er, roles: undefined }))
  }

  // Pre-selects a card's role(s), adds them to any existing selection, and scrolls to the form.
  const startApplication = (roleKeys) => {
    setRoles((current) => Array.from(new Set([...current, ...roleKeys])))
    scrollToForm()
  }

  const validate = () => {
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'Please enter your first name.'
    if (!form.surname.trim()) next.surname = 'Please enter your surname.'
    if (!form.email.trim()) next.email = 'Please enter your email.'
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Please enter a valid email address.'
    if (!form.phoneDialCode || !form.phoneNumber.trim()) next.phone = 'Please enter your telephone number.'
    if (!form.instagramHandle.trim() && !form.tiktokHandle.trim()) next.social = 'Please add your Instagram or TikTok handle.'
    if (!form.country.trim() || !COUNTRY_OPTIONS.includes(form.country.trim())) next.country = 'Please select a country from the list.'
    if (roles.length === 0) next.roles = 'Please select at least one option.'
    if (roles.includes('other') && !form.rolesOther.trim()) next.rolesOther = 'Please tell us more.'
    if (!form.whyInterested.trim()) next.whyInterested = 'Please tell us why you are interested.'
    if (!form.valueAdd.trim()) next.valueAdd = 'Please tell us how you would add value.'
    if (!form.whatOffer.trim()) next.whatOffer = 'Please tell us what you can offer.'
    if (!consent) next.consent = 'Please agree to be contacted about working together.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setStatus('submitting')
    setErrorMsg('')

    const record = {
      first_name: form.firstName.trim(),
      surname: form.surname.trim(),
      email: form.email.trim().toLowerCase(),
      phone_dial_code: form.phoneDialCode,
      phone_number: form.phoneNumber.trim(),
      instagram_handle: form.instagramHandle || null,
      instagram_url: instagramUrl || null,
      tiktok_handle: form.tiktokHandle || null,
      tiktok_url: tiktokUrl || null,
      country: form.country.trim(),
      roles,
      roles_other: roles.includes('other') ? form.rolesOther.trim() : null,
      why_interested: form.whyInterested.trim(),
      value_add: form.valueAdd.trim(),
      what_offer: form.whatOffer.trim(),
      consent: true,
      source: typeof window !== 'undefined' && window.location.search ? window.location.search.slice(1) : 'direct',
    }

    try {
      if (hasSupabaseConfig && supabase) {
        const { error: insertError } = await supabase.from('work_with_us_applications').insert(record)
        if (insertError) throw insertError
      }

      // Email notification is best-effort — never blocks the applicant's success screen.
      try { await sendWorkWithUsNotification(record) } catch { /* best-effort */ }

      if (typeof window !== 'undefined') {
        if (window.fbq) window.fbq('track', 'Lead', { content_name: 'work_with_us_application' })
        if (window.gtag) window.gtag('event', 'generate_lead', { lead_source: 'work_with_us' })
      }

      setStatus('success')
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong.')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#D43790] focus:ring-2 focus:ring-[#D43790]/40'
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60'
  const errorClass = 'mt-1.5 text-xs text-rose-300'

  const OpenLinkIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-8 8M9 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-3" />
    </svg>
  )

  return (
    <div className="-mx-3 -my-4 md:-mx-6 md:-my-10">
      {/* HERO */}
      <section className="px-5 py-16 text-center sm:py-24" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #2a1030 0%, #17111c 55%, #0e0b12 100%)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e879c4]">Work With GEL.IT.UP</p>
        <h1 className="heading-on-dark mx-auto mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
          The world&apos;s best nail professionals. One brand.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/75 sm:text-lg">
          Wherever you work, if you set the standard in your market, we&apos;d love to hear from you. GEL.IT.UP is a
          professional gel brand, made in the EU and trusted by nail technicians in more than 15 countries, and
          we&apos;re always looking for exceptional people to represent it.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 rounded-full bg-[#D43790] px-8 py-4 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_0_24px_rgba(212,55,144,0.5)] transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(212,55,144,0.6)]"
          >
            Tell us about you
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            onClick={scrollToCatalogue}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-8 py-4 text-sm font-bold uppercase tracking-[0.06em] text-white/85 transition duration-300 hover:bg-white/5"
          >
            Explore the range
          </button>
        </div>
        <div className="mx-auto mt-10 flex max-w-xl justify-center">
          <SocialProof variant="hero" />
        </div>
      </section>

      {/* WHY GEL.IT.UP */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">Why GEL.IT.UP</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_ITEMS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex h-14 items-center justify-start">
                {item.photo ? (
                  <img src={item.photo} alt={item.photoAlt} className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <img src={item.badge} alt={item.badgeAlt} className="h-14 w-auto max-w-[160px] object-contain" loading="lazy" />
                )}
              </div>
              <h3 className="mt-4 text-base font-black text-[#1A1A1A]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/65">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOUR WAYS TO WORK WITH US */}
      <section className="bg-[#F5F5F5] px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#D43790]">Four ways to work with us</p>
          <h2 className="mt-3 text-center text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">
            Find where you fit
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {WAYS_TO_WORK.map((way) => (
              <div key={way.key} className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-[#1A1A1A]">{way.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-black/65">{way.body}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startApplication(way.roles)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#D43790] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-white transition hover:bg-[#c22f82]"
                  >
                    Tell us about you
                    <span aria-hidden="true">→</span>
                  </button>
                  {way.secondaryTo && (
                    <NavLink
                      to={way.secondaryTo}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-black/70 transition hover:bg-black/5"
                    >
                      {way.secondaryLabel}
                    </NavLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-center text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step) => (
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

      {/* OUR APPROACH */}
      <section className="bg-[#F5F5F5] px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">
            We start with people, not paperwork.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-black/65 sm:text-base">
            Many brands enter a new market through a distributor and work backwards. We prefer to start with the
            professionals and educators who actually use and teach the product, and build from there. If you&apos;re
            one of them, this page is your invitation.
          </p>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section
        id="work-with-us-apply"
        className="scroll-mt-24 px-5 py-16"
        style={{ background: 'radial-gradient(120% 120% at 50% 100%, #2a1030 0%, #17111c 55%, #0e0b12 100%)' }}
      >
        <div className="mx-auto max-w-xl">
          <h2 className="text-center text-2xl font-black tracking-tight text-white sm:text-3xl">Tell us about you</h2>

          {status === 'success' ? (
            <div className="mt-8 rounded-2xl border border-[#D43790]/40 bg-white/[0.04] p-8 text-center">
              <div className="text-4xl" aria-hidden="true">🎉</div>
              <h3 className="mt-4 text-xl font-black text-white">Thank you!</h3>
              <p className="mt-2 text-sm text-white/70">
                We&apos;ve received your details and a member of our team will be in touch personally.
              </p>
              <NavLink
                to="/full-catalogue"
                className="mt-6 inline-flex rounded-full bg-[#D43790] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c22f82]"
              >
                Browse the catalogue
              </NavLink>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="wwu-first-name" className={labelClass}>First name *</label>
                  <input
                    id="wwu-first-name"
                    type="text"
                    value={form.firstName}
                    onChange={update('firstName')}
                    placeholder="Jane"
                    className={inputClass}
                    aria-invalid={Boolean(errors.firstName)}
                  />
                  {errors.firstName && <p className={errorClass}>{errors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="wwu-surname" className={labelClass}>Surname *</label>
                  <input
                    id="wwu-surname"
                    type="text"
                    value={form.surname}
                    onChange={update('surname')}
                    placeholder="Doe"
                    className={inputClass}
                    aria-invalid={Boolean(errors.surname)}
                  />
                  {errors.surname && <p className={errorClass}>{errors.surname}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="wwu-email" className={labelClass}>Email *</label>
                <input
                  id="wwu-email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="you@email.com"
                  className={inputClass}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="wwu-phone" className={labelClass}>Telephone number *</label>
                <div className="flex gap-2">
                  <select
                    id="wwu-phone-code"
                    aria-label="Country calling code"
                    value={form.phoneDialCode}
                    onChange={(e) => {
                      setDialCodeTouched(true)
                      setForm((f) => ({ ...f, phoneDialCode: e.target.value }))
                      setErrors((er) => ({ ...er, phone: undefined }))
                    }}
                    className={`${inputClass} w-28 shrink-0 px-2`}
                  >
                    <option value="">Code</option>
                    {DIAL_CODE_OPTIONS.map(({ country, code }) => (
                      <option key={country} value={code}>{code} {country}</option>
                    ))}
                  </select>
                  <input
                    id="wwu-phone"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={update('phoneNumber')}
                    placeholder="170 1234567"
                    className={inputClass}
                    aria-invalid={Boolean(errors.phone)}
                  />
                </div>
                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
              </div>

              <div>
                <p className={labelClass}>Social media * (at least one)</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="wwu-instagram" className="sr-only">Instagram handle</label>
                    <div className="flex items-stretch overflow-hidden rounded-xl border border-white/20 bg-white/[0.06] focus-within:border-[#D43790] focus-within:ring-2 focus-within:ring-[#D43790]/40">
                      <span className="flex items-center whitespace-nowrap px-3 text-xs text-white/40">www.instagram.com/</span>
                      <input
                        id="wwu-instagram"
                        type="text"
                        value={form.instagramHandle}
                        onChange={updateHandle('instagramHandle')}
                        placeholder="yourhandle"
                        className="w-full min-w-0 bg-transparent px-1 py-3 text-sm text-white placeholder-white/40 outline-none"
                      />
                      <a
                        href={instagramUrl || 'https://www.instagram.com/'}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open Instagram profile"
                        className={`flex items-center px-3 text-white/50 transition hover:text-white ${instagramUrl ? '' : 'pointer-events-none opacity-30'}`}
                      >
                        <OpenLinkIcon />
                      </a>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="wwu-tiktok" className="sr-only">TikTok handle</label>
                    <div className="flex items-stretch overflow-hidden rounded-xl border border-white/20 bg-white/[0.06] focus-within:border-[#D43790] focus-within:ring-2 focus-within:ring-[#D43790]/40">
                      <span className="flex items-center whitespace-nowrap px-3 text-xs text-white/40">www.tiktok.com/@</span>
                      <input
                        id="wwu-tiktok"
                        type="text"
                        value={form.tiktokHandle}
                        onChange={updateHandle('tiktokHandle')}
                        placeholder="yourhandle"
                        className="w-full min-w-0 bg-transparent px-1 py-3 text-sm text-white placeholder-white/40 outline-none"
                      />
                      <a
                        href={tiktokUrl || 'https://www.tiktok.com/'}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open TikTok profile"
                        className={`flex items-center px-3 text-white/50 transition hover:text-white ${tiktokUrl ? '' : 'pointer-events-none opacity-30'}`}
                      >
                        <OpenLinkIcon />
                      </a>
                    </div>
                  </div>
                </div>
                {errors.social && <p className={errorClass}>{errors.social}</p>}
              </div>

              <div>
                <label htmlFor="wwu-country" className={labelClass}>Country *</label>
                <input
                  id="wwu-country"
                  type="text"
                  list="wwu-country-list"
                  value={form.country}
                  onChange={update('country')}
                  placeholder="Start typing your country…"
                  className={inputClass}
                  aria-invalid={Boolean(errors.country)}
                />
                <datalist id="wwu-country-list">
                  {COUNTRY_OPTIONS.map((c) => <option key={c} value={c} />)}
                </datalist>
                {errors.country && <p className={errorClass}>{errors.country}</p>}
              </div>

              <div>
                <p className={labelClass}>I am a… * (select all that apply)</p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => {
                    const selected = roles.includes(role.key)
                    return (
                      <label
                        key={role.key}
                        className={`cursor-pointer select-none rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          selected
                            ? 'border-[#D43790] bg-[#D43790] text-white'
                            : 'border-white/20 bg-white/[0.04] text-white/70 hover:border-white/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRole(role.key)}
                          className="sr-only"
                        />
                        {role.label}
                      </label>
                    )
                  })}
                </div>
                {errors.roles && <p className={errorClass}>{errors.roles}</p>}
                {roles.includes('other') && (
                  <div className="mt-3">
                    <label htmlFor="wwu-roles-other" className={labelClass}>Please tell us *</label>
                    <input
                      id="wwu-roles-other"
                      type="text"
                      value={form.rolesOther}
                      onChange={update('rolesOther')}
                      placeholder="How would you describe what you do?"
                      className={inputClass}
                      aria-invalid={Boolean(errors.rolesOther)}
                    />
                    {errors.rolesOther && <p className={errorClass}>{errors.rolesOther}</p>}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="wwu-why" className={labelClass}>Why are you interested in GEL.IT.UP? *</label>
                <textarea
                  id="wwu-why"
                  rows={4}
                  value={form.whyInterested}
                  onChange={update('whyInterested')}
                  placeholder="Tell us what draws you to the brand…"
                  className={inputClass}
                  aria-invalid={Boolean(errors.whyInterested)}
                />
                {errors.whyInterested && <p className={errorClass}>{errors.whyInterested}</p>}
              </div>

              <div>
                <label htmlFor="wwu-value" className={labelClass}>How would you add value to our brand? *</label>
                <textarea
                  id="wwu-value"
                  rows={4}
                  value={form.valueAdd}
                  onChange={update('valueAdd')}
                  placeholder="Tell us about your audience, reputation or reach…"
                  className={inputClass}
                  aria-invalid={Boolean(errors.valueAdd)}
                />
                {errors.valueAdd && <p className={errorClass}>{errors.valueAdd}</p>}
              </div>

              <div>
                <label htmlFor="wwu-offer" className={labelClass}>
                  What can you offer? (e.g. education, distribution, salon, content, competitions) *
                </label>
                <textarea
                  id="wwu-offer"
                  rows={4}
                  value={form.whatOffer}
                  onChange={update('whatOffer')}
                  placeholder="Tell us what you bring to the table…"
                  className={inputClass}
                  aria-invalid={Boolean(errors.whatOffer)}
                />
                {errors.whatOffer && <p className={errorClass}>{errors.whatOffer}</p>}
              </div>

              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); setErrors((er) => ({ ...er, consent: undefined })) }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#D43790]"
                  aria-invalid={Boolean(errors.consent)}
                />
                <span>
                  I agree to GEL.IT.UP storing my details to contact me about working together. Read our{' '}
                  <NavLink to="/privacy-policy" target="_blank" className="underline hover:text-white">privacy policy</NavLink>.
                </span>
              </label>
              {errors.consent && <p className={errorClass}>{errors.consent}</p>}

              {status === 'error' && (
                <p className="text-sm text-red-400">
                  {errorMsg || 'Something went wrong.'} Please try again, or email us directly.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full rounded-full bg-[#D43790] px-6 py-4 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_0_24px_rgba(212,55,144,0.4)] transition duration-300 hover:shadow-[0_0_32px_rgba(212,55,144,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'submitting' ? 'Sending…' : 'Send'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* INSTAGRAM STRIP */}
      <section className="bg-[#F5F5F5] px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl">
              See our brand in action{' '}
              <a
                href="https://www.instagram.com/gelitupinternational/"
                target="_blank"
                rel="noreferrer"
                className="text-[#D43790] hover:underline"
              >
                @gelitupinternational
              </a>
            </h2>
          </div>
          <div className="mt-8">
            <InstagramFeed />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <WorkWithUsFAQ />
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
      style={{ flexShrink: 0, transition: 'transform 0.25s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// Same accordion pattern as AcademyFAQ, with Work-With-Us-specific questions.
function WorkWithUsFAQ() {
  const [openIndex, setOpenIndex] = useState(null)
  const toggle = (i) => setOpenIndex(openIndex === i ? null : i)

  return (
    <section className="py-14">
      <div className="mx-auto max-w-[760px] px-6">
        <div className="mb-8">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#D43790]">Common questions</p>
          <h2 className="m-0 text-2xl font-bold text-[#1a1a1a]">Work With Us FAQs</h2>
        </div>
        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-[10px] border bg-white transition-colors"
                style={{ borderColor: isOpen ? '#D43790' : '#e8e8e8' }}
              >
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-[18px] text-left transition-colors"
                  style={{ color: isOpen ? '#D43790' : '#1a1a1a' }}
                >
                  <span className="text-[15px] font-semibold leading-snug">{faq.q}</span>
                  <ChevronIcon open={isOpen} />
                </button>
                <div style={{ maxHeight: isOpen ? '300px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <p className="m-0 border-t border-[#f5f5f5] px-5 pb-[18px] pt-[14px] text-sm leading-[1.7] text-[#555]">
                    {faq.a}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
