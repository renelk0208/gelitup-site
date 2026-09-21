import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SITE_ORIGIN = process.env.GELITUP_SITE_ORIGIN || 'https://www.gelitup.com'
const PAGES = (process.env.GELITUP_PAGES || '/,/about-us,/contact-us')
  .split(',')
  .map((page) => page.trim())
  .filter(Boolean)
const OUTPUT_ROOT = path.resolve('public', 'gelitup-media')
const MEDIA_LIMIT = Number.parseInt(process.env.GELITUP_MEDIA_LIMIT || '1200', 10)
const PAGE_LIMIT = Number.parseInt(process.env.GELITUP_PAGE_LIMIT || '200', 10)
const USE_SITEMAP = (process.env.GELITUP_USE_SITEMAP || 'true') === 'true'
const USE_CRAWL = (process.env.GELITUP_USE_CRAWL || 'true') === 'true'

const SITEMAP_CANDIDATES = ['/sitemap.xml', '/wp-sitemap.xml', '/sitemap_index.xml']

const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.mp4', '.webm', '.mov',
])

function buildAbsoluteUrl(value, base) {
  try {
    return new URL(value, base).toString()
  }
  catch {
    return null
  }
}

function isSameOrigin(urlString) {
  try {
    const url = new URL(urlString)
    const site = new URL(SITE_ORIGIN)
    return url.origin === site.origin
  }
  catch {
    return false
  }
}

function getExtension(urlString) {
  try {
    const url = new URL(urlString)
    return path.extname(url.pathname).toLowerCase()
  }
  catch {
    return ''
  }
}

function sanitizeFileName(rawName) {
  return rawName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

function buildLocalTarget(urlString) {
  const url = new URL(urlString)
  const ext = getExtension(urlString)
  const baseName = path.basename(url.pathname, ext) || 'media'
  const urlHash = createHash('sha1').update(urlString).digest('hex').slice(0, 8)
  const finalName = `${sanitizeFileName(baseName)}-${urlHash}${ext || '.bin'}`
  const mediaType = ['.mp4', '.webm', '.mov'].includes(ext) ? 'videos' : 'images'

  return {
    mediaType,
    fileName: finalName,
    absolutePath: path.join(OUTPUT_ROOT, mediaType, finalName),
    webPath: `/gelitup-media/${mediaType}/${finalName}`,
  }
}

function extractFromSrcset(srcsetValue, pageUrl) {
  return srcsetValue
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .map((candidate) => buildAbsoluteUrl(candidate, pageUrl))
    .filter(Boolean)
}

function extractMediaUrls(html, pageUrl) {
  const found = new Set()
  const attrRegex = /(src|href|data-src|data-lazy-src|poster)=["']([^"']+)["']/gi
  const srcsetRegex = /srcset=["']([^"']+)["']/gi

  for (const match of html.matchAll(attrRegex)) {
    const absolute = buildAbsoluteUrl(match[2], pageUrl)
    if (!absolute) continue
    const ext = getExtension(absolute)
    if (!MEDIA_EXTENSIONS.has(ext)) continue
    found.add(absolute)
  }

  for (const match of html.matchAll(srcsetRegex)) {
    const urls = extractFromSrcset(match[1], pageUrl)
    for (const absolute of urls) {
      const ext = getExtension(absolute)
      if (MEDIA_EXTENSIONS.has(ext)) {
        found.add(absolute)
      }
    }
  }

  return [...found]
}

function normalizePageUrl(urlString) {
  try {
    const url = new URL(urlString)
    url.hash = ''
    url.search = ''

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1)
    }

    return url.toString()
  }
  catch {
    return null
  }
}

function isLikelyHtmlPage(urlString) {
  try {
    const url = new URL(urlString)
    const ext = path.extname(url.pathname).toLowerCase()
    if (!ext) return true

    return ext === '.html' || ext === '.htm'
  }
  catch {
    return false
  }
}

function extractInternalPageUrls(html, pageUrl) {
  const urls = new Set()
  const hrefRegex = /href=["']([^"']+)["']/gi

  for (const match of html.matchAll(hrefRegex)) {
    const absolute = buildAbsoluteUrl(match[1], pageUrl)
    if (!absolute || !isSameOrigin(absolute)) continue
    if (!isLikelyHtmlPage(absolute)) continue

    const ext = getExtension(absolute)
    if (ext && MEDIA_EXTENSIONS.has(ext)) continue
    if (absolute.includes('/wp-content/')) continue
    if (absolute.includes('/wp-json/')) continue

    const normalized = normalizePageUrl(absolute)
    if (normalized) {
      urls.add(normalized)
    }
  }

  return [...urls]
}

async function fetchHtml(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.text()
}

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.text()
}

function extractLocUrls(xmlText) {
  const urls = []
  const locRegex = /<loc>([^<]+)<\/loc>/gi

  for (const match of xmlText.matchAll(locRegex)) {
    const value = match[1]?.trim()
    if (value) {
      urls.push(value)
    }
  }

  return urls
}

