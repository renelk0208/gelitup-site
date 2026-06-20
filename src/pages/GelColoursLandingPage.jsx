import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const COLOUR_SWATCHES = [
  '/gelitup-content/product-images/COLORS/SHIMMER COLORS/SH01.webp',
  '/gelitup-content/product-images/COLORS/SHIMMER COLORS/SH02.webp',
  '/gelitup-content/product-images/COLORS/SHIMMER COLORS/SH03.webp',
  '/gelitup-content/product-images/COLORS/SHIMMER COLORS/SH04.webp',
  '/gelitup-content/product-images/COLORS/SHIMMER COLORS/SH05.webp',
  '/gelitup-content/product-images/COLORS/SHIMMER COLORS/SH06.webp',
  '/gelitup-content/product-images/COLORS/METALLIC COLLECTION/MC1.webp',
  '/gelitup-content/product-images/COLORS/METALLIC COLLECTION/MC2.webp',
  '/gelitup-content/product-images/COLORS/METALLIC COLLECTION/MC3.webp',
  '/gelitup-content/product-images/COLORS/METALLIC COLLECTION/MC4.webp',
  '/gelitup-content/product-images/COLORS/METALLIC COLLECTION/MC5.webp',
  '/gelitup-content/product-images/COLORS/METALLIC COLLECTION/MC6.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/VELVET CAT EYE/GIUP-VCE-06.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/VELVET CAT EYE/GIUP-VCE-07.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/VELVET CAT EYE/GIUP-VCE-08.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/VELVET CAT EYE/GIUP-VCE-09.webp',
  '/gelitup-content/product-images/COLORS/PASTEL/GIUP-2500.webp',
  '/gelitup-content/product-images/COLORS/PASTEL/GIUP-2501.webp',
  '/gelitup-content/product-images/COLORS/PASTEL/GIUP-2502.webp',
  '/gelitup-content/product-images/COLORS/PASTEL/GIUP-2503.webp',
  '/gelitup-content/product-images/COLORS/PASTEL/GIUP-2504.webp',
  '/gelitup-content/product-images/COLORS/PASTEL/GIUP-2505.webp',
  '/gelitup-content/product-images/COLORS/TUTTI FRUTTI GLASS/TFG01.webp',
  '/gelitup-content/product-images/COLORS/TUTTI FRUTTI GLASS/TFG02.webp',
  '/gelitup-content/product-images/COLORS/TUTTI FRUTTI GLASS/TFG03.webp',
  '/gelitup-content/product-images/COLORS/TUTTI FRUTTI GLASS/TFG04.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/DREAMY CAT EYE/DCE1.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/DREAMY CAT EYE/DCE2.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/DREAMY CAT EYE/DCE3.webp',
  '/gelitup-content/product-images/COLORS/CAT EYE/DREAMY CAT EYE/DCE4.webp',
]

const AUDIENCES = [
  { icon: '✂️', label: 'Nail Technicians', detail: 'Professional-grade gel that performs every service' },
  { icon: '💅', label: 'Nail Salons', detail: 'Consistent results across every chair in your salon' },
  { icon: '🎓', label: 'Nail Academies', detail: 'Teach with a brand your students will recognise' },
]

const TRUST_BADGES = [
  { label: 'HEMA-Free', sub: 'Safer for clients & techs' },
  { label: 'TPO-Free', sub: 'Superior light stability' },
  { label: 'EU Certified', sub: 'EC 1223/2009 compliant' },
  { label: 'Leaping Bunny', sub: 'Cruelty-free approved' },
]

