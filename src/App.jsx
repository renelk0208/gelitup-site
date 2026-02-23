import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import appLogo from '/logo.png'
import PWABadge from './PWABadge.jsx'
import ImportedAnyPage from './pages/imported/ImportedAnyPage.jsx'
import { hasSupabaseConfig, supabase } from './lib/supabaseClient'
import useB2BIntelligence from './lib/useB2BIntelligence'

const B2B_EMAIL = 'distribution@gelitup.com'
const PRODUCT_CATEGORIES = ['Solid Colours', 'Builder Gels', 'Base & Top', 'Nail Care', 'Accessories']
const DEFAULT_PRODUCTS_TABLE = 'b2b_products'
const DEFAULT_ORDERS_TABLE = 'b2b_orders'
const DEFAULT_REGISTRATIONS_TABLE = 'b2b_registrations'
const PORTAL_ENABLED = import.meta.env.VITE_ENABLE_PORTAL === 'true'
const LEGACY_MIRROR_ENABLED = import.meta.env.VITE_ENABLE_LEGACY_MIRROR === 'true'
const LEGACY_SITE_ORIGIN = (import.meta.env.VITE_LEGACY_SITE_ORIGIN || 'https://www.gelitup.com').replace(/\/$/, '')
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL
const EMAIL_WEBHOOK_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'distributors@gelitup.com'
const EMAIL_REPLY_TO = import.meta.env.VITE_EMAIL_REPLY_TO || B2B_EMAIL
const ORDER_INBOX_EMAIL = import.meta.env.VITE_B2B_ORDER_INBOX || B2B_EMAIL
const ZOHO_SYNC_WEBHOOK_URL = import.meta.env.VITE_ZOHO_SYNC_WEBHOOK_URL
const ZOHO_SYNC_ENABLED = import.meta.env.VITE_ENABLE_ZOHO_SYNC === 'true'
const ZOHO_SYNC_TIMEOUT_MS = Number.parseInt(import.meta.env.VITE_ZOHO_SYNC_TIMEOUT_MS || '12000', 10)
const ZOHO_SYNC_AUTH_TOKEN = import.meta.env.VITE_ZOHO_SYNC_AUTH_TOKEN || ''
const ZOHO_SYNC_TARGET = import.meta.env.VITE_ZOHO_SYNC_TARGET || 'books'
const UPSELL_PRICE_FUNCTION_URL = import.meta.env.VITE_UPSELL_PRICE_FUNCTION_URL || '/.netlify/functions/get-upsell-price'
const PROFORMA_COMPANY_NAME = import.meta.env.VITE_PROFORMA_COMPANY_NAME || 'GEL.IT.UP Factory Direct'
const PROFORMA_VAT_TAX_ID = import.meta.env.VITE_PROFORMA_VAT_TAX_ID || 'VAT/TAX ID: EL999999999'
const PROFORMA_BANK_DETAILS = import.meta.env.VITE_PROFORMA_BANK_DETAILS || 'BANK: Alpha Bank | IBAN: GR0000000000000000000000000 | SWIFT: CRBAGRAA'
const PROFORMA_SWIFT_BIC = import.meta.env.VITE_PROFORMA_SWIFT_BIC || ''
const PROFORMA_LEFT_LOGO_PATH = import.meta.env.VITE_PROFORMA_LEFT_LOGO || '/gelitup_logo.png'
const PROFORMA_RIGHT_LOGO_PATH = import.meta.env.VITE_PROFORMA_RIGHT_LOGO || '/leeukopf_black_logo.png'
const PROFORMA_LEEUKOPF_COMPANY = import.meta.env.VITE_PROFORMA_LEEUKOPF_COMPANY || 'Leeukopf'
const PROFORMA_LEEUKOPF_ADDRESS = import.meta.env.VITE_PROFORMA_LEEUKOPF_ADDRESS || '8 Racho Dimchev, Sofia, Bulgaria'
const PROFORMA_LEEUKOPF_PHONE = import.meta.env.VITE_PROFORMA_LEEUKOPF_PHONE || '(+359) 73 891 041'
const PROFORMA_LEEUKOPF_EMAIL = import.meta.env.VITE_PROFORMA_LEEUKOPF_EMAIL || 'info@leeukopf.com'
const TIKTOK_URL = import.meta.env.VITE_TIKTOK_URL || 'https://www.tiktok.com/@gelitupgreece'
const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/gelitup'
const LINKEDIN_URL = import.meta.env.VITE_LINKEDIN_URL || 'https://gr.linkedin.com/company/gel-it-up-by-giup'
const FACEBOOK_URL = import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com/GEL.IT.UP.Greece/'
const YOUTUBE_URL = import.meta.env.VITE_YOUTUBE_URL || 'https://www.youtube.com/@GELITUP'
const TIKTOK_HANDLE = import.meta.env.VITE_TIKTOK_HANDLE || 'GELITUPGREECE'
const INSTAGRAM_HANDLE = import.meta.env.VITE_INSTAGRAM_HANDLE || 'gelitup'
const LINKEDIN_HANDLE = import.meta.env.VITE_LINKEDIN_HANDLE || 'GEL.IT.UP'
const FACEBOOK_HANDLE = import.meta.env.VITE_FACEBOOK_HANDLE || '@gelitup'
const YOUTUBE_HANDLE = import.meta.env.VITE_YOUTUBE_HANDLE || '@GELITUP'
const PORTAL_FONT_TTF_URL = import.meta.env.VITE_PORTAL_FONT_TTF_URL || '/fonts/PF-Futura-Neu.ttf'
const CLIENT_PROFILE_STORAGE_KEY = 'gelitup.portal.client_profile.v1'
const COOKIE_CONSENT_STORAGE_KEY = 'gelitup.cookies.consent.v2'
const FOOTER_SOCIAL_LINKS = [
  { key: 'tiktok', label: 'TikTok', handle: TIKTOK_HANDLE, href: TIKTOK_URL },
  { key: 'instagram', label: 'Instagram', handle: INSTAGRAM_HANDLE, href: INSTAGRAM_URL },
  { key: 'linkedin', label: 'LinkedIn', handle: LINKEDIN_HANDLE, href: LINKEDIN_URL },
  { key: 'facebook', label: 'Facebook', handle: FACEBOOK_HANDLE, href: FACEBOOK_URL },
  { key: 'youtube', label: 'YouTube', handle: YOUTUBE_HANDLE, href: YOUTUBE_URL },
]
const COUNTRY_OPTIONS = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France',
  'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
  'United Kingdom', 'Norway', 'Switzerland', 'Turkey', 'Ukraine',
  'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile',
  'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Israel', 'Egypt', 'South Africa',
  'India', 'China', 'Japan', 'South Korea', 'Singapore', 'Australia', 'New Zealand',
]

const defaultClientProfile = {
  customerType: 'company',
  customerName: '',
  vatNumber: '',
  shippingType: 'road',
  contactPhone: '',
  contactEmail: '',
  invoiceAddressLine1: '',
  invoiceAddressLine2: '',
  invoiceArea: '',
  invoiceRegion: '',
  invoiceCountry: '',
  invoicePostalCode: '',
  shippingSameAsInvoice: true,
  shippingName: '',
  shippingPhone: '',
  shippingAddressLine1: '',
  shippingAddressLine2: '',
  shippingArea: '',
  shippingRegion: '',
  shippingCountry: '',
  shippingPostalCode: '',
}

function buildClientProfileFromRegistration(registration) {
  if (!registration || typeof registration !== 'object') {
    return { ...defaultClientProfile }
  }

  const shippingSameAsInvoice = registration.shipping_same_as_invoice !== false

  return {
    ...defaultClientProfile,
    customerType: registration.customer_type || 'company',
    customerName: registration.company_name || '',
    vatNumber: registration.vat_number || '',
    shippingType: registration.shipping_type || 'road',
    contactPhone: registration.phone || '',
    contactEmail: registration.contact_email || '',
    invoiceAddressLine1: registration.invoice_address_line1 || registration.address || '',
    invoiceAddressLine2: registration.invoice_address_line2 || '',
    invoiceArea: registration.invoice_area || registration.city || '',
    invoiceRegion: registration.invoice_region || '',
    invoiceCountry: registration.invoice_country || registration.country || '',
    invoicePostalCode: registration.invoice_postal_code || registration.postal_code || '',
    shippingSameAsInvoice,
    shippingName: registration.shipping_name || '',
    shippingPhone: registration.shipping_phone || '',
    shippingAddressLine1: registration.shipping_address_line1 || '',
    shippingAddressLine2: registration.shipping_address_line2 || '',
    shippingArea: registration.shipping_area || '',
    shippingRegion: registration.shipping_region || '',
    shippingCountry: registration.shipping_country || '',
    shippingPostalCode: registration.shipping_postal_code || '',
  }
}

function buildUserMetadataFromRegistration(registration) {
  const profile = buildClientProfileFromRegistration(registration)

  return {
    customer_type: profile.customerType,
    account_type: profile.customerType,
    company_name: profile.customerName,
    full_name: registration?.contact_name || profile.customerName,
    vat_number: profile.vatNumber,
    contact_phone: profile.contactPhone,
    contact_email: profile.contactEmail,
    shipping_type: profile.shippingType,
    invoice_address_line1: profile.invoiceAddressLine1,
    invoice_address_line2: profile.invoiceAddressLine2,
    invoice_area: profile.invoiceArea,
    invoice_region: profile.invoiceRegion,
    invoice_country: profile.invoiceCountry,
    invoice_postal_code: profile.invoicePostalCode,
    shipping_same_as_invoice: profile.shippingSameAsInvoice,
    shipping_name: profile.shippingName,
    shipping_phone: profile.shippingPhone,
    shipping_address_line1: profile.shippingAddressLine1,
    shipping_address_line2: profile.shippingAddressLine2,
    shipping_area: profile.shippingArea,
    shipping_region: profile.shippingRegion,
    shipping_country: profile.shippingCountry,
    shipping_postal_code: profile.shippingPostalCode,
    registration_status: 'approved',
    registration_id: registration?.id || null,
  }
}

function composeAddress({ line1, line2, area, region, country, postalCode }) {
  return [line1, line2, area, region, postalCode, country]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ')
}

function normalizeSkuCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function normalizeProductName(value) {
  return normalizeSkuCode(value)
    .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeImageMap(payload) {
  if (!payload || typeof payload !== 'object') {
    return new Map()
  }

  const map = new Map()

  Object.entries(payload).forEach(([rawKey, rawValue]) => {
    const imageUrl = typeof rawValue === 'string' ? rawValue.trim() : ''
    if (!imageUrl) return

    const normalizedSku = normalizeSkuCode(rawKey)
    const normalizedName = normalizeProductName(rawKey)

    if (normalizedSku && !map.has(normalizedSku)) map.set(normalizedSku, imageUrl)
    if (normalizedName && !map.has(normalizedName)) map.set(normalizedName, imageUrl)
  })

  return map
}

function buildColorAliases(value) {
  const normalized = normalizeSkuCode(value)
  if (!normalized) return []

  const aliases = new Set([normalized])
  const numericMatch = normalized.match(/^(\d{1,4})([A-Z]?)$/)

  if (numericMatch) {
    const digits = numericMatch[1]
    const suffix = numericMatch[2] || ''
    const parsedNumber = Number.parseInt(digits, 10)

    if (Number.isFinite(parsedNumber)) {
      const unpadded = String(parsedNumber)
      aliases.add(`${unpadded}${suffix}`)
      aliases.add(`${unpadded.padStart(2, '0')}${suffix}`)
      aliases.add(`${unpadded.padStart(3, '0')}${suffix}`)
      aliases.add(`${unpadded.padStart(4, '0')}${suffix}`)
    }
  }

  return Array.from(aliases)
}

async function sendPortalEmailNotification(payload) {
  if (!EMAIL_WEBHOOK_URL) {
    return { ok: false, skipped: true, message: 'Email webhook is not configured.' }
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    }

    if (EMAIL_WEBHOOK_ANON_KEY) {
      headers.apikey = EMAIL_WEBHOOK_ANON_KEY
      headers.Authorization = `Bearer ${EMAIL_WEBHOOK_ANON_KEY}`
    }

    const response = await fetch(EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
        ...payload,
      }),
    })

    let responseMessage = ''
    const responseType = response.headers.get('content-type') || ''

    if (responseType.includes('application/json')) {
      const responseJson = await response.json().catch(() => null)
      responseMessage = responseJson?.error || responseJson?.message || ''
    }
    else {
      responseMessage = await response.text().catch(() => '')
    }

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        message: responseMessage || `Email webhook returned ${response.status}`,
      }
    }

    return { ok: true, skipped: false }
  }
  catch (error) {
    return {
      ok: false,
      skipped: false,
      message: error instanceof Error ? error.message : 'Unknown email webhook error',
    }
  }
}

async function sendZohoOrderSync(payload) {
  if (!ZOHO_SYNC_ENABLED) {
    return { ok: false, skipped: true, message: 'Zoho sync is disabled by configuration.' }
  }

  if (!ZOHO_SYNC_WEBHOOK_URL) {
    return { ok: false, skipped: true, message: 'Zoho sync webhook is not configured.' }
  }

  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      controller.abort()
    }, Number.isFinite(ZOHO_SYNC_TIMEOUT_MS) ? ZOHO_SYNC_TIMEOUT_MS : 12000)

    const headers = {
      'Content-Type': 'application/json',
    }

    if (ZOHO_SYNC_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${ZOHO_SYNC_AUTH_TOKEN}`
    }

    const response = await fetch(ZOHO_SYNC_WEBHOOK_URL, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        ...payload,
        zohoTarget: ZOHO_SYNC_TARGET,
        emittedAt: new Date().toISOString(),
      }),
    })
    window.clearTimeout(timeoutId)

    let responseMessage = ''
    const responseType = response.headers.get('content-type') || ''

    if (responseType.includes('application/json')) {
      const responseJson = await response.json().catch(() => null)
      responseMessage = responseJson?.message || responseJson?.error || ''
    }
    else {
      responseMessage = await response.text().catch(() => '')
    }

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        message: responseMessage || `Zoho sync webhook returned ${response.status}`,
      }
    }

    return {
      ok: true,
      skipped: false,
      message: responseMessage || `Zoho sync completed via ${ZOHO_SYNC_TARGET}.`,
    }
  }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        skipped: false,
        message: `Zoho sync timed out after ${Number.isFinite(ZOHO_SYNC_TIMEOUT_MS) ? ZOHO_SYNC_TIMEOUT_MS : 12000}ms`,
      }
    }

    return {
      ok: false,
      skipped: false,
      message: error instanceof Error ? error.message : 'Unknown Zoho sync error',
    }
  }
}

function createFallbackProducts(count = 120) {
  return Array.from({ length: count }, (_, index) => {
    const code = `GIUP-PD-${String(index + 1).padStart(4, '0')}`
    const hue = (index * 17) % 360
    const category = PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length]

    return {
      code,
      sku: code,
      name: `GEL.IT.UP Product ${String(index + 1).padStart(4, '0')}`,
      description: 'Sample catalog product description.',
      category,
      preview: `hsl(${hue} 82% 56%)`,
      imageUrl: null,
    }
  })
}

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/about-us', label: 'About us' },
  { to: '/distributor-packages', label: 'Packages' },
  { to: '/full-catalogue', label: 'Full Catalogue' },
  { to: '/distributors', label: 'Distributors' },
  { to: '/contact-us', label: 'Contact us' },
]

const SILVER_MAINTENANCE_SKUS = [
  'GIUP-MNT-SB01 — Superbond Primer',
  'GIUP-MNT-5C01 — 5-in-1 Clear Builder',
  'GIUP-MNT-NW01 — Non-Wipe Top Coat',
]

const SILVER_CORE_30_COLORS = [
  'GIUP-COL-01 — Ice Ice Baby',
  'GIUP-COL-102 — Marsh Mallow',
  'GIUP-COL-05 — Snow Queen',
  'GIUP-COL-04 — Milkyway',
  'GIUP-COL-09 — Coco Nude',
  'GIUP-COL-08 — Ivory',
  'GIUP-COL-010 — Bridal Bliss',
  'GIUP-COL-07B — Liberte',
  'GIUP-COL-2511 — Skin Shock',
  'GIUP-COL-100A — She Bangs',
  'GIUP-COL-02 — Cotton Candy',
  'GIUP-COL-06 — Ballerina',
  'GIUP-COL-11 — Pinky Promise',
  'GIUP-COL-1801 — Sweet Pea',
  'GIUP-COL-051A — Raspberry Ripple',
  'GIUP-COL-1803 — Don’t Pout',
  'GIUP-COL-023 — Classic Red',
  'GIUP-COL-025 — Cherry Bomb',
  'GIUP-COL-015 — Total Eclipse',
  'GIUP-COL-1802 — Grey Matter',
  'GIUP-COL-019 — Slate',
  'GIUP-COL-152 — Frisco',
  'GIUP-COL-120 — Wisteria Lane',
  'GIUP-COL-07 — Lavender Dreams',
  'GIUP-COL-2020 — Soft n Sweet',
  'GIUP-COL-2037 — Salty Caramel',
  'GIUP-COL-2026 — Whaat? Pistachio?',
  'GIUP-COL-2113J — Blue Flashing Star',
  'GIUP-COL-GCE01 — Glass Cat Eye Clear',
  'GIUP-COL-F01 — Foil Gel Adhesive',
]

const GOLD_BUILDER_SKUS = [
  'GIUP-BLD-3IN1-PK01 — 3-in-1 Builder Gel Pink Soft',
  'GIUP-BLD-3IN1-PK02 — 3-in-1 Builder Gel Pink Medium',
  'GIUP-BLD-3IN1-PK03 — 3-in-1 Builder Gel Pink Hard',
  'GIUP-BLD-3IN1-CV01 — 3-in-1 Builder Gel Cover Light',
  'GIUP-BLD-3IN1-CV02 — 3-in-1 Builder Gel Cover Medium',
  'GIUP-BLD-3IN1-CV03 — 3-in-1 Builder Gel Cover Deep',
]

const GOLD_MODERN_30_COLORS = [
  'GIUP-COL-2032 — Salt Water Toffee',
  'GIUP-COL-2035 — Scuubie',
  'GIUP-COL-2039 — Coral Reef',
  'GIUP-COL-2038 — Hibiscus',
  'GIUP-COL-030 — Sunset',
  'GIUP-COL-2029 — Show Me The Moneee',
  'GIUP-COL-2516 — Berry Obsession',
  'GIUP-COL-2519 — Merlot Veil',
  'GIUP-COL-2512 — Ember Rose',
  'GIUP-COL-2521 — Chopco Veil',
  'GIUP-COL-1927 — Forestation',
  'GIUP-COL-2027 — Emerald Coast',
  'GIUP-COL-1926 — Eco-Savvy',
  'GIUP-COL-2526 — Double Leopardy',
  'GIUP-COL-2034 — Smurf\'s Baby',
  'GIUP-COL-2033 — Baby Shark',
  'GIUP-COL-2113R — Midnight Hera',
  'GIUP-COL-2113G — Golden Hour',
  'GIUP-COL-GCE02 — Glass Cat Eye Rose',
  'GIUP-COL-GCE05 — Glass Cat Eye Ocean',
  'GIUP-COL-112 — Vintage Rose',
  'GIUP-COL-2518 — Vintage Whisper',
  'GIUP-COL-061 — Deep Sangria',
  'GIUP-COL-088 — Midnight Sky',
  'GIUP-COL-141 — Peachy Keen',
  'GIUP-COL-ST01 — Spider Gel Black',
  'GIUP-COL-ST02 — Spider Gel White',
  'GIUP-COL-2022 — Lemon Squeeze',
  'GIUP-COL-2023 — Minty Fresh',
  'GIUP-COL-2025 — Lilac Love',
]

const PLATINUM_SYNTHOGEL_SKUS = [
  'GIUP-SYN-BS01 — Synthogel Base',
  'GIUP-SYN-CL01 — Synthogel Clear',
  'GIUP-SYN-PK01 — Synthogel Pink',
  'GIUP-SYN-CV01 — Synthogel Cover',
  'GIUP-SYN-WH01 — Synthogel White',
  'GIUP-SYN-MX01 — Synthogel Multimix',
  'GIUP-SYN-TG01 — Synthogel Top Gloss',
  'GIUP-SYN-LQ01 — Synthogel Brush Liquid',
]

const PLATINUM_SPECIAL_EFFECTS_60 = [
  'GIUP-COL-2113B — Pink Flashing Star',
  'GIUP-COL-2113S — Silver Flashing Star',
  'GIUP-COL-GCE08 — Glass Cat Eye Emerald',
  'GIUP-COL-GCE10 — Glass Cat Eye Amethyst',
  'GIUP-COL-N01 — Neon Yellow',
  'GIUP-COL-N05 — Electric Orange',
  'GIUP-COL-N08 — Shocking Pink',
  'GIUP-COL-1301 — Mermaid Tail',
  'GIUP-COL-1305 — Golden Dust',
  'GIUP-COL-1310 — Starry Night',
  'GIUP-COL-1502 — Holographic Silver',
  'GIUP-COL-2041 — Ibiza Blue',
  'GIUP-COL-2045 — Sunset Strip',
  'GIUP-COL-118 — Tiffany Blue',
  'GIUP-COL-145 — Apricot Sorbet',
  'GIUP-COL-160 — Matcha Latte',
  'GIUP-COL-054 — Crimson Tide',
  'GIUP-COL-058 — Bordeaux Wine',
  'GIUP-COL-062 — Plum Pudding',
  'GIUP-COL-068 — Vampire Red',
  'GIUP-COL-2530 — Velvet Sand',
  'GIUP-COL-2535 — Desert Rose',
  'GIUP-COL-1930 — Earth Mother',
  'GIUP-COL-1935 — Clay Canyon',
  'GIUP-COL-2050 — Electric Lime',
  'GIUP-COL-2055 — Ultraviolet',
  'GIUP-COL-STF03 — Shimmer Top Silver',
  'GIUP-COL-STF04 — Shimmer Top Gold',
  'GIUP-COL-M01 — Metallic Silver Paint',
  'GIUP-COL-M02 — Metallic Gold Paint',
  'GIUP-COL-2540 — Midnight Chrome',
  'GIUP-COL-2545 — Bronze Age',
  'GIUP-COL-2550 — Antique Copper',
  'GIUP-COL-110 — Smoked Mauve',
  'GIUP-COL-115 — Dusty Cedar',
  'GIUP-COL-125 — Misty Lilac',
  'GIUP-COL-135 — Sage Wisdom',
  'GIUP-COL-170 — Oyster Shell',
  'GIUP-COL-175 — Pearly White',
  'GIUP-COL-075 — Royal Purple',
  'GIUP-COL-082 — Cobalt Crush',
  'GIUP-COL-095 — Forest Fern',
  'GIUP-COL-105 — Concrete Jungle',
  'GIUP-COL-111 — Black Cherry',
  'GIUP-COL-122 — Mulberry',
  'GIUP-COL-185 — Spiced Chai',
  'GIUP-COL-195 — Pumpkin Spice',
  'GIUP-COL-205 — Deep Teal',
  'GIUP-COL-215 — Midnight Navy',
  'GIUP-COL-225 — Charcoal Spark',
  'GIUP-COL-235 — Rose Gold Foil',
  'GIUP-COL-245 — Copper Flare',
  'GIUP-COL-GCE12 — Glass Cat Eye Galaxy',
  'GIUP-COL-2113W — White Flashing Star',
  'GIUP-COL-2113P — Purple Flashing Star',
  'GIUP-COL-ST03 — Spider Gel Gold',
  'GIUP-COL-ST04 — Spider Gel Silver',
  'GIUP-COL-B01 — Blooming Gel',
  'GIUP-COL-401 — Mattest Matte',
  'GIUP-COL-501 — Super Glossy Wipe',
]

const HERO_PRODUCT_COPY = [
  {
    name: '5-in-1 Superior Base Coat',
    headline: 'Five Services. One HEMA-Free Power Base.',
    bullets: [
      'Adhesion + reinforcement + shaping in one step',
      'Strong grip for rhinestones and short extensions',
      'Faster workflows, better retention, higher service value',
    ],
  },
  {
    name: 'Non-Wipe Satin Matte RS',
    headline: 'Velvet Matte That Sells Premium.',
    bullets: [
      'No-wipe satin finish with soft-touch luxury look',
      'Scratch-resistant surface for cleaner long-wear results',
      'Modern, editorial finish clients notice immediately',
    ],
  },
  {
    name: '3-in-1 Premium Builder Gel',
    headline: 'Fiberglass-Infused Strength, Pro-Level Control.',
    bullets: [
      '3-in-1 system for base, build, and structure work',
      'Reinforced durability to reduce cracks and callbacks',
      'Controlled viscosity for precise shaping and faster sets',
    ],
  },
]

const PACKAGE_TIER_OPTIONS = ['Silver', 'Gold', 'Platinum']
const DEFAULT_PACKAGE_ITEM_QTY = 5
const PACKAGE_TECH_ESSENTIALS = [
  { sku: 'SUPERBOND', code: 'SUPERBOND', name: 'Superbond Acid-Free Primer', category: 'Technical', group: 'Essentials' },
  { sku: '5IN1_CLR', code: '5IN1_CLR', name: '5-in-1 Superior Base Coat Clear', category: 'Technical', group: 'Essentials' },
  { sku: 'NW_TOP', code: 'NW_TOP', name: 'Non-Wipe Top Coat', category: 'Technical', group: 'Essentials' },
  { sku: '3IN1_CLR', code: '3IN1_CLR', name: '3-in-1 Premium Builder Gel Clear', category: 'Technical', group: 'Essentials' },
  { sku: 'SYN_MWH', code: 'SYN_MWH', name: 'Multimix Synthogel Milky White', category: 'Technical', group: 'Essentials' },
]
const PROFESSIONAL_BASE_PACK = {
  sku: '5IN1_CLR_6PACK',
  description: '5-in-1 Superior Base Professional 6-pack (15% discount)',
  qty: 6,
}
const PROFORMA_HEADER = {
  company: PROFORMA_COMPANY_NAME,
  vatTaxId: PROFORMA_VAT_TAX_ID,
  bankDetails: PROFORMA_BANK_DETAILS,
  swiftBic: PROFORMA_SWIFT_BIC,
  leftLogoPath: PROFORMA_LEFT_LOGO_PATH,
  rightLogoPath: PROFORMA_RIGHT_LOGO_PATH,
  leeukopfCompany: PROFORMA_LEEUKOPF_COMPANY,
  leeukopfAddress: PROFORMA_LEEUKOPF_ADDRESS,
  leeukopfPhone: PROFORMA_LEEUKOPF_PHONE,
  leeukopfEmail: PROFORMA_LEEUKOPF_EMAIL,
}
const EUR_CURRENCY_CODE = 'EUR'
const FACTORY_PRICE_BOOK_EUR = {
  colorDefault: 9.5,
  technicalBySku: {
    SUPERBOND: 12.5,
    '5IN1_CLR': 14,
    NW_TOP: 13,
    '3IN1_CLR': 16.5,
    SYN_MWH: 17,
  },
  professionalPackDiscountPct: 15,
}

function currencyFormatter(amount, currencyCode = EUR_CURRENCY_CODE) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0))
}

function getUnitPriceEurForSku(sku) {
  const normalizedSku = normalizeSkuCode(sku)
  if (!normalizedSku) return FACTORY_PRICE_BOOK_EUR.colorDefault

  if (FACTORY_PRICE_BOOK_EUR.technicalBySku[normalizedSku]) {
    return FACTORY_PRICE_BOOK_EUR.technicalBySku[normalizedSku]
  }

  if (normalizedSku.includes('GIUP-COL') || /^\d{1,4}[A-Z]?$/.test(normalizedSku)) {
    return FACTORY_PRICE_BOOK_EUR.colorDefault
  }

  return FACTORY_PRICE_BOOK_EUR.colorDefault
}

function buildProformaFromCart({
  orderId,
  userProfile,
  selectedCodes,
  packageCartItems,
  includeProfessionalBasePack,
  products,
}) {
  const productMap = new Map(products.map((product) => [normalizeSkuCode(product.code), product]))

  const selectedLines = selectedCodes.map((code) => {
    const normalized = normalizeSkuCode(code)
    const product = productMap.get(normalized)
    const unitPriceEur = getUnitPriceEurForSku(normalized)
    const qty = 1

    return {
      sku: normalized,
      description: product?.name || 'Catalog item',
      qty,
      unitPriceEur,
      discountPct: 0,
      subtotalEur: Number((qty * unitPriceEur).toFixed(2)),
    }
  })

  const packageLines = packageCartItems.map((item) => {
    const unitPriceEur = getUnitPriceEurForSku(item.sku)
    const qty = Number(item.qty || 0)
    return {
      sku: item.sku,
      description: item.name || item.code || item.sku,
      qty,
      unitPriceEur,
      discountPct: 0,
      subtotalEur: Number((qty * unitPriceEur).toFixed(2)),
    }
  })

  const addOnLines = includeProfessionalBasePack
    ? (() => {
      const listUnitPriceEur = FACTORY_PRICE_BOOK_EUR.technicalBySku['5IN1_CLR'] || 14
      const discountPct = FACTORY_PRICE_BOOK_EUR.professionalPackDiscountPct
      const discountedUnitPriceEur = Number((listUnitPriceEur * (1 - (discountPct / 100))).toFixed(2))
      const qty = PROFESSIONAL_BASE_PACK.qty
      return [{
        sku: PROFESSIONAL_BASE_PACK.sku,
        description: PROFESSIONAL_BASE_PACK.description,
        qty,
        unitPriceEur: discountedUnitPriceEur,
        discountPct,
        subtotalEur: Number((qty * discountedUnitPriceEur).toFixed(2)),
      }]
    })()
    : []

  const lines = [...selectedLines, ...packageLines, ...addOnLines]
  const grandTotalEur = Number(lines.reduce((sum, line) => sum + line.subtotalEur, 0).toFixed(2))

  return {
    orderId,
    createdAtIso: new Date().toISOString(),
    customer: {
      companyName: userProfile?.companyName || '-',
      vatNumber: userProfile?.vatNumber || '-',
      country: userProfile?.country || '-',
      region: userProfile?.region || '-',
    },
    lines,
    grandTotalEur,
    currency: EUR_CURRENCY_CODE,
  }
}

function buildTierPackageItems(tier, podCatalog, defaultQty = DEFAULT_PACKAGE_ITEM_QTY) {
  const pod1 = Array.isArray(podCatalog?.pod_1) ? podCatalog.pod_1 : []
  const pod2 = Array.isArray(podCatalog?.pod_2) ? podCatalog.pod_2 : []
  const pod3 = Array.isArray(podCatalog?.pod_3) ? podCatalog.pod_3 : []
  const pod4 = Array.isArray(podCatalog?.pod_4) ? podCatalog.pod_4 : []

  const source = tier === 'Silver'
    ? pod1
    : tier === 'Gold'
      ? [...pod1, ...pod2]
      : [...pod1, ...pod2, ...pod3, ...pod4]

  return source.map((item) => ({
    sku: item.sku,
    code: item.code,
    name: item.name,
    category: item.category,
    group: item.group,
    qty: defaultQty,
  }))
}

function buildTierTechnicalItems(defaultQty = DEFAULT_PACKAGE_ITEM_QTY) {
  return PACKAGE_TECH_ESSENTIALS.map((item) => ({
    ...item,
    qty: defaultQty,
  }))
}

function buildPackageDraftInvoice(
  tier,
  buyerEmail = 'b2b-client@company.com',
  packageItems = [],
  additionalLineItems = [],
) {
  const createdAt = new Date().toISOString()
  const invoiceNumber = `DRAFT-${tier.toUpperCase()}-${Date.now()}`

  const lineItems = [
    ...packageItems.map((item) => ({
      sku: item.sku,
      description: `${item.name} (${item.code})`,
      qty: item.qty,
    })),
    ...additionalLineItems,
  ]
  const colorCodes = packageItems
    .filter((item) => item.code)
    .map((item) => item.code)
  const totalUnits = lineItems.reduce((sum, item) => sum + item.qty, 0)

  return {
    invoiceNumber,
    tier,
    createdAt,
    buyerEmail,
    colorCodes,
    lineItems,
    totalUnits,
  }
}

function formatDraftInvoiceText(invoice) {
  const lines = [
    'GEL.IT.UP by GIUP® - B2B DRAFT INVOICE',
    `Invoice #: ${invoice.invoiceNumber}`,
    `Created: ${new Date(invoice.createdAt).toLocaleString()}`,
    `Tier: ${invoice.tier}`,
    `Bill To: ${invoice.buyerEmail}`,
    '',
    'Line Items:',
    ...invoice.lineItems.map((item, index) => `${index + 1}. ${item.sku} | ${item.description} | Qty: ${item.qty}`),
    '',
    `Color Codes Included (${invoice.colorCodes.length}): ${invoice.colorCodes.join(', ')}`,
    `Total Units: ${invoice.totalUnits}`,
    '',
    'Status: Draft (B2B user review required)',
  ]

  return lines.join('\n')
}

