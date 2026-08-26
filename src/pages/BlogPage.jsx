import { useEffect, useRef, useState } from 'react'

const HOLO_EMBED_URL = 'https://prod-api-holo-ai.fly.dev/public/seo/embed/c9956a33-1367-4e77-817e-f85680901089.js'

const SEO = {
  title: 'Professional Nail Industry Blog | GEL.IT.UP by GIUP®',
  description: 'Professional guidance for nail salons and technicians on gel safety, EU compliance, ingredients, business protection and product performance.',
  canonical: 'https://gelitup.com/blog',
}

function usePageSeo() {
  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const canonical = document.querySelector('link[rel="canonical"]')
    const previousDescription = description?.getAttribute('content')
    const previousCanonical = canonical?.getAttribute('href')

    document.title = SEO.title
    description?.setAttribute('content', SEO.description)
    canonical?.setAttribute('href', SEO.canonical)

    return () => {
      document.title = previousTitle
      if (previousDescription) description?.setAttribute('content', previousDescription)
      if (previousCanonical) canonical?.setAttribute('href', previousCanonical)
    }
  }, [])
}

function HoloBlogEmbed() {
  const containerRef = useRef(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const previousScript = document.querySelector(`script[src="${HOLO_EMBED_URL}"]`)
    previousScript?.remove()

    const script = document.createElement('script')
    const loadTimeout = window.setTimeout(() => setLoadError(true), 15000)
    const handleLoad = () => {
      window.clearTimeout(loadTimeout)
      if (!container.hasChildNodes()) setLoadError(true)
    }
    const handleError = () => {
      window.clearTimeout(loadTimeout)
      setLoadError(true)
    }

    script.src = HOLO_EMBED_URL
    script.defer = true
    script.dataset.holoBlogEmbed = 'true'
    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)
    document.body.appendChild(script)

    return () => {
      window.clearTimeout(loadTimeout)
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
      script.remove()
      container.replaceChildren()
      document.getElementById('holo-blog-jsonld')?.remove()
      document.querySelector('link[rel="canonical"][data-holo]')?.remove()
    }
  }, [])

  return (
    <>
      <div ref={containerRef} id="holo-blog" />
      {loadError && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          The journal could not be loaded. Please refresh the page or try again shortly.
        </div>
      )}
    </>
  )
}

export default function BlogPage() {
  usePageSeo()

  return (
    <main className="min-h-screen bg-[#f8f4f1] text-neutral-950">
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-neutral-950 px-5 py-12 text-white sm:px-8 sm:py-16 lg:py-20">
        <div className="absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[48px] border-[#D43790]/20" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-24 -z-10 h-72 w-72 rounded-full border border-[#D43790]/50" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#f168ae] sm:text-sm">The GEL.IT.UP Journal</p>
          <h1 className="heading-on-dark mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[0.02em] sm:text-5xl lg:text-6xl">
            Knowledge for safer, stronger salons.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            Professional insight on product safety, salon compliance, ingredients and the standards shaping the nail industry.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <HoloBlogEmbed />
      </section>
    </main>
  )
}
