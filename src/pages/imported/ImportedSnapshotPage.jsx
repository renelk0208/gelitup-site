import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const INSTAGRAM_URL = 'https://www.instagram.com/gelitup_official/'
const ABOUT_US_NEWS_DEFAULT = {
  introText: 'Inspired by bold summer tones, luminous finishes, and editorial nail artistry for the 2026 season.',
  title: 'Spring/Summer 2026',
  portalLabel: 'Enter Portal',
  portalLink: '/portal/login',
  items: [
    {
      title: 'Spring/Summer 2026 · 01',
      imageUrl: '/gelitup-media/images/news/spring-summer-2026-01.webp',
    },
    {
      title: 'Spring/Summer 2026 · 02',
      imageUrl: '/gelitup-media/images/news/spring-summer-2026-02.webp',
    },
    {
      title: 'Spring/Summer 2026 · 03',
      imageUrl: '/gelitup-media/images/news/spring-summer-2026-03.webp',
    },
  ],
}

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

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

function getNewsSlideStep(container) {
  if (!container) return 0
  const firstSlide = container.querySelector('[data-news-slide="true"]')
  if (!firstSlide) return 0
  return firstSlide.getBoundingClientRect().width
}

function resolveNewsMediaType(item = {}) {
  const explicitType = String(item?.mediaType || '').trim().toLowerCase()
  if (explicitType) return explicitType

  const imageUrl = String(item?.imageUrl || '').toLowerCase()
  const linkUrl = String(item?.link || '').toLowerCase()

  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(imageUrl)) return 'video'
  if (/\.pdf(\?|$)/i.test(linkUrl)) return 'pdf'
  return 'image'
}

const PDF_PREVIEW_ASPECT_RATIO = 210 / 297

