import { useEffect } from 'react'

const ELFSIGHT_APP_ID = 'elfsight-app-b92ff608-e961-429a-be31-d7d920cbb12f'
const ELFSIGHT_SCRIPT = 'https://elfsightcdn.com/platform.js'

export default function TikTokFeed() {
  useEffect(() => {
    if (document.querySelector(`script[src="${ELFSIGHT_SCRIPT}"]`)) return
    const script = document.createElement('script')
    script.src = ELFSIGHT_SCRIPT
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D43790]">TikTok</p>
          <h2 className="mt-0.5 text-xl font-bold text-slate-900">@gelitupofficial</h2>
        </div>
        <a
          href="https://www.tiktok.com/@gelitupofficial"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Follow on TikTok ↗
        </a>
      </div>
      <div className={ELFSIGHT_APP_ID} data-elfsight-app-lazy />
    </section>
  )
}
