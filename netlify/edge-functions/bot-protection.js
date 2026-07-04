// Edge function: bot-protection
// Runs at CDN edge before the request hits the origin.
// Blocks headless browsers, scrapers, and high-volume bot traffic
// that inflates session counts with zero engagement.

// Bots that are allowed through (legitimate crawlers)
const ALLOWED_BOTS = [
  /googlebot/i,
  /google-inspectiontool/i,
  /adsbot-google/i,
  /bingbot/i,
  /slurp/i,           // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /screaming frog/i,
]

// Patterns that indicate automated/headless traffic
const BOT_PATTERNS = [
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /webdriver/i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /wget\//i,
  /curl\//i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /lwp-trivial/i,
  /okhttp/i,
  /apache-httpclient/i,
  /axios\//i,
  /node-fetch/i,
  /got\//i,
  /httpclient/i,
  /zgrab/i,
  /masscan/i,
  /nmap/i,
  /nuclei/i,
  /nikto/i,
  /sqlmap/i,
]

// Countries generating suspicious zero-engagement traffic.
// Southeast Asia is the world's largest hub for click farms, scraper bots,
// and data-centre traffic. None of these are target markets for this business.
// SG: 60% of all sessions at 0.99% engagement — primary bot source
// VN, TH, MY, ID, PH, MM, KH, LA, BN: same data-centre ecosystem
const BLOCKED_GEO = new Set([
  'SG', // Singapore  — 60% of sessions, 0.99% engagement
  'VN', // Vietnam
  'TH', // Thailand
  'MY', // Malaysia
  'ID', // Indonesia
  'PH', // Philippines
  'MM', // Myanmar
  'KH', // Cambodia
  'LA', // Laos
  'BN', // Brunei
  'TW', // Taiwan   — frequent scraper/bot origin
  'HK', // Hong Kong — frequent scraper/bot origin
])

// Referral-spam domains — bot networks that crawl the site to plant their
// domain in Analytics referral reports. Real visitors never arrive from these.
const SPAM_REFERRERS = [
  /trafficheap\.cc/i,
  /semalt\./i,
  /buttons-for-website\./i,
  /best-seo-offer\./i,
  /darodar\./i,
  /ilovevitaly\./i,
]

export default async (request, context) => {
  // Skip protection for Netlify function calls and static assets
  const url = new URL(request.url)
  if (
    url.pathname.startsWith('/.netlify/') ||
    url.pathname.match(/\.(css|js|png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf|json|xml|txt)$/)
  ) {
    return context.next()
  }

  const ua = request.headers.get('user-agent') || ''
  const country = context.geo?.country?.code?.toUpperCase() || ''

  // Allow known legitimate bots through unconditionally
  if (ALLOWED_BOTS.some((p) => p.test(ua))) {
    return context.next()
  }

  // Block empty or suspiciously short user agents
  if (ua.length < 20) {
    return new Response('Forbidden', { status: 403 })
  }

  // Block known bad bot user agents
  if (BOT_PATTERNS.some((p) => p.test(ua))) {
    return new Response('Forbidden', { status: 403 })
  }

  // Block referral-spam networks (e.g. trafficheap.cc) so they never
  // reach the page or register a session in Analytics
  const referer = request.headers.get('referer') || ''
  if (referer && SPAM_REFERRERS.some((p) => p.test(referer))) {
    return new Response('Forbidden', { status: 403 })
  }

  // Geo block: countries with 0% real engagement
  // Legitimate users from these countries are not in our target market
  if (BLOCKED_GEO.has(country)) {
    return new Response('Service not available in your region.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return context.next()
}