function PdfPreviewSlide({ pdfUrl, fallbackImageUrl, altText, backgroundVideoUrl }) {
  const canvasRef = useRef(null)
  const backgroundVideoRef = useRef(null)
  const pdfDocumentRef = useRef(null)
  const [aspectRatio, setAspectRatio] = useState(PDF_PREVIEW_ASPECT_RATIO)
  const [hasRenderError, setHasRenderError] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const videoElement = backgroundVideoRef.current
    if (!videoElement || !backgroundVideoUrl) return

    const tryPlay = () => {
      const playPromise = videoElement.play()
      if (playPromise?.catch) {
        playPromise.catch(() => {})
      }
    }

    tryPlay()
    videoElement.addEventListener('loadeddata', tryPlay)

    return () => {
      videoElement.removeEventListener('loadeddata', tryPlay)
    }
  }, [backgroundVideoUrl])

  useEffect(() => {
    let isCancelled = false
    let loadingTask

    const loadPdfDocument = async () => {
      if (!pdfUrl) {
        setHasRenderError(true)
        return
      }

      try {
        loadingTask = getDocument({ url: pdfUrl })
        const pdfDocument = await loadingTask.promise
        if (isCancelled) {
          pdfDocument.destroy()
          return
        }

        pdfDocumentRef.current?.destroy()
        pdfDocumentRef.current = pdfDocument

        const detectedPages = Math.max(1, Number(pdfDocument.numPages) || 1)
        const firstPage = await pdfDocument.getPage(1)
        const firstPageViewport = firstPage.getViewport({ scale: 1 })
        const firstPageRatio = firstPageViewport.height > 0
          ? firstPageViewport.width / firstPageViewport.height
          : PDF_PREVIEW_ASPECT_RATIO

        setAspectRatio(firstPageRatio)
        setTotalPages(detectedPages)
        setCurrentPage(1)
        setHasRenderError(false)
      }
      catch {
        if (isCancelled) return
        setHasRenderError(true)
      }
    }

    void loadPdfDocument()

    return () => {
      isCancelled = true
      loadingTask?.destroy()
      pdfDocumentRef.current?.destroy()
      pdfDocumentRef.current = null
    }
  }, [pdfUrl])

  useEffect(() => {
    let isCancelled = false
    let renderTask
    let frameId

    const renderPdf = async () => {
      const canvas = canvasRef.current
      const pdfDocument = pdfDocumentRef.current

      if (!canvas || !pdfDocument) {
        setHasRenderError(true)
        return
      }

      try {
        const safePage = Math.max(1, Math.min(currentPage, totalPages))
        const page = await pdfDocument.getPage(safePage)
        if (isCancelled) return

        const baseViewport = page.getViewport({ scale: 1 })

        const containerWidth = Math.max(canvas.parentElement?.clientWidth || 0, 1)
        const scale = containerWidth / baseViewport.width
        const viewport = page.getViewport({ scale })
        const context = canvas.getContext('2d')

        if (!context) {
          setHasRenderError(true)
          return
        }

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        renderTask = page.render({
          canvasContext: context,
          viewport,
        })
        await renderTask.promise

        if (!isCancelled) {
          setHasRenderError(false)
        }
      }
      catch (error) {
        if (isCancelled) return
        if (error?.name === 'RenderingCancelledException') return
        setHasRenderError(true)
      }
    }

    const scheduleRender = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        void renderPdf()
      })
    }

    scheduleRender()
    window.addEventListener('resize', scheduleRender)

    return () => {
      isCancelled = true
      window.removeEventListener('resize', scheduleRender)
      window.cancelAnimationFrame(frameId)
      renderTask?.cancel()
    }
  }, [currentPage, totalPages])

  const canGoToPreviousPage = currentPage > 1
  const canGoToNextPage = currentPage < totalPages

  return (
    <div className="relative h-full w-full overflow-hidden bg-black" style={{ aspectRatio }}>
      {backgroundVideoUrl && (
        <video
          ref={backgroundVideoRef}
          src={backgroundVideoUrl}
          className="absolute -inset-4 z-0 h-[calc(100%+2rem)] w-[calc(100%+2rem)] max-w-none object-cover opacity-70"
          autoPlay
          muted
          loop
          playsInline
          webkit-playsinline="true"
          controls={false}
          preload="metadata"
          aria-hidden="true"
        />
      )}

      <div className="relative z-[1] h-full w-full p-2.5 sm:p-3.5">
        {hasRenderError
          ? (
            <img
              src={fallbackImageUrl}
              alt={altText}
              className="h-full w-full rounded-md bg-black object-contain"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = '/logo.png'
              }}
            />
            )
              : <canvas ref={canvasRef} className="block h-full w-full rounded-md bg-white" aria-label={altText} />}
      </div>

      {!hasRenderError && totalPages > 1 && (
        <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-lg bg-black/70 p-1.5 text-[11px] font-semibold text-white">
          <button
            type="button"
            aria-label="Previous PDF page"
            onClick={() => {
              if (!canGoToPreviousPage) return
              setCurrentPage((page) => Math.max(1, page - 1))
            }}
            disabled={!canGoToPreviousPage}
            className={`rounded px-2 py-1 transition ${canGoToPreviousPage ? 'bg-[#D43790] hover:bg-[#BF3182]' : 'cursor-not-allowed bg-white/20 text-white/60'}`}
          >
            Up
          </button>
          <span className="rounded bg-black/30 px-2 py-1 tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next PDF page"
            onClick={() => {
              if (!canGoToNextPage) return
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }}
            disabled={!canGoToNextPage}
            className={`rounded px-2 py-1 transition ${canGoToNextPage ? 'bg-[#D43790] hover:bg-[#BF3182]' : 'cursor-not-allowed bg-white/20 text-white/60'}`}
          >
            Down
          </button>
        </div>
      )}
    </div>
  )
}

