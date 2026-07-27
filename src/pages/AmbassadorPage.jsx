import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'
import InstagramFeed from '../components/InstagramFeed'
import { AGREEMENT_SUMMARY, AGREEMENT_VERSION } from '../data/ambassadorAgreement'

const FOLLOWER_RANGES = [
  '1,000 – 5,000',
  '5,000 – 10,000',
  '10,000 – 50,000',
  '50,000+',
]

// Editable programme perks — tweak the copy freely, the layout adapts.
const PERKS = [
  {
    emoji: '📸',
    title: 'Featured on our Instagram',
    body: 'Your nail work reposted to @gelitup — real exposure to thousands of pros and clients across Europe.',
  },
  {
    emoji: '🏷️',
    title: 'Your own discount code',
    body: 'A personal code for money off every order — and one to share with your followers.',
  },
  {
    emoji: '🎁',
    title: 'Free product drops',
    body: 'Get sent new colours and launches before anyone else, so you always have something fresh to create with.',
  },
]

const STEPS = [
  { n: '1', title: 'Apply', body: 'Fill in the quick form below with your socials.' },
  { n: '2', title: 'We review', body: 'We check out your work — we welcome creators from 1,000 followers up.' },
  { n: '3', title: 'Create & get featured', body: 'Post your GEL.IT.UP looks, tag us, and get reposted.' },
]

function scrollToApply() {
  document.getElementById('ambassador-apply')?.scrollIntoView({ behavior: 'smooth' })
}

export default function AmbassadorPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    instagram: '',
    tiktok: '',
    followers: '',
    country: '',
    message: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    document.title = 'Become an Ambassador | GEL.IT.UP® by GIUP®'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        'Get your nail work featured on @gelitup, earn a personal discount code and receive free product drops. Apply to become a GEL.IT.UP® ambassador.',
      )
    }
  }, [])

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || !form.instagram.trim() || !form.followers || !agreed) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      if (hasSupabaseConfig && supabase) {
        const igHandle = form.instagram.trim().replace(/^@+/, '')
        const { error: insertError } = await supabase
          .from('ambassador_applications')
          .insert({
            full_name: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            instagram: igHandle,
            tiktok: form.tiktok.trim().replace(/^@+/, '') || null,
            followers: form.followers || null,
            country: form.country.trim() || null,
            message: form.message.trim() || null,
            agreed_terms: true,
            agreement_version: AGREEMENT_VERSION,
          })
        // 23505 = unique violation → they already applied with this handle.
        if (insertError && insertError.code !== '23505') throw insertError
      }
      setStatus('success')
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong.')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#D43790] focus:ring-2 focus:ring-[#D43790]/40'

  return (
    <div className="-mx-3 -my-4 md:-mx-6 md:-my-10">
      {/* Hero */}
      <section className="px-5 py-16 text-center sm:py-24" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #2a1030 0%, #17111c 55%, #0e0b12 100%)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e879c4]">
          The GEL.IT.UP® Ambassador Programme
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
            href="https://www.instagram.com/gelitup/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-8 py-4 text-sm font-bold uppercase tracking-[0.06em] text-white/85 transition duration-300 hover:bg-white/10 hover:text-white"
          >
            See @gelitup
          </a>
        </div>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
          1,000+ followers · Free to join
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
              Our @gelitup feed
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-black/60">
              Every post below is an ambassador or artist creating with GEL.IT.UP®.
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

          {status === 'success' ? (
            <div className="mt-8 rounded-2xl border border-[#D43790]/40 bg-white/[0.04] p-8 text-center">
              <div className="text-4xl">🎉</div>
              <h3 className="mt-4 text-xl font-black text-white">You&apos;re in the running!</h3>
              <p className="mt-2 text-sm text-white/70">
                Thanks {form.fullName.split(' ')[0] || 'so much'} — we&apos;ve got your application.
                Keep an eye on your inbox and keep tagging <span className="font-semibold text-[#e879c4]">@gelitup</span>.
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
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Instagram handle *</label>
                  <input type="text" required value={form.instagram} onChange={update('instagram')} placeholder="@yourhandle" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">TikTok (optional)</label>
                  <input type="text" value={form.tiktok} onChange={update('tiktok')} placeholder="@yourhandle" className={inputClass} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Instagram following *</label>
                  <select required value={form.followers} onChange={update('followers')} className={inputClass}>
                    <option value="" style={{ color: '#000' }}>Select a range…</option>
                    {FOLLOWER_RANGES.map((r) => (
                      <option key={r} value={r} style={{ color: '#000' }}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Country</label>
                  <input type="text" value={form.country} onChange={update('country')} placeholder="Germany" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Why do you want to join? (optional)</label>
                <textarea rows={4} value={form.message} onChange={update('message')} placeholder="Tell us a little about your work…" className={inputClass} />
              </div>

              {/* Mini contract — summary + agree checkbox + name signature */}
              <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#e879c4]">
                    The Ambassador Agreement
                  </p>
                  <NavLink
                    to="/ambassador-agreement"
                    target="_blank"
                    className="shrink-0 text-xs font-semibold text-white/60 underline transition hover:text-white"
                  >
                    Read full terms
                  </NavLink>
                </div>
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
                  I have read and agree to the{' '}
                  <NavLink to="/ambassador-agreement" target="_blank" className="font-semibold text-[#e879c4] underline">
                    GEL.IT.UP® Ambassador Agreement
                  </NavLink>
                  , and I understand the monthly posting commitment.
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
                disabled={status === 'submitting' || !agreed}
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
    </div>
  )
}