async function discoverPagesFromSitemaps() {
  const queue = SITEMAP_CANDIDATES.map((candidate) => new URL(candidate, SITE_ORIGIN).toString())
  const seenXml = new Set()
  const pageUrls = new Set()

  while (queue.length && pageUrls.size < PAGE_LIMIT) {
    const sitemapUrl = queue.shift()
    if (!sitemapUrl || seenXml.has(sitemapUrl)) continue
    seenXml.add(sitemapUrl)

    try {
      const xmlText = await fetchText(sitemapUrl)
      const locUrls = extractLocUrls(xmlText)

      for (const locUrl of locUrls) {
        if (!isSameOrigin(locUrl)) continue

        if (locUrl.endsWith('.xml')) {
          if (!seenXml.has(locUrl)) {
            queue.push(locUrl)
          }
          continue
        }

        if (!isLikelyHtmlPage(locUrl)) continue

        const normalizedPageUrl = normalizePageUrl(locUrl)
        if (!normalizedPageUrl) continue

        pageUrls.add(normalizedPageUrl)
        if (pageUrls.size >= PAGE_LIMIT) {
          break
        }
      }
    }
    catch {
      // ignore missing sitemap candidate and continue
    }
  }

  return [...pageUrls]
}

async function discoverPagesByCrawl(seedPages) {
  const queue = [...seedPages.map((page) => normalizePageUrl(page)).filter(Boolean)]
  const seenPages = new Set()
  const discovered = new Set()

  while (queue.length && discovered.size < PAGE_LIMIT) {
    const current = queue.shift()
    if (!current || seenPages.has(current)) continue
    seenPages.add(current)

    try {
      const html = await fetchHtml(current)
      discovered.add(current)

      const linkedPages = extractInternalPageUrls(html, current)
      for (const linkedPage of linkedPages) {
        if (!seenPages.has(linkedPage) && queue.length + discovered.size < PAGE_LIMIT * 2) {
          queue.push(linkedPage)
        }
      }
    }
    catch {
      // ignore failed page during crawl
    }
  }

  return [...discovered]
}

async function fetchBuffer(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed media download ${url}: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function loadExistingManifest() {
  const manifestPath = path.join(OUTPUT_ROOT, 'manifest.json')

  try {
    const file = await readFile(manifestPath, 'utf8')
    return JSON.parse(file)
  }
  catch {
    return { generatedAt: null, items: [] }
  }
}

async function main() {
  const manualPages = PAGES
    .map((pagePath) => new URL(pagePath, SITE_ORIGIN).toString())
    .map((pageUrl) => normalizePageUrl(pageUrl))
    .filter(Boolean)
  const sitemapPages = USE_SITEMAP ? await discoverPagesFromSitemaps() : []
  const crawlSeedPages = [...new Set([...manualPages, ...sitemapPages])]
  const crawledPages = USE_CRAWL ? await discoverPagesByCrawl(crawlSeedPages.length ? crawlSeedPages : manualPages) : []
  const pageUrls = [...new Set([...manualPages, ...sitemapPages, ...crawledPages])].slice(0, PAGE_LIMIT)

  await mkdir(path.join(OUTPUT_ROOT, 'images'), { recursive: true })
  await mkdir(path.join(OUTPUT_ROOT, 'videos'), { recursive: true })

  console.log(`Scanning ${pageUrls.length} pages from ${SITE_ORIGIN} (sitemap=${USE_SITEMAP}, crawl=${USE_CRAWL})...`)

  const extracted = new Set()
  const pageMediaMap = {}
  for (const pageUrl of pageUrls) {
    try {
      const html = await fetchHtml(pageUrl)
      const mediaUrls = extractMediaUrls(html, pageUrl)
      pageMediaMap[pageUrl] = mediaUrls
      mediaUrls.forEach((url) => extracted.add(url))
      console.log(`- ${pageUrl}: found ${mediaUrls.length} media links`)
    }
    catch (error) {
      pageMediaMap[pageUrl] = []
      console.warn(`- ${pageUrl}: ${error.message}`)
    }
  }

  const selectedUrls = [...extracted].slice(0, MEDIA_LIMIT)
  console.log(`Downloading ${selectedUrls.length} media files (limit=${MEDIA_LIMIT})...`)

  const existingManifest = await loadExistingManifest()
  const previousByUrl = new Map(existingManifest.items.map((item) => [item.sourceUrl, item]))

  const items = []

  for (const sourceUrl of selectedUrls) {
    try {
      const target = buildLocalTarget(sourceUrl)
      const buffer = await fetchBuffer(sourceUrl)
      await writeFile(target.absolutePath, buffer)

      items.push({
        sourceUrl,
        localPath: target.webPath,
        mediaType: target.mediaType.slice(0, -1),
        sizeBytes: buffer.length,
      })

      console.log(`✓ ${target.webPath}`)
    }
    catch (error) {
      const fallback = previousByUrl.get(sourceUrl)
      if (fallback) {
        items.push(fallback)
        console.warn(`! Reused existing manifest entry for ${sourceUrl}`)
      }
      else {
        console.warn(`! Skipped ${sourceUrl}: ${error.message}`)
      }
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    siteOrigin: SITE_ORIGIN,
    sitemapEnabled: USE_SITEMAP,
    crawlEnabled: USE_CRAWL,
    pageCount: pageUrls.length,
    pages: pageUrls,
    pageMediaMap,
    itemCount: items.length,
    items,
  }

  await writeFile(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  console.log(`Done. Wrote ${items.length} files and manifest to /public/gelitup-media/manifest.json`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
