import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'

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
        <NavLink to="/baseline" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
          Back to Baseline List
        </NavLink>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Dedicated Imported Page</p>
        <p className="mt-1 text-xs text-slate-500">Source: {page.url}</p>
        <p className="mt-1 text-xs text-slate-500">Editable file: {editorFile}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSourceMode('snapshot')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              sourceMode === 'snapshot' ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'
            }`}
          >
            Snapshot Source
          </button>
          <button
            type="button"
            disabled={!hasCustomContent}
            onClick={() => setSourceMode('custom')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              sourceMode === 'custom' ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'
            }`}
          >
            Custom Source
          </button>
        </div>
        {!hasCustomContent && (
          <p className="mt-2 text-xs text-amber-700">
            No custom override exists for this slug yet. Add one in `/public/gelitup-content/custom-pages.json`.
          </p>
        )}
      </div>

      <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white sm:p-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">GEL.IT.UP Imported Layout</p>
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
            <NavLink to="/become-distributor" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 sm:text-sm">
              Become Distributor
            </NavLink>
            <NavLink to="/baseline" className="rounded-lg border border-slate-400 px-3 py-2 text-xs font-semibold text-white sm:text-sm">
              Open Baseline
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
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
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

      <div className="flex flex-wrap gap-2">
        <NavLink to="/baseline" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
          Back to Baseline List
        </NavLink>
        <NavLink to={`/baseline/${slug}`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
          Open Dynamic Snapshot
        </NavLink>
      </div>
    </section>
  )
}
