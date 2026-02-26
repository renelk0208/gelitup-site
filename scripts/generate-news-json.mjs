import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const newsImagesDir = path.join(projectRoot, 'public', 'gelitup-media', 'images', 'news')
const aboutNewsPath = path.join(projectRoot, 'public', 'gelitup-content', 'about-us-news.json')
const lookbookPath = path.join(projectRoot, 'public', 'gelitup-content', 'spring-summer-catalogue.json')
const homeCarouselPath = path.join(projectRoot, 'public', 'gelitup-content', 'home-news-carousel.json')
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])
const supportedPdfExtensions = new Set(['.pdf'])
const supportedVideoExtensions = new Set(['.mp4', '.webm', '.mov', '.m4v'])
const homeCarouselFolderPrefix = 'Spring Summer/NEWS Carousel/'
const homeCarouselPrimaryBaseName = 'Primary Image - Starting on Carousel'
const aboutPortraitFolderPrefix = 'Spring Summer/1088x1440/'
const aboutPortraitPrimaryBaseName = 'Primary Image - Starting on Carousel'

const ABOUT_DEFAULTS = {
  introText: 'The new professional neutral. 2026 begins with softness, refinement, and intention. Cloud Dancer Series introduces illuminated tones that enhance the nail without overpowering it. Modern shades designed to feel effortless, elevated, and timeless. Minimalism becomes the new expression of confidence.',
  title: 'Cloud Dancer - The Story',
  portalLabel: 'Enter Portal',
  portalLink: '/portal/login',
}

const LOOKBOOK_DEFAULTS = {
  title: 'Spring/Summer Collection 2026 Lookbook',
  subtitle: 'Flip through the seasonal edit before exploring the full catalogue.',
}

async function readJsonObject(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }

    return fallback
  }
  catch {
    return fallback
  }
}

