import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const INSTAGRAM_URL = 'https://www.instagram.com/gelitup_official/'
const INSTAGRAM_HANDLE = 'gelitup_official'
const ABOUT_US_HERO_IMAGE_URL = '/gelitup-content/catalog-heroes/about-us-page-hero-image.jpg'
const ABOUT_US_HERO_IMAGE_FALLBACK_URL = '/gelitup-media/images/about-us-hero-image.webp'
const EXHIBITIONS_BACKDROP_VIDEO_URL = '/gelitup-media/videos/exhibition%20video.mp4'
const ABOUT_US_LIVE_FALLBACK_VIDEO_URL = '/gelitup-media/videos/reaching%20hands.mp4'
const ABOUT_US_CONTENT_CACHE_BUSTER = '2026-04-15-1'
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

const ABOUT_US_EXHIBITIONS_DEFAULT = {
  title: 'Upcoming Exhibitions',
  introText: 'Meet GEL.IT.UP by GIUP® at the next professional beauty events and discover our seasonal launches live.',
  events: [],
}

function parseDateValue(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return Number.POSITIVE_INFINITY

  const timestamp = Date.parse(raw)
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

function sortEventsByDate(events = []) {
  return [...events].sort((left, right) => {
    const leftStart = parseDateValue(left?.startDate)
    const rightStart = parseDateValue(right?.startDate)
    if (leftStart !== rightStart) return leftStart - rightStart

    const leftEnd = parseDateValue(left?.endDate)
    const rightEnd = parseDateValue(right?.endDate)
    if (leftEnd !== rightEnd) return leftEnd - rightEnd

    const leftName = String(left?.name || '')
    const rightName = String(right?.name || '')
    return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' })
  })
}

function formatEventDateRange(startDate = '', endDate = '') {
  const start = parseDateValue(startDate)
  const end = parseDateValue(endDate)

  if (!Number.isFinite(start) && !Number.isFinite(end)) return 'Date to be announced'

  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  if (!Number.isFinite(end) || start === end) {
    return Number.isFinite(start) ? formatter.format(new Date(start)) : formatter.format(new Date(end))
  }

  if (!Number.isFinite(start)) {
    return formatter.format(new Date(end))
  }

  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
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
        <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-lg bg-black/70 p-2 text-xs font-semibold text-white">
          <button
            type="button"
            aria-label="Previous PDF page"
            onClick={() => {
              if (!canGoToPreviousPage) return
              setCurrentPage((page) => Math.max(1, page - 1))
            }}
            disabled={!canGoToPreviousPage}
            className={`min-h-[44px] min-w-[44px] rounded px-3 py-2 transition ${canGoToPreviousPage ? 'bg-[#D43790] hover:bg-[#BF3182]' : 'cursor-not-allowed bg-white/20 text-white/60'}`}
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
            className={`min-h-[44px] min-w-[44px] rounded px-3 py-2 transition ${canGoToNextPage ? 'bg-[#D43790] hover:bg-[#BF3182]' : 'cursor-not-allowed bg-white/20 text-white/60'}`}
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
  const [aboutUsExhibitions, setAboutUsExhibitions] = useState(ABOUT_US_EXHIBITIONS_DEFAULT)
  const [igPosts, setIgPosts] = useState([])
  const [igStatus, setIgStatus] = useState('loading')

  const PAGE_SEO_MAP = {
    'about-us': {
      title: 'About GEL.IT.UP by GIUP® | Professional Gel Polish Brand',
      description: 'Learn about GEL.IT.UP by GIUP® — a professional gel polish and nail systems brand known for 1,000+ shades, HEMA-free formulas, and EU-certified products for nail technicians worldwide.',
      canonical: 'https://gelitup.com/pages/about-us',
    },
    'contact-us': {
      title: 'Contact GEL.IT.UP by GIUP® | Get in Touch',
      description: 'Contact GEL.IT.UP by GIUP® for wholesale enquiries, distributor applications, and professional nail product support.',
      canonical: 'https://gelitup.com/pages/contact-us',
    },
  }

  useEffect(() => {
    const defaults = {
      title: 'GEL.IT.UP by GIUP® | Professional Gel Polish, Builder Gel & Nail Systems',
      description: 'Professional gel polish with 1,000+ shades, builder gel systems, base coats and top coats. HEMA-free, TPO-free, EU certified. Available wholesale to professional nail technicians worldwide.',
      canonical: `https://gelitup.com/pages/${slug}`,
    }
    const seo = PAGE_SEO_MAP[slug] || defaults
    const prevTitle = document.title
    const metaDesc = document.querySelector('meta[name="description"]')
    const metaCanonical = document.querySelector('link[rel="canonical"]')
    const prevDesc = metaDesc?.getAttribute('content') || ''
    const prevCanonical = metaCanonical?.getAttribute('href') || ''

    document.title = seo.title
    if (metaDesc) metaDesc.setAttribute('content', seo.description)
    if (metaCanonical) metaCanonical.setAttribute('href', seo.canonical)

    return () => {
      document.title = prevTitle
      if (metaDesc) metaDesc.setAttribute('content', prevDesc)
      if (metaCanonical) metaCanonical.setAttribute('href', prevCanonical)
    }
  }, [slug])

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

    const loadAboutUsExhibitions = async () => {
      try {
        const response = await fetch(`/gelitup-content/about-us-exhibitions.json?v=${ABOUT_US_CONTENT_CACHE_BUSTER}`)
        if (!response.ok) {
          return
        }

        const payload = await response.json()
        if (!isMounted) {
          return
        }

        const events = Array.isArray(payload?.events)
          ? payload.events
            .map((item) => ({
              id: String(item?.id || '').trim(),
              name: String(item?.name || '').trim(),
              location: String(item?.location || '').trim(),
              startDate: String(item?.startDate || '').trim(),
              endDate: String(item?.endDate || '').trim(),
              stand: String(item?.stand || '').trim(),
              notes: String(item?.notes || '').trim(),
              imageUrl: String(item?.imageUrl || '').trim(),
              link: String(item?.link || '').trim(),
            }))
            .filter((item) => item.name)
          : []

        if (!events.length) {
          return
        }

        setAboutUsExhibitions({
          title: String(payload?.title || ABOUT_US_EXHIBITIONS_DEFAULT.title).trim() || ABOUT_US_EXHIBITIONS_DEFAULT.title,
          introText: String(payload?.introText || ABOUT_US_EXHIBITIONS_DEFAULT.introText).trim() || ABOUT_US_EXHIBITIONS_DEFAULT.introText,
          events: sortEventsByDate(events),
        })
      }
      catch {
        if (!isMounted) return
      }
    }

    void loadAboutUsExhibitions()

    return () => {
      isMounted = false
    }
  }, [isAboutUsManifesto])

  useEffect(() => {
    if (!isAboutUsManifesto) return undefined
    let isMounted = true
    const loadIg = async () => {
      try {
        const res = await fetch('/.netlify/functions/instagram-feed')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (isMounted) {
          setIgPosts(data.posts || [])
          setIgStatus((data.posts || []).length > 0 ? 'ok' : 'empty')
        }
      } catch {
        if (isMounted) setIgStatus('error')
      }
    }
    void loadIg()
    return () => { isMounted = false }
  }, [isAboutUsManifesto])

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
  const aboutUsLiveMediaSource = String(fallbackVideo || ABOUT_US_LIVE_FALLBACK_VIDEO_URL).trim()
  const aboutUsLiveIsVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(aboutUsLiveMediaSource)

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
    const exhibitionsBackdropVideoUrl = EXHIBITIONS_BACKDROP_VIDEO_URL
    const sortedExhibitionEvents = sortEventsByDate(aboutUsExhibitions.events || [])

    return (
      <section className="space-y-6 bg-white">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-black">
          <div className="relative h-[58vh] min-h-[320px] w-full sm:h-[66vh] sm:min-h-[400px]">
            <img
              src={ABOUT_US_HERO_IMAGE_URL || manifestoVisual?.displayUrl || '/logo.png'}
              alt="About Us hero visual"
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                const currentSrc = event.currentTarget.getAttribute('src') || ''
                if (currentSrc.includes('about-us-page-hero-image')) {
                  event.currentTarget.src = ABOUT_US_HERO_IMAGE_FALLBACK_URL
                  return
                }
                event.currentTarget.src = manifestoVisual?.displayUrl || '/logo.png'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end px-6 pb-8 sm:px-10 sm:pb-10">
              <div className="max-w-xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
                  GEL.IT.UP by GIUP®
                </p>
                <h1 className="text-3xl font-bold leading-[1.25] tracking-tight text-white sm:text-4xl lg:text-5xl">
                  About Us
                </h1>
              </div>
            </div>
          </div>
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

        {/* ── Instagram Feed ───────────────────────────────────────────── */}
        {igStatus !== 'error' && igStatus !== 'empty' && (
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#F5F5F5] py-8">
            <div className="mx-auto max-w-6xl px-4 sm:px-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="ig-grad-au" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad-au)" strokeWidth="2" fill="none" />
                    <circle cx="12" cy="12" r="4" stroke="url(#ig-grad-au)" strokeWidth="2" fill="none" />
                    <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad-au)" />
                  </svg>
                  <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#1A1A1A]">@{INSTAGRAM_HANDLE}</span>
                </div>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="rounded-lg bg-[#D43790] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.06em] text-white transition duration-200 hover:bg-[#BF3182]">
                  Follow Us Now →
                </a>
              </div>
              {igStatus === 'loading' ? (
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-40 w-40 flex-shrink-0 animate-pulse rounded-xl bg-black/10 sm:h-48 sm:w-48" />
                  ))}
                </div>
              ) : (
                <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
                  {igPosts.map((post) => {
                    const thumb = post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url
                    const isVideo = post.media_type === 'VIDEO'
                    return (
                      <a key={post.id} href={post.permalink} target="_blank" rel="noreferrer" className="group relative h-40 w-40 flex-shrink-0 snap-start overflow-hidden rounded-xl sm:h-48 sm:w-48">
                        <img src={thumb} alt={post.caption ? post.caption.slice(0, 80) : 'Instagram post'} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                        {isVideo && (
                          <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1">
                            <svg className="h-3 w-3 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100">
                          {post.caption && <p className="line-clamp-3 p-3 text-[10px] leading-relaxed text-white">{post.caption}</p>}
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Exhibitions ─────────────────────────────────────────────── */}
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[#1A1A1A] px-4 py-10 sm:px-8 sm:py-12">
          {exhibitionsBackdropVideoUrl && (
            <video
              src={exhibitionsBackdropVideoUrl}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              autoPlay
              loop
              controls={false}
              preload="metadata"
              aria-hidden="true"
            />
          )}
          <div className="absolute inset-0 bg-[#1A1A1A]/76" />

          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-8 grid-cols-1">
              <div className="rounded-2xl border border-white/15 bg-black/30 p-5 sm:p-6">
                <p className="text-3xl font-black uppercase tracking-[0.18em] !text-[#D43790] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-4xl">Exhibitions</p>
                <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.12em] !text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-3xl">{aboutUsExhibitions.title}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed !text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] sm:text-base">{aboutUsExhibitions.introText}</p>
              </div>

              <div className="space-y-3">
                {sortedExhibitionEvents.map((event, index) => (
                  <article key={event.id || `${event.name}-${index}`} className="overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-4 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] !text-[#D43790]">Exhibition {index + 1}</p>
                        <h3 className="mt-1 text-xl font-extrabold uppercase tracking-[0.08em] !text-white">{event.name}</h3>
                        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em] !text-white">{formatEventDateRange(event.startDate, event.endDate)}</p>
                        {event.location && <p className="mt-1 text-sm !text-white/90">{event.location}</p>}
                        {event.stand && <p className="mt-2 text-sm font-bold uppercase tracking-[0.06em] !text-white">{event.stand}</p>}
                        {event.notes && <p className="mt-1 text-sm !text-white/90">{event.notes}</p>}
                        {event.link && (
                          <a
                            href={event.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex rounded-lg bg-[#D43790] px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white transition duration-300 hover:bg-[#BF3182]"
                          >
                            Event Details
                          </a>
                        )}
                      </div>

                      {event.imageUrl && (
                        <div className="block overflow-hidden rounded-xl border border-white/20 bg-black/40">
                          <img
                            src={event.imageUrl}
                            alt={event.name}
                            className="h-44 w-full object-contain sm:h-52"
                            loading="lazy"
                            draggable="false"
                            onContextMenu={e => e.preventDefault()}
                            onError={(eventTarget) => {
                              eventTarget.currentTarget.src = '/logo.png'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
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
