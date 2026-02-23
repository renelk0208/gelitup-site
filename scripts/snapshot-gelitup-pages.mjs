import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SITE_ORIGIN = process.env.GELITUP_SITE_ORIGIN || 'https://www.gelitup.com'
const PAGES = (process.env.GELITUP_PAGES || '/,/about-us,/contact-us')
  .split(',')
  .map((page) => page.trim())
  .filter(Boolean)
const OUTPUT_ROOT = path.resolve('public', 'gelitup-content')
const OUTPUT_FILE = path.join(OUTPUT_ROOT, 'pages.json')

const PAGE_LIMIT = Number.parseInt(process.env.GELITUP_PAGE_LIMIT || '200', 10)
const USE_SITEMAP = (process.env.GELITUP_USE_SITEMAP || 'true') === 'true'
const USE_CRAWL = (process.env.GELITUP_USE_CRAWL || 'true') === 'true'

const SITEMAP_CANDIDATES = ['/sitemap.xml', '/wp-sitemap.xml', '/sitemap_index.xml']
const MEDIA_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.mp4', '.webm', '.mov'])

function buildAbsoluteUrl(value, base) {
  try {
    return new URL(value, base).toString()
  }
  catch {
    return null
  }
}

function getExtension(urlString) {
  try {
    return path.extname(new URL(urlString).pathname).toLowerCase()
  }
  catch {
    return ''
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
  const ext = getExtension(urlString)
  if (!ext) return true
  return ext === '.html' || ext === '.htm'
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
    if (value) urls.push(value)
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
          if (!seenXml.has(locUrl)) queue.push(locUrl)
          continue
        }

        if (!isLikelyHtmlPage(locUrl)) continue

        const normalized = normalizePageUrl(locUrl)
        if (!normalized) continue

        pageUrls.add(normalized)
        if (pageUrls.size >= PAGE_LIMIT) break
      }
    }
    catch {
      // ignore missing sitemap files
    }
  }

  return [...pageUrls]
}

function extractInternalPageUrls(html, pageUrl) {
  const found = new Set()
  const hrefRegex = /href=["']([^"']+)["']/gi

  for (const match of html.matchAll(hrefRegex)) {
    const href = match[1]
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue
    }

    const absolute = buildAbsoluteUrl(href, pageUrl)
    if (!absolute || !isSameOrigin(absolute)) continue
    if (!isLikelyHtmlPage(absolute)) continue

    const ext = getExtension(absolute)
    if (ext && MEDIA_EXTENSIONS.has(ext)) continue
    if (absolute.includes('/wp-json/')) continue
    if (absolute.includes('/wp-content/')) continue

    const normalized = normalizePageUrl(absolute)
    if (normalized) found.add(normalized)
  }

  return [...found]
}

