import { NavLink } from 'react-router-dom'

/**
 * AmbassadorCTA
 *
 * Clickbait-style banner nudging scrollers to apply for the ambassador
 * programme. Drop it into content-heavy pages (Instagram section, Inspiration,
 * etc.). Purely presentational — links to the /ambassadors landing page.
 *
 * variant:
 *   'strip'  — full-width gradient bar (default), good between sections
 *   'card'   — rounded card, good inside a padded content column
 */
export default function AmbassadorCTA({ variant = 'strip' }) {
  const inner = (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
          GEL.IT.UP Ambassadors
        </p>
        <p className="mt-1 text-lg font-black leading-tight text-white sm:text-xl">
          Want to see <span className="italic">your</span> nails featured here?
        </p>
        <p className="mt-1 text-sm text-white/80">
          Get reposted to our page, a personal discount code &amp; free product drops.
        </p>
      </div>
      <NavLink
        to="/ambassadors"
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.06em] text-[#D43790] shadow-lg transition duration-300 hover:scale-[1.03] hover:bg-white/95"
      >
        Become an Ambassador
        <span aria-hidden="true">→</span>
      </NavLink>
    </div>
  )

  if (variant === 'card') {
    return (
      <div
        className="rounded-2xl p-6 shadow-lg"
        style={{ background: 'linear-gradient(120deg, #D43790 0%, #a12a86 55%, #7b2a8f 100%)' }}
      >
        {inner}
      </div>
    )
  }

  return (
    <div
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen py-8"
      style={{ background: 'linear-gradient(120deg, #D43790 0%, #a12a86 55%, #7b2a8f 100%)' }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8">{inner}</div>
    </div>
  )
}
