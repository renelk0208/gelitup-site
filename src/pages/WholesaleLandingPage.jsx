import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'

const BENEFITS = [
  { icon: '💰', title: 'Trade Pricing', detail: 'B2B wholesale rates from day one — no minimum order quantity required.' },
  { icon: '📦', title: '1,000+ Products', detail: 'Full range of gel polish, builder gels, base coats, top coats and nail art supplies.' },
  { icon: '🚚', title: 'Free EU Shipping', detail: 'Free shipping on all wholesale orders across the EU.' },
  { icon: '🧪', title: 'HEMA-Free & EU Certified', detail: 'EC 1223/2009 compliant. Safer for your clients and your technicians.' },
  { icon: '🐇', title: 'Leaping Bunny Approved', detail: 'Cruelty-free certified. A brand your clients can feel good about.' },
  { icon: '💬', title: 'Dedicated Support', detail: 'WhatsApp & Viber support from a team that knows the industry.' },
]

const WHO_ITS_FOR = [
  { icon: '✂️', title: 'Nail Technicians', detail: 'Stock professional-grade gel that performs every service — from basics to advanced nail art.' },
  { icon: '💅', title: 'Nail Salons', detail: 'Keep every chair stocked with consistent, client-approved gel. One supplier, one invoice.' },
  { icon: '🏫', title: 'Nail Academies', detail: 'Supply your students with the brands they\'ll use throughout their career.' },
  { icon: '🏪', title: 'Wholesalers & Resellers', detail: 'Add GEL.IT.UP to your range. Competitive margins, reliable stock, EU-ready compliance docs.' },
]

const STEPS = [
  { num: '1', title: 'Register free', detail: 'Fill in your details — takes under 2 minutes. No approval process, no waiting.' },
  { num: '2', title: 'Access B2B pricing', detail: 'Instant access to wholesale pricing across the full 1,000+ product catalogue.' },
  { num: '3', title: 'Place your first order', detail: 'Order online, pay by invoice or card. We ship across the EU and worldwide.' },
]

export default function WholesaleLandingPage() {
  useEffect(() => {
    document.title = 'Nail Supplies Wholesale | GEL.IT.UP by GIUP®'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Wholesale nail technician supplies from GEL.IT.UP. Gel polish, builder gel, base & top coats. HEMA-free, EU certified. Open a free B2B account and access trade pricing instantly.')
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f7f5', fontFamily: 'inherit' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#1a1a1a' }}>
        <NavLink to="/">
          <img src="/gelitup_logo.png" alt="GEL.IT.UP" className="h-8 w-auto" />
        </NavLink>
        <NavLink
          to="/become-distributor"
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#D43790' }}
        >
          Open Wholesale Account
        </NavLink>
      </header>

      {/* Hero */}
      <section className="px-5 py-14 sm:py-24 text-center" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#D43790' }}>
          GEL.IT.UP by GIUP® — Wholesale Nail Supplies
        </p>
        <h1 className="mt-4 text-4xl sm:text-6xl font-black leading-tight tracking-tight">
          Professional Nail<br />Supplies, Wholesale
        </h1>
        <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Trade pricing on 1,000+ gel polish shades, builder gels, base coats and more.
          HEMA-free, EU certified, cruelty-free. Open your free B2B account today.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <NavLink
            to="/become-distributor"
            className="rounded-xl px-8 py-4 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#D43790' }}
          >
            Open Free Wholesale Account
          </NavLink>
          <NavLink
            to="/full-catalogue"
            className="rounded-xl px-8 py-4 text-base font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.4)', color: '#fff' }}
          >
            Browse the Catalogue
          </NavLink>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No minimum order · Instant access · Free EU shipping
        </p>
      </section>

      {/* Who it's for */}
      <section className="px-5 py-14 sm:py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-center mb-2" style={{ color: '#1a1a1a' }}>
          Who we supply
        </h2>
        <p className="text-center text-sm mb-10" style={{ color: '#6b7280' }}>
          From solo nail techs to multi-location salons and academies
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHO_ITS_FOR.map((w) => (
            <div key={w.title} className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              <div className="text-3xl mb-3">{w.icon}</div>
              <p className="font-bold text-base mb-1" style={{ color: '#1a1a1a' }}>{w.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{w.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-5 py-14 sm:py-20" style={{ backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-10" style={{ color: '#1a1a1a' }}>
            Why buy wholesale from GEL.IT.UP
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4">
                <span className="text-2xl mt-0.5">{b.icon}</span>
                <div>
                  <p className="font-bold text-sm mb-1" style={{ color: '#1a1a1a' }}>{b.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{b.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-14 sm:py-20 max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-center mb-10" style={{ color: '#1a1a1a' }}>
          Getting started is simple
        </h2>
        <div className="flex flex-col gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="flex gap-5 items-start">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm"
                style={{ backgroundColor: '#D43790' }}
              >
                {s.num}
              </div>
              <div>
                <p className="font-bold text-base mb-0.5" style={{ color: '#1a1a1a' }}>{s.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-5 py-16 text-center" style={{ backgroundColor: '#1a1a1a' }}>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
          Ready to open your wholesale account?
        </h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Free registration. Instant access to trade pricing. No waiting, no approval process.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <NavLink
            to="/become-distributor"
            className="rounded-xl px-10 py-4 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#D43790' }}
          >
            Open Free Wholesale Account
          </NavLink>
          <NavLink
            to="/full-catalogue"
            className="rounded-xl px-10 py-4 text-base font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.4)', color: '#fff' }}
          >
            Browse the Catalogue
          </NavLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-5 text-center text-xs" style={{ color: '#9ca3af', backgroundColor: '#111' }}>
        © {new Date().getFullYear()} GEL.IT.UP by GIUP® · gelitup.com ·{' '}
        <NavLink to="/privacy-policy" className="underline">Privacy</NavLink>
      </footer>
    </div>
  )
}