export default function ImportedSnapshotPage({ slug, editorFile }) {
  const [snapshotPages, setSnapshotPages] = useState([])
  const [customPagesBySlug, setCustomPagesBySlug] = useState({})
  const [mediaItems, setMediaItems] = useState([])
  const [mediaBySourceUrl, setMediaBySourceUrl] = useState({})
  const [sourceMode, setSourceMode] = useState('snapshot')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [aboutUsNews, setAboutUsNews] = useState(ABOUT_US_NEWS_DEFAULT)
  const [isNewsAutoplayEnabled, setIsNewsAutoplayEnabled] = useState(true)
  const [activeNewsSlide, setActiveNewsSlide] = useState(0)
  const newsCarouselRef = useRef(null)

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
  const isAboutUsManifesto = slug === 'about-us'

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

  useEffect(() => {
    if (!isAboutUsManifesto) {
      return undefined
    }

    let isMounted = true

    const loadAboutUsNews = async () => {
      try {
        const response = await fetch('/gelitup-content/about-us-news.json')
        if (!response.ok) {
          return
        }

        const payload = await response.json()
        if (!isMounted) {
          return
        }

        const items = Array.isArray(payload?.items)
          ? payload.items
            .map((item) => ({
              title: String(item?.title || '').trim(),
              imageUrl: String(item?.imageUrl || '').trim(),
              mediaType: String(item?.mediaType || '').trim().toLowerCase(),
              link: String(item?.link || '').trim(),
              backgroundVideoUrl: String(item?.backgroundVideoUrl || '').trim(),
            }))
            .filter((item) => item.imageUrl)
          : []

        if (!items.length) {
          return
        }

        setAboutUsNews({
          introText: String(payload?.introText || ABOUT_US_NEWS_DEFAULT.introText).trim() || ABOUT_US_NEWS_DEFAULT.introText,
          title: String(payload?.title || ABOUT_US_NEWS_DEFAULT.title).trim() || ABOUT_US_NEWS_DEFAULT.title,
          portalLabel: String(payload?.portalLabel || ABOUT_US_NEWS_DEFAULT.portalLabel).trim() || ABOUT_US_NEWS_DEFAULT.portalLabel,
          portalLink: String(payload?.portalLink || ABOUT_US_NEWS_DEFAULT.portalLink).trim() || ABOUT_US_NEWS_DEFAULT.portalLink,
          items,
        })
      }
      catch {
        if (!isMounted) return
      }
    }

    void loadAboutUsNews()

    return () => {
      isMounted = false
    }
  }, [isAboutUsManifesto])

  const activeNewsItem = aboutUsNews.items[activeNewsSlide] || null
  const isActiveNewsSlidePdf = resolveNewsMediaType(activeNewsItem || {}) === 'pdf'

  useEffect(() => {
    if (!isAboutUsManifesto || !isNewsAutoplayEnabled || isActiveNewsSlidePdf || aboutUsNews.items.length <= 1) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      const container = newsCarouselRef.current
      if (!container) {
        return
      }

      const step = getNewsSlideStep(container)
      if (!step) return
      const maxScrollLeft = container.scrollWidth - container.clientWidth
      const currentIndex = Math.max(0, Math.min(aboutUsNews.items.length - 1, Math.round(container.scrollLeft / step)))
      const nextIndex = (currentIndex + 1) % aboutUsNews.items.length
      const nextLeft = nextIndex * step

      if (nextLeft >= maxScrollLeft - 2 || nextIndex === 0) {
        container.scrollTo({ left: 0, behavior: 'smooth' })
        setActiveNewsSlide(0)
        return
      }

      container.scrollTo({ left: nextLeft, behavior: 'smooth' })
      setActiveNewsSlide(nextIndex)
    }, 3500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [aboutUsNews.items.length, isAboutUsManifesto, isNewsAutoplayEnabled, isActiveNewsSlidePdf])

  useEffect(() => {
    if (!isAboutUsManifesto || aboutUsNews.items.length <= 1) {
      setActiveNewsSlide(0)
      return undefined
    }

    const container = newsCarouselRef.current
    if (!container) {
      return undefined
    }

    const updateActiveSlide = () => {
      const step = getNewsSlideStep(container)
      if (!step) return
      const rawIndex = step > 0 ? Math.round(container.scrollLeft / step) : 0
      const nextIndex = Math.max(0, Math.min(aboutUsNews.items.length - 1, rawIndex))
      setActiveNewsSlide(nextIndex)
    }

    updateActiveSlide()
    container.addEventListener('scroll', updateActiveSlide, { passive: true })

    return () => {
      container.removeEventListener('scroll', updateActiveSlide)
    }
  }, [aboutUsNews.items.length, isAboutUsManifesto])

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
    const preferredVideo = mediaItems.find((item) => {
      const mediaType = String(item?.mediaType || '').toLowerCase()
      const localPath = String(item?.localPath || '')
      if (mediaType !== 'video') return false
      if (!localPath) return false
      return localPath.includes('superior_innovation_cat_eye_french')
    })

    if (preferredVideo?.localPath) {
      return preferredVideo.localPath
    }

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

    // Default fallback to the gel.it.up live demo video
    return '/gelitup-media/videos/superior_innovation_cat_eye_french-fe10f199.mp4'
  }, [mediaItems])

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
  const manifestoVisual = heroMedia || galleryMedia[0] || null

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
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-white/80 sm:text-base">{aboutUsNews.introText}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D43790]">News</p>
                <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.12em] text-white sm:text-3xl">{aboutUsNews.title}</h2>
              </div>
              <NavLink
                to={aboutUsNews.portalLink}
                className="inline-flex rounded-lg bg-[#D43790] px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:bg-[#BF3182]"
              >
                {aboutUsNews.portalLabel}
              </NavLink>
            </div>

            <div
              ref={newsCarouselRef}
              className="mt-5 mx-auto flex w-full max-w-[90vw] snap-x overflow-x-auto pb-1 [scrollbar-width:thin] sm:max-w-[420px] lg:max-w-[460px]"
            >
              {aboutUsNews.items.map((item, index) => {
                const mediaType = resolveNewsMediaType(item)
                const mediaHref = item.link || item.imageUrl
                const pdfHref = /\.pdf(\?|$)/i.test(mediaHref) ? mediaHref : item.imageUrl

                return (
                  <article key={`${item.imageUrl}-${index}`} data-news-slide="true" className="w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-white/15 bg-black/20">
                  <div className="w-full" style={mediaType === 'pdf' ? undefined : { aspectRatio: '1088 / 1440' }}>
                    {mediaType === 'video'
                      ? (
                        <a href={mediaHref} target="_blank" rel="noreferrer" className="block h-full w-full">
                          <video
                            src={item.imageUrl}
                            className="h-full w-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                            controls
                            preload="metadata"
                          />
                        </a>
                        )
                      : mediaType === 'pdf'
                        ? (
                          <PdfPreviewSlide
                            pdfUrl={pdfHref}
                            fallbackImageUrl={item.imageUrl}
                            altText="Spring/Summer lookbook PDF preview"
                            backgroundVideoUrl={item.backgroundVideoUrl}
                          />
                          )
                        : (
                          <a href={mediaHref} target="_blank" rel="noreferrer" className="block h-full w-full">
                            <img
                              src={item.imageUrl}
                              alt="Spring/Summer lookbook"
                              className="h-full w-full bg-black object-contain"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.src = '/logo.png'
                              }}
                            />
                          </a>
                          )}
                  </div>
                </article>
                )
              })}
            </div>
            {aboutUsNews.items.length > 1 && (
              <div className="mx-auto mt-3 flex w-full max-w-[90vw] items-center justify-center gap-2 sm:max-w-[420px] lg:max-w-[460px]">
                {aboutUsNews.items.map((item, index) => (
                  <button
                    key={`${item.imageUrl}-dot`}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => {
                      const container = newsCarouselRef.current
                      if (!container) {
                        return
                      }

                      const step = getNewsSlideStep(container)
                      if (!step) return

                      const targetLeft = index * step
                      container.scrollTo({ left: targetLeft, behavior: 'smooth' })
                      setActiveNewsSlide(index)
                    }}
                    className={`h-2.5 w-2.5 rounded-full transition ${activeNewsSlide === index ? 'bg-[#D43790]' : 'bg-white/35 hover:bg-white/55'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 sm:p-7">
          <h2 className="text-2xl font-extrabold uppercase tracking-[0.15em] text-[#1A1A1A] sm:text-3xl">GEL.IT.UP by GIUP® LIVE.</h2>
          <p className="mt-2 text-sm font-medium text-[#1A1A1A]">Real salon outputs that prove market demand for distributors.</p>

          <div className="mt-4 space-y-3">
            {(fallbackVideo || heroMedia?.displayUrl) && (
              <div className="overflow-hidden rounded-2xl border border-[#4A4A4A]/20 bg-[#1A1A1A]">
                {fallbackVideo && fallbackVideo.toLowerCase().includes('.mp4') || fallbackVideo?.toLowerCase().includes('.webm') ? (
                  <video
                    src={fallbackVideo}
                    poster={heroMedia?.displayUrl || undefined}
                    className="h-72 w-full object-cover sm:h-96"
                    muted
                    playsInline
                    autoPlay
                    loop
                    controls={false}
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={heroMedia?.displayUrl || fallbackVideo}
                    alt="GEL.IT.UP live salon work"
                    className="h-72 w-full object-cover sm:h-96"
                    loading="lazy"
                  />
                )}
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