function buildPlatinumSuccessEmail({ distributorName, orderId }) {
  const subject = `Welcome to the Family! 💎 Your GEL.IT.UP Platinum Distributor Order [#${orderId}]`
  const html = `
    <p>Hello ${distributorName},</p>
    <p>It is a pleasure to officially welcome you to the GEL.IT.UP by GIUP® global network!</p>
    <p>You haven’t just placed an order; you’ve invested in a partnership. By choosing the Platinum Elite Package, you are now equipped with our top 120 high-velocity colors and the technical systems that professional nail technicians trust daily.</p>
    <p><strong>📦 What Happens Next?</strong></p>
    <p><strong>Order Processing:</strong> Our warehouse team is currently hand-picking your 120-color "Master Collection" and technical essentials.</p>
    <p><strong>Digital Assets:</strong> Keep an eye on your inbox. Within 24 hours, you will receive a link to our Distributor Media Kit, containing high-res imagery, social media templates, and technical data sheets (SDS) to help you start selling immediately.</p>
    <p><strong>Logistics:</strong> As soon as your shipment leaves our facility, your tracking number will update automatically on your V2 Dashboard.</p>
    <p><strong>💡 A Pro-Tip for Your Launch:</strong><br/>Your package includes the 5-in-1 Superior Base 6-pack. We recommend highlighting this as your "Hero Product" alongside the Coco Nude (09) and Ice Ice Baby (01) shades—this combination is currently our #1 requested salon starter set for 2026.</p>
    <p>We are thrilled to have you representing the brand. Let’s make the world more colorful, one manicure at a time.</p>
    <p>Best Regards,<br/>The GEL.IT.UP Team<br/>Professional Choice. Professional Results.</p>
  `

  return { subject, html }
}

const SHIPPING_RULES = {
  defaults: {
    unitWeightKg: 0.06,
    unitLengthCm: 3.5,
    unitWidthCm: 3.5,
    unitHeightCm: 7.0,
    description: 'Standard GEL color bottle',
  },
  byPrefix: {
    'GIUP-COL': {
      unitWeightKg: 0.06,
      unitLengthCm: 3.5,
      unitWidthCm: 3.5,
      unitHeightCm: 7.0,
      description: 'GEL color bottle',
    },
    'GIUP-MNT': {
      unitWeightKg: 0.08,
      unitLengthCm: 4.0,
      unitWidthCm: 4.0,
      unitHeightCm: 8.0,
      description: 'Maintenance SKU bottle',
    },
  },
  bySku: {
    SUPERBOND: {
      unitWeightKg: 0.05,
      unitLengthCm: 3.2,
      unitWidthCm: 3.2,
      unitHeightCm: 7.0,
      description: 'Superbond primer bottle',
    },
    '5IN1_CLR': {
      unitWeightKg: 0.08,
      unitLengthCm: 4.0,
      unitWidthCm: 4.0,
      unitHeightCm: 8.0,
      description: '5-in-1 base bottle',
    },
    NW_TOP: {
      unitWeightKg: 0.08,
      unitLengthCm: 4.0,
      unitWidthCm: 4.0,
      unitHeightCm: 8.0,
      description: 'Non-wipe top bottle',
    },
    '3IN1_CLR': {
      unitWeightKg: 0.1,
      unitLengthCm: 4.4,
      unitWidthCm: 4.4,
      unitHeightCm: 8.3,
      description: '3-in-1 builder bottle',
    },
    SYN_MWH: {
      unitWeightKg: 0.12,
      unitLengthCm: 4.8,
      unitWidthCm: 4.8,
      unitHeightCm: 8.8,
      description: 'Synthogel jar',
    },
    '5IN1_CLR_6PACK': {
      unitWeightKg: 0.58,
      unitLengthCm: 17.0,
      unitWidthCm: 12.0,
      unitHeightCm: 9.0,
      description: '6-pack bundled carton',
    },
  },
  packaging: {
    maxBoxWeightKg: 18,
    maxBoxVolumeCm3: 50000,
    suggestedBoxLengthCm: 40,
    suggestedBoxWidthCm: 30,
    suggestedBoxHeightCm: 25,
  },
}

function parsePositiveNumber(value, fallbackValue) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue
}

function normalizeShippingRule(rule, fallbackRule) {
  const baseRule = fallbackRule || SHIPPING_RULES.defaults
  return {
    unitWeightKg: parsePositiveNumber(rule?.unitWeightKg, baseRule.unitWeightKg),
    unitLengthCm: parsePositiveNumber(rule?.unitLengthCm, baseRule.unitLengthCm),
    unitWidthCm: parsePositiveNumber(rule?.unitWidthCm, baseRule.unitWidthCm),
    unitHeightCm: parsePositiveNumber(rule?.unitHeightCm, baseRule.unitHeightCm),
    description: String(rule?.description || baseRule.description || 'Standard item'),
  }
}

function normalizeShippingMetadata(payload) {
  const defaults = normalizeShippingRule(payload?.defaults, SHIPPING_RULES.defaults)

  const bySku = Object.entries(payload?.bySku || {}).reduce((acc, [rawSku, rawRule]) => {
    const sku = normalizeSkuCode(rawSku)
    if (!sku) return acc
    acc[sku] = normalizeShippingRule(rawRule, defaults)
    return acc
  }, {})

  const byPrefix = Object.entries(payload?.byPrefix || {}).reduce((acc, [rawPrefix, rawRule]) => {
    const prefix = normalizeSkuCode(rawPrefix)
    if (!prefix) return acc
    acc[prefix] = normalizeShippingRule(rawRule, defaults)
    return acc
  }, {})

  const defaultPackaging = SHIPPING_RULES.packaging
  const packaging = {
    maxBoxWeightKg: parsePositiveNumber(payload?.packaging?.maxBoxWeightKg, defaultPackaging.maxBoxWeightKg),
    maxBoxVolumeCm3: parsePositiveNumber(payload?.packaging?.maxBoxVolumeCm3, defaultPackaging.maxBoxVolumeCm3),
    suggestedBoxLengthCm: parsePositiveNumber(payload?.packaging?.suggestedBoxLengthCm, defaultPackaging.suggestedBoxLengthCm),
    suggestedBoxWidthCm: parsePositiveNumber(payload?.packaging?.suggestedBoxWidthCm, defaultPackaging.suggestedBoxWidthCm),
    suggestedBoxHeightCm: parsePositiveNumber(payload?.packaging?.suggestedBoxHeightCm, defaultPackaging.suggestedBoxHeightCm),
  }

  return {
    defaults,
    bySku,
    byPrefix,
    packaging,
  }
}

function parseCartLineItem(rawItem) {
  const normalized = String(rawItem || '').trim()
  if (!normalized) return { sku: '', qty: 0 }

  const match = normalized.match(/^(.*?)\s*x\s*(\d+)$/i)
  if (match) {
    return {
      sku: normalizeSkuCode(match[1]),
      qty: Number.parseInt(match[2], 10),
    }
  }

  return {
    sku: normalizeSkuCode(normalized),
    qty: 1,
  }
}

function resolveShippingRule(sku, shippingRules = SHIPPING_RULES) {
  const normalizedSku = normalizeSkuCode(sku)
  if (!normalizedSku) return shippingRules.defaults

  if (shippingRules.bySku[normalizedSku]) {
    return shippingRules.bySku[normalizedSku]
  }

  const matchedPrefix = Object.keys(shippingRules.byPrefix || {}).find((prefix) => normalizedSku.startsWith(prefix))
  if (matchedPrefix) {
    return shippingRules.byPrefix[matchedPrefix]
  }

  return shippingRules.defaults
}

function generatePackingList(orderItems, shippingRules = SHIPPING_RULES) {
  const lines = orderItems
    .map(parseCartLineItem)
    .filter((line) => line.sku && line.qty > 0)
    .map((line) => {
      const rule = resolveShippingRule(line.sku, shippingRules)
      const unitVolumeCm3 = rule.unitLengthCm * rule.unitWidthCm * rule.unitHeightCm
      const lineWeightKg = Number((line.qty * rule.unitWeightKg).toFixed(3))
      const lineVolumeCm3 = Math.round(line.qty * unitVolumeCm3)

      return {
        sku: line.sku,
        qty: line.qty,
        description: rule.description,
        unitWeightKg: rule.unitWeightKg,
        unitLengthCm: rule.unitLengthCm,
        unitWidthCm: rule.unitWidthCm,
        unitHeightCm: rule.unitHeightCm,
        lineWeightKg,
        lineVolumeCm3,
      }
    })

  const totalWeightKg = Number(lines.reduce((sum, line) => sum + line.lineWeightKg, 0).toFixed(3))
  const totalVolumeCm3 = lines.reduce((sum, line) => sum + line.lineVolumeCm3, 0)
  const byWeight = Math.ceil(totalWeightKg / shippingRules.packaging.maxBoxWeightKg)
  const byVolume = Math.ceil(totalVolumeCm3 / shippingRules.packaging.maxBoxVolumeCm3)
  const suggestedParcels = Math.max(1, byWeight, byVolume)

  return {
    lines,
    totalWeightKg,
    totalVolumeCm3,
    suggestedParcels,
    packaging: shippingRules.packaging,
  }
}

function isLikelyColorSku(code) {
  const normalized = normalizeSkuCode(code)
  if (!normalized) return false

  return /^\d{1,4}[A-Z]?$/.test(normalized) || normalized.includes('GIUP-COL')
}

function isTechnicalSku(code) {
  const normalized = normalizeSkuCode(code)
  if (!normalized) return false

  return normalized.includes('5IN1')
    || normalized.includes('SUPERBOND')
    || normalized.includes('BUILDER')
    || normalized.includes('SYN')
    || normalized.includes('TOP')
    || normalized.includes('BASE')
    || normalized.includes('PRIMER')
    || normalized.includes('CREME')
}

