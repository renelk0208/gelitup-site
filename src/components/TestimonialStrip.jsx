const TESTIMONIALS = [
  {
    name: 'Maria K.',
    role: 'Nail Salon Owner',
    country: 'Greece',
    flag: '🇬🇷',
    rating: 5,
    text: 'The quality is outstanding — my clients constantly ask what brand I use. The HEMA-free formula means zero reactions and very happy customers.',
  },
  {
    name: 'Andreea P.',
    role: 'Nail Technician',
    country: 'Romania',
    flag: '🇷🇴',
    rating: 5,
    text: 'I switched from my old supplier after trying GEL.IT.UP. The colour range is incredible and shipping to Romania is very fast.',
  },
  {
    name: 'Sophie V.',
    role: 'Beauty Academy',
    country: 'France',
    flag: '🇫🇷',
    rating: 5,
    text: 'We supply all our students with GEL.IT.UP kits. The compliance documentation is complete and the B2B pricing is very competitive.',
  },
]

function Stars({ count = 5 }) {
  return (
    <span aria-label={`${count} out of 5 stars`} className="text-amber-400 text-sm">
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  )
}

export default function TestimonialStrip({ compact = false }) {
  if (compact) {
    return (
      <div className="mt-4 space-y-3">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <Stars count={t.rating} />
              <span className="text-[11px] text-slate-400">{t.flag} {t.country}</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">"{t.text}"</p>
            <p className="mt-1.5 text-[11px] font-semibold text-slate-700">{t.name} · <span className="font-normal text-slate-400">{t.role}</span></p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-7 sm:px-7">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#D43790]">What Professionals Say</p>
      <h2 className="mt-1 text-center text-xl font-bold text-slate-900">Trusted by nail professionals across Europe</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Stars count={t.rating} />
              <span className="text-xs text-slate-400">{t.flag} {t.country}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">"{t.text}"</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700">
                {t.name[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                <p className="text-[11px] text-slate-400">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
