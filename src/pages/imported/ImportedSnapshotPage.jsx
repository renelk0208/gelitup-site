import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

const INSTAGRAM_URL = 'https://www.instagram.com/gelitup_official/'

function SnapshotCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </div>
  )
}

function chunkBySize(items = [], size = 2) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export default function ImportedSnapshotPage({ slug, editorFile }) {
  const [snapshotPages, setSnapshotPages] = useState([])
  const [customPagesBySlug, setCustomPagesBySlug] = useState({})
  const [mediaItems, setMediaItems] = useState([])
  const [mediaBySourceUrl, setMediaBySourceUrl] = useState({})
  const [sourceMode, setSourceMode] = useState('snapshot')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadSnapshot = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [snapshotResponse, mediaResponse, customResponse] = await Promise.all([
          fetch('/gelitup-content/pages.json'),
          fetch('/gelitup-media/manifest.json'),
          fetch('/gelitup-content/custom-pages.json'),
        ])

        if (!snapshotResponse.ok) {
          throw new Error(`Content snapshot unavailable (${snapshotResponse.status})`)
        }

        const snapshotPayload = await snapshotResponse.json()
        const mediaPayload = mediaResponse.ok ? await mediaResponse.json() : { items: [] }
        const customPayload = customResponse.ok ? await customResponse.json() : { pages: [] }

        if (!isMounted) return

        setSnapshotPages(Array.isArray(snapshotPayload?.pages) ? snapshotPayload.pages : [])
        setMediaItems(Array.isArray(mediaPayload?.items) ? mediaPayload.items : [])

        const customMap = {}
        for (const page of customPayload?.pages || []) {
          if (page?.slug) {
            customMap[page.slug] = page
          }
        }
        setCustomPagesBySlug(customMap)

        const mediaMap = {}
        for (const item of mediaPayload?.items || []) {
          if (item?.sourceUrl && item?.localPath) {
            mediaMap[item.sourceUrl] = item.localPath
          }
        }

        setMediaBySourceUrl(mediaMap)
      }
      catch (error) {
        if (!isMounted) return
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load snapshot pages.')
      }
      finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSnapshot()

    return () => {
      isMounted = false
    }
  }, [])

  const page = useMemo(
    () => snapshotPages.find((candidate) => candidate.slug === slug),
    [slug, snapshotPages],
  )

  const customPage = customPagesBySlug[slug]
  const hasCustomContent = Boolean(customPage)

  const activePage = useMemo(() => {
    if (sourceMode === 'custom' && customPage) {
      return {
        ...page,
        ...customPage,
        headings: {
          h1: customPage.headings?.h1 || page?.headings?.h1 || [],
          h2: customPage.headings?.h2 || page?.headings?.h2 || [],
          h3: customPage.headings?.h3 || page?.headings?.h3 || [],
        },
        paragraphs: customPage.paragraphs || page?.paragraphs || [],
        mediaRefs: customPage.mediaRefs || page?.mediaRefs || [],
      }
    }

    return page
  }, [customPage, page, sourceMode])

  useEffect(() => {
    if (sourceMode === 'custom' && !hasCustomContent) {
      setSourceMode('snapshot')
    }
  }, [hasCustomContent, sourceMode])

  const previewMedia = useMemo(() => {
    if (!activePage?.mediaRefs?.length) return []

    return activePage.mediaRefs.slice(0, 8).map((sourceUrl) => ({
      sourceUrl,
      displayUrl: mediaBySourceUrl[sourceUrl] || sourceUrl,
    }))
  }, [activePage, mediaBySourceUrl])

  const instagramTiles = useMemo(() => {
    const refs = Array.isArray(activePage?.mediaRefs) ? activePage.mediaRefs : []
    const referenceSet = new Set(refs)

    const fromPageRefs = mediaItems.filter((item) => referenceSet.has(item?.sourceUrl))
    const sourcePool = [...fromPageRefs, ...mediaItems]

    const deduped = []
    const seen = new Set()

    for (const item of sourcePool) {
      const sourceUrl = String(item?.sourceUrl || '').trim()
      if (!sourceUrl || seen.has(sourceUrl)) continue
      if (!/instagram\.com/i.test(sourceUrl)) continue

      const displayUrl = String(item?.localPath || mediaBySourceUrl[sourceUrl] || sourceUrl).trim()
      if (!displayUrl) continue
      if (/logo/i.test(displayUrl)) continue

      seen.add(sourceUrl)
      deduped.push({
        sourceUrl,
        displayUrl,
      })

      if (deduped.length >= 9) break
    }

    return deduped
  }, [activePage?.mediaRefs, mediaBySourceUrl, mediaItems])

  const fallbackVideo = useMemo(() => {
    const manifestVideo = mediaItems.find((item) => {
      const mediaType = String(item?.mediaType || '').toLowerCase()
      const localPath = String(item?.localPath || '')
      if (mediaType !== 'video') return false
      if (!localPath) return false
      return !/logo/i.test(localPath)
    })

    if (manifestVideo?.localPath) {
      return manifestVideo.localPath
    }

    if (manifestoVisual && (manifestoVisual.displayUrl.toLowerCase().includes('.mp4') || manifestoVisual.displayUrl.toLowerCase().includes('.webm'))) {
      return manifestoVisual.displayUrl
    }

    return ''
  }, [manifestoVisual, mediaItems])

  const structuredContent = useMemo(() => {
    if (!activePage) {
      return {
        heroTitle: '',
        heroSubtitle: '',
        heroParagraphs: [],
        sectionBlocks: [],
        trailingParagraphs: [],
      }
    }

    const h1 = activePage.headings?.h1 || []
    const h2 = activePage.headings?.h2 || []
    const paragraphs = activePage.paragraphs || []

    const heroTitle = h1[0] || activePage.title || activePage.slug
    const heroSubtitle = h2[0] || ''
    const heroParagraphs = paragraphs.slice(0, 2)
    const remainingParagraphs = paragraphs.slice(2)
    const sectionHeadings = h2.slice(heroSubtitle ? 1 : 0)

    const paragraphGroups = chunkBySize(remainingParagraphs, 2)
    const sectionBlocks = sectionHeadings.map((heading, index) => ({
      heading,
      paragraphs: paragraphGroups[index] || [],
    }))

    const consumedParagraphs = sectionBlocks.reduce((sum, section) => sum + section.paragraphs.length, 0)
    const trailingParagraphs = remainingParagraphs.slice(consumedParagraphs)

    return {
      heroTitle,
      heroSubtitle,
      heroParagraphs,
      sectionBlocks,
      trailingParagraphs,
    }
  }, [activePage])

  const heroMedia = previewMedia[0] || null
  const galleryMedia = previewMedia.slice(1, 7)
  const quickLinks = (activePage?.links || []).slice(0, 8)
  const isAboutUsManifesto = slug === 'about-us'
  const manifestoVisual = heroMedia || galleryMedia[0] || null
  const countdownTarget = useMemo(() => {
    const now = new Date()
    const target = new Date(now)
    const dayOfWeek = now.getDay()
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7
    target.setDate(now.getDate() + daysUntilMonday)
    target.setHours(9, 0, 0, 0)
    return target.getTime()
  }, [])
  const [countdownNow, setCountdownNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isAboutUsManifesto) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isAboutUsManifesto])

  const countdownRemaining = Math.max(0, countdownTarget - countdownNow)
  const countdownDays = Math.floor(countdownRemaining / (1000 * 60 * 60 * 24))
  const countdownHours = Math.floor((countdownRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const countdownMinutes = Math.floor((countdownRemaining % (1000 * 60 * 60)) / (1000 * 60))
  const countdownSeconds = Math.floor((countdownRemaining % (1000 * 60)) / 1000)

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading page baseline...</p>
  }

  if (errorMessage) {
    return <p className="text-sm text-rose-600">{errorMessage}</p>
  }

  if (!page) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-slate-600">Page snapshot not found for this slug.</p>
        <NavLink to="/baseline" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:border-fuchsia-500 hover:text-fuchsia-700 active:bg-fuchsia-600 active:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2">
          Back to Baseline List
        </NavLink>
      </section>
    )
  }

  if (isAboutUsManifesto) {
    const visualIsVideo = Boolean(
      manifestoVisual
      && (manifestoVisual.displayUrl.toLowerCase().includes('.mp4') || manifestoVisual.displayUrl.toLowerCase().includes('.webm')),
    )

    return (
      <section className="space-y-6 bg-white">
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[#1A1A1A]">
          <article className="relative min-h-[320px] overflow-hidden bg-[#1A1A1A] sm:min-h-[420px]">
            {visualIsVideo
              ? (
                <video
                  src={manifestoVisual.displayUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                  loop
                  controls={false}
                />
                )
              : (
                <img
                  src={manifestoVisual?.displayUrl || '/logo.png'}
                  alt="Cinematic GEL.IT.UP by GIUP® texture visual"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                )}
          </article>
        </div>

        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 sm:p-8">
          <p
            className="text-2xl font-extrabold uppercase leading-tight tracking-[0.15em] text-[#1A1A1A] sm:text-4xl"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}
          >
            THE ARCHITECTS OF PROFESSIONAL COLOR.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#D43790]">CLEAN SCIENCE</p>
          <p className="mt-2 text-sm leading-relaxed text-[#1A1A1A] sm:text-base">
            100% HEMA &amp; TPO Free chemistry engineered for professional confidence.
          </p>
        </div>

        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#1A1A1A] px-4 py-10 sm:px-8 sm:py-12">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-3xl font-extrabold uppercase tracking-[0.12em] text-[#D43790] sm:text-5xl">
              {String(countdownDays).padStart(2, '0')} : {String(countdownHours).padStart(2, '0')} : {String(countdownMinutes).padStart(2, '0')} : {String(countdownSeconds).padStart(2, '0')}
            </p>
            <p className="mt-4 text-sm font-extrabold uppercase tracking-[0.1em] text-white sm:text-lg">
              NEW COLOUR REVEAL COMING SOON. WATCH THIS SPACE.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 sm:p-7">
          <h2 className="text-2xl font-extrabold uppercase tracking-[0.15em] text-[#1A1A1A] sm:text-3xl">GEL.IT.UP by GIUP® IN THE WILD.</h2>
          <p className="mt-2 text-sm font-medium text-[#1A1A1A]">Real salon outputs that prove market demand for distributors.</p>

          {instagramTiles.length > 0
            ? (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                {instagramTiles.map((tile, index) => {
                  const isVideo = Boolean(tile && (tile.displayUrl.toLowerCase().includes('.mp4') || tile.displayUrl.toLowerCase().includes('.webm')))
                  const tileUrl = tile?.displayUrl

                  return (
                    <a
                      key={`social-tile-${index}`}
                      href={tile.sourceUrl || INSTAGRAM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-2xl border border-[#4A4A4A]/20 bg-white shadow-[0_10px_24px_rgba(26,26,26,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-fuchsia-400/60 hover:shadow-[0_12px_28px_rgba(212,55,144,0.14)]"
                      aria-label="Open GEL.IT.UP by GIUP® Instagram"
                    >
                      {isVideo
                        ? (
                          <video src={tileUrl} className="h-24 w-full object-cover sm:h-32 lg:h-40 xl:h-44" muted playsInline autoPlay loop controls={false} />
                          )
                        : (
                          <img src={tileUrl} alt="GEL.IT.UP by GIUP® salon result" className="h-24 w-full object-cover sm:h-32 lg:h-40 xl:h-44" loading="lazy" />
                          )}
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/35" aria-hidden="true" />
                    </a>
                  )
                })}
              </div>
              )
            : (
              <div className="mt-4 space-y-3">
                {!!fallbackVideo && (
                  <div className="overflow-hidden rounded-2xl border border-[#4A4A4A]/20 bg-[#1A1A1A]">
                    <video
                      src={fallbackVideo}
                      className="h-56 w-full object-cover sm:h-72"
                      muted
                      playsInline
                      autoPlay
                      loop
                      controls={false}
                    />
                  </div>
                )}
                <div className="text-center">
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg bg-[#D43790] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.06em] text-white transition duration-200 hover:bg-[#BF3182]"
                  >
                    Follow Us on Instagram
                  </a>
                </div>
              </div>
              )}
        </div>

        <div className="pb-2 text-center">
          <NavLink
            to="/become-distributor"
            className="inline-flex rounded-lg bg-[#D43790] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.06em] text-white transition duration-200 hover:bg-[#BF3182]"
          >
            JOIN THE EXCLUSIVE GLOBAL NETWORK
          </NavLink>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white sm:p-6 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{structuredContent.heroTitle}</h1>
          {structuredContent.heroSubtitle && (
            <p className="mt-2 text-sm font-semibold text-slate-200">{structuredContent.heroSubtitle}</p>
          )}
          <div className="mt-3 space-y-2">
            {structuredContent.heroParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm text-slate-200">{paragraph}</p>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <NavLink to="/become-distributor" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition duration-200 hover:bg-fuchsia-500 hover:text-white active:bg-fuchsia-600 active:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 sm:text-sm">
              Become Distributor
            </NavLink>
          </div>
        </div>

        <div>
          {heroMedia && (heroMedia.displayUrl.toLowerCase().includes('.mp4') || heroMedia.displayUrl.toLowerCase().includes('.webm'))
            ? (
              <video src={heroMedia.displayUrl} className="h-52 w-full rounded-xl object-cover sm:h-60" muted playsInline controls />
            )
            : heroMedia
              ? <img src={heroMedia.displayUrl} alt="Page hero media" className="h-52 w-full rounded-xl object-cover sm:h-60" loading="lazy" />
              : <div className="h-52 w-full rounded-xl bg-slate-800 sm:h-60" />}
        </div>
      </div>

      {quickLinks.length > 0 && (
        <SnapshotCard title="Quick Links">
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <a
                key={`${link.href}-${link.text}`}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition duration-200 hover:border-fuchsia-500 hover:bg-fuchsia-50 hover:text-fuchsia-700 active:border-fuchsia-600 active:bg-fuchsia-600 active:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
              >
                {link.text}
              </a>
            ))}
          </div>
        </SnapshotCard>
      )}

      {structuredContent.sectionBlocks.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {structuredContent.sectionBlocks.map((section) => (
            <SnapshotCard key={section.heading} title={section.heading}>
              <div className="space-y-2">
                {section.paragraphs.length > 0
                  ? section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-relaxed text-slate-700">{paragraph}</p>
                  ))
                  : <p className="text-sm text-slate-500">Section placeholder ready for custom content.</p>}
              </div>
            </SnapshotCard>
          ))}
        </div>
      )}

      {structuredContent.trailingParagraphs.length > 0 && (
        <SnapshotCard title="Additional Content">
          <div className="space-y-2">
            {structuredContent.trailingParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-slate-700">{paragraph}</p>
            ))}
          </div>
        </SnapshotCard>
      )}

      {galleryMedia.length > 0 && (
        <SnapshotCard title="Media Gallery">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {galleryMedia.map((item) => {
              const isVideo = item.displayUrl.toLowerCase().includes('.mp4') || item.displayUrl.toLowerCase().includes('.webm')

              return isVideo
                ? (
                  <video key={item.sourceUrl} src={item.displayUrl} className="h-28 w-full rounded-lg object-cover sm:h-32" muted playsInline controls />
                )
                : (
                  <img key={item.sourceUrl} src={item.displayUrl} alt="Page baseline media" className="h-28 w-full rounded-lg object-cover sm:h-32" loading="lazy" />
                )
            })}
          </div>
        </SnapshotCard>
      )}

    </section>
  )
}