function DistributorPackagesPage() {
  const packageTiers = [
    {
      name: 'Silver (Boutique)',
      badge: 'Starter Tier',
      roi: 'Built for new salons focused on fast-turn maintenance services and repeat bookings from classic shades.',
      value: 'Lowest opening inventory risk with high-frequency products that convert quickly and stabilize weekly cash flow.',
      groups: [
        { title: 'Maintenance Essentials', items: SILVER_MAINTENANCE_SKUS },
        { title: 'Core 30 Classic Colors (Whites, Nudes, Reds)', items: SILVER_CORE_30_COLORS },
      ],
    },
    {
      name: 'Gold (Professional)',
      badge: 'Growth Tier',
      roi: 'Designed for salons ready to raise average ticket value with builder services and a wider color menu.',
      value: 'Expands margin opportunities by adding structure services and trend-driven shades while keeping proven core sellers.',
      groups: [
        { title: 'Includes Silver Package', items: [...SILVER_MAINTENANCE_SKUS, ...SILVER_CORE_30_COLORS] },
        { title: '3-in-1 Builder Gels (Pink / Cover)', items: GOLD_BUILDER_SKUS },
        { title: 'Modern Aesthetic Colors (Additional 30, Total 60)', items: GOLD_MODERN_30_COLORS },
      ],
    },
    {
      name: 'Platinum (Elite)',
      badge: 'Scale Tier',
      roi: 'Best for high-volume salons and academies seeking full technical range and premium service differentiation.',
      value: 'Maximizes service mix, premium pricing potential, and retention through complete systems plus advanced effects.',
      groups: [
        {
          title: 'Includes Gold Package',
          items: [...SILVER_MAINTENANCE_SKUS, ...SILVER_CORE_30_COLORS, ...GOLD_BUILDER_SKUS, ...GOLD_MODERN_30_COLORS],
        },
        { title: 'Complete Synthogel System', items: PLATINUM_SYNTHOGEL_SKUS },
        { title: 'Special Effects Colors (Additional 60, Total 120)', items: PLATINUM_SPECIAL_EFFECTS_60 },
      ],
    },
  ]

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-300">B2B Merchandising</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-4xl">Distributor Packages</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-200 sm:text-base">
          Three tiered assortment models designed to help new nail salons launch faster, improve sell-through,
          and increase service profitability with a clear step-up path.
        </p>
        <NavLink to="/full-catalogue" className="mt-4 inline-flex rounded-lg border border-slate-400 px-4 py-2 text-sm font-semibold text-white">
          Quick View: Full Catalogue
        </NavLink>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {HERO_PRODUCT_COPY.map((product) => (
          <article key={product.name} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Hero Product</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">{product.name}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">{product.headline}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {product.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="grid gap-4">
        {packageTiers.map((tier) => (
          <article key={tier.name} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{tier.name}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{tier.badge}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700">ROI Focus: {tier.roi}</p>
            <p className="mt-1 text-sm text-slate-600">{tier.value}</p>

            <div className="mt-4 space-y-4">
              {tier.groups.map((group) => (
                <div key={group.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
                  <ul className="mt-2 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function formatCatalogueItemName(rawPath = '') {
  const fileName = rawPath.split('/').pop() || ''
  const withoutExtension = fileName.replace(/\.[a-z0-9]+$/i, '')
  return withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isCategoryHeroAssetPath(rawPath = '') {
  const fileName = String(rawPath || '').split('/').pop() || ''
  return /hero\.image/i.test(fileName)
}

function normalizeCatalogueToken(value = '') {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findCatalogueItemByMatch(items = [], rawMatch = '', used = new Set()) {
  const match = normalizeCatalogueToken(rawMatch)
  if (!match) return null

  return items.find((item) => {
    if (used.has(item.imageUrl)) return false
    const nameToken = normalizeCatalogueToken(item.name)
    const pathToken = normalizeCatalogueToken(item.imageUrl)
    return nameToken.includes(match) || pathToken.includes(match)
  }) || null
}

function isLikelySwatchName(name = '') {
  const upper = normalizeCatalogueToken(name)
  if (!upper) return false

  return upper.includes('SWATCH')
    || upper.startsWith('GIUP ')
    || /^GIUP\s*[A-Z0-9]+\s*\d+[A-Z0-9]*$/i.test(upper)
    || /^[A-Z]{2,8}\s*\d+[A-Z0-9]*$/i.test(upper)
}

function extractCatalogueFamilyKey(name = '') {
  const upper = normalizeCatalogueToken(name)
  if (!upper) return 'MISC'

  if (upper.includes('3 IN 1') || upper.includes('3IN1')) return '3IN1'
  if (upper.includes('5 IN 1') || upper.includes('5IN1')) return '5IN1'
  if (upper.startsWith('GIUP ')) {
    const compact = upper.replace(/\s+/g, '')
    const skuMatch = compact.match(/^(GIUP[A-Z0-9]+?)(\d+[A-Z0-9]*)?$/)
    if (skuMatch) return skuMatch[1]
  }

  const tokens = upper.split(' ').filter(Boolean)
  const strippedTokens = tokens.map((token) => token.replace(/^0+/, ''))
  const keep = strippedTokens.filter((token) => !/^\d+[A-Z0-9]*$/.test(token))

  if (keep.length >= 2) return `${keep[0]} ${keep[1]}`
  if (keep.length === 1) return keep[0]

  return upper
}

function sortCatalogueItems(items = []) {
  return [...items].sort((left, right) => {
    const leftFamily = extractCatalogueFamilyKey(left.name)
    const rightFamily = extractCatalogueFamilyKey(right.name)

    if (leftFamily !== rightFamily) {
      return leftFamily.localeCompare(rightFamily, undefined, { sensitivity: 'base' })
    }

    const leftIsSwatch = isLikelySwatchName(left.name)
    const rightIsSwatch = isLikelySwatchName(right.name)

    if (leftIsSwatch !== rightIsSwatch) {
      return leftIsSwatch ? 1 : -1
    }

    return left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })
}

function buildManualRuleIndex(payload) {
  const rules = Array.isArray(payload?.rules) ? payload.rules : []
  const index = new Map()

  rules.forEach((rule) => {
    const category = String(rule?.category || '').trim()
    const subcategory = String(rule?.subcategory || '').trim()
    if (!category || !subcategory) return
    index.set(`${category}::${subcategory}`, rule)
  })

  return index
}

function applyManualCatalogueOrder(items = [], rule = null) {
  if (!rule || !Array.isArray(items) || items.length === 0) {
    return sortCatalogueItems(items)
  }

  const used = new Set()
  const ordered = []
  const groups = Array.isArray(rule.groups) ? rule.groups : []
  const flatOrder = Array.isArray(rule.order) ? rule.order : []

  groups.forEach((group) => {
    const heroItem = findCatalogueItemByMatch(items, group?.hero || '', used)
    if (heroItem) {
      used.add(heroItem.imageUrl)
      ordered.push(heroItem)
    }

    const swatches = Array.isArray(group?.swatches) ? group.swatches : []
    swatches.forEach((swatchName) => {
      const swatchItem = findCatalogueItemByMatch(items, swatchName, used)
      if (!swatchItem) return
      used.add(swatchItem.imageUrl)
      ordered.push(swatchItem)
    })
  })

  flatOrder.forEach((rawName) => {
    const item = findCatalogueItemByMatch(items, rawName, used)
    if (!item) return
    used.add(item.imageUrl)
    ordered.push(item)
  })

  const remainder = sortCatalogueItems(items.filter((item) => !used.has(item.imageUrl)))
  return [...ordered, ...remainder]
}

function buildCatalogueSectionsFromImageMap(payload, manualRuleIndex = new Map()) {
  if (!payload || typeof payload !== 'object') return []

  const uniqueImagePaths = new Set(
    Object.values(payload)
      .filter((value) => typeof value === 'string')
      .map((value) => String(value).trim())
      .filter((value) => value.includes('/gelitup-content/product-images/'))
      .filter((value) => !isCategoryHeroAssetPath(value))
  )

  const grouped = new Map()

  uniqueImagePaths.forEach((imagePath) => {
    const afterRoot = imagePath.split('/gelitup-content/product-images/')[1] || ''
    const segments = afterRoot.split('/').filter(Boolean)
    const category = segments[0] || 'Other'
    const subcategory = segments.length > 2
      ? segments.slice(1, -1).join(' / ')
      : (segments[1] ? 'General' : 'General')

    const categoryBucket = grouped.get(category) || new Map()
    const subcategoryItems = categoryBucket.get(subcategory) || []

    subcategoryItems.push({
      imageUrl: imagePath,
      name: formatCatalogueItemName(afterRoot),
    })

    categoryBucket.set(subcategory, subcategoryItems)
    grouped.set(category, categoryBucket)
  })

  return Array.from(grouped.entries())
    .map(([category, subcategoryMap]) => ({
      category,
      subcategories: Array.from(subcategoryMap.entries())
        .map(([name, items]) => ({
          name,
          items: applyManualCatalogueOrder(items, manualRuleIndex.get(`${category}::${name}`) || null),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, undefined, { sensitivity: 'base', numeric: true }))
}

const COLOR_FAMILY_FILTERS = [
  { key: 'ALL', label: 'All', swatchClass: 'bg-slate-300' },
  { key: 'RED', label: 'Red', swatchClass: 'bg-red-500' },
  { key: 'PINK', label: 'Pink', swatchClass: 'bg-pink-400' },
  { key: 'NUDE', label: 'Nude', swatchClass: 'bg-amber-200' },
  { key: 'ORANGE', label: 'Orange', swatchClass: 'bg-orange-400' },
  { key: 'YELLOW', label: 'Yellow', swatchClass: 'bg-yellow-300' },
  { key: 'GREEN', label: 'Green', swatchClass: 'bg-emerald-500' },
  { key: 'BLUE', label: 'Blue', swatchClass: 'bg-blue-500' },
  { key: 'PURPLE', label: 'Purple', swatchClass: 'bg-violet-500' },
  { key: 'BROWN', label: 'Brown', swatchClass: 'bg-amber-700' },
  { key: 'GREY', label: 'Grey', swatchClass: 'bg-slate-500' },
  { key: 'BLACK', label: 'Black', swatchClass: 'bg-black' },
  { key: 'WHITE', label: 'White', swatchClass: 'bg-white border border-slate-300' },
]

function resolveColorFamilyKey(name = '') {
  const token = normalizeCatalogueToken(name)
  if (!token) return 'OTHER'

  if (/\bRED|CHERRY|CRIMSON|RUBY|SCARLET|ROUGE|WINE|BURGUNDY|BORDEAUX|MERLOT\b/.test(token)) return 'RED'
  if (/\bPINK|BLUSH|FUCHSIA|MAGENTA|ROSE|PINKY|BARBIE\b/.test(token)) return 'PINK'
  if (/\bNUDE|BEIGE|IVORY|ALMOND|SAND|MILKY|NATURAL|LATTE|CREAM|PORCELAIN|SKIN|COCO\b/.test(token)) return 'NUDE'
  if (/\bORANGE|CORAL|PEACH|APRICOT|TANGERINE|TERRACOTTA\b/.test(token)) return 'ORANGE'
  if (/\bYELLOW|LEMON|SUN|MUSTARD|GOLDEN\b/.test(token)) return 'YELLOW'
  if (/\bGREEN|MINT|OLIVE|PISTACHIO|EMERALD|SAGE|LIME|FOREST\b/.test(token)) return 'GREEN'
  if (/\bBLUE|NAVY|COBALT|AQUA|SKY|OCEAN|TURQUOISE|AZURE|DENIM\b/.test(token)) return 'BLUE'
  if (/\bPURPLE|LILAC|VIOLET|LAVENDER|PLUM|MAUVE|AMETHYST\b/.test(token)) return 'PURPLE'
  if (/\bBROWN|CHOC|MOCHA|CARAMEL|COFFEE|TAUPE|TOFFEE|BRONZE\b/.test(token)) return 'BROWN'
  if (/\bGREY|GRAY|SILVER|SLATE|SMOKE|ASH|GRAPHITE|CHARCOAL\b/.test(token)) return 'GREY'
  if (/\bBLACK\b/.test(token)) return 'BLACK'
  if (/\bWHITE\b/.test(token)) return 'WHITE'

  return 'OTHER'
}

function isColorsCategoryName(categoryName = '') {
  return normalizeCatalogueToken(categoryName).includes('COLOR')
}

function buildCategoryHeroImageCandidates(categoryName = '', fallbackImageUrl = '') {
  const normalizedCategory = normalizeCatalogueToken(categoryName)
  const tokens = normalizedCategory.split(' ').filter(Boolean)
  const slug = tokens.map((token) => token.toLowerCase()).join('-')
  const baseNames = new Set()

  if (slug) {
    baseNames.add(slug)
  }

  tokens.forEach((token) => {
    baseNames.add(token.toLowerCase())
  })

  if (baseNames.has('colours')) baseNames.add('colors')
  if (baseNames.has('colors')) baseNames.add('colours')

  const extensions = ['png', 'webp', 'jpg', 'jpeg']
  const candidates = []

  baseNames.forEach((baseName) => {
    extensions.forEach((extension) => {
      candidates.push(`/gelitup-content/catalog-heroes/${baseName}.hero.image.${extension}`)
    })
  })

  const encodedCategory = encodeURIComponent(String(categoryName || '').trim())
  if (encodedCategory) {
    extensions.forEach((extension) => {
      candidates.push(`/gelitup-content/product-images/${encodedCategory}/hero.image.${extension}`)
    })
  }

  if (fallbackImageUrl) {
    candidates.push(fallbackImageUrl)
  }

  return Array.from(new Set(candidates))
}

function flattenSectionItems(section) {
  if (!section) return []

  return section.subcategories.flatMap((subcategory) =>
    subcategory.items.map((item) => ({
      ...item,
      subcategory: subcategory.name,
      colorFamilyKey: resolveColorFamilyKey(item.name),
    })),
  )
}

function FullCataloguePage() {
  const [sections, setSections] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [activeSubcategory, setActiveSubcategory] = useState('')
  const [activeColorFamily, setActiveColorFamily] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [heroCandidateIndexByCategory, setHeroCandidateIndexByCategory] = useState({})
  const [itemQuantities, setItemQuantities] = useState({})
  const [quickCart, setQuickCart] = useState({})
  const [pulseItemKey, setPulseItemKey] = useState('')
  const [gridColumns, setGridColumns] = useState(5)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(720)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const virtualContainerRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const loadCatalogue = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [mapResponse, orderResponse] = await Promise.all([
          fetch('/gelitup-content/product-image-map.json'),
          fetch('/gelitup-content/catalog-order.json'),
        ])

        if (!mapResponse.ok) {
          throw new Error(`Catalogue map unavailable (${mapResponse.status})`)
        }

        const payload = await mapResponse.json()
        const manualOrderPayload = orderResponse.ok ? await orderResponse.json() : { rules: [] }
        const manualRuleIndex = buildManualRuleIndex(manualOrderPayload)
        if (!mounted) return

        const nextSections = buildCatalogueSectionsFromImageMap(payload, manualRuleIndex)
        setSections(nextSections)
        setHeroCandidateIndexByCategory({})
        const firstCategory = nextSections[0]?.category || ''
        const firstSubcategory = ''
        setActiveCategory(firstCategory)
        setActiveSubcategory(firstSubcategory)
        setActiveColorFamily('ALL')
      }
      catch (error) {
        if (!mounted) return
        setSections([])
        setActiveCategory('')
        setActiveSubcategory('')
        setActiveColorFamily('ALL')
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load catalogue.')
      }
      finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadCatalogue()

    return () => {
      mounted = false
    }
  }, [])

  const activeSection = sections.find((section) => section.category === activeCategory) || null
  const subcategoryOptions = useMemo(() => {
    if (!activeSection) return []
    return activeSection.subcategories
      .map((subcategory) => subcategory.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
  }, [activeSection])

  const baseItems = useMemo(() => {
    if (!activeSection || !activeSubcategory) return []

    const subcategory = activeSection.subcategories.find((item) => item.name === activeSubcategory)
    if (!subcategory) return []

    return subcategory.items.map((item) => ({
      ...item,
      subcategory: subcategory.name,
      colorFamilyKey: resolveColorFamilyKey(item.name),
    }))
  }, [activeSection, activeSubcategory])

  const isColorsCategory = isColorsCategoryName(activeSection?.category)

  const filteredItems = useMemo(() => {
    const colorFiltered = (!isColorsCategory || activeColorFamily === 'ALL')
      ? baseItems
      : baseItems.filter((item) => item.colorFamilyKey === activeColorFamily)

    const normalizedSearch = normalizeCatalogueToken(searchQuery)
    if (!normalizedSearch) return colorFiltered

    return colorFiltered.filter((item) => {
      const nameToken = normalizeCatalogueToken(item.name)
      const subcategoryToken = normalizeCatalogueToken(item.subcategory)
      const pathToken = normalizeCatalogueToken(item.imageUrl)
      return nameToken.includes(normalizedSearch)
        || subcategoryToken.includes(normalizedSearch)
        || pathToken.includes(normalizedSearch)
    })
  }, [activeColorFamily, baseItems, isColorsCategory, searchQuery])

  useEffect(() => {
    setScrollTop(0)
  }, [activeCategory, activeSubcategory, activeColorFamily])

  useEffect(() => {
    setScrollTop(0)
  }, [searchQuery])

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth
      if (bulkMode) {
        setGridColumns(1)
        return
      }
      if (width >= 1280) {
        setGridColumns(5)
        return
      }
      if (width >= 1024) {
        setGridColumns(4)
        return
      }
      if (width >= 640) {
        setGridColumns(3)
        return
      }
      setGridColumns(2)
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [bulkMode])

  useEffect(() => {
    const node = virtualContainerRef.current
    if (!node) return undefined

    const updateHeight = () => {
      setViewportHeight(node.clientHeight || 720)
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const virtualRowHeight = bulkMode ? 74 : 372
  const totalRows = Math.max(1, Math.ceil(filteredItems.length / gridColumns))
  const overscanRows = 3
  const startRow = Math.max(0, Math.floor(scrollTop / virtualRowHeight) - overscanRows)
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / virtualRowHeight) + overscanRows)

  const virtualItems = useMemo(() => {
    const items = []
    for (let row = startRow; row < endRow; row += 1) {
      for (let column = 0; column < gridColumns; column += 1) {
        const itemIndex = row * gridColumns + column
        if (itemIndex >= filteredItems.length) break
        items.push({ item: filteredItems[itemIndex], row, column, itemIndex })
      }
    }
    return items
  }, [endRow, filteredItems, gridColumns, startRow])

  const topSpacerHeight = startRow * virtualRowHeight
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * virtualRowHeight)

  const quickCartUnits = useMemo(
    () => Object.values(quickCart).reduce((sum, qty) => sum + Number(qty || 0), 0),
    [quickCart],
  )

  const getQty = useCallback((itemKey) => Number(itemQuantities[itemKey] || 1), [itemQuantities])

  const updateQty = useCallback((itemKey, nextValue) => {
    const normalized = Math.max(1, Number(nextValue || 1))
    setItemQuantities((current) => ({
      ...current,
      [itemKey]: normalized,
    }))
  }, [])

  const addQuickItem = useCallback((itemKey) => {
    const qty = Math.max(1, Number(itemQuantities[itemKey] || 1))
    setPulseItemKey(itemKey)
    window.setTimeout(() => {
      setPulseItemKey('')
    }, 320)
    setQuickCart((current) => ({
      ...current,
      [itemKey]: Number(current[itemKey] || 0) + qty,
    }))
  }, [itemQuantities])

  const quickProgress = Math.min(100, Math.round((quickCartUnits / 100) * 100))

  const extractProductCode = useCallback((name = '') => {
    const cleaned = String(name || '').trim()
    const codeMatch = cleaned.match(/[A-Z]{2,8}\s*-?\s*\d+[A-Z0-9-]*/i)
    return codeMatch ? codeMatch[0].toUpperCase() : 'SKU'
  }, [])

  const getTileVariant = useCallback((index) => {
    const variant = index % 6
    if (variant === 0) return 'ring-1 ring-fuchsia-300/60'
    if (variant === 3) return 'bg-gradient-to-b from-white to-fuchsia-50/30'
    return ''
  }, [])

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-black/50">Luxury Colour Library</p>
        <h1 className="mt-2 text-xl font-black uppercase tracking-[0.04em] text-black sm:text-3xl sm:tracking-[0.06em]">Full Product Catalogue</h1>
        <p className="mt-2 text-sm text-black/65">
          Keep the main product pages as they are, and use this quick-click catalogue to open what is available by category.
        </p>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/65">
          Loading catalogue images...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          Unable to load catalogue: {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && sections.length > 0 && (
        <>
          <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">Category Tiles</p>
              <label className="inline-flex items-center gap-2 text-xs text-black/70">
                <span>Quick Order</span>
                <button
                  onClick={() => setBulkMode((current) => !current)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition duration-300 ${bulkMode ? 'bg-fuchsia-600' : 'bg-black/20'}`}
                  aria-label="Toggle bulk mode"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${bulkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sections.map((section) => {
                const isActiveCategory = activeCategory === section.category
                const imageCount = section.subcategories.reduce((sum, sub) => sum + sub.items.length, 0)
                const sectionFallbackImage = section.subcategories.find((sub) => sub.items.length > 0)?.items?.[0]?.imageUrl || '/logo.png'
                const coverCandidates = buildCategoryHeroImageCandidates(section.category, sectionFallbackImage)
                const coverIndex = heroCandidateIndexByCategory[section.category] || 0
                const coverImage = coverCandidates[Math.min(coverIndex, coverCandidates.length - 1)] || '/logo.png'

                return (
                  <button
                    key={section.category}
                    onClick={() => {
                      setActiveCategory(section.category)
                      setActiveSubcategory('')
                      setActiveColorFamily('ALL')
                    }}
                    className={`group relative aspect-[4/3] overflow-hidden rounded-[12px] border bg-white text-left transition duration-300 hover:scale-[1.02] hover:border-fuchsia-500/70 hover:shadow-[0_0_0_2px_rgba(217,70,239,0.28)] ${isActiveCategory ? 'border-fuchsia-600 shadow-[0_0_0_1px_rgba(217,70,239,0.35)]' : 'border-black/10'}`}
                  >
                    <img
                      src={coverImage}
                      alt={section.category}
                      className="h-full w-full bg-white object-contain p-1"
                      loading="lazy"
                      onError={() => {
                        if (coverIndex >= coverCandidates.length - 1) return
                        setHeroCandidateIndexByCategory((current) => ({
                          ...current,
                          [section.category]: coverIndex + 1,
                        }))
                      }}
                    />
                    <div className="absolute inset-x-2 bottom-2 rounded-[12px] border border-white/40 bg-white/45 px-3 py-2 backdrop-blur-md">
                      <p className="text-sm font-semibold uppercase tracking-[0.04em] text-black">{section.category}</p>
                      <p className="text-[11px] text-black/70">{imageCount} items</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black uppercase tracking-[0.05em] text-black">{activeSection?.category || 'Catalogue'}</h2>
                <p className="mt-1 text-xs text-black/55">{filteredItems.length} matching items</p>
              </div>
              <div className="rounded-[12px] border border-black/10 bg-white px-3 py-2 text-xs text-black/70">
                Quick Basket: {quickCartUnits} units
              </div>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-fuchsia-600 transition-all duration-300"
                style={{ width: `${quickProgress}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {subcategoryOptions.map((subcategory) => {
                const isActive = activeSubcategory === subcategory
                return (
                  <button
                    key={`subcategory-${subcategory}`}
                    onClick={() => setActiveSubcategory(subcategory)}
                    className={`rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition duration-300 ${isActive ? 'border-fuchsia-600 bg-fuchsia-600 text-white' : 'border-black/20 bg-white text-black/75 hover:border-fuchsia-500'}`}
                  >
                    {subcategory}
                  </button>
                )
              })}
            </div>

            {!activeSubcategory && (
              <div className="mt-3 rounded-[12px] border border-black/10 bg-black/[0.02] px-3 py-2 text-xs text-black/60">
                Select a subcategory to view products.
              </div>
            )}

            {!!activeSubcategory && (
              <>
                <div className="mt-3">
                  <label className="sr-only" htmlFor="catalog-search">Search catalogue</label>
                  <input
                    id="catalog-search"
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search product name, code, or subcategory..."
                    className="w-full rounded-[12px] border border-black/20 bg-white px-3 py-2 text-sm text-black outline-none ring-fuchsia-500/20 focus:ring"
                  />
                </div>

                {isColorsCategory && (
                  <div className="mt-3 rounded-[12px] border border-black/10 bg-black/[0.02] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">Quick Filter</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {COLOR_FAMILY_FILTERS.map((family) => {
                        const isActive = activeColorFamily === family.key
                        return (
                          <button
                            key={family.key}
                            onClick={() => setActiveColorFamily(family.key)}
                            className={`inline-flex items-center gap-2 rounded-[12px] border px-2.5 py-1.5 text-xs transition duration-300 ${isActive ? 'border-fuchsia-600 bg-fuchsia-600 text-white' : 'border-black/20 bg-white text-black/70 hover:border-fuchsia-500'}`}
                          >
                            <span className={`h-3 w-3 rounded-full ${family.swatchClass}`} />
                            {family.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div
                  ref={virtualContainerRef}
                  onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                  className="mt-4 max-h-[62vh] overflow-auto rounded-[14px] border border-black/10 bg-white md:max-h-[72vh]"
                >
                  <div style={{ height: topSpacerHeight }} />

                  <div
                    className={`grid gap-3 p-2 sm:p-3 ${bulkMode ? 'grid-cols-1' : ''}`}
                    style={bulkMode ? undefined : { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                  >
                    {virtualItems.map(({ item, itemIndex }) => {
                      const itemKey = item.imageUrl
                      const qty = getQty(itemKey)
                      const hasChangedQty = qty > 1
                      const itemCode = extractProductCode(item.name)

                      if (bulkMode) {
                        return (
                          <div key={`${activeSection?.category}-${item.subcategory}-${item.imageUrl}`} className="flex items-center gap-2 rounded-[12px] border border-black/10 bg-white px-3 py-2 transition duration-300 hover:border-fuchsia-500/70 hover:shadow-[0_0_0_1px_rgba(217,70,239,0.26)]">
                            <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-[10px] border border-black/10 bg-white object-contain" loading="lazy" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold uppercase tracking-[0.02em] text-black">{item.name}</p>
                              <p className="truncate text-[11px] font-light text-black/55">{itemCode}</p>
                            </div>
                            <button onClick={() => updateQty(itemKey, qty - 1)} className={`h-7 w-7 rounded-[10px] border text-sm transition duration-300 ${hasChangedQty ? 'border-fuchsia-600 text-fuchsia-600' : 'border-black/25 text-black/70'}`}>−</button>
                            <input value={qty} onChange={(event) => updateQty(itemKey, event.target.value)} className={`h-7 w-10 rounded-[10px] border text-center text-xs ${hasChangedQty ? 'border-fuchsia-600 text-fuchsia-600' : 'border-black/20 text-black/70'}`} />
                            <button onClick={() => updateQty(itemKey, qty + 1)} className={`h-7 w-7 rounded-[10px] border text-sm transition duration-300 ${hasChangedQty ? 'border-fuchsia-600 text-fuchsia-600' : 'border-black/25 text-black/70'}`}>+</button>
                            <button onClick={() => addQuickItem(itemKey)} className={`rounded-[10px] px-3 py-1.5 text-[11px] font-semibold text-white transition duration-300 ${pulseItemKey === itemKey ? 'lux-pulse bg-fuchsia-600' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}>Add</button>
                          </div>
                        )
                      }

                      return (
                        <article key={`${activeSection?.category}-${item.subcategory}-${item.imageUrl}`} className={`overflow-hidden rounded-[14px] border border-black/10 bg-white transition duration-300 hover:scale-[1.05] hover:border-fuchsia-500/70 hover:shadow-[0_0_0_2px_rgba(217,70,239,0.24)] ${getTileVariant(itemIndex)}`}>
                          <div className="flex h-56 w-full items-center justify-center bg-white p-2 sm:h-60">
                            <img src={item.imageUrl} alt={item.name} loading="lazy" className="max-h-full w-full object-contain" />
                          </div>
                          <div className="border-t border-black/10 px-2.5 py-2">
                            <p className="truncate text-[11px] font-light uppercase tracking-[0.08em] text-black/45">{itemCode}</p>
                            <p className="truncate text-xs font-semibold uppercase tracking-[0.02em] text-black">{item.name}</p>
                            <div className="mt-2 flex items-center gap-1">
                              <span className="h-3.5 w-3.5 rounded-full border border-black/15 bg-fuchsia-500" aria-hidden="true" />
                              <p className="truncate text-[11px] font-light text-black/55">{item.subcategory}</p>
                            </div>
                            <div className="mt-2 flex items-center gap-1">
                              <button onClick={() => updateQty(itemKey, qty - 1)} className={`h-7 w-7 rounded-[10px] border text-sm transition duration-300 ${hasChangedQty ? 'border-fuchsia-600 text-fuchsia-600' : 'border-black/25 text-black/70'}`}>−</button>
                              <input value={qty} onChange={(event) => updateQty(itemKey, event.target.value)} className={`h-7 w-10 rounded-[10px] border text-center text-xs ${hasChangedQty ? 'border-fuchsia-600 text-fuchsia-600' : 'border-black/20 text-black/70'}`} />
                              <button onClick={() => updateQty(itemKey, qty + 1)} className={`h-7 w-7 rounded-[10px] border text-sm transition duration-300 ${hasChangedQty ? 'border-fuchsia-600 text-fuchsia-600' : 'border-black/25 text-black/70'}`}>+</button>
                              <button onClick={() => addQuickItem(itemKey)} className={`ml-auto rounded-[10px] px-3 py-1.5 text-[11px] font-semibold text-white transition duration-300 ${pulseItemKey === itemKey ? 'lux-pulse bg-fuchsia-600' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}>Add</button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <div style={{ height: bottomSpacerHeight }} />
                </div>

                <div className="mt-2 text-xs text-black/55">
                  Virtualized view active: showing {virtualItems.length} / {filteredItems.length} items.
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function InfoCard({ id, title, children, tone = 'white' }) {
  const toneClass = tone === 'muted' ? 'bg-slate-50' : 'bg-white'

  return (
    <div id={id} className={`rounded-2xl border border-slate-200 ${toneClass} p-5 sm:p-6`}>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </div>
  )
}

function pickHomepageMedia(items = []) {
  const images = items.filter((item) => item.mediaType === 'image')
  const videos = items.filter((item) => item.mediaType === 'video')

  const heroImage = images.find((item) => item.localPath.includes('com_web_1280x1280_18'))
    || images.find((item) => item.localPath.includes('1-1024x1024'))
    || images[0]

  const heroVideo = videos.find((item) => item.localPath.toLowerCase().includes('sarri'))
    || videos[0]

  const gallery = images
    .filter((item) => item.localPath !== heroImage?.localPath)
    .slice(0, 4)

  return {
    heroImage: heroImage?.localPath || '/logo.png',
    heroVideo: heroVideo?.localPath || null,
    gallery,
  }
}

function Nav() {
  return (
    <nav className="hidden gap-2 md:flex">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2 text-sm font-medium uppercase tracking-[0.04em] transition duration-300 ${
              isActive ? 'bg-fuchsia-600 text-white shadow-[0_0_0_1px_rgba(217,70,239,0.45)]' : 'text-white/85 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-black/90 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl gap-1" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-md px-2 py-2 text-center text-xs font-medium uppercase tracking-[0.03em] transition duration-300 ${
                isActive ? 'bg-fuchsia-600 text-white shadow-[0_0_0_1px_rgba(217,70,239,0.5)]' : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function ScrollToTopOnRouteChange() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  return null
}

function LegacyMirrorPage({ pagePath }) {
  const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`
  const targetUrl = `${LEGACY_SITE_ORIGIN}${normalizedPath}`

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Legacy Mirror Mode</p>
        <p className="mt-1 text-sm text-slate-600">
          Live embedded page from {targetUrl}. Disable `VITE_ENABLE_LEGACY_MIRROR` to switch back to migrated React layouts.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <iframe
          src={targetUrl}
          title={`Legacy mirror ${normalizedPath}`}
          className="h-[76vh] w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  )
}

function useSnapshotPages() {
  const [snapshotPages, setSnapshotPages] = useState([])
  const [mediaBySourceUrl, setMediaBySourceUrl] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadSnapshot = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [snapshotResponse, mediaResponse] = await Promise.all([
          fetch('/gelitup-content/pages.json'),
          fetch('/gelitup-media/manifest.json'),
        ])

        if (!snapshotResponse.ok) {
          throw new Error(`Content snapshot unavailable (${snapshotResponse.status})`)
        }

        const snapshotPayload = await snapshotResponse.json()
        const mediaPayload = mediaResponse.ok ? await mediaResponse.json() : { items: [] }

        if (!isMounted) return

        setSnapshotPages(Array.isArray(snapshotPayload?.pages) ? snapshotPayload.pages : [])

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

  return { snapshotPages, mediaBySourceUrl, isLoading, errorMessage }
}

function BaselinePagesIndex() {
  const { snapshotPages, isLoading, errorMessage } = useSnapshotPages()

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">Imported Page Baseline</h2>
        <p className="mt-2 text-sm text-slate-600">
          Page-by-page baseline imported from gelitup.com snapshot. Open any page below and start editing progressively.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-600">Loading snapshot pages...</p>}
      {!isLoading && errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}

      {!isLoading && !errorMessage && (
        <div className="grid gap-3 sm:grid-cols-2">
          {snapshotPages.map((page) => (
            <NavLink
              key={page.url}
              to={`/baseline/${page.slug}`}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <p className="text-sm font-semibold text-slate-900">{page.title || page.slug}</p>
              <p className="mt-1 text-xs text-slate-500">/{page.slug}</p>
              <p className="mt-2 text-xs text-slate-600">
                {page.paragraphs?.[0]?.slice(0, 140) || 'No paragraph snapshot available.'}
              </p>
              <p className="mt-3 text-xs font-semibold text-slate-800">
                Dedicated page route: /pages/{page.slug}
              </p>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  )
}

function BaselinePageView() {
  const { slug } = useParams()
  const { snapshotPages, mediaBySourceUrl, isLoading, errorMessage } = useSnapshotPages()

  const page = useMemo(
    () => snapshotPages.find((candidate) => candidate.slug === slug),
    [slug, snapshotPages],
  )

  const previewMedia = useMemo(() => {
    if (!page?.mediaRefs?.length) return []

    return page.mediaRefs.slice(0, 8).map((sourceUrl) => ({
      sourceUrl,
      displayUrl: mediaBySourceUrl[sourceUrl] || sourceUrl,
    }))
  }, [mediaBySourceUrl, page])

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
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Snapshot Page</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{page.title || page.slug}</h2>
        <p className="mt-2 text-xs text-slate-500">Source: {page.url}</p>
      </div>

      {page.headings?.h1?.length > 0 && (
        <InfoCard title="Primary Headings">
          <ul className="space-y-1">
            {page.headings.h1.map((heading) => <li key={heading}>• {heading}</li>)}
          </ul>
        </InfoCard>
      )}

      {page.headings?.h2?.length > 0 && (
        <InfoCard title="Section Headings">
          <ul className="space-y-1">
            {page.headings.h2.map((heading) => <li key={heading}>• {heading}</li>)}
          </ul>
        </InfoCard>
      )}

      {page.paragraphs?.length > 0 && (
        <InfoCard title="Content Blocks">
          <div className="space-y-3">
            {page.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-slate-700">{paragraph}</p>
            ))}
          </div>
        </InfoCard>
      )}

      {previewMedia.length > 0 && (
        <InfoCard title="Media Baseline">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {previewMedia.map((item) => {
              const isVideo = item.displayUrl.toLowerCase().includes('.mp4') || item.displayUrl.toLowerCase().includes('.webm')

              return isVideo
                ? (
                  <video key={item.sourceUrl} src={item.displayUrl} className="h-28 w-full rounded-lg object-cover" muted playsInline controls />
                )
                : (
                  <img key={item.sourceUrl} src={item.displayUrl} alt="Page baseline media" className="h-28 w-full rounded-lg object-cover" loading="lazy" />
                )
            })}
          </div>
        </InfoCard>
      )}

      <NavLink to="/baseline" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
        Back to Baseline List
      </NavLink>
      <NavLink to={`/pages/${slug}`} className="ml-2 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
        Open Dedicated Page Route
      </NavLink>
    </section>
  )
}

function HomePage() {
  const [media, setMedia] = useState(() => ({
    heroImage: '/logo.png',
    heroVideo: null,
    gallery: [],
  }))
  const [isManifestoOpen, setIsManifestoOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadMediaManifest = async () => {
      try {
        const response = await fetch('/gelitup-media/manifest.json')
        if (!response.ok) {
          return
        }

        const manifest = await response.json()
        if (!isMounted || !Array.isArray(manifest?.items)) {
          return
        }

        setMedia(pickHomepageMedia(manifest.items))
      }
      catch {
        if (!isMounted) return
      }
    }

    void loadMediaManifest()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isManifestoOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsManifestoOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isManifestoOpen])

  return (
    <section className="space-y-6">
      <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white sm:p-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">GEL.IT.UP by GIUP®</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">Official Distributor Information</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-200 md:text-base">
            Since 2011, GEL.IT.UP by GIUP® supports nail professionals with an extended product range, cruelty-free standards,
            and EU/GMP-aligned quality. This website is for distributor information and applications only.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <NavLink to="/become-distributor" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900">
              Apply as Distributor
            </NavLink>
            <a href={`mailto:${B2B_EMAIL}`} className="rounded-lg border border-slate-400 px-4 py-2 text-sm font-semibold text-white">Contact Distribution</a>
          </div>
        </div>

        <div className="space-y-3">
          <img src={media.heroImage} alt="GEL.IT.UP distributor visual" className="h-48 w-full rounded-xl object-cover sm:h-56" loading="lazy" />
          {media.heroVideo && (
            <video
              className="h-40 w-full rounded-xl object-cover sm:h-48"
              src={media.heroVideo}
              muted
              autoPlay
              loop
              playsInline
              controls={false}
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/20 bg-black px-4 py-3 text-white sm:px-5">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] sm:text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 text-[10px]">C</span>
            <span>CPNP</span>
            <button
              type="button"
              onClick={() => setIsManifestoOpen(true)}
              className="border-b border-transparent text-fuchsia-300 hover:border-fuchsia-500 hover:text-fuchsia-200"
            >
              Learn More
            </button>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5">
            <span className="text-base leading-none" aria-hidden="true">🇪🇺</span>
            <span>EU Regulation</span>
            <button
              type="button"
              onClick={() => setIsManifestoOpen(true)}
              className="border-b border-transparent text-fuchsia-300 hover:border-fuchsia-500 hover:text-fuchsia-200"
            >
              Learn More
            </button>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5">
            <span className="text-sm">🐇</span>
            <span>Leaping Bunny</span>
          </span>
        </div>
      </div>

      <InfoCard id="products" title="Product Families">
        <p>
          The GEL.IT.UP lineup includes Soak-off Gel Polish, Base and Top Coats, Builder System,
          Nail Polishes, Nail Art, Consumables, and Skin & Nail Care.
          We also maintain a broad color portfolio (800+ shades) for professional channels.
        </p>
        <NavLink to="/full-catalogue" className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
          Open Full Catalogue (Quick Click)
        </NavLink>
        {media.gallery.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {media.gallery.map((item) => (
              <img
                key={item.localPath}
                src={item.localPath}
                alt="GEL.IT.UP product preview"
                className="h-24 w-full rounded-lg object-cover sm:h-28"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </InfoCard>

      <InfoCard id="certifications" title="Certifications & Compliance">
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>• Leaping Bunny certified cruelty-free standards for in-house cosmetic and personal care products.</li>
          <li>• EU regulation alignment and GMP (Good Manufacturing Practices) commitment.</li>
          <li>• Professionals-only commercial policy to protect quality and industry standards.</li>
        </ul>
      </InfoCard>

      <InfoCard title="Distributor Packages">
        <p>
          Package terms are tailored by territory, business type, and expected volume.
          After application review, the distribution team shares starter options, regional support, and launch materials.
        </p>
      </InfoCard>

      <InfoCard id="contact" title="Contact Information">
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <p>Distribution Email: <a href={`mailto:${B2B_EMAIL}`} className="font-medium text-slate-800 underline">{B2B_EMAIL}</a></p>
          <p>General Email: <a href="mailto:info@leeukopf.com" className="font-medium text-slate-800 underline">info@leeukopf.com</a></p>
          <p>Phone: <a href="tel:+35973891041" className="font-medium text-slate-800 underline">(+359) 73 891 041</a></p>
          <p>Address: 8 Racho Dimchev, Sofia, Bulgaria</p>
        </div>
      </InfoCard>

      <InfoCard title="Client Registration" tone="muted">
        <p>
          Submit your distributor application form and our team will review it.
          Portal credentials are issued only after contract confirmation and approval.
        </p>
        <NavLink to="/become-distributor" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Open Registration Form
        </NavLink>
      </InfoCard>

      {isManifestoOpen && (
        <div
          className="manifesto-overlay fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-6"
          style={{ backdropFilter: 'blur(15px)' }}
          onClick={() => setIsManifestoOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Compliance Manifesto"
        >
          <div
            className="manifesto-panel relative w-full border border-fuchsia-500 bg-black px-5 pb-6 pt-12 text-white sm:max-w-3xl sm:rounded-2xl sm:px-8 sm:pb-8 sm:pt-14"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close manifesto modal"
              onClick={() => setIsManifestoOpen(false)}
              className="absolute right-4 top-4 text-xl font-bold leading-none text-fuchsia-400 hover:text-fuchsia-300"
            >
              ×
            </button>

            <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">Compliance Manifesto</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">BEYOND COLOR: THE STANDARDS OF A LEADER.</h2>

            <div className="mt-6 space-y-5 text-sm leading-relaxed text-white/90 sm:text-base">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-fuchsia-200">CPNP</h3>
                <p className="mt-2">Every formula in The Spectrum is CPNP Notified. This is your legal guarantee that Gelitup is fully authorized for sale and professional use across every EU member state.</p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-fuchsia-200">EU Regulation</h3>
                <p className="mt-2">We operate under the world’s strictest safety protocols. Our manufacturing is ISO-certified, ensuring zero hazardous contaminants and 100% batch consistency.</p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-fuchsia-200">Leaping Bunny</h3>
                <p className="mt-2">Ethics without compromise. We are 100% Leaping Bunny Approved—the global gold standard for cruelty-free cosmetics.</p>
              </section>
            </div>

            <p className="mt-7 border-t border-white/20 pt-5 text-sm font-semibold uppercase tracking-[0.08em] text-white sm:text-base">
              When you choose Gelitup, you aren’t just buying gel; you are buying the peace of mind that comes with total regulatory compliance.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function PortalAccessNotice() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8">
      <h2 className="text-2xl font-semibold text-slate-900">Portal Access by Approval Only</h2>
      <p className="mt-3 text-sm text-slate-600">
        The B2B ordering portal is not part of this public distributor website.
        Access is enabled only after distribution contract approval.
      </p>
      <p className="mt-3 text-sm text-slate-600">
        For new applications, use the distributor registration form.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <NavLink to="/become-distributor" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Distributor Registration
        </NavLink>
        <a href={`mailto:${B2B_EMAIL}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          Contact Distribution
        </a>
      </div>
    </section>
  )
}

function PortalLanding() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">B2B Portal</h2>
        <p className="mt-2 text-sm text-slate-600">
          Wholesale workspace inspired by your existing systems, rebuilt in English for distributors,
          salons, and professional buyers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Client Registration</h3>
          <p className="mt-2 text-sm text-slate-600">Onboard new distributors and manage trade account access.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Trade Dashboard</h3>
          <p className="mt-2 text-sm text-slate-600">Orders, order intake status, and support in one place.</p>
        </article>
      </div>
      <div className="flex flex-wrap gap-3">
        <NavLink to="/portal/login" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Portal Sign In
        </NavLink>
        <a
          href="https://www.gelitup.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Apply as Distributor
        </a>
      </div>
    </section>
  )
}

function PortalLogin({ onLogin, onResendConfirmation, onCheckApproval }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingApproval, setIsCheckingApproval] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [applicationStatus, setApplicationStatus] = useState('')

  return (
    <section className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
      <div className="bg-slate-900 p-8 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">GEL.IT.UP Trade</p>
        <h2 className="mt-3 text-3xl font-bold">Distributor Portal</h2>
        <p className="mt-4 text-sm text-slate-300">
          Sign in to access wholesale pricing, order history, order intake, and account support.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-slate-300">
          <li>• Real-time account overview</li>
          <li>• Fast reorder and order intake tracking</li>
          <li>• Dedicated distributor support</li>
        </ul>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-semibold text-slate-900">Sign In</h3>
        <form autoComplete="on" className="mt-5 space-y-4" onSubmit={async (event) => {
          event.preventDefault()
          setIsSubmitting(true)
          setErrorMessage('')
          setInfoMessage('')
          setApplicationStatus('')
          const result = await onLogin(email, password)
          setIsSubmitting(false)

          if (!result.ok) {
            setErrorMessage(result.message || 'Unable to sign in.')
            if (result.applicationStatus) {
              setApplicationStatus(result.applicationStatus)
            }
            return
          }

          if (result.applicationStatus) {
            setApplicationStatus(result.applicationStatus)
          }

          navigate('/portal/dashboard/overview')
        }}>
          <label className="block text-sm font-medium text-slate-700">
            Business Email
            <input
              id="portal-login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="you@company.com"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              id="portal-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting ? 'Signing in...' : 'Access Portal'}
          </button>
        </form>

        {!hasSupabaseConfig && (
          <p className="mt-3 text-xs text-amber-600">
            Demo auth mode active. Add Supabase env vars in `.env` to enable production authentication.
          </p>
        )}

        {errorMessage && <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>}
        {infoMessage && <p className="mt-2 text-xs text-emerald-700">{infoMessage}</p>}
        {applicationStatus && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Application status</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  applicationStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : applicationStatus === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {applicationStatus}
              </span>
              <span>
                {applicationStatus === 'approved'
                  ? 'Approved for portal access.'
                  : applicationStatus === 'rejected'
                    ? 'Rejected. Contact distribution support.'
                    : 'Pending review by B2B team.'}
              </span>
            </div>
            {applicationStatus === 'pending' && (
              <button
                type="button"
                disabled={isCheckingApproval || !email || !password}
                onClick={async () => {
                  setErrorMessage('')
                  setInfoMessage('')
                  setIsCheckingApproval(true)

                  const statusResult = await onCheckApproval(email)

                  if (!statusResult.ok) {
                    setErrorMessage(statusResult.message || 'Unable to check approval status.')
                    setIsCheckingApproval(false)
                    return
                  }

                  setApplicationStatus(statusResult.applicationStatus || 'pending')

                  if (statusResult.applicationStatus !== 'approved') {
                    setInfoMessage('Still pending. Please try again later.')
                    setIsCheckingApproval(false)
                    return
                  }

                  const loginResult = await onLogin(email, password)
                  setIsCheckingApproval(false)

                  if (!loginResult.ok) {
                    setErrorMessage(loginResult.message || 'Approval detected, but sign-in failed.')
                    return
                  }

                  navigate('/portal/dashboard/overview')
                }}
                className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                {isCheckingApproval ? 'Checking approval...' : 'Check approval now'}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs sm:p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <NavLink to="/portal/forgot-password" className="font-medium text-slate-700 hover:text-slate-900">
              Forgot password?
            </NavLink>
            <button
              type="button"
              onClick={async () => {
                setErrorMessage('')
                setInfoMessage('')
                const result = await onResendConfirmation(email)

                if (!result.ok) {
                  setErrorMessage(result.message || 'Unable to resend confirmation email.')
                  return
                }

                setInfoMessage('Confirmation email sent. Check your inbox and spam folder.')
              }}
              className="font-medium text-slate-700 underline hover:text-slate-900"
            >
              Resend confirmation email
            </button>
          </div>

          <p className="mt-3 leading-relaxed text-slate-600">
            For questions or issues with the portal, contact{' '}
            <a href={`mailto:${B2B_EMAIL}`} className="font-medium text-slate-700 hover:text-slate-900">
              {B2B_EMAIL}
            </a>
            .
          </p>

          <div className="mt-3 space-y-1 text-slate-600">
            <p>
              Need distributor access?{' '}
              <NavLink to="/become-distributor" className="font-semibold text-slate-900 hover:underline">
                Apply now
              </NavLink>
            </p>
            <p>
              Admin reviewer?{' '}
              <NavLink to="/portal/admin-login" className="font-semibold text-slate-900 hover:underline">
                Admin Login
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PortalAdminLogin({ onAdminLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  return (
    <section className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
      <div className="bg-slate-900 p-8 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">GEL.IT.UP Trade</p>
        <h2 className="mt-3 text-3xl font-bold">Admin Login</h2>
        <p className="mt-4 text-sm text-slate-300">
          Reviewer access for approving pending B2B applications.
        </p>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-semibold text-slate-900">Sign In as Admin</h3>
        <form autoComplete="on" className="mt-5 space-y-4" onSubmit={async (event) => {
          event.preventDefault()
          setIsSubmitting(true)
          setErrorMessage('')

          const result = await onAdminLogin(email, password)
          setIsSubmitting(false)

          if (!result.ok) {
            setErrorMessage(result.message || 'Unable to sign in as admin.')
            return
          }

          navigate('/portal/dashboard/applications')
        }}>
          <label className="block text-sm font-medium text-slate-700">
            Admin Email
            <input
              id="portal-admin-login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="admin@company.com"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              id="portal-admin-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting ? 'Signing in...' : 'Access Applications'}
          </button>
        </form>

        {errorMessage && <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>}

        <div className="mt-4 text-xs text-slate-600">
          Not an admin?{' '}
          <NavLink to="/portal/login" className="font-semibold text-slate-900 hover:underline">
            Back to Portal Login
          </NavLink>
        </div>
      </div>
    </section>
  )
}

function PortalRegister({ onRegister }) {
  const [application, setApplication] = useState({
    customerType: 'company',
    companyName: '',
    vatNumber: '',
    contactName: '',
    contactEmail: '',
    phone: '',
    website: '',
    shippingType: 'road',
    invoiceAddressLine1: '',
    invoiceAddressLine2: '',
    invoiceArea: '',
    invoiceRegion: '',
    invoiceCountry: '',
    invoicePostalCode: '',
    shippingSameAsInvoice: true,
    shippingName: '',
    shippingPhone: '',
    shippingAddressLine1: '',
    shippingAddressLine2: '',
    shippingArea: '',
    shippingRegion: '',
    shippingCountry: '',
    shippingPostalCode: '',
    businessType: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const setField = (fieldName, value) => {
    setApplication((current) => ({
      ...current,
      [fieldName]: value,
    }))
  }

  return (
    <section className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
      <div className="bg-slate-900 p-8 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">GEL.IT.UP Trade</p>
        <h2 className="mt-3 text-3xl font-bold">Distributor Registration</h2>
        <p className="mt-4 text-sm text-slate-300">
          Submit your company details. Applications are uploaded automatically and reviewed by the B2B team.
        </p>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-semibold text-slate-900">B2B Client Application</h3>
        <form className="mt-5 space-y-4" onSubmit={async (event) => {
          event.preventDefault()
          setIsSubmitting(true)
          setErrorMessage('')
          setSuccessMessage('')

          const result = await onRegister(application)
          setIsSubmitting(false)

          if (!result.ok) {
            setErrorMessage(result.message || 'Unable to submit application.')
            return
          }

          setSuccessMessage(result.message || 'Application submitted and marked as pending approval. You will be notified by email after review.')
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Client Type
              <select
                required
                value={application.customerType}
                onChange={(event) => setField('customerType', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              >
                <option value="company">Company</option>
                <option value="client">Client</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              {application.customerType === 'company' ? 'Company Name' : 'Client Name'}
              <input
                type="text"
                required
                value={application.companyName}
                onChange={(event) => setField('companyName', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder={application.customerType === 'company' ? 'Company Ltd' : 'Client Name'}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              VAT Number
              <input
                type="text"
                required
                value={application.vatNumber}
                onChange={(event) => setField('vatNumber', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="EU123456789"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Contact Name
              <input
                type="text"
                required
                value={application.contactName}
                onChange={(event) => setField('contactName', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Jane Smith"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Contact Email
              <input
                type="email"
                required
                value={application.contactEmail}
                onChange={(event) => setField('contactEmail', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="buyer@company.com"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone
              <input
                type="text"
                required
                value={application.phone}
                onChange={(event) => setField('phone', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="+30 210 0000000"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Website
              <input
                type="url"
                value={application.website}
                onChange={(event) => setField('website', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="https://company.com"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Shipping Type
              <select
                required
                value={application.shippingType}
                onChange={(event) => setField('shippingType', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              >
                <option value="road">Road</option>
                <option value="air">Air</option>
                <option value="self_arranged">Self-arranged</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Invoice Address Line 1
              <input
                type="text"
                required
                value={application.invoiceAddressLine1}
                onChange={(event) => setField('invoiceAddressLine1', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Street, number"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Invoice Address Line 2 (optional)
              <input
                type="text"
                value={application.invoiceAddressLine2}
                onChange={(event) => setField('invoiceAddressLine2', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Suite, floor"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Invoice Area / City
              <input
                type="text"
                required
                value={application.invoiceArea}
                onChange={(event) => setField('invoiceArea', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Athens"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Invoice Region / State
              <input
                type="text"
                required
                value={application.invoiceRegion}
                onChange={(event) => setField('invoiceRegion', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Attica"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Invoice Postal Code
              <input
                type="text"
                required
                value={application.invoicePostalCode}
                onChange={(event) => setField('invoicePostalCode', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="10431"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Invoice Country
              <select
                required
                value={application.invoiceCountry}
                onChange={(event) => setField('invoiceCountry', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={application.shippingSameAsInvoice}
                  onChange={(event) => setField('shippingSameAsInvoice', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                />
                Shipping details same as invoice
              </span>
            </label>

            {!application.shippingSameAsInvoice && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Shipping Contact Name
                  <input
                    type="text"
                    required={!application.shippingSameAsInvoice}
                    value={application.shippingName}
                    onChange={(event) => setField('shippingName', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="Warehouse receiver"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shipping Phone
                  <input
                    type="text"
                    required={!application.shippingSameAsInvoice}
                    value={application.shippingPhone}
                    onChange={(event) => setField('shippingPhone', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="+30 210 0000000"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                  Shipping Address Line 1
                  <input
                    type="text"
                    required={!application.shippingSameAsInvoice}
                    value={application.shippingAddressLine1}
                    onChange={(event) => setField('shippingAddressLine1', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="Street, number"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                  Shipping Address Line 2 (optional)
                  <input
                    type="text"
                    value={application.shippingAddressLine2}
                    onChange={(event) => setField('shippingAddressLine2', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="Suite, floor"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shipping Area / City
                  <input
                    type="text"
                    required={!application.shippingSameAsInvoice}
                    value={application.shippingArea}
                    onChange={(event) => setField('shippingArea', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="Athens"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shipping Region / State
                  <input
                    type="text"
                    required={!application.shippingSameAsInvoice}
                    value={application.shippingRegion}
                    onChange={(event) => setField('shippingRegion', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="Attica"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shipping Postal Code
                  <input
                    type="text"
                    required={!application.shippingSameAsInvoice}
                    value={application.shippingPostalCode}
                    onChange={(event) => setField('shippingPostalCode', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="10431"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shipping Country
                  <select
                    required={!application.shippingSameAsInvoice}
                    value={application.shippingCountry}
                    onChange={(event) => setField('shippingCountry', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                  >
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Business Type
              <select
                required
                value={application.businessType}
                onChange={(event) => setField('businessType', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              >
                <option value="">Select type</option>
                <option value="Distributor">Distributor</option>
                <option value="Salon">Salon</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Academy">Academy</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Notes
              <textarea
                rows={3}
                value={application.notes}
                onChange={(event) => setField('notes', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="Tell us about your expected monthly volume, brands, or regions."
              />
            </label>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        {errorMessage && <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>}
        {successMessage && <p className="mt-2 text-xs text-emerald-700">{successMessage}</p>}

        <div className="mt-4 text-xs text-slate-600">
          Already approved?{' '}
          <NavLink to="/portal/login" className="font-semibold text-slate-900 hover:underline">
            Sign in
          </NavLink>
        </div>
      </div>
    </section>
  )
}

function PortalForgotPassword() {
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8">
      <h2 className="text-2xl font-semibold text-slate-900">Reset Password</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enter your business email and we’ll send a password reset link. Manual support:
        {' '}
        <a href={`mailto:${B2B_EMAIL}`} className="font-medium text-slate-800 underline">
          {B2B_EMAIL}
        </a>
      </p>
      <form className="mt-5 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <label className="block text-sm font-medium text-slate-700">
          Business Email
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
            placeholder="you@company.com"
          />
        </label>
        <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Send Reset Link
        </button>
      </form>
      <p className="mt-3 text-xs text-slate-600">
        Need distributor access?{' '}
        <NavLink to="/become-distributor" className="font-semibold text-slate-900 hover:underline">
          Apply now
        </NavLink>
      </p>
      <NavLink to="/portal/login" className="mt-4 inline-block text-sm font-medium text-slate-600 hover:text-slate-900">
        Back to Sign In
      </NavLink>
    </section>
  )
}

function ProductsModule({ moduleView = 'products' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const fallbackProducts = useMemo(() => createFallbackProducts(), [])
  const [products, setProducts] = useState(fallbackProducts)
  const [isLoadingFeed, setIsLoadingFeed] = useState(false)
  const [feedMessage, setFeedMessage] = useState('Using built-in product sample data.')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [orderInboxEmailStatus, setOrderInboxEmailStatus] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedCodes, setSelectedCodes] = useState([])
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [packageTier, setPackageTier] = useState('Silver')
  const [draftInvoice, setDraftInvoice] = useState('')
  const [dismissedTechnicalUpsell, setDismissedTechnicalUpsell] = useState(false)
  const [includeProfessionalBasePack, setIncludeProfessionalBasePack] = useState(false)
  const [showAddOnRemovedToast, setShowAddOnRemovedToast] = useState(false)
  const [showOrderConfetti, setShowOrderConfetti] = useState(false)
  const [generatedPackageTier, setGeneratedPackageTier] = useState('')
  const [lastPackingList, setLastPackingList] = useState(null)
  const [lastProformaInvoice, setLastProformaInvoice] = useState(null)
  const [b2bUserRole, setB2bUserRole] = useState('salon')
  const [liveUpsellRecommendation, setLiveUpsellRecommendation] = useState(null)
  const [dismissedSmartSuggestion, setDismissedSmartSuggestion] = useState(false)
  const [showClientValidation, setShowClientValidation] = useState(false)
  const [packagePreviewVisibleCount, setPackagePreviewVisibleCount] = useState(15)
  const [clientProfile, setClientProfile] = useState(() => {
    try {
      const savedRaw = localStorage.getItem(CLIENT_PROFILE_STORAGE_KEY)
      if (!savedRaw) return { ...defaultClientProfile }
      const parsed = JSON.parse(savedRaw)
      if (!parsed || typeof parsed !== 'object') return { ...defaultClientProfile }
      return { ...defaultClientProfile, ...parsed }
    }
    catch {
      return { ...defaultClientProfile }
    }
  })
  const [packageCartItems, setPackageCartItems] = useState([])
  const [podCatalog, setPodCatalog] = useState({ pod_1: [], pod_2: [], pod_3: [], pod_4: [] })
  const [localImageMap, setLocalImageMap] = useState(() => new Map())
  const [shippingMetadata, setShippingMetadata] = useState(SHIPPING_RULES)
  const [shippingMetadataStatus, setShippingMetadataStatus] = useState('Using embedded shipping metadata rules.')
  const productsTable = import.meta.env.VITE_B2B_PRODUCTS_TABLE || DEFAULT_PRODUCTS_TABLE
  const ordersTable = import.meta.env.VITE_B2B_ORDERS_TABLE || DEFAULT_ORDERS_TABLE

  useEffect(() => {
    localStorage.setItem(CLIENT_PROFILE_STORAGE_KEY, JSON.stringify(clientProfile))
  }, [clientProfile])

  useEffect(() => {
    let isMounted = true

    const hydrateClientProfile = async () => {
      if (!hasSupabaseConfig || !supabase) return

      const { data } = await supabase.auth.getUser()
      const userMeta = data?.user?.user_metadata || {}
      const resolvedRole = userMeta.role || userMeta.account_type || userMeta.customer_type || 'salon'
      setB2bUserRole(String(resolvedRole || 'salon'))

      const metaProfile = {
        customerType: userMeta.customer_type || userMeta.account_type || '',
        customerName: userMeta.company_name || userMeta.full_name || '',
        vatNumber: userMeta.vat_number || userMeta.vies_vat || '',
        shippingType: userMeta.shipping_type || '',
        contactPhone: userMeta.contact_phone || userMeta.phone || '',
        contactEmail: userMeta.contact_email || data?.user?.email || '',
        invoiceAddressLine1: userMeta.invoice_address_line1 || '',
        invoiceAddressLine2: userMeta.invoice_address_line2 || '',
        invoiceArea: userMeta.invoice_area || '',
        invoiceRegion: userMeta.invoice_region || userMeta.region || '',
        invoiceCountry: userMeta.invoice_country || userMeta.country || '',
        invoicePostalCode: userMeta.invoice_postal_code || '',
        shippingSameAsInvoice: userMeta.shipping_same_as_invoice !== false,
        shippingName: userMeta.shipping_name || '',
        shippingPhone: userMeta.shipping_phone || '',
        shippingAddressLine1: userMeta.shipping_address_line1 || '',
        shippingAddressLine2: userMeta.shipping_address_line2 || '',
        shippingArea: userMeta.shipping_area || '',
        shippingRegion: userMeta.shipping_region || '',
        shippingCountry: userMeta.shipping_country || '',
        shippingPostalCode: userMeta.shipping_postal_code || '',
      }

      if (!isMounted) return

      setClientProfile((current) => {
        const merged = { ...current }
        Object.entries(metaProfile).forEach(([key, value]) => {
          const currentValue = current[key]
          const currentEmpty = typeof currentValue === 'string'
            ? !currentValue.trim()
            : currentValue == null

          if (currentEmpty && typeof value === 'string' && value.trim()) {
            merged[key] = value
          }

          if (key === 'shippingSameAsInvoice' && typeof currentValue !== 'boolean') {
            merged[key] = Boolean(value)
          }
        })

        return merged
      })
    }

    hydrateClientProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const setClientField = useCallback((key, value) => {
    setClientProfile((current) => ({ ...current, [key]: value }))
  }, [])

  const invoiceAddressComposed = useMemo(() => composeAddress({
    line1: clientProfile.invoiceAddressLine1,
    line2: clientProfile.invoiceAddressLine2,
    area: clientProfile.invoiceArea,
    region: clientProfile.invoiceRegion,
    country: clientProfile.invoiceCountry,
    postalCode: clientProfile.invoicePostalCode,
  }), [
    clientProfile.invoiceAddressLine1,
    clientProfile.invoiceAddressLine2,
    clientProfile.invoiceArea,
    clientProfile.invoiceRegion,
    clientProfile.invoiceCountry,
    clientProfile.invoicePostalCode,
  ])

  const shippingAddressComposed = useMemo(() => {
    if (clientProfile.shippingSameAsInvoice) return invoiceAddressComposed

    return composeAddress({
      line1: clientProfile.shippingAddressLine1,
      line2: clientProfile.shippingAddressLine2,
      area: clientProfile.shippingArea,
      region: clientProfile.shippingRegion,
      country: clientProfile.shippingCountry,
      postalCode: clientProfile.shippingPostalCode,
    })
  }, [
    clientProfile.shippingSameAsInvoice,
    clientProfile.shippingAddressLine1,
    clientProfile.shippingAddressLine2,
    clientProfile.shippingArea,
    clientProfile.shippingRegion,
    clientProfile.shippingCountry,
    clientProfile.shippingPostalCode,
    invoiceAddressComposed,
  ])

  const shippingConsigneeName = clientProfile.shippingSameAsInvoice
    ? clientProfile.customerName
    : clientProfile.shippingName

  const shippingConsigneePhone = clientProfile.shippingSameAsInvoice
    ? clientProfile.contactPhone
    : clientProfile.shippingPhone

  const clientValidation = useMemo(() => {
    const missing = {
      customerType: !String(clientProfile.customerType || '').trim(),
      shippingType: !String(clientProfile.shippingType || '').trim(),
      customerName: !String(clientProfile.customerName || '').trim(),
      vatNumber: !String(clientProfile.vatNumber || '').trim(),
      contactPhone: !String(clientProfile.contactPhone || '').trim(),
      contactEmail: !String(clientProfile.contactEmail || '').trim(),
      invoiceAddressLine1: !String(clientProfile.invoiceAddressLine1 || '').trim(),
      invoiceArea: !String(clientProfile.invoiceArea || '').trim(),
      invoiceRegion: !String(clientProfile.invoiceRegion || '').trim(),
      invoiceCountry: !String(clientProfile.invoiceCountry || '').trim(),
      invoicePostalCode: !String(clientProfile.invoicePostalCode || '').trim(),
      shippingName: !clientProfile.shippingSameAsInvoice && !String(clientProfile.shippingName || '').trim(),
      shippingPhone: !clientProfile.shippingSameAsInvoice && !String(clientProfile.shippingPhone || '').trim(),
      shippingAddressLine1: !clientProfile.shippingSameAsInvoice && !String(clientProfile.shippingAddressLine1 || '').trim(),
      shippingArea: !clientProfile.shippingSameAsInvoice && !String(clientProfile.shippingArea || '').trim(),
      shippingRegion: !clientProfile.shippingSameAsInvoice && !String(clientProfile.shippingRegion || '').trim(),
      shippingCountry: !clientProfile.shippingSameAsInvoice && !String(clientProfile.shippingCountry || '').trim(),
      shippingPostalCode: !clientProfile.shippingSameAsInvoice && !String(clientProfile.shippingPostalCode || '').trim(),
    }

    const labelByField = {
      customerType: 'customer type',
      shippingType: 'shipping type',
      customerName: 'company/client name',
      vatNumber: 'VAT number',
      contactPhone: 'contact number (with country code)',
      contactEmail: 'contact email',
      invoiceAddressLine1: 'invoice address line 1',
      invoiceArea: 'invoice area/city',
      invoiceRegion: 'invoice region/state',
      invoiceCountry: 'invoice country',
      invoicePostalCode: 'invoice postal code',
      shippingName: 'shipping contact name',
      shippingPhone: 'shipping contact number',
      shippingAddressLine1: 'shipping address line 1',
      shippingArea: 'shipping area/city',
      shippingRegion: 'shipping region/state',
      shippingCountry: 'shipping country',
      shippingPostalCode: 'shipping postal code',
    }

    const missingLabels = Object.entries(missing)
      .filter(([, isMissing]) => isMissing)
      .map(([field]) => labelByField[field])

    if (!invoiceAddressComposed.trim()) missingLabels.push('invoice address')
    if (!shippingAddressComposed.trim()) missingLabels.push('shipping address')

    return {
      missing,
      missingLabels,
      hasMissing: missingLabels.length > 0,
    }
  }, [
    clientProfile.contactEmail,
    clientProfile.contactPhone,
    clientProfile.customerName,
    clientProfile.customerType,
    clientProfile.invoiceAddressLine1,
    clientProfile.invoiceArea,
    clientProfile.invoiceCountry,
    clientProfile.invoicePostalCode,
    clientProfile.invoiceRegion,
    clientProfile.shippingAddressLine1,
    clientProfile.shippingArea,
    clientProfile.shippingCountry,
    clientProfile.shippingName,
    clientProfile.shippingPhone,
    clientProfile.shippingPostalCode,
    clientProfile.shippingRegion,
    clientProfile.shippingSameAsInvoice,
    clientProfile.shippingType,
    clientProfile.vatNumber,
    invoiceAddressComposed,
    shippingAddressComposed,
  ])

  const hasClientFieldError = useCallback(
    (field) => showClientValidation && Boolean(clientValidation.missing[field]),
    [clientValidation.missing, showClientValidation],
  )

  const getClientInputClass = useCallback(
    (field) => `mt-1 w-full rounded-lg border px-3 py-2 text-xs text-slate-700 ${hasClientFieldError(field) ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'}`,
    [hasClientFieldError],
  )

  const selectionProfile = useMemo(() => {
    const fromManual = selectedCodes.reduce(
      (summary, code) => {
        if (isTechnicalSku(code)) {
          summary.technicalCount += 1
          return summary
        }

        if (isLikelyColorSku(code)) {
          summary.colorCount += 1
        }

        return summary
      },
      { colorCount: 0, technicalCount: 0 },
    )

    const fromPackage = packageCartItems.reduce(
      (summary, item) => {
        const category = normalizeSkuCode(item.category)

        if (category === 'TECHNICAL' || category === 'ART' || isTechnicalSku(item.sku)) {
          summary.technicalCount += 1
          return summary
        }

        summary.colorCount += 1
        return summary
      },
      { colorCount: 0, technicalCount: 0 },
    )

    return {
      colorCount: fromManual.colorCount + fromPackage.colorCount,
      technicalCount: fromManual.technicalCount + fromPackage.technicalCount,
    }
  }, [packageCartItems, selectedCodes])

  const shouldShowTechnicalUpsellToast = selectionProfile.colorCount > 20
    && selectionProfile.technicalCount === 0
    && !includeProfessionalBasePack
  const packageUnits = packageCartItems.reduce((sum, item) => sum + item.qty, 0)
  const totalUnits = selectedCodes.length + packageUnits + (includeProfessionalBasePack ? PROFESSIONAL_BASE_PACK.qty : 0)
  const { activeTier, recommendedProduct } = useB2BIntelligence({
    cartTotalItems: totalUnits,
    userRole: b2bUserRole,
  })
  const selectedLineItems = selectedCodes.length + packageCartItems.length + (includeProfessionalBasePack ? 1 : 0)
  const expectedColorCountByTier = generatedPackageTier === 'Silver'
    ? podCatalog.pod_1.length
    : generatedPackageTier === 'Gold'
      ? podCatalog.pod_1.length + podCatalog.pod_2.length
      : generatedPackageTier === 'Platinum'
        ? podCatalog.pod_1.length + podCatalog.pod_2.length + podCatalog.pod_3.length + podCatalog.pod_4.length
        : 0
  const expectedTechCount = generatedPackageTier ? PACKAGE_TECH_ESSENTIALS.length : 0
  const expectedPackageItems = expectedColorCountByTier + expectedTechCount
  const expectedPackageUnits = expectedPackageItems * DEFAULT_PACKAGE_ITEM_QTY
  const packageIntegrityPass = packageCartItems.length === expectedPackageItems && packageUnits === expectedPackageUnits
  const catalogBySku = useMemo(() => {
    const map = new Map()

    products.forEach((product) => {
      const normalizedCode = normalizeSkuCode(product.code)
      const normalizedSku = normalizeSkuCode(product.sku)

      if (normalizedCode) map.set(normalizedCode, product)
      if (normalizedSku) map.set(normalizedSku, product)
    })

    return map
  }, [products])
  const catalogByName = useMemo(() => {
    const map = new Map()

    products.forEach((product) => {
      const normalizedName = normalizeProductName(product.name)
      const normalizedCode = normalizeProductName(product.code)
      const normalizedSku = normalizeProductName(product.sku)

      if (normalizedName && !map.has(normalizedName)) map.set(normalizedName, product)
      if (normalizedCode && !map.has(normalizedCode)) map.set(normalizedCode, product)
      if (normalizedSku && !map.has(normalizedSku)) map.set(normalizedSku, product)
    })

    return map
  }, [products])
  const catalogNameEntries = useMemo(
    () => Array.from(catalogByName.entries()),
    [catalogByName],
  )
  const resolveCatalogImageUrl = useCallback((item) => {
    const localMapKeys = [
      normalizeSkuCode(item?.sku),
      normalizeSkuCode(item?.code),
      normalizeProductName(item?.name),
      normalizeProductName(item?.code),
      normalizeProductName(item?.sku),
    ].filter(Boolean)

    for (const key of localMapKeys) {
      const mappedUrl = localImageMap.get(key)
      if (mappedUrl) return mappedUrl
    }

    const bySkuOrCode = catalogBySku.get(normalizeSkuCode(item?.sku))?.imageUrl
      || catalogBySku.get(normalizeSkuCode(item?.code))?.imageUrl

    if (bySkuOrCode) return bySkuOrCode

    const normalizedItemName = normalizeProductName(item?.name)
    const normalizedItemCode = normalizeProductName(item?.code)
    const normalizedItemSku = normalizeProductName(item?.sku)
    const candidates = [normalizedItemName, normalizedItemCode, normalizedItemSku].filter(Boolean)

    for (const candidate of candidates) {
      const exact = catalogByName.get(candidate)?.imageUrl
      if (exact) return exact
    }

    for (const candidate of candidates) {
      const fuzzy = catalogNameEntries.find(([key, product]) =>
        Boolean(product?.imageUrl) && (key.includes(candidate) || candidate.includes(key)),
      )
      if (fuzzy?.[1]?.imageUrl) return fuzzy[1].imageUrl
    }

    return item?.imageUrl || null
  }, [catalogByName, catalogBySku, catalogNameEntries, localImageMap])
  const packagePreviewItems = useMemo(
    () => packageCartItems,
    [packageCartItems],
  )
  const visiblePackagePreviewItems = useMemo(
    () => packagePreviewItems.slice(0, packagePreviewVisibleCount),
    [packagePreviewItems, packagePreviewVisibleCount],
  )

  useEffect(() => {
    if (!shouldShowTechnicalUpsellToast) {
      setDismissedTechnicalUpsell(false)
    }
  }, [shouldShowTechnicalUpsellToast])

  useEffect(() => {
    let mounted = true

    const loadPodCatalog = async () => {
      try {
        const response = await fetch('/gelitup-content/package-pods.json')
        if (!response.ok) return

        const payload = await response.json()
        if (!mounted) return

        setPodCatalog({
          pod_1: Array.isArray(payload?.pod_1) ? payload.pod_1 : [],
          pod_2: Array.isArray(payload?.pod_2) ? payload.pod_2 : [],
          pod_3: Array.isArray(payload?.pod_3) ? payload.pod_3 : [],
          pod_4: Array.isArray(payload?.pod_4) ? payload.pod_4 : [],
        })
      }
      catch {
        if (!mounted) return
      }
    }

    void loadPodCatalog()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadProductImageMap = async () => {
      try {
        const response = await fetch('/gelitup-content/product-image-map.json')
        if (!response.ok) {
          if (mounted) setLocalImageMap(new Map())
          return
        }

        const payload = await response.json()
        if (!mounted) return

        setLocalImageMap(normalizeImageMap(payload))
      }
      catch {
        if (!mounted) return
        setLocalImageMap(new Map())
      }
    }

    void loadProductImageMap()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadShippingMetadata = async () => {
      try {
        const response = await fetch('/gelitup-content/shipping-metadata.json')
        if (!response.ok) {
          if (mounted) setShippingMetadataStatus('Shipping metadata feed unavailable. Using embedded shipping rules.')
          return
        }

        const payload = await response.json()
        if (!mounted) return

        const normalized = normalizeShippingMetadata(payload)
        setShippingMetadata(normalized)
        setShippingMetadataStatus(`Shipping metadata loaded: ${Object.keys(normalized.bySku).length} SKU rules, ${Object.keys(normalized.byPrefix).length} prefix rules.`)
      }
      catch {
        if (!mounted) return
        setShippingMetadataStatus('Shipping metadata load failed. Using embedded shipping rules.')
      }
    }

    void loadShippingMetadata()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!showAddOnRemovedToast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShowAddOnRemovedToast(false)
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [showAddOnRemovedToast])

  useEffect(() => {
    if (!showOrderConfetti) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShowOrderConfetti(false)
    }, 2600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [showOrderConfetti])

  useEffect(() => {
    setPackagePreviewVisibleCount(15)
  }, [generatedPackageTier])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const action = params.get('quickRestock')

    if (action !== 'pod_1' || !podCatalog.pod_1.length) {
      return
    }

    const restockItems = podCatalog.pod_1.map((item) => ({
      sku: item.sku,
      code: item.code,
      name: item.name,
      category: item.category,
      group: item.group,
      qty: DEFAULT_PACKAGE_ITEM_QTY,
      imageUrl: resolveCatalogImageUrl(item),
    }))

    setPackageCartItems(restockItems)
    setCheckoutError('')
    setCheckoutMessage(`Quick Restock applied: ${restockItems.length} Pod_1 colors x ${DEFAULT_PACKAGE_ITEM_QTY}.`)

    params.delete('quickRestock')
    const nextSearch = params.toString()
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true })
  }, [location.pathname, location.search, navigate, podCatalog.pod_1, resolveCatalogImageUrl])

  useEffect(() => {
    const feedUrl = import.meta.env.VITE_PRODUCTS_URL || import.meta.env.VITE_SOLID_COLOURS_URL

    let isMounted = true

    const loadFeed = async () => {
      setIsLoadingFeed(true)

      try {
        const sourceItems = feedUrl
          ? await (async () => {
            const response = await fetch(feedUrl)
            if (!response.ok) {
              throw new Error(`Feed request failed with ${response.status}`)
            }
            const payload = await response.json()
            return Array.isArray(payload)
              ? payload
              : payload.items || payload.products || payload.data || []
          })()
          : await (async () => {
            if (!hasSupabaseConfig || !supabase) {
              return []
            }

            const { data, error } = await supabase
              .from(productsTable)
              .select('sku, name, description, category, hex_color, image_url, is_active')
              .eq('is_active', true)
              .order('name', { ascending: true })

            if (error) {
              throw new Error(error.message)
            }

            return data || []
          })()

        const normalized = sourceItems
          .map((item, index) => {
            const code = item.code || item.sku || item.id || `GIUP-PD-${String(index + 1).padStart(4, '0')}`
            const sku = item.sku || code
            const categoryName = item.category || item.family || item.group || item.type || PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length]
            const preview = item.preview || item.hex || item.hex_color || item.color || `hsl(${(index * 17) % 360} 82% 56%)`
            const name = item.name || item.title || code
            const description = item.description || item.short_description || ''
            const mapImageUrl = localImageMap.get(normalizeSkuCode(sku))
              || localImageMap.get(normalizeSkuCode(code))
              || localImageMap.get(normalizeProductName(name))
              || null
            const imageUrl = mapImageUrl || item.image_url || item.imageUrl || item?.images?.[0]?.src || null

            return {
              code,
              sku,
              name,
              description,
              category: categoryName,
              preview,
              imageUrl,
            }
          })
          .filter((item) => Boolean(item.code))

        if (!normalized.length) {
          throw new Error('Feed has no valid products')
        }

        if (isMounted) {
          setProducts(normalized)
          setFeedMessage(`Loaded ${normalized.length} live products from ${feedUrl ? 'feed' : 'Supabase catalog'}.`)
        }
      }
      catch {
        if (isMounted) {
          setProducts(fallbackProducts)
          setFeedMessage('Live feed unavailable. Showing fallback product sample data.')
        }
      }
      finally {
        if (isMounted) {
          setIsLoadingFeed(false)
        }
      }
    }

    loadFeed()

    return () => {
      isMounted = false
    }
  }, [fallbackProducts, localImageMap, productsTable])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.code.toLowerCase().includes(query.toLowerCase())
        || (product.name || '').toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category === 'All' || product.category === category
      const matchesSelected = !showSelectedOnly || selectedCodes.includes(product.code)

      return matchesSearch && matchesCategory && matchesSelected
    })
  }, [category, products, query, selectedCodes, showSelectedOnly])

  const toggleSelection = (code) => {
    setSelectedCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  const copyCodes = async () => {
    if (!selectedCodes.length) return
    await navigator.clipboard.writeText(selectedCodes.join(', '))
  }

  const createPackageDraft = async () => {
    const generatedColorItems = buildTierPackageItems(packageTier, podCatalog, DEFAULT_PACKAGE_ITEM_QTY)
    const generatedTechItems = buildTierTechnicalItems(DEFAULT_PACKAGE_ITEM_QTY)
    const generatedItems = [...generatedColorItems, ...generatedTechItems]
    const generatedItemsWithImages = generatedItems.map((item) => ({
      ...item,
      imageUrl: resolveCatalogImageUrl(item),
    }))

    if (!generatedColorItems.length) {
      setCheckoutError('Package generation failed: pod catalog is empty or unavailable.')
      setCheckoutMessage('')
      return
    }

    setPackageCartItems(generatedItemsWithImages)
    setGeneratedPackageTier(packageTier)
    setCheckoutError('')

    let buyerEmail = 'b2b-client@company.com'

    if (hasSupabaseConfig && supabase) {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        buyerEmail = data.user.email
      }
    }

    const invoice = buildPackageDraftInvoice(
      packageTier,
      buyerEmail,
      generatedItemsWithImages,
      includeProfessionalBasePack ? [PROFESSIONAL_BASE_PACK] : [],
    )

    const tierMessage = packageTier === 'Platinum'
      ? `Platinum package generated with ${generatedColorItems.length} colors (Pod_1 + Pod_2 + Pod_3 + Pod_4) + ${generatedTechItems.length} tech essentials.`
      : `${packageTier} package generated with ${generatedColorItems.length} colors + ${generatedTechItems.length} tech essentials (qty ${DEFAULT_PACKAGE_ITEM_QTY}).`

    setCheckoutMessage(tierMessage)
    setDraftInvoice(formatDraftInvoiceText(invoice))
  }

  const copyDraftInvoice = async () => {
    if (!draftInvoice) return
    await navigator.clipboard.writeText(draftInvoice)
  }

  const openPrintPreview = (title, documentHtml, fallbackFilenameBase) => {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=980,height=700')

    if (popup) {
      popup.document.write(documentHtml)
      popup.document.close()
      popup.focus()
      popup.print()
      return
    }

    const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${fallbackFilenameBase}.html`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    setCheckoutMessage(`${title} preview popup was blocked by the browser. A printable HTML file was downloaded instead.`)
  }

  const exportProformaPdf = async () => {
    if (!lastProformaInvoice) return

    const getImageFormat = (dataUrl) => dataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG'

    const uint8ArrayToBinary = (uint8Array) => {
      const chunkSize = 0x8000
      let result = ''

      for (let index = 0; index < uint8Array.length; index += chunkSize) {
        result += String.fromCharCode(...uint8Array.subarray(index, index + chunkSize))
      }

      return result
    }

    const loadImageAsDataUrl = async (imagePath) => {
      const response = await fetch(imagePath)
      if (!response.ok) {
        throw new Error(`Unable to load image ${imagePath}`)
      }

      const blob = await response.blob()

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      if (typeof dataUrl !== 'string') {
        throw new Error(`Invalid image data for ${imagePath}`)
      }

      return dataUrl
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

    const hasPdfCustomFont = await (async () => {
      try {
        const response = await fetch(PORTAL_FONT_TTF_URL)
        if (!response.ok) return false

        const fontBuffer = await response.arrayBuffer()
        const fontBinary = uint8ArrayToBinary(new Uint8Array(fontBuffer))

        doc.addFileToVFS('PF-Futura-Neu.ttf', fontBinary)
        doc.addFont('PF-Futura-Neu.ttf', 'PFFuturaNeu', 'normal')
        doc.setFont('PFFuturaNeu', 'normal')
        return true
      }
      catch {
        return false
      }
    })()

    if (!hasPdfCustomFont) {
      doc.setFont('helvetica', 'normal')
    }

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40
    const leftLogoMaxWidth = 168
    const leftLogoMaxHeight = 44
    const rightLogoMaxWidth = 124
    const rightLogoMaxHeight = 34
    const logoY = 24
    const textColor = [17, 24, 39]
    let cursorY = 84

    const getContainedSize = (width, height, maxWidth, maxHeight) => {
      if (!width || !height) {
        return { width: maxWidth, height: maxHeight }
      }

      const ratio = Math.min(maxWidth / width, maxHeight / height)
      return {
        width: Math.max(1, width * ratio),
        height: Math.max(1, height * ratio),
      }
    }

    const loadImageAsset = async (imagePath, maxWidth, maxHeight) => {
      const dataUrl = await loadImageAsDataUrl(imagePath)
      const dimensions = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => {
          resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height })
        }
        image.onerror = () => reject(new Error(`Unable to read image dimensions for ${imagePath}`))
        image.src = dataUrl
      })

      const contained = getContainedSize(dimensions.width, dimensions.height, maxWidth, maxHeight)

      return {
        dataUrl,
        format: getImageFormat(dataUrl),
        width: contained.width,
        height: contained.height,
      }
    }

    const [leftLogoResult, rightLogoResult] = await Promise.allSettled([
      loadImageAsset(PROFORMA_HEADER.leftLogoPath, leftLogoMaxWidth, leftLogoMaxHeight),
      loadImageAsset(PROFORMA_HEADER.rightLogoPath, rightLogoMaxWidth, rightLogoMaxHeight),
    ])

    let leftLogoBottomY = logoY
    let rightLogoBottomY = logoY

    if (leftLogoResult.status === 'fulfilled') {
      doc.addImage(
        leftLogoResult.value.dataUrl,
        leftLogoResult.value.format,
        margin,
        logoY,
        leftLogoResult.value.width,
        leftLogoResult.value.height,
      )
      leftLogoBottomY = logoY + leftLogoResult.value.height
    }

    if (rightLogoResult.status === 'fulfilled') {
      doc.addImage(
        rightLogoResult.value.dataUrl,
        rightLogoResult.value.format,
        pageWidth - margin - rightLogoResult.value.width,
        logoY,
        rightLogoResult.value.width,
        rightLogoResult.value.height,
      )
      rightLogoBottomY = logoY + rightLogoResult.value.height
    }

    doc.setTextColor(...textColor)
    doc.setFontSize(8)
    const companyLines = [
      PROFORMA_HEADER.leeukopfCompany,
      PROFORMA_HEADER.leeukopfAddress,
      `Phone: ${PROFORMA_HEADER.leeukopfPhone}`,
      `Email: ${PROFORMA_HEADER.leeukopfEmail}`,
    ].filter(Boolean)

    const companyBlockStartY = Math.max(leftLogoBottomY, rightLogoBottomY) + 8
    const companyLineHeight = 10

    companyLines.forEach((line, index) => {
      doc.text(String(line), pageWidth - margin, companyBlockStartY + (index * companyLineHeight), {
        align: 'right',
      })
    })

    const companyBlockBottomY = companyBlockStartY + (companyLines.length * companyLineHeight)
    const headerDividerY = Math.max(companyBlockBottomY, leftLogoBottomY, rightLogoBottomY) + 8
    cursorY = headerDividerY + 24

    doc.setFontSize(16)
    doc.text('Pro-Forma / Commercial Invoice (Non-Fiscal)', margin, cursorY)
    cursorY += 20

    doc.setFontSize(10)
    const orderMetaLines = [
      `Order ID: ${lastProformaInvoice.orderId}`,
      `Date: ${new Date(lastProformaInvoice.createdAtIso).toLocaleString()}`,
      `Customer: ${lastProformaInvoice.customer.companyName}`,
      `VIES/VAT: ${lastProformaInvoice.customer.vatNumber}`,
      `Country: ${lastProformaInvoice.customer.country}`,
      `Region: ${lastProformaInvoice.customer.region}`,
      PROFORMA_HEADER.vatTaxId,
      PROFORMA_HEADER.bankDetails,
      PROFORMA_HEADER.swiftBic ? `SWIFT/BIC: ${PROFORMA_HEADER.swiftBic}` : null,
    ]

    orderMetaLines.forEach((line) => {
      doc.text(line, margin, cursorY)
      cursorY += 13
    })

    autoTable(doc, {
      startY: cursorY + 8,
      margin: { left: margin, right: margin },
      styles: {
        font: hasPdfCustomFont ? 'PFFuturaNeu' : 'helvetica',
        fontSize: 9,
        cellPadding: 5,
        textColor,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor,
      },
      head: [['#', 'SKU', 'Description', 'Qty', 'Unit Price (EUR)', 'Discount', 'Subtotal (EUR)']],
      body: lastProformaInvoice.lines.map((line, index) => ([
        index + 1,
        line.sku,
        line.description,
        line.qty,
        currencyFormatter(line.unitPriceEur),
        line.discountPct ? `${line.discountPct}%` : '-',
        currencyFormatter(line.subtotalEur),
      ])),
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 84 },
        2: { cellWidth: 170 },
        3: { cellWidth: 42, halign: 'right' },
        4: { cellWidth: 86, halign: 'right' },
        5: { cellWidth: 56, halign: 'right' },
        6: { cellWidth: 86, halign: 'right' },
      },
      didDrawPage: () => {
        doc.setDrawColor(226, 232, 240)
        doc.line(margin, headerDividerY, pageWidth - margin, headerDividerY)
      },
    })

    const tableEndY = doc.lastAutoTable?.finalY || cursorY + 8
    const footerY = Math.min(tableEndY + 22, pageHeight - 64)

    doc.setFontSize(12)
    doc.text(`Grand Total (EUR): ${currencyFormatter(lastProformaInvoice.grandTotalEur)}`, pageWidth - margin, footerY, { align: 'right' })

    doc.setFontSize(9)
    doc.text(
      'This is a Pro-Forma invoice for bank transfer purposes. Production begins upon payment confirmation.',
      margin,
      Math.min(footerY + 18, pageHeight - 42),
    )

    doc.save(`proforma-order-${lastProformaInvoice.orderId}.pdf`)
  }

  const exportPackingListCsv = () => {
    if (!lastPackingList) return

    const escapeCsv = (value) => {
      const text = String(value ?? '')
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    }

    const shipping = lastPackingList.shipping || {}

    const header = [
      'Order ID',
      'SKU',
      'Description',
      'Qty',
      'Unit Weight (kg)',
      'Unit L (cm)',
      'Unit W (cm)',
      'Unit H (cm)',
      'Line Weight (kg)',
      'Line Volume (cm3)',
    ]

    const rows = lastPackingList.lines.map((line) => ([
      lastPackingList.orderId,
      line.sku,
      line.description,
      line.qty,
      line.unitWeightKg,
      line.unitLengthCm,
      line.unitWidthCm,
      line.unitHeightCm,
      line.lineWeightKg,
      line.lineVolumeCm3,
    ]))

    rows.push([
      lastPackingList.orderId,
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      lastPackingList.totalWeightKg,
      lastPackingList.totalVolumeCm3,
    ])

    const csv = [
      ['Order ID', lastPackingList.orderId],
      ['Consignee Name', shipping.name || '-'],
      ['Consignee Phone', shipping.phone || '-'],
      ['Shipping Address', shipping.address || '-'],
      [],
      header,
      ...rows,
    ]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `packing-list-order-${lastPackingList.orderId}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const exportPackingListPdf = () => {
    if (!lastPackingList) return

    const escapeHtml = (value) => String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

    const shipping = lastPackingList.shipping || {}

    const rowsHtml = lastPackingList.lines
      .map((line) => `<tr>
        <td>${escapeHtml(line.sku)}</td>
        <td>${escapeHtml(line.description)}</td>
        <td>${line.qty}</td>
        <td>${line.unitWeightKg}</td>
        <td>${line.unitLengthCm}×${line.unitWidthCm}×${line.unitHeightCm}</td>
        <td>${line.lineWeightKg}</td>
        <td>${line.lineVolumeCm3}</td>
      </tr>`)
      .join('')

    const documentHtml = `
      <html>
        <head>
          <title>Packing List #${lastPackingList.orderId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { font-size: 20px; margin: 0 0 8px 0; }
            p { margin: 4px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Packing List — Order #${lastPackingList.orderId}</h1>
          <p>Total Weight: ${lastPackingList.totalWeightKg} kg</p>
          <p>Total Volume: ${lastPackingList.totalVolumeCm3} cm³</p>
          <p>Suggested Parcels: ${lastPackingList.suggestedParcels}</p>
          <p>Suggested Carton: ${lastPackingList.packaging.suggestedBoxLengthCm}×${lastPackingList.packaging.suggestedBoxWidthCm}×${lastPackingList.packaging.suggestedBoxHeightCm} cm</p>
          <p>Consignee Name: ${escapeHtml(shipping.name || '-')}</p>
          <p>Consignee Phone: ${escapeHtml(shipping.phone || '-')}</p>
          <p>Shipping Address: ${escapeHtml(shipping.address || '-')}</p>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Weight (kg)</th>
                <th>Dimensions (cm)</th>
                <th>Line Weight (kg)</th>
                <th>Line Volume (cm³)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `

    openPrintPreview(
      `Packing List #${lastPackingList.orderId}`,
      documentHtml,
      `packing-list-order-${lastPackingList.orderId}`,
    )
  }

  const removeProfessionalBasePack = () => {
    setIncludeProfessionalBasePack(false)
    setShowAddOnRemovedToast(true)
  }

  const submitOrder = async () => {
    if (!selectedCodes.length && !packageCartItems.length && !includeProfessionalBasePack) {
      setCheckoutError('Select at least one product to submit checkout.')
      setCheckoutMessage('')
      return
    }

    if (!hasSupabaseConfig || !supabase) {
      setCheckoutError('Order intake API is not configured. Use Send to Order Inbox.')
      setCheckoutMessage('')
      return
    }

    setShowClientValidation(true)
    const missingProfileFields = [...clientValidation.missingLabels]

    if (missingProfileFields.length) {
      const message = `Please complete the required fields before submitting: ${missingProfileFields.join(', ')}.`
      window.alert(message)
      setCheckoutError(message)
      setCheckoutMessage('')
      return
    }

    setIsSubmittingOrder(true)
    setCheckoutError('')
    setCheckoutMessage('')
    setOrderInboxEmailStatus('')

    const { data: userData } = await supabase.auth.getUser()

    try {
      const userMeta = userData?.user?.user_metadata || {}
      await supabase.auth.updateUser({
        data: {
          ...userMeta,
          customer_type: clientProfile.customerType,
          company_name: clientProfile.customerName,
          vat_number: clientProfile.vatNumber,
          contact_phone: clientProfile.contactPhone,
          contact_email: clientProfile.contactEmail,
          invoice_address_line1: clientProfile.invoiceAddressLine1,
          invoice_address_line2: clientProfile.invoiceAddressLine2,
          invoice_area: clientProfile.invoiceArea,
          invoice_region: clientProfile.invoiceRegion,
          invoice_country: clientProfile.invoiceCountry,
          invoice_postal_code: clientProfile.invoicePostalCode,
          shipping_same_as_invoice: clientProfile.shippingSameAsInvoice,
          shipping_type: clientProfile.shippingType,
          shipping_name: clientProfile.shippingName,
          shipping_phone: clientProfile.shippingPhone,
          shipping_address_line1: clientProfile.shippingAddressLine1,
          shipping_address_line2: clientProfile.shippingAddressLine2,
          shipping_area: clientProfile.shippingArea,
          shipping_region: clientProfile.shippingRegion,
          shipping_country: clientProfile.shippingCountry,
          shipping_postal_code: clientProfile.shippingPostalCode,
        },
      })
    }
    catch {
      // Non-blocking: local profile persistence still applies.
    }

    const packageItemsPayload = packageCartItems.map((item) => `${item.sku} x${item.qty}`)
    const checkoutItems = includeProfessionalBasePack
      ? [...selectedCodes, ...packageItemsPayload, `${PROFESSIONAL_BASE_PACK.sku} x${PROFESSIONAL_BASE_PACK.qty}`]
      : [...selectedCodes, ...packageItemsPayload]

    const verifiedUnits = selectedCodes.length
      + packageCartItems.reduce((sum, item) => sum + item.qty, 0)
      + (includeProfessionalBasePack ? PROFESSIONAL_BASE_PACK.qty : 0)

    if (verifiedUnits !== totalUnits) {
      setCheckoutError(`Order verification failed: expected ${verifiedUnits} units, got ${totalUnits}.`)
      setCheckoutMessage('')
      setIsSubmittingOrder(false)
      return
    }

    const shipping = {
      name: String(shippingConsigneeName || '').trim(),
      phone: String(shippingConsigneePhone || '').trim(),
      address: shippingAddressComposed.trim(),
      country: clientProfile.shippingSameAsInvoice
        ? String(clientProfile.invoiceCountry || '').trim()
        : String(clientProfile.shippingCountry || '').trim(),
      type: String(clientProfile.shippingType || '').trim() || 'road',
    }
    const invoice = {
      name: String(clientProfile.customerName || '').trim(),
      vatNumber: String(clientProfile.vatNumber || '').trim(),
      address: invoiceAddressComposed.trim(),
      country: String(clientProfile.invoiceCountry || '').trim(),
      contactEmail: String(clientProfile.contactEmail || '').trim(),
      contactPhone: String(clientProfile.contactPhone || '').trim(),
      customerType: String(clientProfile.customerType || 'company').trim(),
    }
    const escapeHtml = (value) => String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

    const payload = {
      customer_email: userData?.user?.email ?? null,
      items: checkoutItems,
      total_units: totalUnits,
      source: 'portal',
      module: 'products',
      status: 'received',
      consignee_name: shipping.name || null,
      consignee_phone: shipping.phone || null,
      shipping_address: shipping.address || null,
    }

    const userProfile = {
      companyName: invoice.name || userData?.user?.user_metadata?.company_name || userData?.user?.user_metadata?.full_name || userData?.user?.email || '-',
      vatNumber: invoice.vatNumber || userData?.user?.user_metadata?.vat_number || userData?.user?.user_metadata?.vies_vat || '-',
      country: invoice.country || userData?.user?.user_metadata?.country || '-',
      region: String(clientProfile.invoiceRegion || '').trim() || userData?.user?.user_metadata?.region || 'EU',
    }

    const proformaInvoice = buildProformaFromCart({
      orderId: '-',
      userProfile,
      selectedCodes,
      packageCartItems,
      includeProfessionalBasePack,
      products,
    })

    let { data: insertedOrder, error } = await supabase
      .from(ordersTable)
      .insert([payload])
      .select('id, created_at')
      .single()

    const missingShippingColumnsError = error?.message?.includes('consignee_name')
      || error?.message?.includes('consignee_phone')
      || error?.message?.includes('shipping_address')

    if (missingShippingColumnsError) {
      const legacyPayload = {
        customer_email: userData?.user?.email ?? null,
        items: checkoutItems,
        total_units: totalUnits,
        source: 'portal',
        module: 'products',
        status: 'received',
      }

      const retry = await supabase
        .from(ordersTable)
        .insert([legacyPayload])
        .select('id, created_at')
        .single()

      insertedOrder = retry.data
      error = retry.error
    }

    if (error) {
      const missingTableError = error.message?.includes('Could not find the table')
        || error.message?.includes('relation')

      if (missingTableError) {
        setCheckoutError(`Checkout failed: orders table \`${ordersTable}\` is missing in Supabase. Run the SQL from /supabase/sql/create_b2b_orders.sql, then retry.`)
      }
      else {
        setCheckoutError(`Checkout failed: ${error.message}`)
      }

      setIsSubmittingOrder(false)
      return
    }

    const isPlatinumOrder = generatedPackageTier === 'Platinum'
      && packageCartItems.some((item) => item.group === 'Pod_4')

    if (isPlatinumOrder) {
      setShowOrderConfetti(true)

      const distributorName = userData?.user?.user_metadata?.full_name
        || userData?.user?.user_metadata?.company_name
        || 'Distributor'

      const userMeta = userData?.user?.user_metadata || {}

      await supabase.auth.updateUser({
        data: {
          ...userMeta,
          account_type: 'Platinum_Distributor',
        },
      })

      const emailPayload = buildPlatinumSuccessEmail({
        distributorName,
        orderId: insertedOrder?.id ?? '-',
      })

      await sendPortalEmailNotification({
        eventType: 'platinum_order_success',
        to: userData?.user?.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        orderId: insertedOrder?.id,
      })
    }

    const zohoSyncResult = await sendZohoOrderSync({
      orderId: insertedOrder?.id,
      customerEmail: userData?.user?.email ?? null,
      accountType: userData?.user?.user_metadata?.account_type || null,
      generatedPackageTier: generatedPackageTier || null,
      items: checkoutItems,
      totalUnits,
      status: 'received',
      source: 'b2b_portal',
      orderInboxEmail: ORDER_INBOX_EMAIL,
      invoice,
      shipping,
      totalValueEurBase: proformaInvoice.grandTotalEur,
    })

    const shippingBlockHtml = `
      <p><strong>Shipping Type:</strong> ${escapeHtml(shipping.type || '-')}</p>
      <p><strong>Consignee Name:</strong> ${escapeHtml(shipping.name || '-')}</p>
      <p><strong>Consignee Phone:</strong> ${escapeHtml(shipping.phone || '-')}</p>
      <p><strong>Shipping Address:</strong> ${escapeHtml(shipping.address || '-')}</p>
      <p><strong>Shipping Country:</strong> ${escapeHtml(shipping.country || '-')}</p>
    `
    const invoiceBlockHtml = `
      <p><strong>Invoice Type:</strong> ${escapeHtml(invoice.customerType === 'company' ? 'Company' : 'Client')}</p>
      <p><strong>Invoice Name:</strong> ${escapeHtml(invoice.name || '-')}</p>
      <p><strong>VAT Number:</strong> ${escapeHtml(invoice.vatNumber || '-')}</p>
      <p><strong>Invoice Address:</strong> ${escapeHtml(invoice.address || '-')}</p>
      <p><strong>Invoice Country:</strong> ${escapeHtml(invoice.country || '-')}</p>
      <p><strong>Contact Email:</strong> ${escapeHtml(invoice.contactEmail || '-')}</p>
      <p><strong>Contact Phone:</strong> ${escapeHtml(invoice.contactPhone || '-')}</p>
      <p><strong>Shipping same as invoice:</strong> ${clientProfile.shippingSameAsInvoice ? 'Yes' : 'No'}</p>
    `

    const inboxNotificationResult = await sendPortalEmailNotification({
      eventType: 'b2b_order_received',
      to: ORDER_INBOX_EMAIL,
      subject: `B2B Portal Order Received [#${insertedOrder?.id ?? '-'}]`,
      html: `<p>A new B2B portal order has been received and is ready for offline invoicing.</p><p><strong>Order ID:</strong> ${insertedOrder?.id ?? '-'}</p><p><strong>Customer Email:</strong> ${userData?.user?.email ?? '-'}</p><p><strong>Total Units:</strong> ${totalUnits}</p>${invoiceBlockHtml}${shippingBlockHtml}<p><strong>Items:</strong> ${checkoutItems.join(', ')}</p>`,
      orderId: insertedOrder?.id,
      customerEmail: userData?.user?.email ?? null,
      totalUnits,
      items: checkoutItems,
      invoice,
      shipping,
      totalValueEurBase: proformaInvoice.grandTotalEur,
    })

    const inboxEmailStatusText = inboxNotificationResult.ok
      ? `Inbox notification sent to ${ORDER_INBOX_EMAIL}.`
      : inboxNotificationResult.skipped
        ? `Inbox notification skipped: ${inboxNotificationResult.message}`
        : `Inbox notification failed: ${inboxNotificationResult.message}`

    setOrderInboxEmailStatus(inboxEmailStatusText)

    const zohoStatusNote = zohoSyncResult.ok
      ? ` Zoho sync queued successfully (${ZOHO_SYNC_TARGET}).`
      : zohoSyncResult.skipped
        ? ` ${zohoSyncResult.message}`
        : ` Zoho sync failed: ${zohoSyncResult.message}`

    const packingList = generatePackingList(checkoutItems, shippingMetadata)
    setLastPackingList({
      orderId: insertedOrder?.id ?? '-',
      shipping,
      ...packingList,
    })

    setLastProformaInvoice({
      ...proformaInvoice,
      orderId: insertedOrder?.id ?? '-',
    })

    setCheckoutMessage(`Order received (#${insertedOrder?.id ?? '-'} | ${totalUnits} units). Invoicing is handled offline via ${ORDER_INBOX_EMAIL}.${zohoStatusNote}`)
    setSelectedCodes([])
    setPackageCartItems([])
    setGeneratedPackageTier('')
    setIncludeProfessionalBasePack(false)
    setIsSubmittingOrder(false)
  }

  const checkoutHref = useMemo(() => {
    const subject = encodeURIComponent(`GEL.IT.UP B2B Order Intake (${totalUnits} units)`)
    const packageItemsPayload = packageCartItems.map((item) => `${item.sku} x${item.qty}`)
    const mailItems = includeProfessionalBasePack
      ? [...selectedCodes, ...packageItemsPayload, `${PROFESSIONAL_BASE_PACK.sku} x${PROFESSIONAL_BASE_PACK.qty}`]
      : [...selectedCodes, ...packageItemsPayload]
    const body = encodeURIComponent([
      'Hello GEL.IT.UP Order Intake Team,',
      '',
      'Please process the following B2B portal order for offline invoicing:',
      mailItems.join(', ') || '(none selected)',
      '',
      `Total units: ${totalUnits}`,
      '',
      `Invoice Type: ${clientProfile.customerType === 'company' ? 'Company' : 'Client'}`,
      `Invoice Name: ${clientProfile.customerName.trim() || ''}`,
      `VAT Number: ${clientProfile.vatNumber.trim() || ''}`,
      `Invoice Address: ${invoiceAddressComposed || ''}`,
      `Contact Email: ${clientProfile.contactEmail.trim() || ''}`,
      `Contact Phone: ${clientProfile.contactPhone.trim() || ''}`,
      `Shipping Type: ${clientProfile.shippingType || ''}`,
      `Consignee Name: ${String(shippingConsigneeName || '').trim() || ''}`,
      `Consignee Phone: ${String(shippingConsigneePhone || '').trim() || ''}`,
      `Shipping Address: ${shippingAddressComposed || ''}`,
      '',
      'Regards,',
    ].join('\n'))

    return `mailto:${ORDER_INBOX_EMAIL}?subject=${subject}&body=${body}`
  }, [
    clientProfile.contactEmail,
    clientProfile.contactPhone,
    clientProfile.customerName,
    clientProfile.customerType,
    clientProfile.shippingType,
    clientProfile.vatNumber,
    includeProfessionalBasePack,
    invoiceAddressComposed,
    packageCartItems,
    selectedCodes,
    shippingAddressComposed,
    shippingConsigneeName,
    shippingConsigneePhone,
    totalUnits,
  ])

  const feedStatus = isLoadingFeed
    ? 'Connecting...'
    : feedMessage.startsWith('Loaded')
      ? 'Live'
      : 'Fallback'

  const authLabel = hasSupabaseConfig ? 'Live' : 'Fallback'
  const authBadgeClass = hasSupabaseConfig
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-amber-100 text-amber-800'
  const feedBadgeClass = isLoadingFeed
    ? 'bg-sky-100 text-sky-800'
    : feedStatus === 'Live'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-amber-100 text-amber-800'
  const checkoutIsLive = hasSupabaseConfig
  const checkoutBadgeClass = checkoutIsLive
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-amber-100 text-amber-800'
  const isCatalogView = moduleView === 'catalog'

  useEffect(() => {
    setDismissedSmartSuggestion(false)
  }, [activeTier?.name, recommendedProduct?.name])

  useEffect(() => {
    let mounted = true

    const loadLiveUpsellPrice = async () => {
      if (!recommendedProduct) {
        if (mounted) setLiveUpsellRecommendation(null)
        return
      }

      let nextRecommendation = { ...recommendedProduct }

      if (hasSupabaseConfig && supabase) {
        const { data } = await supabase.auth.getSession()
        const accessToken = data?.session?.access_token

        if (accessToken) {
          try {
            const response = await fetch(UPSELL_PRICE_FUNCTION_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                totalItems: totalUnits,
                userRole: b2bUserRole,
                productName: recommendedProduct.name,
                basePrice: recommendedProduct.basePrice,
              }),
            })

            if (response.ok) {
              const payload = await response.json()
              if (payload?.eligible) {
                nextRecommendation = {
                  ...nextRecommendation,
                  discountPercent: Number(payload.discountPercent || nextRecommendation.discountPercent),
                  tierOnlyPrice: Number(payload.discountedPrice || nextRecommendation.tierOnlyPrice),
                }
              }
            }
          }
          catch {
            // Keep local recommendation fallback when function is unavailable.
          }
        }
      }

      if (mounted) {
        setLiveUpsellRecommendation(nextRecommendation)
      }
    }

    void loadLiveUpsellPrice()

    return () => {
      mounted = false
    }
  }, [b2bUserRole, recommendedProduct, totalUnits])

  return (
    <div className="space-y-4">
      {showOrderConfetti && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-white/50 pt-20">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-center shadow">
            <p className="text-2xl">🎉✨💎✨🎉</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Platinum order confirmed</p>
          </div>
        </div>
      )}

      {showAddOnRemovedToast && (
        <div className="fixed bottom-4 left-4 z-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
          Add-on removed
        </div>
      )}

      {shouldShowTechnicalUpsellToast && !dismissedTechnicalUpsell && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,440px)] rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Professional Tip</p>
          <p className="mt-1 text-sm text-amber-900">
            Professional Tip: Your chosen shades perform best with the 5-in-1 Superior Base. Would you like to add a professional 6-pack to your order for a 15% discount?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setIncludeProfessionalBasePack(true)
                setDismissedTechnicalUpsell(true)
              }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Add 6-pack
            </button>
            <button
              onClick={() => setDismissedTechnicalUpsell(true)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!isCatalogView && activeTier && liveUpsellRecommendation && !dismissedSmartSuggestion && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:hidden">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Smart Suggestion</p>
          <div className="mt-2 flex items-start gap-3">
            <img
              src={liveUpsellRecommendation.imageURL}
              alt={liveUpsellRecommendation.name}
              className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-800">
                As a {activeTier.name}, you qualify for {liveUpsellRecommendation.name} at a {liveUpsellRecommendation.discountPercent}% discount with this order.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-900">
                Tier-Only: €{Number(liveUpsellRecommendation.tierOnlyPrice || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setDismissedSmartSuggestion(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900">Connection Status</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Auth</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${authBadgeClass}`}>{authLabel}</span>
              <span>{hasSupabaseConfig ? 'Supabase' : 'Demo mode'}</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Product Feed</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${feedBadgeClass}`}>{feedStatus}</span>
              <span>{isLoadingFeed ? 'Fetching products' : 'Catalog source'}</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Checkout Endpoint</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${checkoutBadgeClass}`}>
                {checkoutIsLive ? 'Live' : 'Fallback'}
              </span>
              <span>{checkoutIsLive ? `Supabase table: ${ordersTable}` : ORDER_INBOX_EMAIL}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">B2B Portal</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{selectedLineItems} items</span>
            <span>/</span>
            <span>{totalUnits} total units</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{isLoadingFeed ? 'Loading live feed...' : feedMessage}</p>
        <p className="mt-1 text-[11px] text-slate-500">{shippingMetadataStatus}</p>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-900">Client details (saved for next orders)</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Required fields are marked with <span className="font-semibold text-rose-600">*</span>
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-700">
              Type <span className="text-rose-600">*</span>
              <select
                value={clientProfile.customerType}
                onChange={(event) => setClientField('customerType', event.target.value)}
                className={getClientInputClass('customerType')}
              >
                <option value="company">Company</option>
                <option value="client">Client</option>
              </select>
            </label>
            <label className="text-xs text-slate-700">
              Shipping Type <span className="text-rose-600">*</span>
              <select
                value={clientProfile.shippingType}
                onChange={(event) => setClientField('shippingType', event.target.value)}
                className={getClientInputClass('shippingType')}
              >
                <option value="road">Road</option>
                <option value="air">Air</option>
                <option value="self_arranged">Self-arranged</option>
              </select>
            </label>

            <label className="text-xs text-slate-700">
              {clientProfile.customerType === 'company' ? 'Company Name' : 'Client Name'} <span className="text-rose-600">*</span>
              <input
                type="text"
                value={clientProfile.customerName}
                onChange={(event) => setClientField('customerName', event.target.value)}
                className={getClientInputClass('customerName')}
                placeholder={clientProfile.customerType === 'company' ? 'Company name' : 'Client name'}
              />
            </label>

            <label className="text-xs text-slate-700">
              VAT Number <span className="text-rose-600">*</span>
              <input
                type="text"
                value={clientProfile.vatNumber}
                onChange={(event) => setClientField('vatNumber', event.target.value)}
                className={getClientInputClass('vatNumber')}
                placeholder="VAT / Tax ID"
              />
            </label>

            <label className="text-xs text-slate-700">
              Contact Number (with country code) <span className="text-rose-600">*</span>
              <input
                type="text"
                value={clientProfile.contactPhone}
                onChange={(event) => setClientField('contactPhone', event.target.value)}
                className={getClientInputClass('contactPhone')}
                placeholder="+359..."
              />
            </label>

            <label className="text-xs text-slate-700">
              Contact Email <span className="text-rose-600">*</span>
              <input
                type="email"
                value={clientProfile.contactEmail}
                onChange={(event) => setClientField('contactEmail', event.target.value)}
                className={getClientInputClass('contactEmail')}
                placeholder="name@company.com"
              />
            </label>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-900">Invoice Address</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-700">
              Address line 1 <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoiceAddressLine1} onChange={(event) => setClientField('invoiceAddressLine1', event.target.value)} placeholder="Address line 1" className={getClientInputClass('invoiceAddressLine1')} />
            </label>
            <label className="text-xs text-slate-700">
              Address line 2 <span className="text-slate-500">(optional)</span>
              <input type="text" value={clientProfile.invoiceAddressLine2} onChange={(event) => setClientField('invoiceAddressLine2', event.target.value)} placeholder="Address line 2" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700" />
            </label>
            <label className="text-xs text-slate-700">
              Area / City <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoiceArea} onChange={(event) => setClientField('invoiceArea', event.target.value)} placeholder="Area / City" className={getClientInputClass('invoiceArea')} />
            </label>
            <label className="text-xs text-slate-700">
              Region / State <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoiceRegion} onChange={(event) => setClientField('invoiceRegion', event.target.value)} placeholder="Region / State" className={getClientInputClass('invoiceRegion')} />
            </label>
            <label className="text-xs text-slate-700">
              Country <span className="text-rose-600">*</span>
              <select value={clientProfile.invoiceCountry} onChange={(event) => setClientField('invoiceCountry', event.target.value)} className={getClientInputClass('invoiceCountry')}>
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={`invoice-${country}`} value={country}>{country}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-700">
              Postal code <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoicePostalCode} onChange={(event) => setClientField('invoicePostalCode', event.target.value)} placeholder="Postal code" className={getClientInputClass('invoicePostalCode')} />
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={clientProfile.shippingSameAsInvoice}
              onChange={(event) => setClientField('shippingSameAsInvoice', event.target.checked)}
            />
            Shipping address is same as invoice address
          </label>

          {!clientProfile.shippingSameAsInvoice && (
            <>
              <p className="mt-3 text-xs font-semibold text-slate-900">Shipping Address</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-700">
                  Shipping contact name <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingName} onChange={(event) => setClientField('shippingName', event.target.value)} placeholder="Shipping contact name" className={getClientInputClass('shippingName')} />
                </label>
                <label className="text-xs text-slate-700">
                  Shipping contact number <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingPhone} onChange={(event) => setClientField('shippingPhone', event.target.value)} placeholder="Shipping contact number" className={getClientInputClass('shippingPhone')} />
                </label>
                <label className="text-xs text-slate-700">
                  Address line 1 <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingAddressLine1} onChange={(event) => setClientField('shippingAddressLine1', event.target.value)} placeholder="Address line 1" className={getClientInputClass('shippingAddressLine1')} />
                </label>
                <label className="text-xs text-slate-700">
                  Address line 2 <span className="text-slate-500">(optional)</span>
                  <input type="text" value={clientProfile.shippingAddressLine2} onChange={(event) => setClientField('shippingAddressLine2', event.target.value)} placeholder="Address line 2" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700" />
                </label>
                <label className="text-xs text-slate-700">
                  Area / City <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingArea} onChange={(event) => setClientField('shippingArea', event.target.value)} placeholder="Area / City" className={getClientInputClass('shippingArea')} />
                </label>
                <label className="text-xs text-slate-700">
                  Region / State <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingRegion} onChange={(event) => setClientField('shippingRegion', event.target.value)} placeholder="Region / State" className={getClientInputClass('shippingRegion')} />
                </label>
                <label className="text-xs text-slate-700">
                  Country <span className="text-rose-600">*</span>
                  <select value={clientProfile.shippingCountry} onChange={(event) => setClientField('shippingCountry', event.target.value)} className={getClientInputClass('shippingCountry')}>
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={`shipping-${country}`} value={country}>{country}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-700">
                  Postal code <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingPostalCode} onChange={(event) => setClientField('shippingPostalCode', event.target.value)} placeholder="Postal code" className={getClientInputClass('shippingPostalCode')} />
                </label>
              </div>
            </>
          )}

          {showClientValidation && clientValidation.hasMissing && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Please complete all required fields marked with *.
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={submitOrder}
            disabled={isSubmittingOrder}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {isSubmittingOrder ? 'Submitting...' : `Submit Order (${totalUnits})`}
          </button>
          <a
            href={checkoutHref}
            onClick={(event) => {
              if (!selectedCodes.length && !packageCartItems.length && !includeProfessionalBasePack) event.preventDefault()
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Send to Order Inbox
          </a>
          <button
            onClick={copyCodes}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Copy list
          </button>
          <button
            onClick={() => {
              setSelectedCodes([])
              setPackageCartItems([])
              setGeneratedPackageTier('')
              setIncludeProfessionalBasePack(false)
              setLastPackingList(null)
              setLastProformaInvoice(null)
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Clear list
          </button>
        </div>

        {lastPackingList && (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-slate-800">
            <p className="font-semibold text-slate-900">Packing List (Draft) — Order #{lastPackingList.orderId}</p>
            <p className="mt-1">
              Total weight: {lastPackingList.totalWeightKg} kg • Total volume: {lastPackingList.totalVolumeCm3} cm³ • Suggested parcels: {lastPackingList.suggestedParcels}
            </p>
            <p className="mt-1 text-slate-600">
              Suggested carton: {lastPackingList.packaging.suggestedBoxLengthCm}×{lastPackingList.packaging.suggestedBoxWidthCm}×{lastPackingList.packaging.suggestedBoxHeightCm} cm (max {lastPackingList.packaging.maxBoxWeightKg} kg)
            </p>
            <p className="mt-1 text-slate-600">
              Consignee: {lastPackingList.shipping?.name || '-'} • Phone: {lastPackingList.shipping?.phone || '-'}
            </p>
            <p className="mt-1 text-slate-600">
              Ship to: {lastPackingList.shipping?.address || '-'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={exportPackingListCsv}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Export CSV
              </button>
              <button
                onClick={exportPackingListPdf}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Export PDF
              </button>
            </div>
          </div>
        )}

        {includeProfessionalBasePack && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>Added add-on: {PROFESSIONAL_BASE_PACK.description} ({PROFESSIONAL_BASE_PACK.sku})</span>
            <button
              onClick={removeProfessionalBasePack}
              className="rounded-md border border-amber-300 px-2 py-1 font-semibold text-amber-800"
            >
              Remove Add-on
            </button>
          </div>
        )}

        {!isCatalogView && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales Manager</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Create Package</p>
          <div className="mt-2">
            <button
              onClick={() => navigate('/portal/dashboard/catalog')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Add additional products
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={packageTier}
              onChange={(event) => setPackageTier(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {PACKAGE_TIER_OPTIONS.map((tier) => (
                <option key={tier} value={tier}>{tier} Tier</option>
              ))}
            </select>
            <button
              onClick={createPackageDraft}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Generate {packageTier} Package
            </button>
            <button
              onClick={copyDraftInvoice}
              disabled={!draftInvoice}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              Copy Draft Invoice
            </button>
          </div>

          {draftInvoice && (
            <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-700">
              {draftInvoice}
            </pre>
          )}

          {packageCartItems.length > 0 && (
            <>
              <p className="mt-2 text-xs text-slate-600">
                Package cart mapped: {packageCartItems.length} SKUs x {DEFAULT_PACKAGE_ITEM_QTY} qty (total package units: {packageUnits}).
              </p>
              {generatedPackageTier && (
                <p className={`mt-1 text-xs ${packageIntegrityPass ? 'text-emerald-700' : 'text-rose-600'}`}>
                  Integrity check ({generatedPackageTier}): expected {expectedPackageItems} items / {expectedPackageUnits} units, got {packageCartItems.length} items / {packageUnits} units.
                </p>
              )}
              {generatedPackageTier && packagePreviewItems.length > 0 && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                  <p className="text-xs font-semibold text-slate-700">
                    {generatedPackageTier} Package Products (lazy loaded): showing {visiblePackagePreviewItems.length} of {packagePreviewItems.length}
                  </p>
                  <div className="mt-2 max-h-48 overflow-y-auto pr-1">
                    <ul className="space-y-1 text-xs text-slate-700">
                      {visiblePackagePreviewItems.map((item) => {
                        const resolvedImageUrl = resolveCatalogImageUrl(item)

                        return (
                        <li key={`${item.sku}-${item.code}`} className="flex items-center gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1">
                          <div className="h-8 w-8 overflow-hidden rounded border border-slate-200 bg-white">
                            {resolvedImageUrl
                              ? (
                                <img
                                  src={resolvedImageUrl}
                                  alt={item.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                                )
                              : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                                  No Img
                                </div>
                                )}
                          </div>
                          <span>
                            <span className="font-semibold">{item.code}</span>
                            {' '}
                            —
                            {' '}
                            {item.name}
                          </span>
                          {!resolvedImageUrl && (
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Missing image
                            </span>
                          )}
                        </li>
                        )
                      })}
                    </ul>
                  </div>
                  {visiblePackagePreviewItems.length < packagePreviewItems.length && (
                    <button
                      onClick={() => setPackagePreviewVisibleCount((current) => current + 15)}
                      className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      Load 15 more products
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        )}

        {checkoutError && <p className="mt-2 text-xs text-rose-600">{checkoutError}</p>}
        {checkoutMessage && <p className="mt-2 text-xs text-emerald-700">{checkoutMessage}</p>}
        {orderInboxEmailStatus && <p className="mt-1 text-xs text-slate-700">{orderInboxEmailStatus}</p>}
        {checkoutMessage && lastProformaInvoice && (
          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
            <p className="text-xs text-emerald-900">
              Pro-Forma ready • Base accounting total ({EUR_CURRENCY_CODE}): {currencyFormatter(lastProformaInvoice.grandTotalEur)}
            </p>
            <button
              onClick={exportProformaPdf}
              className="mt-2 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-800"
            >
              Download Pro-Forma Invoice
            </button>
          </div>
        )}
      </div>

      {isCatalogView && (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">GEL.IT.UP Product Catalog</h3>
            <p className="mt-1 text-xs text-slate-500">Add extra products outside package tiers.</p>
          </div>
          <button
            onClick={() => navigate('/portal/dashboard/products')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Back to Tiers
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Distributor ordering workflow for all GEL.IT.UP products.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search SKU or product name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">All categories</option>
            {PRODUCT_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showSelectedOnly}
              onChange={(event) => setShowSelectedOnly(event.target.checked)}
            />
            Show selected only
          </label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filteredProducts.map((product) => {
            const selected = selectedCodes.includes(product.code)

            return (
              <button
                key={product.code}
                onClick={() => toggleSelection(product.code)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                <div className="relative h-16 w-full overflow-hidden rounded-md border border-slate-100">
                  <div className="absolute inset-0" style={{ backgroundColor: product.preview }} />
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className="relative z-10 h-full w-full object-cover"
                    />
                  )}
                  {!product.imageUrl && (
                    <span className="absolute right-1 top-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                      Missing image
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold">{product.code}</p>
                <p className={`truncate text-[11px] ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{product.name}</p>
                <p className={`line-clamp-2 text-[11px] ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {product.description || 'No description'}
                </p>
                <p className={`text-[11px] ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{product.category}</p>
              </button>
            )
          })}
        </div>
      </div>
      )}
    </div>
  )
}

function OrdersModule() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedOrderId, setCopiedOrderId] = useState(null)
  const [errorMessage, setErrorMessage] = useState(
    !hasSupabaseConfig || !supabase
      ? 'Live orders are unavailable because Supabase is not configured.'
      : '',
  )
  const ordersTable = import.meta.env.VITE_B2B_ORDERS_TABLE || DEFAULT_ORDERS_TABLE

  const copyShippingLabel = async (order) => {
    const lines = [
      order.consignee_name || '',
      order.consignee_phone || '',
      order.shipping_address || '',
      `Order #${order.id}`,
    ].filter((line) => String(line).trim())

    if (!lines.length) return

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedOrderId(order.id)
    window.setTimeout(() => {
      setCopiedOrderId((current) => (current === order.id ? null : current))
    }, 1800)
  }

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      return
    }

    let mounted = true

    const loadOrders = async () => {
      setIsLoading(true)
      setErrorMessage('')

      let { data, error } = await supabase
        .from(ordersTable)
        .select('id, created_at, total_units, status, items, customer_email, consignee_name, consignee_phone, shipping_address')
        .order('created_at', { ascending: false })
        .limit(20)

      const missingShippingColumnsError = error?.message?.includes('consignee_name')
        || error?.message?.includes('consignee_phone')
        || error?.message?.includes('shipping_address')

      if (missingShippingColumnsError) {
        const retry = await supabase
          .from(ordersTable)
          .select('id, created_at, total_units, status, items, customer_email')
          .order('created_at', { ascending: false })
          .limit(20)

        data = retry.data
        error = retry.error
      }

      if (!mounted) return

      if (error) {
        setErrorMessage(error.message)
        setOrders([])
        setIsLoading(false)
        return
      }

      setOrders(data || [])
      setIsLoading(false)
    }

    loadOrders()

    return () => {
      mounted = false
    }
  }, [ordersTable])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Submitted Orders</h3>
        <p className="mt-1 text-xs text-slate-500">
          Orders are stored in Supabase table: {ordersTable}. Invoicing is handled offline from {ORDER_INBOX_EMAIL}.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {isLoading && <p className="text-sm text-slate-600">Loading recent orders...</p>}
        {!isLoading && errorMessage && <p className="text-sm text-rose-600">Unable to load orders: {errorMessage}</p>}
        {!isLoading && !errorMessage && !orders.length && (
          <p className="text-sm text-slate-600">No orders found yet.</p>
        )}

        {!isLoading && !errorMessage && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Order #</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Units</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Consignee</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Shipping Address</th>
                  <th className="py-2 pr-4">Label</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-4 font-semibold">#{order.id}</td>
                    <td className="py-2 pr-4">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{order.total_units}</td>
                    <td className="py-2 pr-4">{order.status}</td>
                    <td className="py-2 pr-4">{order.customer_email || '-'}</td>
                    <td className="py-2 pr-4">{order.consignee_name || '-'}</td>
                    <td className="py-2 pr-4">{order.consignee_phone || '-'}</td>
                    <td className="py-2 pr-4">{order.shipping_address || '-'}</td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => {
                          void copyShippingLabel(order)
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {copiedOrderId === order.id ? 'Copied' : 'Copy Label'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PendingApplicationsModule() {
  const [applications, setApplications] = useState([])
  const [reviewedApplications, setReviewedApplications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingId, setIsSavingId] = useState(null)
  const [copiedApplicationId, setCopiedApplicationId] = useState(null)
  const [copiedInvoiceId, setCopiedInvoiceId] = useState(null)
  const [copiedShippingId, setCopiedShippingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const registrationsTable = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || DEFAULT_REGISTRATIONS_TABLE

  const loadPendingApplications = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) {
      setErrorMessage('Supabase is not configured.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from(registrationsTable)
      .select('id, created_at, customer_type, company_name, vat_number, contact_name, contact_email, phone, shipping_type, country, business_type, status, invoice_address_line1, invoice_area, invoice_region, invoice_country, invoice_postal_code, shipping_same_as_invoice, shipping_name, shipping_phone, shipping_address_line1, shipping_area, shipping_region, shipping_country, shipping_postal_code')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const { data: reviewedData, error: reviewedError } = await supabase
      .from(registrationsTable)
      .select('id, created_at, reviewed_at, reviewed_by, customer_type, company_name, vat_number, contact_name, contact_email, phone, shipping_type, country, business_type, status, invoice_address_line1, invoice_area, invoice_region, invoice_country, invoice_postal_code, shipping_same_as_invoice, shipping_name, shipping_phone, shipping_address_line1, shipping_area, shipping_region, shipping_country, shipping_postal_code')
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false })
      .limit(80)

    if (error) {
      setErrorMessage(error.message)
      setApplications([])
      setReviewedApplications([])
      setIsLoading(false)
      return
    }

    if (reviewedError) {
      setErrorMessage(reviewedError.message)
      setApplications([])
      setReviewedApplications([])
      setIsLoading(false)
      return
    }

    setApplications(data || [])
    setReviewedApplications(reviewedData || [])
    setIsLoading(false)
  }, [registrationsTable])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPendingApplications()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadPendingApplications])

  const copyApplicationDetails = async (application) => {
    const shippingSameAsInvoice = application.shipping_same_as_invoice !== false
    const invoiceAddress = [
      application.invoice_address_line1,
      application.invoice_area,
      application.invoice_region,
      application.invoice_postal_code,
      application.invoice_country || application.country,
    ].filter(Boolean).join(', ')

    const shippingAddress = shippingSameAsInvoice
      ? invoiceAddress
      : [
          application.shipping_address_line1,
          application.shipping_area,
          application.shipping_region,
          application.shipping_postal_code,
          application.shipping_country,
        ].filter(Boolean).join(', ')

    const shippingContact = shippingSameAsInvoice
      ? `${application.contact_name || '-'} • ${application.phone || '-'}`
      : `${application.shipping_name || '-'} • ${application.shipping_phone || '-'}`

    const lines = [
      `Application #${application.id}`,
      `Company/Client: ${application.company_name || '-'}`,
      `Customer Type: ${application.customer_type === 'client' ? 'Client' : 'Company'}`,
      `Business Type: ${application.business_type || '-'}`,
      `VAT: ${application.vat_number || '-'}`,
      `Contact: ${application.contact_name || '-'} • ${application.contact_email || '-'} • ${application.phone || '-'}`,
      `Shipping Type: ${application.shipping_type || '-'}`,
      `Invoice Address: ${invoiceAddress || '-'}`,
      `Shipping Address: ${shippingAddress || '-'}`,
      `Shipping Contact: ${shippingContact}`,
      shippingSameAsInvoice ? 'Shipping same as invoice: Yes' : 'Shipping same as invoice: No',
    ]

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedApplicationId(application.id)
    window.setTimeout(() => {
      setCopiedApplicationId((current) => (current === application.id ? null : current))
    }, 1800)
  }

  const copyInvoiceDetails = async (application) => {
    const invoiceAddress = [
      application.invoice_address_line1,
      application.invoice_area,
      application.invoice_region,
      application.invoice_postal_code,
      application.invoice_country || application.country,
    ].filter(Boolean).join(', ')

    const lines = [
      `Application #${application.id}`,
      `Company/Client: ${application.company_name || '-'}`,
      `Customer Type: ${application.customer_type === 'client' ? 'Client' : 'Company'}`,
      `VAT: ${application.vat_number || '-'}`,
      `Invoice Address: ${invoiceAddress || '-'}`,
      `Invoice Contact: ${application.contact_name || '-'} • ${application.contact_email || '-'} • ${application.phone || '-'}`,
    ]

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedInvoiceId(application.id)
    window.setTimeout(() => {
      setCopiedInvoiceId((current) => (current === application.id ? null : current))
    }, 1800)
  }

  const copyShippingDetails = async (application) => {
    const shippingSameAsInvoice = application.shipping_same_as_invoice !== false
    const invoiceAddress = [
      application.invoice_address_line1,
      application.invoice_area,
      application.invoice_region,
      application.invoice_postal_code,
      application.invoice_country || application.country,
    ].filter(Boolean).join(', ')

    const shippingAddress = shippingSameAsInvoice
      ? invoiceAddress
      : [
          application.shipping_address_line1,
          application.shipping_area,
          application.shipping_region,
          application.shipping_postal_code,
          application.shipping_country,
        ].filter(Boolean).join(', ')

    const shippingContact = shippingSameAsInvoice
      ? `${application.contact_name || '-'} • ${application.phone || '-'}`
      : `${application.shipping_name || '-'} • ${application.shipping_phone || '-'}`

    const lines = [
      `Application #${application.id}`,
      `Company/Client: ${application.company_name || '-'}`,
      `Shipping Type: ${application.shipping_type || '-'}`,
      `Shipping same as invoice: ${shippingSameAsInvoice ? 'Yes' : 'No'}`,
      `Shipping Address: ${shippingAddress || '-'}`,
      `Shipping Contact: ${shippingContact}`,
    ]

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedShippingId(application.id)
    window.setTimeout(() => {
      setCopiedShippingId((current) => (current === application.id ? null : current))
    }, 1800)
  }

  const reviewApplication = async (application, status) => {
    if (!hasSupabaseConfig || !supabase) {
      setErrorMessage('Supabase is not configured.')
      return
    }

    setIsSavingId(application.id)
    setErrorMessage('')
    setSuccessMessage('')

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase
      .from(registrationsTable)
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData?.user?.email ?? null,
      })
      .eq('id', application.id)

    if (error) {
      setErrorMessage(error.message)
      setIsSavingId(null)
      return
    }

    const subject = status === 'approved'
      ? `Welcome to GEL.IT.UP Portal, ${application.contact_name}`
      : `GEL.IT.UP Portal application update`

    const html = status === 'approved'
      ? `<p>Hello ${application.contact_name},</p><p>Welcome to the GEL.IT.UP B2B Portal. Your distributor/salon account for <strong>${application.company_name}</strong> has been approved.</p><p>You can now sign in and start ordering from the portal.</p><p>Best regards,<br/>GEL.IT.UP Distribution Team</p>`
      : `<p>Hello ${application.contact_name},</p><p>Your GEL.IT.UP B2B Portal application for <strong>${application.company_name}</strong> has been reviewed and marked as rejected.</p><p>If you need support or want to re-apply, contact us at ${B2B_EMAIL}.</p><p>Best regards,<br/>GEL.IT.UP Distribution Team</p>`

    const notificationResult = await sendPortalEmailNotification({
      eventType: status === 'approved' ? 'application_approved' : 'application_rejected',
      to: application.contact_email,
      subject,
      html,
      applicationId: application.id,
      companyName: application.company_name,
      contactName: application.contact_name,
      status,
    })

    if (notificationResult.ok) {
      setSuccessMessage(`Application #${application.id} marked as ${status}. Notification email sent.`)
    }
    else if (notificationResult.skipped) {
      setSuccessMessage(`Application #${application.id} marked as ${status}. Email webhook not configured yet.`)
    }
    else {
      setSuccessMessage(`Application #${application.id} marked as ${status}. Email failed: ${notificationResult.message}`)
    }

    setIsSavingId(null)
    await loadPendingApplications()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Pending Applications</h3>
        <p className="mt-1 text-xs text-slate-500">
          Review client registration submissions and approve/reject access requests.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {isLoading && <p className="text-sm text-slate-600">Loading pending applications...</p>}
        {!isLoading && errorMessage && <p className="text-sm text-rose-600">Unable to load applications: {errorMessage}</p>}
        {!isLoading && !errorMessage && !applications.length && (
          <p className="text-sm text-slate-600">No pending applications.</p>
        )}

        {!isLoading && !errorMessage && applications.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Business</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Shipping</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-4 font-semibold">#{application.id}</td>
                    <td className="py-2 pr-4">{new Date(application.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{application.company_name}</td>
                    <td className="py-2 pr-4">
                      <div>{application.contact_name}</div>
                      <div className="text-xs text-slate-500">{application.contact_email}</div>
                      <div className="text-xs text-slate-500">{application.phone}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-xs font-semibold text-slate-800">{application.business_type}</div>
                      <div className="text-xs text-slate-500">{application.customer_type === 'client' ? 'Client' : 'Company'}</div>
                      <div className="text-xs text-slate-500">VAT: {application.vat_number || '-'}</div>
                      <div className="text-xs text-slate-500">Shipping: {application.shipping_type || '-'}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-xs text-slate-700">{application.invoice_address_line1 || '-'}</div>
                      <div className="text-xs text-slate-500">
                        {[application.invoice_area, application.invoice_region].filter(Boolean).join(', ') || '-'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {[application.invoice_postal_code, application.invoice_country || application.country].filter(Boolean).join(' ')}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      {application.shipping_same_as_invoice
                        ? (
                          <div className="text-xs text-slate-500">Same as invoice</div>
                        )
                        : (
                          <>
                            <div className="text-xs text-slate-700">{application.shipping_address_line1 || '-'}</div>
                            <div className="text-xs text-slate-500">
                              {[application.shipping_area, application.shipping_region].filter(Boolean).join(', ') || '-'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {[application.shipping_postal_code, application.shipping_country].filter(Boolean).join(' ')}
                            </div>
                            <div className="text-xs text-slate-500">
                              {(application.shipping_name || '-')}
                              {' · '}
                              {(application.shipping_phone || '-')}
                            </div>
                          </>
                        )}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => reviewApplication(application, 'approved')}
                          disabled={isSavingId === application.id}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewApplication(application, 'rejected')}
                          disabled={isSavingId === application.id}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            void copyApplicationDetails(application)
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {copiedApplicationId === application.id ? 'Copied' : 'Copy details'}
                        </button>
                        <button
                          onClick={() => {
                            void copyInvoiceDetails(application)
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {copiedInvoiceId === application.id ? 'Copied invoice' : 'Copy invoice'}
                        </button>
                        <button
                          onClick={() => {
                            void copyShippingDetails(application)
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {copiedShippingId === application.id ? 'Copied shipping' : 'Copy shipping'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {successMessage && <p className="mt-3 text-xs text-emerald-700">{successMessage}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-slate-900">Reviewed Applications</h4>
          <p className="text-xs text-slate-500">Recently approved/rejected applications with copy shortcuts.</p>
        </div>

        {isLoading && <p className="text-sm text-slate-600">Loading reviewed applications...</p>}
        {!isLoading && !errorMessage && !reviewedApplications.length && (
          <p className="text-sm text-slate-600">No reviewed applications yet.</p>
        )}

        {!isLoading && !errorMessage && reviewedApplications.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Reviewed</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Shipping</th>
                  <th className="py-2 pr-4">Copy</th>
                </tr>
              </thead>
              <tbody>
                {reviewedApplications.map((application) => (
                  <tr key={`reviewed-${application.id}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-4 font-semibold">#{application.id}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${application.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div>{application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : '-'}</div>
                      <div className="text-xs text-slate-500">{application.reviewed_by || '-'}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div>{application.company_name}</div>
                      <div className="text-xs text-slate-500">VAT: {application.vat_number || '-'}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div>{application.contact_name}</div>
                      <div className="text-xs text-slate-500">{application.contact_email}</div>
                      <div className="text-xs text-slate-500">{application.phone}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="text-xs text-slate-700">{application.invoice_address_line1 || '-'}</div>
                      <div className="text-xs text-slate-500">
                        {[application.invoice_area, application.invoice_region].filter(Boolean).join(', ') || '-'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {[application.invoice_postal_code, application.invoice_country || application.country].filter(Boolean).join(' ')}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      {application.shipping_same_as_invoice
                        ? (
                          <div className="text-xs text-slate-500">Same as invoice</div>
                        )
                        : (
                          <>
                            <div className="text-xs text-slate-700">{application.shipping_address_line1 || '-'}</div>
                            <div className="text-xs text-slate-500">
                              {[application.shipping_area, application.shipping_region].filter(Boolean).join(', ') || '-'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {[application.shipping_postal_code, application.shipping_country].filter(Boolean).join(' ')}
                            </div>
                            <div className="text-xs text-slate-500">
                              {(application.shipping_name || '-')}
                              {' · '}
                              {(application.shipping_phone || '-')}
                            </div>
                          </>
                        )}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            void copyApplicationDetails(application)
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {copiedApplicationId === application.id ? 'Copied' : 'Copy details'}
                        </button>
                        <button
                          onClick={() => {
                            void copyInvoiceDetails(application)
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {copiedInvoiceId === application.id ? 'Copied invoice' : 'Copy invoice'}
                        </button>
                        <button
                          onClick={() => {
                            void copyShippingDetails(application)
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {copiedShippingId === application.id ? 'Copied shipping' : 'Copy shipping'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PortalDashboard({ onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const ordersTable = import.meta.env.VITE_B2B_ORDERS_TABLE || DEFAULT_ORDERS_TABLE
  const [skuRules, setSkuRules] = useState({
    colorSkuSet: new Set(),
    baseSystemSkuSet: new Set(),
  })
  const [durabilityUpsell, setDurabilityUpsell] = useState({
    isLoading: false,
    shouldShow: false,
  })
  const [performanceWidget, setPerformanceWidget] = useState({
    topSellingColor: '09 Coco Nude',
  })

  const modules = useMemo(
    () => [
      { key: 'overview', label: 'Overview' },
      { key: 'products', label: 'Tier Packages' },
      { key: 'orders', label: 'Orders' },
      { key: 'applications', label: 'Applications' },
      { key: 'invoices', label: 'Order Intake' },
      { key: 'catalog', label: 'Additional Products' },
      { key: 'support', label: 'Support' },
    ],
    [],
  )

  const activeModuleRaw = modules.find((module) => location.pathname.endsWith(module.key))?.key
    ?? (location.pathname.endsWith('solid-colours') ? 'products' : 'overview')
  const activeModule = activeModuleRaw

  useEffect(() => {
    let isMounted = true

    const loadSkuRules = async () => {
      try {
        const response = await fetch('/gelitup-content/sku-rules.json')
        if (!response.ok) return

        const payload = await response.json()
        if (!isMounted) return

        const colorSkuSet = new Set(
          (payload?.colorSkus || [])
            .flatMap((code) => buildColorAliases(code))
            .filter(Boolean),
        )
        const baseSystemSkuSet = new Set((payload?.baseSystemSkus || []).map(normalizeSkuCode).filter(Boolean))

        setSkuRules({ colorSkuSet, baseSystemSkuSet })
      }
      catch {
        if (!isMounted) return
      }
    }

    void loadSkuRules()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const normalizeItemCodes = (items) => {
      if (Array.isArray(items)) {
        return items
          .map((item) => normalizeSkuCode(item))
          .filter(Boolean)
      }

      if (typeof items === 'string') {
        try {
          const parsed = JSON.parse(items)
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) => normalizeSkuCode(item))
              .filter(Boolean)
          }
        }
        catch {
          // treat as comma-separated text fallback
        }

        return items
          .split(',')
          .map((item) => normalizeSkuCode(item))
          .filter(Boolean)
      }

      return []
    }

    const isColorCode = (value) => {
      if (!value) return false

      if (skuRules.colorSkuSet.size > 0) {
        return buildColorAliases(value).some((alias) => skuRules.colorSkuSet.has(alias))
      }

      const lower = value.toLowerCase()
      if (lower.includes('giup-col')) return true
      if (lower.includes('color') || lower.includes('colour')) return true
      if (/^\d{1,4}[a-z]?$/i.test(value)) return true

      return false
    }

    const isBaseSystemCode = (value) => {
      if (!value) return false

      if (skuRules.baseSystemSkuSet.size > 0) {
        return skuRules.baseSystemSkuSet.has(value)
      }

      const lower = value.toLowerCase()

      return lower.includes('superbond')
        || lower.includes('5-in-1')
        || lower.includes('5in1')
        || lower.includes('superior base')
        || lower.includes('giup-mnt-sb01')
        || lower.includes('giup-mnt-5c01')
    }

    const runAnalysis = async () => {
      if (activeModule !== 'overview' || !hasSupabaseConfig || !supabase) {
        if (isMounted) {
          setDurabilityUpsell({ isLoading: false, shouldShow: false })
        }
        return
      }

      if (isMounted) {
        setDurabilityUpsell({ isLoading: true, shouldShow: false })
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData?.user?.email) {
        if (isMounted) {
          setDurabilityUpsell({ isLoading: false, shouldShow: false })
        }
        return
      }

      const userEmail = userData.user.email.toLowerCase()
      const { data: orderRows, error: orderError } = await supabase
        .from(ordersTable)
        .select('items, customer_email, created_at')
        .eq('customer_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(50)

      if (orderError || !Array.isArray(orderRows)) {
        if (isMounted) {
          setDurabilityUpsell({ isLoading: false, shouldShow: false })
        }
        return
      }

      const purchasedCodes = orderRows
        .flatMap((order) => normalizeItemCodes(order.items))

      const purchasedColors = purchasedCodes.some(isColorCode)
      const purchasedBaseSystem = purchasedCodes.some(isBaseSystemCode)

      if (isMounted) {
        setDurabilityUpsell({
          isLoading: false,
          shouldShow: purchasedColors && !purchasedBaseSystem,
        })
      }
    }

    const timeoutId = window.setTimeout(() => {
      void runAnalysis()
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(timeoutId)
    }
  }, [activeModule, ordersTable, skuRules])

  useEffect(() => {
    let mounted = true

    const loadPerformanceWidget = async () => {
      if (activeModule !== 'overview' || !hasSupabaseConfig || !supabase) {
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      const userEmail = userData?.user?.email?.toLowerCase()
      if (!userEmail) {
        return
      }

      const { data: orderRows } = await supabase
        .from(ordersTable)
        .select('items')
        .eq('customer_email', userEmail)
        .limit(200)

      const counts = new Map()
      const parseItems = (items) => {
        if (Array.isArray(items)) return items.map((item) => normalizeSkuCode(item))
        if (typeof items === 'string') {
          try {
            const parsed = JSON.parse(items)
            if (Array.isArray(parsed)) {
              return parsed.map((item) => normalizeSkuCode(item))
            }
          }
          catch {
            return items.split(',').map((item) => normalizeSkuCode(item))
          }
        }
        return []
      }

      ;(orderRows || [])
        .flatMap((row) => parseItems(row.items))
        .forEach((raw) => {
          const normalized = normalizeSkuCode(raw)
          const codeMatch = normalized.match(/GIUP-COL-([A-Z0-9]+)/)
          const code = codeMatch?.[1] || (isLikelyColorSku(normalized) ? normalized : '')
          if (!code) return
          counts.set(code, (counts.get(code) || 0) + 1)
        })

      const topCode = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])?.[0]?.[0]
      const topLabel = topCode
        ? topCode === '09'
          ? '09 Coco Nude'
          : topCode
        : '09 Coco Nude'

      if (mounted) {
        setPerformanceWidget({
          topSellingColor: topLabel,
        })
      }
    }

    void loadPerformanceWidget()

    return () => {
      mounted = false
    }
  }, [activeModule, ordersTable])

  return (
    <section className="grid gap-4 lg:grid-cols-[240px,1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Portal Menu</p>
        <nav className="space-y-1">
          {modules.map((module) => (
            <NavLink
              key={module.key}
              to={`/portal/dashboard/${module.key}`}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {module.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={onLogout} className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
          Sign Out
        </button>
      </aside>

      <div className="space-y-4">
        {activeModule === 'products' || activeModule === 'catalog' ? (
          <ProductsModule moduleView={activeModule} />
        ) : activeModule === 'orders' ? (
          <OrdersModule />
        ) : activeModule === 'applications' ? (
          <PendingApplicationsModule />
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-semibold text-slate-900">{modules.find((module) => module.key === activeModule)?.label}</h2>
              <p className="mt-2 text-sm text-slate-600">Trade account workspace optimized for desktop and mobile management.</p>
            </div>

            {activeModule === 'overview' && durabilityUpsell.isLoading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Analyzing your order history...
              </div>
            )}

            {activeModule === 'overview' && durabilityUpsell.shouldShow && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Durability Recommendation</p>
                <p className="mt-2 text-sm text-amber-900">
                  Maximize your color durability: 85% of top salons pair these shades with the 5-in-1 Superior Base system.
                  Add a 6-pack to your order for a 10% volume discount?
                </p>
                <NavLink
                  to="/portal/dashboard/products"
                  className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Add Base System Products
                </NavLink>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Open Orders</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">12</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Intake Queue</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">4</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Credit Limit Left</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">N/A</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Support Tickets</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">2</p>
              </article>
            </div>

            {activeModule === 'overview' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">DIST_PERFORMANCE_01</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Top Selling Color in Your Region</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{performanceWidget.topSellingColor}</p>
                  </article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Available Credit Limit</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">N/A</p>
                  </article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Quick Restock</p>
                    <p className="mt-1 text-xs text-slate-600">Add {DEFAULT_PACKAGE_ITEM_QTY}x of all Pod_1 colors to cart in one click.</p>
                    <button
                      onClick={() => navigate('/portal/dashboard/products?quickRestock=pod_1')}
                      className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Trigger Pod_1 Restock
                    </button>
                  </article>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-slate-900">Action Center</h3>
              <p className="mt-2 text-sm text-slate-600">
                This section is ready for API integration: order creation, order intake workflows, and distributor account actions.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function ProtectedPortal({ isAuthenticated, onLogout, authReady }) {
  if (!authReady) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Checking account session...
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />
  }

  return <PortalDashboard onLogout={onLogout} />
}

function LegalPageLayout({ title, children }) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: February 2026</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700 sm:p-6">
        {children}
      </div>
    </section>
  )
}

function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <div className="space-y-3">
        <p>
          GEL.IT.UP processes personal data to provide services, respond to requests, manage distributor applications,
          and maintain account security.
        </p>
        <p>
          We collect only the data needed for business operations, including contact information, billing and shipping details,
          and account activity.
        </p>
        <p>
          Data may be shared with trusted service providers for hosting, authentication, transactional messaging, and operational support.
        </p>
        <p>
          You may request access, correction, or deletion of your personal data by contacting us at {PROFORMA_LEEUKOPF_EMAIL}.
        </p>
      </div>
    </LegalPageLayout>
  )
}

function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy">
      <div className="space-y-3">
        <p>
          This site uses cookies and similar technologies to keep core functionality working, remember your preferences,
          and improve user experience.
        </p>
        <p>
          Essential cookies are required for basic site operations. Optional analytics or preference cookies may be added as needed.
        </p>
        <p>
          By clicking “Accept Cookies”, you confirm consent to cookie use as described in this policy.
        </p>
      </div>
    </LegalPageLayout>
  )
}

function TermsAndConditionsPage() {
  return (
    <LegalPageLayout title="Terms and Conditions">
      <div className="space-y-3">
        <p>
          By using this website, you agree to these terms. Product information, pricing, and availability are provided for
          commercial reference and may be updated without prior notice.
        </p>
        <p>
          Orders, account approvals, and distribution relationships are subject to eligibility checks and separate commercial agreements.
        </p>
        <p>
          Unauthorized copying, scraping, or misuse of content is prohibited.
        </p>
        <p>
          For account and legal questions, contact us at {PROFORMA_LEEUKOPF_EMAIL}.
        </p>
      </div>
    </LegalPageLayout>
  )
}

function FooterSocialIcon({ platform }) {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17" cy="7" r="1.1" fill="currentColor" />
      </svg>
    )
  }

  if (platform === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.2 10.4V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8.2" cy="7.8" r="1" fill="currentColor" />
        <path d="M12 16V10.4M12 12.1C12 11 12.9 10.2 14 10.2C15.1 10.2 16 11 16 12.1V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (platform === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13.7 8H15V5.9H13.3C11.7 5.9 10.7 7 10.7 8.7V10H9V12.2H10.7V18H13.2V12.2H15L15.4 10H13.2V8.9C13.2 8.3 13.4 8 13.7 8Z" fill="currentColor" />
      </svg>
    )
  }

  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <rect x="3.5" y="6.5" width="17" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M11 10.1L14.8 12L11 13.9V10.1Z" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M15.2 7.8c-1.1 0-2 .9-2 2v4.1c0 .8-.6 1.4-1.4 1.4-.8 0-1.4-.6-1.4-1.4 0-.8.6-1.4 1.4-1.4.2 0 .5.1.7.1v-2.3a4 4 0 0 0-.7-.1 3.7 3.7 0 0 0-3.7 3.7 3.7 3.7 0 0 0 3.7 3.7 3.7 3.7 0 0 0 3.7-3.7v-2.7c.7.5 1.5.9 2.3.9V9.7c-1.3 0-2.2-.9-2.6-1.9Z" fill="currentColor" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function App() {
  const [isPortalAuthenticated, setIsPortalAuthenticated] = useState(() => localStorage.getItem('portalAuth') === 'true')
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig)
  const [hasAcceptedCookies, setHasAcceptedCookies] = useState(() => localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === 'accepted')
  const registrationsTable = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || DEFAULT_REGISTRATIONS_TABLE
  const adminsTable = import.meta.env.VITE_B2B_ADMINS_TABLE || 'b2b_admins'
  const requireApproval = import.meta.env.VITE_REQUIRE_B2B_APPROVAL !== 'false'

  const handleAcceptCookies = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted')
    setHasAcceptedCookies(true)
  }, [])

  useEffect(() => {
    if (hasSupabaseConfig) {
      return undefined
    }

    localStorage.setItem('portalAuth', String(isPortalAuthenticated))
  }, [isPortalAuthenticated])

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      return undefined
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setIsPortalAuthenticated(Boolean(data.session))
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsPortalAuthenticated(Boolean(session))
      setAuthReady(true)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handlePortalLogin = async (email, password) => {
    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        return { ok: false, message: error.message, applicationStatus: '' }
      }

      if (requireApproval) {
        const normalizedEmail = email.trim().toLowerCase()

        const { data: adminRows, error: adminError } = await supabase
          .from(adminsTable)
          .select('email')
          .eq('email', normalizedEmail)
          .limit(1)

        if (adminError) {
          await supabase.auth.signOut()
          return {
            ok: false,
            message: `Login blocked: admin status could not be verified (${adminError.message}).`,
            applicationStatus: '',
          }
        }

        if (adminRows?.length) {
          setIsPortalAuthenticated(true)
          return { ok: true, applicationStatus: 'approved' }
        }

        const { data: registrationRows, error: registrationError } = await supabase
          .from(registrationsTable)
          .select('*')
          .eq('contact_email', normalizedEmail)
          .order('created_at', { ascending: false })
          .limit(1)

        if (registrationError) {
          await supabase.auth.signOut()
          return {
            ok: false,
            message: `Login blocked: registration status could not be verified (${registrationError.message}).`,
            applicationStatus: '',
          }
        }

        const latestRegistration = registrationRows?.[0]
        const status = latestRegistration?.status?.toLowerCase()

        if (status !== 'approved') {
          await supabase.auth.signOut()

          if (status === 'rejected') {
            return {
              ok: false,
              message: 'Your B2B application was rejected. Contact distribution support for next steps.',
              applicationStatus: 'rejected',
            }
          }

          if (status === 'pending') {
            return {
              ok: false,
              message: 'Your B2B application is pending approval. Access is enabled after manual review.',
              applicationStatus: 'pending',
            }
          }

          return {
            ok: false,
            message: 'No approved B2B application found for this account email.',
            applicationStatus: 'pending',
          }
        }

        try {
          const approvedRegistration = latestRegistration || null

          if (approvedRegistration) {
            const registrationProfile = buildClientProfileFromRegistration(approvedRegistration)

            try {
              const savedRaw = localStorage.getItem(CLIENT_PROFILE_STORAGE_KEY)
              const parsed = savedRaw ? JSON.parse(savedRaw) : null
              const currentLocal = parsed && typeof parsed === 'object' ? parsed : {}
              const mergedLocalProfile = {
                ...defaultClientProfile,
                ...currentLocal,
                ...registrationProfile,
              }
              localStorage.setItem(CLIENT_PROFILE_STORAGE_KEY, JSON.stringify(mergedLocalProfile))
            }
            catch {
              localStorage.setItem(CLIENT_PROFILE_STORAGE_KEY, JSON.stringify(registrationProfile))
            }

            const { data: userData } = await supabase.auth.getUser()
            const currentMeta = userData?.user?.user_metadata || {}

            await supabase.auth.updateUser({
              data: {
                ...currentMeta,
                ...buildUserMetadataFromRegistration(approvedRegistration),
              },
            })
          }
        }
        catch {
          // Non-blocking profile import.
        }
      }

      setIsPortalAuthenticated(true)
      return { ok: true, applicationStatus: 'approved' }
    }

    if (!email || !password) {
      return { ok: false, message: 'Email and password are required.', applicationStatus: '' }
    }

    setIsPortalAuthenticated(true)
    return { ok: true, applicationStatus: 'approved' }
  }

  const handleAdminLogin = async (email, password) => {
    if (!hasSupabaseConfig || !supabase) {
      return { ok: false, message: 'Live auth is not configured.' }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

    if (signInError) {
      return { ok: false, message: signInError.message }
    }

    const { data: adminRows, error: adminError } = await supabase
      .from(adminsTable)
      .select('email')
      .eq('email', normalizedEmail)
      .limit(1)

    if (adminError) {
      await supabase.auth.signOut()
      return { ok: false, message: `Admin access check failed (${adminError.message}).` }
    }

    if (!adminRows?.length) {
      await supabase.auth.signOut()
      return { ok: false, message: 'This account is not registered as a B2B admin reviewer.' }
    }

    setIsPortalAuthenticated(true)
    return { ok: true }
  }

  const handlePortalRegister = async (application) => {
    if (hasSupabaseConfig && supabase) {
      const shippingSameAsInvoice = application.shippingSameAsInvoice !== false
      const invoiceCountry = application.invoiceCountry.trim()
      const invoiceArea = application.invoiceArea.trim()
      const invoiceRegion = application.invoiceRegion.trim()
      const invoicePostalCode = application.invoicePostalCode.trim()
      const invoiceAddressLine1 = application.invoiceAddressLine1.trim()

      const shippingName = shippingSameAsInvoice ? application.contactName.trim() : application.shippingName.trim()
      const shippingPhone = shippingSameAsInvoice ? application.phone.trim() : application.shippingPhone.trim()
      const shippingAddressLine1 = shippingSameAsInvoice ? invoiceAddressLine1 : application.shippingAddressLine1.trim()
      const shippingAddressLine2 = shippingSameAsInvoice ? application.invoiceAddressLine2.trim() : application.shippingAddressLine2.trim()
      const shippingArea = shippingSameAsInvoice ? invoiceArea : application.shippingArea.trim()
      const shippingRegion = shippingSameAsInvoice ? invoiceRegion : application.shippingRegion.trim()
      const shippingCountry = shippingSameAsInvoice ? invoiceCountry : application.shippingCountry.trim()
      const shippingPostalCode = shippingSameAsInvoice ? invoicePostalCode : application.shippingPostalCode.trim()

      const requiredFields = [
        ['client type', application.customerType],
        ['company/client name', application.companyName],
        ['VAT number', application.vatNumber],
        ['contact name', application.contactName],
        ['contact email', application.contactEmail],
        ['phone', application.phone],
        ['shipping type', application.shippingType],
        ['invoice address line 1', invoiceAddressLine1],
        ['invoice area/city', invoiceArea],
        ['invoice region/state', invoiceRegion],
        ['invoice country', invoiceCountry],
        ['invoice postal code', invoicePostalCode],
        ['business type', application.businessType],
      ]

      if (!shippingSameAsInvoice) {
        requiredFields.push(
          ['shipping contact name', shippingName],
          ['shipping phone', shippingPhone],
          ['shipping address line 1', shippingAddressLine1],
          ['shipping area/city', shippingArea],
          ['shipping region/state', shippingRegion],
          ['shipping country', shippingCountry],
          ['shipping postal code', shippingPostalCode],
        )
      }

      const missingField = requiredFields.find(([, value]) => !String(value || '').trim())
      if (missingField) {
        return { ok: false, message: `Please complete ${missingField[0]}.` }
      }

      const payload = {
        customer_type: application.customerType.trim(),
        company_name: application.companyName.trim(),
        vat_number: application.vatNumber.trim(),
        contact_name: application.contactName.trim(),
        contact_email: application.contactEmail.trim().toLowerCase(),
        phone: application.phone.trim(),
        website: application.website.trim() || null,
        shipping_type: application.shippingType.trim(),
        address: invoiceAddressLine1,
        city: invoiceArea,
        postal_code: invoicePostalCode,
        country: invoiceCountry,
        invoice_address_line1: invoiceAddressLine1,
        invoice_address_line2: application.invoiceAddressLine2.trim() || null,
        invoice_area: invoiceArea,
        invoice_region: invoiceRegion,
        invoice_country: invoiceCountry,
        invoice_postal_code: invoicePostalCode,
        shipping_same_as_invoice: shippingSameAsInvoice,
        shipping_name: shippingName || null,
        shipping_phone: shippingPhone || null,
        shipping_address_line1: shippingAddressLine1 || null,
        shipping_address_line2: shippingAddressLine2 || null,
        shipping_area: shippingArea || null,
        shipping_region: shippingRegion || null,
        shipping_country: shippingCountry || null,
        shipping_postal_code: shippingPostalCode || null,
        business_type: application.businessType.trim(),
        notes: application.notes.trim() || null,
        status: 'pending',
      }

      const { data: createdApplication, error } = await supabase
        .from(registrationsTable)
        .insert([payload])
        .select('id, contact_name, contact_email, company_name')
        .single()

      if (error) {
        const missingTableError = error.message?.includes('Could not find the table')
          || error.message?.includes('relation')

        if (missingTableError) {
          return {
            ok: false,
            message: `Registration failed: table \`${registrationsTable}\` is missing in Supabase. Run SQL from /supabase/sql/create_b2b_registrations.sql and retry.`,
          }
        }

        return { ok: false, message: error.message }
      }

      const notificationResult = await sendPortalEmailNotification({
        eventType: 'application_received',
        to: payload.contact_email,
        subject: `Application received: ${payload.company_name}`,
        html: `<p>Hello ${payload.contact_name},</p><p>Thank you for applying to the GEL.IT.UP B2B Portal for <strong>${payload.company_name}</strong>.</p><p>Your application is now pending manual review. We will notify you as soon as it is approved.</p><p>Best regards,<br/>GEL.IT.UP Distribution Team</p>`,
        applicationId: createdApplication?.id,
        companyName: payload.company_name,
        contactName: payload.contact_name,
      })

      if (!notificationResult.ok && !notificationResult.skipped) {
        return {
          ok: true,
          message: `Application submitted, but confirmation email failed: ${notificationResult.message}`,
        }
      }

      if (notificationResult.skipped) {
        return {
          ok: true,
          message: 'Application submitted. Email webhook is not configured yet.',
        }
      }

      return { ok: true }
    }

    return { ok: false, message: 'Live registration is not configured.' }
  }

  const handleResendConfirmation = async (email) => {
    if (!email) {
      return { ok: false, message: 'Enter your email first, then click resend.' }
    }

    if (hasSupabaseConfig && supabase) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/portal/login`,
        },
      })

      if (error) {
        return { ok: false, message: error.message }
      }

      return { ok: true }
    }

    return { ok: false, message: 'Live auth is not configured.' }
  }

  const handleCheckApproval = async (email) => {
    if (!email) {
      return { ok: false, message: 'Enter your business email first.' }
    }

    if (!hasSupabaseConfig || !supabase) {
      return { ok: false, message: 'Live auth is not configured.' }
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: registrationRows, error } = await supabase
      .from(registrationsTable)
      .select('status')
      .eq('contact_email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return { ok: false, message: error.message }
    }

    const status = registrationRows?.[0]?.status?.toLowerCase() || 'pending'

    return { ok: true, applicationStatus: status }
  }

  const handlePortalLogout = async () => {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut()
    }

    setIsPortalAuthenticated(false)
    localStorage.removeItem('portalAuth')
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <ScrollToTopOnRouteChange />
      <header className="sticky top-0 z-40 border-b border-white/15 bg-black/80 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 md:px-6 md:py-3">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="Gelitup logo" className="h-9 w-9 rounded-lg object-cover md:h-10 md:w-10" />
            <div>
              <p className="text-xs font-black uppercase leading-none tracking-[0.07em] text-white md:text-sm md:tracking-[0.08em]">GEL.IT.UP</p>
              <p className="text-[11px] text-white/65 md:text-xs">Distributor Website</p>
            </div>
          </div>
          <Nav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-10">
        <Routes>
          <Route path="/" element={LEGACY_MIRROR_ENABLED ? <LegacyMirrorPage pagePath="/" /> : <HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route
            path="/about-us"
            element={LEGACY_MIRROR_ENABLED ? <LegacyMirrorPage pagePath="/about-us" /> : <Navigate to="/pages/about-us" replace />}
          />
          <Route path="/our-products" element={<Navigate to="/distributor-packages" replace />} />
          <Route
            path="/distributors"
            element={LEGACY_MIRROR_ENABLED ? <LegacyMirrorPage pagePath="/distributors" /> : <Navigate to="/become-distributor" replace />}
          />
          <Route
            path="/contact-us"
            element={LEGACY_MIRROR_ENABLED ? <LegacyMirrorPage pagePath="/contact-us" /> : <Navigate to="/pages/contact-us" replace />}
          />
          <Route path="/products" element={<Navigate to="/distributor-packages" replace />} />
          <Route path="/distributor-packages" element={<DistributorPackagesPage />} />
          <Route path="/full-catalogue" element={<FullCataloguePage />} />
          <Route path="/catalogue" element={<Navigate to="/full-catalogue" replace />} />
          <Route path="/packages" element={<Navigate to="/distributor-packages" replace />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
          <Route path="/certifications" element={<HomePage />} />
          <Route path="/contact" element={<HomePage />} />
          <Route path="/baseline" element={<Navigate to="/" replace />} />
          <Route path="/baseline/:slug" element={<Navigate to="/" replace />} />
          <Route path="/pages/:slug" element={<ImportedAnyPage />} />
          <Route path="/become-distributor" element={<PortalRegister onRegister={handlePortalRegister} />} />

          {PORTAL_ENABLED
            ? (
              <>
                <Route path="/portal" element={<PortalLanding />} />
                <Route
                  path="/portal/login"
                  element={(
                    <PortalLogin
                      onLogin={handlePortalLogin}
                      onResendConfirmation={handleResendConfirmation}
                      onCheckApproval={handleCheckApproval}
                    />
                  )}
                />
                <Route path="/portal/admin-login" element={<PortalAdminLogin onAdminLogin={handleAdminLogin} />} />
                <Route path="/portal/admin-login/*" element={<PortalAdminLogin onAdminLogin={handleAdminLogin} />} />
                <Route path="/admin-login" element={<Navigate to="/portal/admin-login" replace />} />
                <Route path="/portal/register" element={<PortalRegister onRegister={handlePortalRegister} />} />
                <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
                <Route
                  path="/portal/dashboard/:module"
                  element={<ProtectedPortal authReady={authReady} isAuthenticated={isPortalAuthenticated} onLogout={handlePortalLogout} />}
                />
                <Route path="/portal/products" element={<Navigate to="/portal/dashboard/products" replace />} />
                <Route path="/portal/solid-colours" element={<Navigate to="/portal/dashboard/products" replace />} />
                <Route path="/portal/dashboard/solid-colours" element={<Navigate to="/portal/dashboard/products" replace />} />
                <Route path="/portal/dashboard" element={<Navigate to="/portal/dashboard/overview" replace />} />
              </>
            )
            : (
              <>
                <Route path="/portal/*" element={<PortalAccessNotice />} />
                <Route path="/admin-login" element={<PortalAccessNotice />} />
              </>
            )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hasAcceptedCookies && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-3 md:bottom-4 md:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-xl border border-white/20 bg-black/90 p-3 text-white shadow-sm backdrop-blur-[10px] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/80">
              We use cookies to improve your experience. By continuing, you agree to our cookie use.
              {' '}
              <NavLink to="/cookie-policy" className="font-semibold text-fuchsia-300 underline">Read Cookie Policy</NavLink>
            </p>
            <button
              type="button"
              onClick={handleAcceptCookies}
              className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-fuchsia-500"
            >
              Accept Cookies
            </button>
          </div>
        </div>
      )}

      <footer className="mx-auto mt-6 max-w-6xl space-y-5 rounded-2xl border border-white/15 bg-black/85 px-3 pb-4 pt-4 text-xs text-white/80 backdrop-blur-[10px] md:mt-8 md:px-6 md:pt-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Company</p>
            <p className="mt-2 text-sm font-semibold text-white">{PROFORMA_LEEUKOPF_COMPANY}</p>
            <p className="mt-1">{PROFORMA_LEEUKOPF_ADDRESS}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Contact</p>
            <p className="mt-2">Phone: {PROFORMA_LEEUKOPF_PHONE}</p>
            <p className="mt-1">Email: {PROFORMA_LEEUKOPF_EMAIL}</p>
            <p className="mt-1">Orders: {ORDER_INBOX_EMAIL}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Menu</p>
            <div className="mt-2 space-y-1.5">
              <NavLink to="/" className="block transition duration-300 hover:text-fuchsia-300">Home</NavLink>
              <NavLink to="/pages/about-us" className="block transition duration-300 hover:text-fuchsia-300">About Us</NavLink>
              <NavLink to="/full-catalogue" className="block transition duration-300 hover:text-fuchsia-300">Catalogue</NavLink>
              <NavLink to="/distributor-packages" className="block transition duration-300 hover:text-fuchsia-300">Distributor Packages</NavLink>
              <NavLink to="/become-distributor" className="block transition duration-300 hover:text-fuchsia-300">Become Distributor</NavLink>
              <NavLink to="/pages/contact-us" className="block transition duration-300 hover:text-fuchsia-300">Contact Us</NavLink>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Legal</p>
            <div className="mt-2 space-y-1.5">
              <NavLink to="/privacy-policy" className="block transition duration-300 hover:text-fuchsia-300">Privacy Policy</NavLink>
              <NavLink to="/cookie-policy" className="block transition duration-300 hover:text-fuchsia-300">Cookie Policy</NavLink>
              <NavLink to="/terms-and-conditions" className="block transition duration-300 hover:text-fuchsia-300">Terms and Conditions</NavLink>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Social</p>
            <div className="mt-2 space-y-2">
              {FOOTER_SOCIAL_LINKS.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 transition duration-300 hover:text-fuchsia-300"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/30 text-white/85">
                    <FooterSocialIcon platform={social.key} />
                  </span>
                  <span className="font-medium">{social.label}</span>
                  <span className="text-white/55">{social.handle}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="border-t border-white/15 pt-3 text-white/55">© 2026 GEL.IT.UP by GIUP®</p>
      </footer>

      <MobileNav />
      <PWABadge />
    </div>
  )
}

export default App