async function discoverPagesByCrawl(seedPages) {
  const queue = [...seedPages]
  const seen = new Set()
  const discovered = new Set()

  while (queue.length && discovered.size < PAGE_LIMIT) {
    const current = queue.shift()
    if (!current || seen.has(current)) continue
    seen.add(current)

    try {
      const html = await fetchText(current)
      discovered.add(current)
      const linked = extractInternalPageUrls(html, current)
      for (const next of linked) {
        if (!seen.has(next) && queue.length + discovered.size < PAGE_LIMIT * 2) {
          queue.push(next)
        }
      }
    }
    catch {
      // continue crawl on errors
    }
  }

  return [...discovered]
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function stripTags(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function preprocessHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
}

function extractMainHtml(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  if (mainMatch?.[1]) {
    return mainMatch[1]
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch?.[1]) {
    return bodyMatch[1]
  }

  return html
}

function cleanBlocks(blocks, { minLen = 2, maxLen = 800 } = {}) {
  const seen = new Set()
  const result = []

  for (const block of blocks) {
    const value = block.replace(/\s+/g, ' ').trim()
    if (!value) continue
    if (value.length < minLen || value.length > maxLen) continue
    if (/^[@{]/.test(value)) continue
    if (/\.(css|js)\b/i.test(value)) continue
    if (/var\s+|function\s*\(|document\.|window\./i.test(value)) continue

    const dedupeKey = value.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    result.push(value)
  }

  return result
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? stripTags(match[1]) : ''
}

function extractBlocks(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  const blocks = []

  for (const match of html.matchAll(regex)) {
    const cleaned = stripTags(match[1])
    if (cleaned) blocks.push(cleaned)
  }

  return blocks
}

function extractLinks(html, pageUrl) {
  const links = []
  const regex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(regex)) {
    const href = match[1]
    const text = stripTags(match[2])
    const absoluteUrl = buildAbsoluteUrl(href, pageUrl)

    if (!absoluteUrl || !text) continue

    links.push({ text, href: absoluteUrl })
  }

  return links.slice(0, 250)
}

function extractMediaRefs(html, pageUrl) {
  const found = new Set()
  const regex = /(src|href|data-src|data-lazy-src|poster)=["']([^"']+)["']/gi

  for (const match of html.matchAll(regex)) {
    const absolute = buildAbsoluteUrl(match[2], pageUrl)
    if (!absolute) continue

    const ext = getExtension(absolute)
    if (MEDIA_EXTENSIONS.has(ext)) {
      found.add(absolute)
    }
  }

  return [...found]
}

function toSlug(urlString) {
  try {
    const pathname = new URL(urlString).pathname || '/'
    if (pathname === '/' || pathname === '') return 'home'

    return pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/[^a-zA-Z0-9/_-]/g, '-')
      .replace(/\//g, '__')
      .toLowerCase() || 'page'
  }
  catch {
    return 'page'
  }
}

async function main() {
  await mkdir(OUTPUT_ROOT, { recursive: true })

  const manualPages = PAGES
    .map((pagePath) => new URL(pagePath, SITE_ORIGIN).toString())
    .map((pageUrl) => normalizePageUrl(pageUrl))
    .filter(Boolean)

  const sitemapPages = USE_SITEMAP ? await discoverPagesFromSitemaps() : []
  const crawlSeedPages = [...new Set([...manualPages, ...sitemapPages])]
  const crawledPages = USE_CRAWL ? await discoverPagesByCrawl(crawlSeedPages.length ? crawlSeedPages : manualPages) : []

  const pageUrls = [...new Set([...manualPages, ...sitemapPages, ...crawledPages])].slice(0, PAGE_LIMIT)

  console.log(`Snapshotting ${pageUrls.length} pages (sitemap=${USE_SITEMAP}, crawl=${USE_CRAWL})...`)

  const pages = []

  for (const pageUrl of pageUrls) {
    try {
      const html = await fetchText(pageUrl)
      const preparedHtml = preprocessHtml(html)
      const contentHtml = extractMainHtml(preparedHtml)

      const title = extractTitle(preparedHtml)
      const h1 = cleanBlocks(extractBlocks(contentHtml, 'h1'), { minLen: 2, maxLen: 200 })
      const h2 = cleanBlocks(extractBlocks(contentHtml, 'h2'), { minLen: 2, maxLen: 220 })
      const h3 = cleanBlocks(extractBlocks(contentHtml, 'h3'), { minLen: 2, maxLen: 220 })
      const paragraphs = cleanBlocks(extractBlocks(contentHtml, 'p'), { minLen: 30, maxLen: 1000 }).slice(0, 400)
      const listItems = cleanBlocks(extractBlocks(contentHtml, 'li'), { minLen: 2, maxLen: 220 }).slice(0, 400)
      const links = extractLinks(contentHtml, pageUrl)
      const mediaRefs = extractMediaRefs(contentHtml, pageUrl)

      pages.push({
        url: pageUrl,
        slug: toSlug(pageUrl),
        title,
        headings: { h1, h2, h3 },
        paragraphs,
        listItems,
        links,
        mediaRefs,
      })

      console.log(`- ${pageUrl}: h1=${h1.length}, h2=${h2.length}, p=${paragraphs.length}, media=${mediaRefs.length}`)
    }
    catch (error) {
      console.warn(`- ${pageUrl}: ${error.message}`)
      pages.push({
        url: pageUrl,
        slug: toSlug(pageUrl),
        error: error.message,
        headings: { h1: [], h2: [], h3: [] },
        paragraphs: [],
        listItems: [],
        links: [],
        mediaRefs: [],
      })
    }
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    siteOrigin: SITE_ORIGIN,
    sitemapEnabled: USE_SITEMAP,
    crawlEnabled: USE_CRAWL,
    pageCount: pages.length,
    pages,
  }

  await writeFile(OUTPUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(`Done. Wrote page snapshot to ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
