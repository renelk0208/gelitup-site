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
    <section>
      <style>{`
        .elfsight-app-b92ff608-e961-429a-be31-d7d920cbb12f .eapps-tiktok-feed-header,
        .elfsight-app-b92ff608-e961-429a-be31-d7d920cbb12f .eapps-tiktok-feed-posts-item-meta,
        .elfsight-app-b92ff608-e961-429a-be31-d7d920cbb12f .eapps-tiktok-feed-posts-item-text {
          display: none !important;
        }
        .elfsight-app-b92ff608-e961-429a-be31-d7d920cbb12f .eapps-tiktok-feed-posts-item-video {
          border-radius: 8px !important;
        }
      `}</style>
      <div className={ELFSIGHT_APP_ID} data-elfsight-app-lazy />
    </section>
  )
}