function formatPageTitle(baseName, index) {
  const cleaned = String(baseName || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return `Spring/Summer 2026 · ${String(index + 1).padStart(2, '0')}`

  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toPublicNewsPath(fileName) {
  const normalizedFileName = String(fileName || '').trim()
  return `/gelitup-media/images/news/${normalizedFileName}`
}

function getPreferredPamphletLink(pdfFiles = []) {
  if (!Array.isArray(pdfFiles) || !pdfFiles.length) return '/portal/login'

  const sortedPdfFiles = sortWithNumbers(pdfFiles.map((file) => String(file?.relativePath || '').trim()).filter(Boolean))
  const preferredPdfPath = sortedPdfFiles.find((relativePath) => /pamphlet|lookbook|catalogue|catalog/i.test(relativePath))
    || sortedPdfFiles[0]

  return preferredPdfPath ? toPublicNewsPath(preferredPdfPath) : '/portal/login'
}

function toDisplayTitle(baseName = '', fallbackPrefix = 'Spring/Summer 2026 ·') {
  const cleaned = String(baseName || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return fallbackPrefix

  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function sortWithNumbers(files = []) {
  return [...files].sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
}

function getMediaTypeFromExt(ext = '') {
  const normalized = String(ext || '').toLowerCase()
  if (supportedExtensions.has(normalized)) return 'image'
  if (supportedVideoExtensions.has(normalized)) return 'video'
  if (supportedPdfExtensions.has(normalized)) return 'pdf'
  return 'unknown'
}

function isCollectionLookbookMedia(relativePath = '') {
  const normalized = String(relativePath || '').replace(/\\/g, '/').trim()
  if (!normalized) return false

  const segments = normalized.split('/').filter(Boolean)
  if (segments.length < 3) return false

  const collectionRoot = segments[0]
  const groupFolder = segments[1]

  if (collectionRoot !== 'Spring Summer') return false
  if (!/^\d{4}$/.test(groupFolder)) return false

  return true
}

function extractFirstNumber(value = '') {
  const text = String(value || '')
  const match = text.match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : Number.POSITIVE_INFINITY
}

function sortHomeCarouselFiles(files = []) {
  const prepared = files
    .map((file) => {
      const relativePath = String(file?.relativePath || '').trim()
      if (!relativePath) return null

      const baseName = path.basename(relativePath, path.extname(relativePath)).trim()
      const lowerBaseName = baseName.toLowerCase()
      const primaryLower = homeCarouselPrimaryBaseName.toLowerCase()
      const isPrimary = lowerBaseName === primaryLower
      const numberToken = extractFirstNumber(baseName)

      return {
        file,
        relativePath,
        baseName,
        isPrimary,
        numberToken,
      }
    })
    .filter(Boolean)

  prepared.sort((left, right) => {
    if (left.isPrimary && !right.isPrimary) return -1
    if (!left.isPrimary && right.isPrimary) return 1

    if (left.numberToken !== right.numberToken) {
      return left.numberToken - right.numberToken
    }

    return left.baseName.localeCompare(right.baseName, undefined, { numeric: true, sensitivity: 'base' })
  })

  return prepared.map((entry) => entry.file)
}

async function walkFiles(dirPath, basePath = dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath, basePath)
      files.push(...nested)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (!supportedExtensions.has(ext) && !supportedPdfExtensions.has(ext) && !supportedVideoExtensions.has(ext)) continue

    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/')
    files.push({
      relativePath,
      fileName: entry.name,
      ext,
    })
  }

  return files
}

async function getNewsAssets() {
  const files = await walkFiles(newsImagesDir)

  const sorted = sortWithNumbers(files.map((item) => item.relativePath))
  const sortedAssets = sorted
    .map((relativePath) => files.find((item) => item.relativePath === relativePath))
    .filter(Boolean)

  const imageFiles = sortedAssets.filter((item) => supportedExtensions.has(item.ext))
  const videoFiles = sortedAssets.filter((item) => supportedVideoExtensions.has(item.ext))
  const pdfFiles = sortedAssets.filter((item) => supportedPdfExtensions.has(item.ext))
  const mediaFiles = sortedAssets.filter((item) => supportedExtensions.has(item.ext) || supportedVideoExtensions.has(item.ext))

  return { imageFiles, videoFiles, mediaFiles, pdfFiles }
}

function buildMediaItems(mediaFiles = [], itemLink = '/portal/login') {
  return mediaFiles.map((file, index) => {
    const relative = String(file.relativePath || '').trim()
    const mediaUrl = toPublicNewsPath(relative)
    const mediaType = getMediaTypeFromExt(file.ext)

    return {
      title: formatPageTitle(path.basename(relative, path.extname(relative)), index),
      imageUrl: mediaUrl,
      mediaType,
      link: itemLink,
    }
  })
}

function getDirectoryPath(relativePath = '') {
  const normalized = String(relativePath || '').replace(/\\/g, '/').trim()
  if (!normalized) return ''
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length <= 1) return ''
  return segments.slice(0, -1).join('/')
}

function getDirectoryDepth(relativePath = '') {
  const directory = getDirectoryPath(relativePath)
  if (!directory) return 0
  return directory.split('/').filter(Boolean).length
}

function formatGroupTitle(groupKey = '') {
  const key = String(groupKey || '').trim()
  if (!key) return 'Spring/Summer Collection'
  const leaf = key.split('/').filter(Boolean).pop() || key
  return toDisplayTitle(leaf, 'Spring/Summer Collection')
}

function collectGroupedImages(imageFiles = []) {
  const groups = new Map()

  imageFiles.forEach((file) => {
    const relativePath = String(file?.relativePath || '').trim()
    if (!relativePath) return
    const directory = getDirectoryPath(relativePath)
    const key = directory || '__root__'

    const bucket = groups.get(key) || []
    bucket.push(file)
    groups.set(key, bucket)
  })

  return groups
}

function sortGroupStackFiles(files = []) {
  const list = Array.isArray(files) ? files : []

  return [...list].sort((left, right) => {
    const leftName = String(left?.fileName || '').toLowerCase()
    const rightName = String(right?.fileName || '').toLowerCase()
    const leftType = getMediaTypeFromExt(left?.ext)
    const rightType = getMediaTypeFromExt(right?.ext)
    const leftIsAnimation = /animated|animation/.test(leftName)
    const rightIsAnimation = /animated|animation/.test(rightName)

    if (leftIsAnimation && !rightIsAnimation) return -1
    if (!leftIsAnimation && rightIsAnimation) return 1

    if (leftType === 'video' && rightType !== 'video') return -1
    if (leftType !== 'video' && rightType === 'video') return 1

    const leftCardOrderMatch = leftName.match(/-(\d+)(?:\.|\s|$)/)
    const rightCardOrderMatch = rightName.match(/-(\d+)(?:\.|\s|$)/)
    const leftCardOrder = leftCardOrderMatch ? Number.parseInt(leftCardOrderMatch[1], 10) : Number.POSITIVE_INFINITY
    const rightCardOrder = rightCardOrderMatch ? Number.parseInt(rightCardOrderMatch[1], 10) : Number.POSITIVE_INFINITY

    if (leftCardOrder !== rightCardOrder) {
      return leftCardOrder - rightCardOrder
    }

    return leftName.localeCompare(rightName, undefined, { numeric: true, sensitivity: 'base' })
  })
}

function pickStackItems(files = []) {
  const sorted = sortGroupStackFiles(files)
  if (!sorted.length) return []

  const animation = sorted.find((file) => {
    const fileName = String(file?.fileName || '').toLowerCase()
    const mediaType = getMediaTypeFromExt(file?.ext)
    return mediaType === 'video' || /animated|animation/.test(fileName)
  })

  const images = sorted.filter((file) => getMediaTypeFromExt(file?.ext) === 'image')
  const topTwoImages = images.slice(0, 2)

  const picked = []
  if (animation) picked.push(animation)
  picked.push(...topTwoImages)

  if (picked.length < 3) {
    for (const file of sorted) {
      if (picked.includes(file)) continue
      picked.push(file)
      if (picked.length >= 3) break
    }
  }

  return picked.slice(0, 3)
}

function deriveLookbookGroups(mediaFiles = [], itemLink = '/portal/login') {
  const groupedImages = collectGroupedImages(mediaFiles)
  const groupKeys = sortWithNumbers(Array.from(groupedImages.keys()))

  const groupsWithChildren = new Set(
    groupKeys.filter((key) => key !== '__root__' && groupKeys.some((other) => other !== key && other.startsWith(`${key}/`))),
  )

  const leafGroupKeys = groupKeys.filter((key) => key !== '__root__' && !groupsWithChildren.has(key))
  const shallowFiles = mediaFiles.filter((file) => getDirectoryDepth(file?.relativePath || '') <= 1)
  const shallowImageItems = buildMediaItems(shallowFiles, itemLink)

  const lookbookGroups = leafGroupKeys.map((groupKey) => {
    const files = groupedImages.get(groupKey) || []
    const stackFiles = pickStackItems(files)
    const pages = buildMediaItems(stackFiles, itemLink)
    const firstImagePage = pages.find((page) => page.mediaType === 'image')
    const fallbackHero = firstImagePage?.imageUrl || pages[0]?.imageUrl || '/logo.png'
    const heroImage = fallbackHero

    return {
      id: groupKey,
      title: formatGroupTitle(groupKey),
      heroImage,
      pages,
    }
  }).filter((group) => Array.isArray(group.pages) && group.pages.length > 0)

  return {
    lookbookGroups,
    shallowImageItems,
  }
}

function buildPdfItems(pdfFiles = [], previewImage = '/logo.png') {
  return pdfFiles.map((file, index) => {
    const relative = String(file.relativePath || '').trim()
    const pdfUrl = toPublicNewsPath(relative)

    return {
      title: `${toDisplayTitle(path.basename(relative, path.extname(relative)), 'Spring/Summer Catalogue')} (PDF${pdfFiles.length > 1 ? ` ${index + 1}` : ''})`,
      imageUrl: previewImage,
      mediaType: 'pdf',
      link: pdfUrl,
    }
  })
}

function buildHomeCarouselItems(mediaFiles = []) {
  const carouselFiles = mediaFiles
    .filter((file) => String(file?.relativePath || '').startsWith(homeCarouselFolderPrefix))
    .filter((file) => getMediaTypeFromExt(file?.ext) === 'image')
    .filter((file) => {
      const relativePath = String(file?.relativePath || '').trim()
      const baseName = path.basename(relativePath, path.extname(relativePath)).trim().toLowerCase()
      return baseName !== homeCarouselPrimaryBaseName.toLowerCase() && !baseName.includes(homeCarouselPrimaryBaseName.toLowerCase())
    })

  const ordered = sortHomeCarouselFiles(carouselFiles)
  const deduped = []
  const seenBaseNames = new Set()

  for (const file of ordered) {
    const relativePath = String(file?.relativePath || '').trim()
    const baseName = path.basename(relativePath, path.extname(relativePath)).trim().toLowerCase()
    if (!relativePath || !baseName || seenBaseNames.has(baseName)) continue
    seenBaseNames.add(baseName)
    deduped.push(file)
  }

  return deduped.map((file, index) => {
    const relativePath = String(file?.relativePath || '').trim()
    const imageUrl = toPublicNewsPath(relativePath)
    const baseName = path.basename(relativePath, path.extname(relativePath)).trim()
    const isPrimary = false

    return {
      id: `home-news-carousel-${index + 1}`,
      imageUrl,
      order: index + 1,
      isPrimary,
    }
  })
}

function sortAboutPortraitFiles(files = []) {
  const prepared = files
    .map((file) => {
      const relativePath = String(file?.relativePath || '').trim()
      if (!relativePath) return null

      const baseName = path.basename(relativePath, path.extname(relativePath)).trim()
      const lowerBaseName = baseName.toLowerCase()
      const primaryLower = aboutPortraitPrimaryBaseName.toLowerCase()
      const isPrimary = lowerBaseName === primaryLower || lowerBaseName.includes(primaryLower)
      const numberToken = extractFirstNumber(baseName)

      return {
        file,
        baseName,
        isPrimary,
        numberToken,
      }
    })
    .filter(Boolean)

  prepared.sort((left, right) => {
    if (left.isPrimary && !right.isPrimary) return -1
    if (!left.isPrimary && right.isPrimary) return 1

    if (left.numberToken !== right.numberToken) {
      return left.numberToken - right.numberToken
    }

    return left.baseName.localeCompare(right.baseName, undefined, { numeric: true, sensitivity: 'base' })
  })

  return prepared.map((entry) => entry.file)
}

function buildAboutPortraitItems(mediaFiles = [], itemLink = '/portal/login') {
  const portraitFiles = mediaFiles
    .filter((file) => String(file?.relativePath || '').startsWith(aboutPortraitFolderPrefix))
    .filter((file) => getMediaTypeFromExt(file?.ext) === 'image')

  const ordered = sortAboutPortraitFiles(portraitFiles)
  return ordered
    .map((file, index) => {
      const relativePath = String(file?.relativePath || '').trim()
      return {
        title: formatPageTitle(path.basename(relativePath, path.extname(relativePath)), index),
        imageUrl: toPublicNewsPath(relativePath),
        mediaType: 'image',
        link: itemLink,
      }
    })
}

async function main() {
  const dirExists = await fs.access(newsImagesDir).then(() => true).catch(() => false)
  if (!dirExists) {
    console.error(`News image folder not found: ${newsImagesDir}`)
    process.exit(1)
  }

  const assets = await getNewsAssets()
  const imageFiles = Array.isArray(assets?.imageFiles) ? assets.imageFiles : []
  const videoFiles = Array.isArray(assets?.videoFiles) ? assets.videoFiles : []
  const mediaFiles = Array.isArray(assets?.mediaFiles) ? assets.mediaFiles : []
  const pdfFiles = Array.isArray(assets?.pdfFiles) ? assets.pdfFiles : []
  const lookbookDocumentLink = getPreferredPamphletLink(pdfFiles)

  if (!mediaFiles.length && !pdfFiles.length) {
    console.log('No images, videos, or PDFs found in public/gelitup-media/images/news. Add files first, then run this script again.')
    process.exit(0)
  }

  const existingAbout = await readJsonObject(aboutNewsPath, {})
  const existingLookbook = await readJsonObject(lookbookPath, {})

  const mediaItems = buildMediaItems(mediaFiles, lookbookDocumentLink)
  const lookbookMediaFiles = mediaFiles.filter((file) => isCollectionLookbookMedia(file?.relativePath))
  const lookbookMediaItems = buildMediaItems(lookbookMediaFiles, lookbookDocumentLink)
  const aboutPortraitItems = buildAboutPortraitItems(mediaFiles, lookbookDocumentLink)
  const homeCarouselItems = buildHomeCarouselItems(mediaFiles)
  const firstImagePreview = lookbookMediaItems.find((item) => item.mediaType === 'image')?.imageUrl || '/logo.png'
  const pdfItems = buildPdfItems(pdfFiles, firstImagePreview)
  const { lookbookGroups, shallowImageItems } = deriveLookbookGroups(lookbookMediaFiles, lookbookDocumentLink)
  const fallbackLookbookItems = lookbookMediaItems.length ? lookbookMediaItems : pdfItems
  const fallbackGroups = fallbackLookbookItems.length
    ? [{
      id: 'default',
      title: 'Spring/Summer Collection',
      heroImage: fallbackLookbookItems[0]?.imageUrl || '/logo.png',
      pages: fallbackLookbookItems,
    }]
    : []
  const nextGroups = lookbookGroups.length ? lookbookGroups : fallbackGroups
  const firstGroupPages = nextGroups[0]?.pages || []

  const aboutImageItems = []
  const seenAboutImageUrls = new Set()
  for (const group of nextGroups) {
    const pages = Array.isArray(group?.pages) ? group.pages : []
    for (const page of pages) {
      if (page?.mediaType !== 'image') continue
      const imageUrl = String(page?.imageUrl || '').trim()
      if (!imageUrl || seenAboutImageUrls.has(imageUrl)) continue
      seenAboutImageUrls.add(imageUrl)
      aboutImageItems.push(page)
    }
  }

  const aboutItems = aboutPortraitItems.length
    ? aboutPortraitItems
    : (aboutImageItems.length ? aboutImageItems.slice(0, 12) : (pdfItems.length ? pdfItems : shallowImageItems))

  const nextAbout = {
    introText: String(existingAbout?.introText || ABOUT_DEFAULTS.introText).trim() || ABOUT_DEFAULTS.introText,
    title: String(existingAbout?.title || ABOUT_DEFAULTS.title).trim() || ABOUT_DEFAULTS.title,
    portalLabel: String(existingAbout?.portalLabel || ABOUT_DEFAULTS.portalLabel).trim() || ABOUT_DEFAULTS.portalLabel,
    portalLink: String(existingAbout?.portalLink || ABOUT_DEFAULTS.portalLink).trim() || ABOUT_DEFAULTS.portalLink,
    items: aboutItems,
  }

  const nextLookbook = {
    title: String(existingLookbook?.title || LOOKBOOK_DEFAULTS.title).trim() || LOOKBOOK_DEFAULTS.title,
    subtitle: String(existingLookbook?.subtitle || LOOKBOOK_DEFAULTS.subtitle).trim() || LOOKBOOK_DEFAULTS.subtitle,
    groups: nextGroups,
    pages: firstGroupPages,
  }

  const nextHomeCarousel = {
    title: 'Spring/Summer News Carousel',
    items: homeCarouselItems,
  }

  await fs.writeFile(aboutNewsPath, `${JSON.stringify(nextAbout, null, 2)}\n`, 'utf8')
  await fs.writeFile(lookbookPath, `${JSON.stringify(nextLookbook, null, 2)}\n`, 'utf8')
  await fs.writeFile(homeCarouselPath, `${JSON.stringify(nextHomeCarousel, null, 2)}\n`, 'utf8')

  console.log(`Scanned ${imageFiles.length} image(s), ${videoFiles.length} video file(s), and ${pdfFiles.length} PDF file(s) in public/gelitup-media/images/news`) 
  console.log('Updated: public/gelitup-content/about-us-news.json')
  console.log('Updated: public/gelitup-content/spring-summer-catalogue.json')
  console.log('Updated: public/gelitup-content/home-news-carousel.json')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