export default function GelColoursLandingPage() {
  useEffect(() => {
    document.title = 'Professional Gel Colours | GEL.IT.UP® by GIUP®'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', 'Wholesale professional gel colours for nail technicians, salons and academies. HEMA-free, EU certified, 200+ shades. Order online or register as a distributor.')
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f7f5', fontFamily: 'inherit' }}>

      {/* Minimal sticky header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#1a1a1a' }}>
        <NavLink to="/">
          <img src="/gelitup_logo.png" alt="GEL.IT.UP" className="h-8 w-auto" />
        </NavLink>
        <NavLink
          to="/full-catalogue?category=colours"
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition"
          style={{ backgroundColor: '#D43790' }}
        >
          Shop Colours
        </NavLink>
      </header>

      {/* Hero */}
      <section className="px-5 py-12 sm:py-20 text-center" style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#D43790' }}>
          GEL.IT.UP® by GIUP® — Professional Nail System
        </p>
        <h1 className="mt-4 text-4xl sm:text-6xl font-black leading-tight tracking-tight">
          200+ Professional<br />Gel Colours
        </h1>
        <p className="mt-5 mx-auto max-w-xl text-base sm:text-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
          HEMA-free, EU certified gel polish built for nail technicians, salons and academies.
          Stunning pigment. Consistent cure. No compromises.
        </p>

        {/* Audience pills */}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {AUDIENCES.map((a) => (
            <div key={a.label} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span>{a.icon}</span>
              <span className="font-semibold">{a.label}</span>
            </div>
          ))}
        </div>

        {/* Dual CTA */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <NavLink
            to="/full-catalogue?category=colours"
            className="rounded-xl px-8 py-3.5 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#D43790' }}
          >
            Shop All Colours
          </NavLink>
          <NavLink
            to="/become-distributor"
            className="rounded-xl px-8 py-3.5 text-base font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.4)', color: '#fff' }}
          >
            Become a Distributor
          </NavLink>
        </div>
      </section>

      {/* Colour swatch grid */}
      <section className="px-5 py-10 sm:py-14">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] mb-6" style={{ color: '#6b7280' }}>
          A taste of the collection
        </p>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-w-4xl mx-auto">
          {COLOUR_SWATCHES.map((src, i) => (
            <NavLink key={i} to="/full-catalogue?category=colours">
              <img
                src={src}
                alt="gel colour swatch"
                className="aspect-square w-full rounded-lg object-cover transition hover:scale-105"
                loading="lazy"
              />
            </NavLink>
          ))}
        </div>
        <div className="mt-6 text-center">
          <NavLink
            to="/full-catalogue?category=colours"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            View All 200+ Shades →
          </NavLink>
        </div>
      </section>

      {/* Trust badges */}
      <section className="px-5 py-8" style={{ backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TRUST_BADGES.map((b) => (
            <div key={b.label} className="text-center">
              <p className="text-sm font-black" style={{ color: '#1a1a1a' }}>{b.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audience cards */}
      <section className="px-5 py-12 sm:py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-center mb-8" style={{ color: '#1a1a1a' }}>
          Built for professionals
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.label} className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              <div className="text-3xl mb-3">{a.icon}</div>
              <p className="font-bold text-base mb-1" style={{ color: '#1a1a1a' }}>{a.label}</p>
              <p className="text-sm" style={{ color: '#6b7280' }}>{a.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom dual CTA */}
      <section className="px-5 py-14 text-center" style={{ backgroundColor: '#1a1a1a' }}>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Ready to get started?</h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Order directly online, or register as a distributor for wholesale pricing.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <NavLink
            to="/full-catalogue?category=colours"
            className="rounded-xl px-8 py-3.5 text-base font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#D43790' }}
          >
            Shop All Colours
          </NavLink>
          <NavLink
            to="/become-distributor"
            className="rounded-xl px-8 py-3.5 text-base font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.4)', color: '#fff' }}
          >
            Register as Distributor
          </NavLink>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="px-5 py-5 text-center text-xs" style={{ color: '#9ca3af', backgroundColor: '#111' }}>
        © {new Date().getFullYear()} GEL.IT.UP® by GIUP® · gelitup.com ·{' '}
        <NavLink to="/privacy-policy" className="underline">Privacy</NavLink>
      </footer>
    </div>
  )
}
