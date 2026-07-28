import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { AGREEMENT_SECTIONS, AGREEMENT_VERSION } from '../data/ambassadorAgreement'

export default function AmbassadorAgreementPage() {
  useEffect(() => {
    document.title = 'Ambassador Agreement | GEL.IT.UP by GIUP®'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        'The full GEL.IT.UP Ambassador Agreement — commitments, content permissions and how the partnership works.',
      )
    }
  }, [])

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D43790]">
          GEL.IT.UP by GIUP®
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Ambassador Agreement
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Version {AGREEMENT_VERSION} · Please read this before applying to the{' '}
          <NavLink to="/ambassadors" className="font-medium text-[#D43790] hover:underline">Ambassador Programme</NavLink>.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700 sm:p-6">
        <div className="space-y-7">
          {AGREEMENT_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">{section.heading}</h2>
              <ul className="mt-3 space-y-2.5">
                {section.points.map((point, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D43790]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <NavLink
            to="/ambassadors"
            className="inline-flex items-center gap-2 rounded-full bg-[#D43790] px-6 py-3 text-sm font-black uppercase tracking-[0.06em] text-white transition hover:bg-[#c22f82]"
          >
            Apply to become an ambassador →
          </NavLink>
          <NavLink
            to="/privacy-policy"
            className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Privacy Policy
          </NavLink>
        </div>
      </div>
    </section>
  )
}
