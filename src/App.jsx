import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import appLogo from '/gelitup_logo.png'
import PWABadge from './PWABadge.jsx'
import ImportedAnyPage from './pages/imported/ImportedAnyPage.jsx'
import { hasSupabaseConfig, supabase } from './lib/supabaseClient'
import useB2BIntelligence from './lib/useB2BIntelligence'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const B2B_EMAIL = 'gelitup.portal@gelitup.com'
const PRODUCT_CATEGORIES = ['Solid Colours', 'Builder Gels', 'Base & Top', 'Nail Care', 'Accessories']
const DEFAULT_PRODUCTS_TABLE = 'b2b_products'
const DEFAULT_ORDERS_TABLE = 'b2b_orders'
const DEFAULT_REGISTRATIONS_TABLE = 'b2b_registrations'
function readBooleanEnvFlag(value, fallbackValue = false) {
  if (value === undefined || value === null || value === '') {
    return fallbackValue
  }

  return /^(1|true|yes|on)$/i.test(String(value).trim())
}

const PORTAL_ENABLED = readBooleanEnvFlag(import.meta.env.VITE_ENABLE_PORTAL, false)
const LEGACY_MIRROR_ENABLED = readBooleanEnvFlag(import.meta.env.VITE_ENABLE_LEGACY_MIRROR, false)
const LEGACY_SITE_ORIGIN = (import.meta.env.VITE_LEGACY_SITE_ORIGIN || 'https://www.gelitup.com').replace(/\/$/, '')
const EMAIL_WEBHOOK_URL = import.meta.env.VITE_EMAIL_WEBHOOK_URL
const EMAIL_WEBHOOK_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'gelitup.portal@gelitup.com'
const EMAIL_REPLY_TO = import.meta.env.VITE_EMAIL_REPLY_TO || B2B_EMAIL
const ORDER_INBOX_EMAIL = import.meta.env.VITE_B2B_ORDER_INBOX || B2B_EMAIL
const ORDER_BACKUP_INBOX_EMAIL = import.meta.env.VITE_B2B_ORDER_BACKUP_INBOX || 'info@gelitup.com'
const CONTACT_INBOX_EMAIL = 'info@gelitup.com'
const SUPPORT_WHATSAPP_NUMBER = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '+306940715234'
const SUPPORT_WHATSAPP_URL = import.meta.env.VITE_SUPPORT_WHATSAPP_URL
  || `https://wa.me/${String(SUPPORT_WHATSAPP_NUMBER).replace(/[^\d]/g, '')}`
const PORTAL_INTERNAL_BYPASS_EMAILS = new Set(
  [
    'distributors@gelitup.com',
    ...String(import.meta.env.VITE_PORTAL_INTERNAL_BYPASS_EMAILS || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  ],
)
const ZOHO_SYNC_WEBHOOK_URL = import.meta.env.VITE_ZOHO_SYNC_WEBHOOK_URL
const ZOHO_SYNC_ENABLED = readBooleanEnvFlag(import.meta.env.VITE_ENABLE_ZOHO_SYNC, false)
const ZOHO_SYNC_TIMEOUT_MS = Number.parseInt(import.meta.env.VITE_ZOHO_SYNC_TIMEOUT_MS || '12000', 10)
const ZOHO_SYNC_AUTH_TOKEN = import.meta.env.VITE_ZOHO_SYNC_AUTH_TOKEN || ''
const ZOHO_SYNC_TARGET = import.meta.env.VITE_ZOHO_SYNC_TARGET || 'books'
const PAYMENT_BANK_DETAILS = import.meta.env.VITE_PAYMENT_BANK_DETAILS || ''
const PAYMENT_REVOLUT_URL = import.meta.env.VITE_PAYMENT_REVOLUT_URL || ''
const PAYMENT_STRIPE_URL = import.meta.env.VITE_PAYMENT_STRIPE_URL || ''
const PAYMENT_PAYPAL_URL = import.meta.env.VITE_PAYMENT_PAYPAL_URL || ''
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
const PROFORMA_LEEUKOPF_EMAIL = import.meta.env.VITE_PROFORMA_LEEUKOPF_EMAIL || 'gelitup.portal@gelitup.com'
const TIKTOK_URL = import.meta.env.VITE_TIKTOK_URL || 'https://www.tiktok.com/@gelitupgreece'
const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/gelitupgreece'
const LINKEDIN_URL = import.meta.env.VITE_LINKEDIN_URL || 'https://gr.linkedin.com/company/gel-it-up-by-giup'
const FACEBOOK_URL = import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com/GEL.IT.UP.Greece/'
const YOUTUBE_URL = import.meta.env.VITE_YOUTUBE_URL || 'https://www.youtube.com/@GELITUP'
const TIKTOK_HANDLE = import.meta.env.VITE_TIKTOK_HANDLE || 'GELITUPGREECE'
const INSTAGRAM_HANDLE = import.meta.env.VITE_INSTAGRAM_HANDLE || 'gelitupgreece'
const LINKEDIN_HANDLE = import.meta.env.VITE_LINKEDIN_HANDLE || 'GEL.IT.UP'
const FACEBOOK_HANDLE = import.meta.env.VITE_FACEBOOK_HANDLE || '@gelitup'
const YOUTUBE_HANDLE = import.meta.env.VITE_YOUTUBE_HANDLE || '@GELITUP'
const PORTAL_FONT_TTF_URL = import.meta.env.VITE_PORTAL_FONT_TTF_URL || '/fonts/PF-Futura-Neu.ttf'
const CLIENT_PROFILE_STORAGE_KEY = 'gelitup.portal.client_profile.v1'
const COOKIE_CONSENT_STORAGE_KEY = 'gelitup.cookies.consent.v2'
const COMPLIANCE_DATE = '2025-12-01'
const HERO_CINEMATIC_VIDEO_URL = 'https://gelitup.com/wp-content/uploads/2024/03/SarriGelItUp.mp4'
const HOME_HERO_VIDEO_URL = '/gelitup-media/videos/reaching%20hands.mp4'
const HOME_HERO_POSTER_URL = '/gelitup-media/images/news/Spring%20Summer/NEWS%20Carousel/2600-1.jpg'
const HOME_NEWS_CLOUD_VIDEO_URL = '/gelitup-media/videos/floatingclouds.mp4'
const HOME_NEWS_CAROUSEL_FOLDER = '/gelitup-media/images/news/Spring Summer/NEWS Carousel/'
const CONTENT_CACHE_BUSTER = '2026-02-27-1'
const HOME_CLOUD_DANCER_DEFAULT = {
  title: 'Cloud Dancer - The Story',
  introText: 'The new professional neutral. 2026 begins with softness, refinement, and intention. Cloud Dancer Series introduces illuminated tones that enhance the nail without overpowering it. Modern shades designed to feel effortless, elevated, and timeless.',
  ctaLabel: 'See Our Products',
  ctaLink: '/full-catalogue',
}
const LEEUKOPF_DISTRIBUTORS_SOURCE_URL = 'https://leeukopf.com/our-brands'
const DISTRIBUTOR_DIRECTORY = [
  {
    country: 'Belgium',
    distributors: [
      {
        name: 'GEL.IT.UP Belgium',
        address: 'Gentsesteenweg 200, 9800 Deinze, Belgium',
        phone: '+32 484963975',
      },
    ],
  },
  {
    country: 'Bulgaria',
    distributors: [
      {
        name: 'GEL.IT.UP Bulgaria and GEL.IT.UP Nails School',
        address: 'INFINITY NAILS Ltd., Midia Enos No. 3, Entrance 1, Floor 9, Ruse, UIC (Company ID): 203055670, Bulgaria',
        phone: '+359876850055',
        email: 'gelitup_professional@abv.bg',
        website: 'https://gelitup.bg',
      },
    ],
  },
  {
    country: 'France',
    distributors: [
      {
        name: 'GEL.IT.UP France',
        address: "7 Rue du Chemin Blanc, 63800 Cournon d'Auvergne, France",
        phone: '(+33) 0473845460',
        email: 'info@gelitup.fr',
        website: 'https://gelitup.fr/',
      },
    ],
  },
  {
    country: 'Greece',
    distributors: [
      {
        name: 'GEL.IT.UP Corinth',
        address: 'Sikyōnos 1, Kiato, 20200, Greece',
        phone: '+30 2742 402617',
        email: 'info@nailtalesacademy.gr',
        website: 'https://nailtalesacademy.gr/',
      },
      {
        name: 'GEL.IT.UP Greece / GEL.IT.UP Nail College',
        address: '4 Kalamon, Peristeri, 12131, Greece',
        phone: '+30 210 291 4373',
        email: 'orders@gelitup.gr',
        website: 'https://gelitup.gr',
      },
      {
        name: 'Comoprof',
        address: '5 Pyrsinella Vasileiou Street, Ioannina 453 32, Greece',
        phone: '+30 2651 039850',
        email: 'info@comoprof.gr',
        website: 'https://comoprof.gr/',
      },
      {
        name: 'Sonothing',
        address: '3 Thanou Mikroutsikou Street (134 Knossou Avenue), Heraklion, Crete, Greece',
        phone: '+30 2810324235',
        email: 'info@sonothing.gr',
        website: 'https://sonothing.gr/',
      },
      {
        name: 'Bagatouris',
        address: '48 Vasilissis Olgas Avenue, Thessaloniki 546 42, Greece',
        phone: '+30 2311824834',
        email: 'info@beautycompany.gr',
        website: 'https://beautycompany.gr',
      },
      {
        name: 'Centrecare',
        address: 'P.P GERMANOU 14, Thessaloniki, 54622, Greece',
        phone: '+30 2310 265200',
        email: 'Centrecare@centercare.gr',
      },
      {
        name: 'Nails Services Institute Elena Chiou',
        address: 'Greece',
        phone: '+30 2241300919, +30 2241112572',
        email: 'nsinailsgr@gmail.com',
      },
      {
        name: 'Master Educator Nails Artist and Podology Trade and Training Center',
        address: 'Karpathoy 17, RHODES, 85100, Greece',
      },
      {
        name: 'HairMod - Vrettakos Panagiotis',
        address: 'Ippodamou 8 Patra, Patra, 26442, Greece',
        phone: '+30 2614008088',
        email: 'info@hairmod.gr',
      },
    ],
  },
  {
    country: 'Kingdom of Saudi Arabia',
    distributors: [
      {
        name: 'GEL.IT.UP Saudi Arabia - BEAUTY ADDRESS TRADING CO.LTD',
        address: 'AL KHAYAT CENTER, AL TAHLIA STREET ROLEX BOUTIQUE, 2ND FLOOR # 405, Jeddah, 23322, Kingdom of Saudi Arabia',
        phone: '+966 55 337 4320',
      },
    ],
  },
  {
    country: 'Qatar',
    distributors: [
      {
        name: 'GEL.IT.UP Qatar',
        address: 'Burj Marina Tower, 11th Floor, Bldg. No-108 Street-303, Zone-69, PO Box-5774 Lusail City Doha, Qatar',
        phone: '+974 4418 0270',
      },
    ],
  },
  {
    country: 'United States',
    distributors: [
      {
        name: 'GEL.IT.UP USA',
        address: '400 Alton Rd Ste 105, Miami Beach, FL 33139, United States',
        phone: '(+1) 786 395-8506, (+1) 786 200-2062',
        email: 'usagelitup@gmail.com',
        website: 'https://gelitup.us.com',
      },
    ],
  },
]
const VERIFIED_DISTRIBUTOR_COUNTRIES = DISTRIBUTOR_DIRECTORY.map((item) => item.country)
const DISTRIBUTOR_COUNTRY_COORDINATES = {
  Belgium: [50.5039, 4.4699],
  Bulgaria: [42.7339, 25.4858],
  France: [46.2276, 2.2137],
  Greece: [39.0742, 21.8243],
  'Kingdom of Saudi Arabia': [23.8859, 45.0792],
  Qatar: [25.3548, 51.1839],
  'United States': [39.8283, -98.5795],
}
const DISTRIBUTOR_COUNTRY_POINTS = DISTRIBUTOR_DIRECTORY
  .map((item) => {
    const country = String(item?.country || '').trim()
    const coordinates = DISTRIBUTOR_COUNTRY_COORDINATES[country]
    if (!country || !Array.isArray(coordinates)) return null

    return {
      country,
      coordinates,
    }
  })
  .filter(Boolean)
const SILVER_FREE_GUARANTEE_BADGE = 'Silver-Free Guarantee'
const CI77820_MAIN_STATEMENT = 'All Gelitup products manufactured from December 2025 onwards are 100% CI 77820 (Silver) FREE.'
const CI77820_TRANSPARENCY_NOTE = 'All current batches have transitioned to Aluminium and Mica-based pigments.'
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

const COUNTRY_DIAL_CODES = {
  Austria: '+43',
  Belgium: '+32',
  Bulgaria: '+359',
  Croatia: '+385',
  Cyprus: '+357',
  'Czech Republic': '+420',
  Denmark: '+45',
  Estonia: '+372',
  Finland: '+358',
  France: '+33',
  Germany: '+49',
  Greece: '+30',
  Hungary: '+36',
  Ireland: '+353',
  Italy: '+39',
  Latvia: '+371',
  Lithuania: '+370',
  Luxembourg: '+352',
  Malta: '+356',
  Netherlands: '+31',
  Poland: '+48',
  Portugal: '+351',
  Romania: '+40',
  Slovakia: '+421',
  Slovenia: '+386',
  Spain: '+34',
  Sweden: '+46',
  'United Kingdom': '+44',
  Norway: '+47',
  Switzerland: '+41',
  Turkey: '+90',
  Ukraine: '+380',
  'United States': '+1',
  Canada: '+1',
  Mexico: '+52',
  Brazil: '+55',
  Argentina: '+54',
  Chile: '+56',
  'United Arab Emirates': '+971',
  'Saudi Arabia': '+966',
  Qatar: '+974',
  Israel: '+972',
  Egypt: '+20',
  'South Africa': '+27',
  India: '+91',
  China: '+86',
  Japan: '+81',
  'South Korea': '+82',
  Singapore: '+65',
  Australia: '+61',
  'New Zealand': '+64',
}

const SHOW_SERVICE_FLOW_SUBCATEGORY_MENU = false
const CATALOGUE_RESULTS_ANCHOR_ID = 'catalogue-results-anchor'

function withCountryDialCode(phoneValue = '', country = '') {
  const dialCode = COUNTRY_DIAL_CODES[country] || ''
  const current = String(phoneValue || '').trim()
  if (!dialCode) return current
  if (!current) return `${dialCode} `
  if (current.startsWith('+')) return current
  return `${dialCode} ${current}`
}

function extractTaggedValue(notesValue, tagName) {
  const notes = String(notesValue || '')
  const match = notes.match(new RegExp(`\\[${tagName}:([^\\]]+)\\]`, 'i'))
  return String(match?.[1] || '').trim().toLowerCase()
}

function getApplicationTypeFromRecord(record) {
  const explicit = String(record?.application_type || '').trim().toLowerCase()
  if (explicit) return explicit

  const tagged = extractTaggedValue(record?.notes, 'APPLICATION_TYPE')
  if (tagged) return tagged

  return 'b2b_order'
}

function getOrderProfileFromRecord(record) {
  const explicit = String(record?.order_profile || '').trim().toLowerCase()
  if (explicit) return explicit

  const tagged = extractTaggedValue(record?.notes, 'ORDER_PROFILE')
  if (tagged) return tagged

  return 'business'
}

function isDistributorSubmission(record) {
  return getApplicationTypeFromRecord(record) === 'distributor'
}

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

function hasReachedComplianceDate(referenceDate = new Date()) {
  const complianceStart = new Date(`${COMPLIANCE_DATE}T00:00:00.000Z`)
  const comparedDate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  return Number.isFinite(comparedDate.getTime()) && comparedDate.getTime() >= complianceStart.getTime()
}

function getSilverFreeGuaranteeText(referenceDate = new Date()) {
  return hasReachedComplianceDate(referenceDate) ? `${SILVER_FREE_GUARANTEE_BADGE} • CI 77820-FREE` : ''
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
    return { ok: false, skipped: true, message: 'Zoho sync is disabled by configuration.', salesorder_id: null }
  }

  if (!ZOHO_SYNC_WEBHOOK_URL) {
    return { ok: false, skipped: true, message: 'Zoho sync webhook is not configured.', salesorder_id: null }
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
    let responseJson = null
    const responseType = response.headers.get('content-type') || ''

    if (responseType.includes('application/json')) {
      responseJson = await response.json().catch(() => null)
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
        salesorder_id: null,
      }
    }

    return {
      ok: true,
      skipped: false,
      message: responseMessage || `Zoho sync completed via ${ZOHO_SYNC_TARGET}.`,
      salesorder_id: responseJson?.salesorder_id ?? null,
    }
  }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        skipped: false,
        message: `Zoho sync timed out after ${Number.isFinite(ZOHO_SYNC_TIMEOUT_MS) ? ZOHO_SYNC_TIMEOUT_MS : 12000}ms`,
        salesorder_id: null,
      }
    }

    return {
      ok: false,
      skipped: false,
      message: error instanceof Error ? error.message : 'Unknown Zoho sync error',
      salesorder_id: null,
    }
  }
}

function isExistingUserSignUpResult(signUpResult) {
  const user = signUpResult?.data?.user || null
  if (!user) return false

  const identities = Array.isArray(user.identities) ? user.identities : []
  const hasNoIdentity = identities.length === 0

  return hasNoIdentity
}

function hasActiveSignUpSession(signUpResult) {
  return Boolean(signUpResult?.data?.session)
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
  { to: '/distributor-packages', label: 'Distribution Options' },
  { to: '/full-catalogue', label: 'Our Products' },
  { to: '/distributors', label: 'Distributors' },
  { to: '/become-distributor', label: 'B2B / Distribution Registration', highlight: true },
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
    headline: 'Five Services. One HEMA & TPO-Free Power Base.',
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
const DEFAULT_PACKAGE_ITEM_QTY = 1
const PACKAGE_TECH_ESSENTIALS = [
  { sku: 'SUPERBOND', code: 'SUPERBOND', name: 'Superbond Acid-Free Primer', category: 'Technical', group: 'Essentials' },
  { sku: '5IN1_CLR', code: '5IN1_CLR', name: '5-in-1 Superior Base Coat Clear', category: 'Technical', group: 'Essentials' },
  { sku: 'NW_TOP', code: 'NW_TOP', name: 'Non-Wipe Top Coat', category: 'Technical', group: 'Essentials' },
  { sku: '3IN1_CLR', code: '3IN1_CLR', name: '3-in-1 Premium Builder Gel Clear', category: 'Technical', group: 'Essentials' },
  { sku: 'SYN_MWH', code: 'SYN_MWH', name: 'Multimix Synthogel Milky White', category: 'Technical', group: 'Essentials' },
]
const PROFESSIONAL_BASE_PACK = {
  sku: '5IN1_CLR',
  description: '5-in-1 Superior Base Add-on',
  qty: 1,
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
  const silverFreeLine = getSilverFreeGuaranteeText(invoice?.createdAt)

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
    ...(silverFreeLine ? [silverFreeLine, ''] : []),
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
  return (
    <section className="space-y-6">

      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f0f0f] via-[#1c0a2e] to-[#3b0764] p-7 text-white sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,38,211,0.12),transparent_60%)]" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">GEL.IT.UP by GIUP® — Verified Distribution Network</p>
        <h1 className="heading-on-dark relative mt-3 text-3xl font-black leading-tight tracking-tight drop-shadow-lg sm:text-5xl">
          Distribution<br className="hidden sm:block" /> Partnership Tiers
        </h1>
        <p className="relative mt-3 max-w-2xl text-sm text-white/90 sm:text-base">
          Built for serious operators. Every tier ships with full EU regulatory documentation and a social media brand engine — because your success is our brand in motion.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <NavLink to="/full-catalogue" className="inline-flex rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white transition duration-300 hover:bg-fuchsia-500">
            View Product Catalogue
          </NavLink>
          <NavLink to="/become-distributor" className="inline-flex rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition duration-300 hover:bg-white/20">
            Apply for Partnership
          </NavLink>
        </div>
      </div>

      {/* KEY DIFFERENTIATORS BANNER */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-purple-50 p-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-fuchsia-800">EU Regulatory Ready</p>
            <p className="mt-0.5 text-xs text-fuchsia-700/80">Full compliance documentation, HEMA-Free & TPO-Free certificates, and EC 1223/2009 declaration support — handled for you, not by you.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-purple-800">Social Media Brand Engine</p>
            <p className="mt-0.5 text-xs text-purple-700/80">Viral-ready content, branded assets, and territory advertising support that turns your distribution into a visible, growing movement.</p>
          </div>
        </div>
      </div>

      {/* BOUTIQUE TIER */}
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Tier header bar */}
        <div className="bg-gradient-to-r from-[#6b7280] via-[#9ca3af] to-[#6b7280] px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Entry Tier — Silver</p>
          <h2 className="mt-0.5 text-xl font-black text-white sm:text-2xl">BOUTIQUE — The Foundation</h2>
          <p className="mt-1 text-sm text-white/90">Launch with confidence. The smartest entry point for localized distribution with everything you need to move product and build a client base instantly.</p>
        </div>
        {/* Rows */}
        <div className="divide-y divide-slate-100">
          <div className="flex items-start gap-4 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Market Focus</p>
            <p className="text-sm font-semibold text-slate-800">Localized Distribution</p>
          </div>
          <div className="flex items-start gap-4 bg-gradient-to-r from-fuchsia-50/60 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-fuchsia-500">Product Spectrum</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-500" />Top 120 Core Shades</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-500" />200 SKUs — Builder Systems, Brushes &amp; Essentials</li>
            </ul>
          </div>
          <div className="flex items-start gap-4 bg-gradient-to-r from-purple-50/60 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-purple-500">Support Package</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />Digital Brand Assets</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-500" />
                Viral Social Media Content
                <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">Brand Power</span>
              </li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                EU Regulatory Support
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">Compliance Included</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="px-6 py-4">
          <NavLink to="/become-distributor" className="inline-flex rounded-lg bg-gradient-to-r from-[#4b5563] to-[#6b7280] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-300 hover:from-[#374151] hover:to-[#4b5563]">
            Request Boutique Tier Pricing →
          </NavLink>
        </div>
      </article>

      {/* PROFESSIONAL TIER */}
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#78350f] via-[#b45309] to-[#78350f] px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Growth Tier — Gold</p>
          <h2 className="mt-0.5 text-xl font-black text-white sm:text-2xl">PROFESSIONAL — The Expanded Spectrum</h2>
          <p className="mt-1 text-sm text-amber-50/90">Scale intelligently. A broader product range, physical brand presence, and deeper marketing tools designed for distributors ready to dominate their region.</p>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-start gap-4 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Market Focus</p>
            <p className="text-sm font-semibold text-slate-800">Localized Distribution</p>
          </div>
          <div className="flex items-start gap-4 bg-gradient-to-r from-amber-50/60 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-amber-600">Product Spectrum</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />150 Core Shades</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />280 SKU Recommendation Package</li>
            </ul>
          </div>
          <div className="flex items-start gap-4 bg-gradient-to-r from-amber-50/40 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Support Package</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />Digital Brand Assets</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />Marketing Material</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />Branded Salon Visibility</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-500" />
                Viral Social Media Content
                <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">Brand Power</span>
              </li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                EU Regulatory Support
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">Compliance Included</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="px-6 py-4">
          <NavLink to="/become-distributor" className="inline-flex rounded-lg bg-gradient-to-r from-[#78350f] to-[#b45309] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-300 hover:from-[#92400e] hover:to-[#ca8a04]">
            Request Professional Tier Pricing →
          </NavLink>
        </div>
      </article>

      {/* AUTHORITY TIER */}
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#1e293b] px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Elite Tier — Platinum</p>
          <h2 className="mt-0.5 text-xl font-black text-white sm:text-2xl">AUTHORITY — The Full Master Collection</h2>
          <p className="mt-1 text-sm text-slate-200">Total market ownership. Every product, every shade, every support tool — with your territory backed by GEL.IT.UP advertising, live training, and white-glove regulatory handling.</p>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-start gap-4 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Market Focus</p>
            <p className="text-sm font-semibold text-slate-800">Full Territory Dominance</p>
          </div>
          <div className="flex items-start gap-4 bg-gradient-to-r from-fuchsia-50/40 to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-fuchsia-500">Product Spectrum</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-500" />Complete GEL.IT.UP Portfolio — Every Product, Every Shade</li>
            </ul>
          </div>
          <div className="flex items-start gap-4 bg-gradient-to-r from-slate-900/[0.03] to-white px-6 py-4">
            <p className="w-36 flex-shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Support Package</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />Digital Brand Assets</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />Marketing Material</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />Branded Salon Visibility</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />Seminar Training Events</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />Online Seminars</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />Promotional Package Availability</li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-500" />
                Viral Social Media Content
                <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">Brand Power</span>
              </li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-600" />
                Supported Territory Social Media Advertising
                <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">Brand Power</span>
              </li>
              <li className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                EU Regulatory Support
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">Compliance Included</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="px-6 py-4">
          <NavLink to="/become-distributor" className="inline-flex rounded-lg bg-gradient-to-r from-[#1e293b] to-[#334155] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-300 hover:from-[#0f172a] hover:to-[#1e293b]">
            Request Authority Tier Pricing →
          </NavLink>
        </div>
      </article>

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

  const blockedCategoryTokens = new Set(['CRACK', 'THERMO'])
  
  // Map certain folders to be subcategories of parent categories
  const categoryRemapping = new Map([
    // Colors subcategories
    ['BY THE OCEAN', 'COLORS'],
    // Nail Art subcategories
    ['COBWEB', 'NAIL ART'],
    ['LINE-IT-UP', 'NAIL ART'],
    ['LINE IT UP', 'NAIL ART'],
    // Builder Gel Systems subcategories
    ['BUILDER GEL', 'BUILDER GEL SYSTEMS'],
    ['ACRYLIC', 'BUILDER GEL SYSTEMS'],
    ['MULTIMIX', 'BUILDER GEL SYSTEMS'],
    ['CREME DE LA CREME', 'BUILDER GEL SYSTEMS'],
  ])
  
  const isBlockedImagePath = (imagePath = '') => {
    const normalizedPath = normalizeCatalogueToken(imagePath)
    if (!normalizedPath) return false

    return Array.from(blockedCategoryTokens).some((token) => normalizedPath.includes(`/${token}/`) || normalizedPath.endsWith(`/${token}`) || normalizedPath.includes(token))
  }

  const uniqueImagePaths = new Set(
    Object.values(payload)
      .filter((value) => typeof value === 'string')
      .map((value) => String(value).trim())
      .filter((value) => value.includes('/gelitup-content/product-images/'))
      .filter((value) => !isCategoryHeroAssetPath(value))
      .filter((value) => !isBlockedImagePath(value))
  )

  const grouped = new Map()

  uniqueImagePaths.forEach((imagePath) => {
    const afterRoot = imagePath.split('/gelitup-content/product-images/')[1] || ''
    const segments = afterRoot.split('/').filter(Boolean)
    const sourceCategory = segments[0] || 'Other'
    let category = sourceCategory
    
    // Apply category remapping (e.g., BY THE OCEAN → COLORS)
    const remappedCategory = categoryRemapping.get(category)
    const isRemapped = !!remappedCategory
    if (remappedCategory) {
      category = remappedCategory
    }
    
    // Determine subcategory based on folder structure
    let subcategory
    if (isRemapped) {
      if (segments.length > 2) {
        // For remapped categories with real subfolders, use the path between root and filename
        // e.g., BUILDER GEL/3INI BUILDER/item.jpg → "3INI BUILDER"
        subcategory = segments.slice(1, -1).join(' / ') || sourceCategory
      } else {
        // For remapped categories with files directly under root, keep root as subcategory
        // e.g., CREME DE LA CREME/item.jpg → "CREME DE LA CREME"
        subcategory = sourceCategory
      }
    } else if (category === 'COLORS' && segments.length > 3) {
      // Deep path: COLORS/SOLID GEL POLISH/Red/img.jpg → subcategory='SOLID GEL POLISH', family stored on item
      subcategory = segments[1]
    } else if (category === 'COLORS' && segments.length > 2) {
      // Standard: COLORS/CAT EYE/img.jpg → subcategory='CAT EYE'
      // NUDE, FRENCH, PASTEL, RONE (GIUP1) belong under Solid Gel Polish
      const folderToken = (segments[segments.length - 2] || 'General').toUpperCase()
      subcategory = ['NUDE', 'FRENCH', 'PASTEL', 'RONE'].includes(folderToken)
        ? 'SOLID GEL POLISH'
        : (segments[segments.length - 2] || 'General')
    } else if (segments.length > 2) {
      // For other categories with deep nesting, join middle segments
      subcategory = segments.slice(1, -1).join(' / ')
    } else {
      // Simple structure: just use first subfolder or 'General'
      subcategory = segments[1] || 'General'
    }

    const categoryBucket = grouped.get(category) || new Map()
    const subcategoryItems = categoryBucket.get(subcategory) || []

    const rawFolder = (segments[segments.length - 2] || '').toUpperCase()
    const solidGelFlatFolders = { NUDE: 'Nude', FRENCH: 'French', PASTEL: 'Pastel', RONE: 'GIUP1' }
    subcategoryItems.push({
      imageUrl: imagePath,
      name: formatCatalogueItemName(afterRoot),
      colorFamily: category === 'COLORS'
        ? segments.length > 3
          ? segments[2]
          : solidGelFlatFolders[rawFolder] || undefined
        : undefined,
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
  { key: 'BLACK', label: 'Black', swatchClass: 'bg-black' },
  { key: 'BLUE', label: 'Blue', swatchClass: 'bg-blue-500' },
  { key: 'BROWN', label: 'Brown', swatchClass: 'bg-amber-700' },
  { key: 'CORAL ORANGE', label: 'Coral Orange', swatchClass: 'bg-orange-400' },
  { key: 'FRENCH', label: 'French', swatchClass: 'bg-pink-100 border border-pink-200' },
  { key: 'GIUP1', label: 'GIUP1', swatchClass: 'bg-fuchsia-200 border border-fuchsia-300' },
  { key: 'GREEN', label: 'Green', swatchClass: 'bg-emerald-500' },
  { key: 'GREY', label: 'Grey', swatchClass: 'bg-slate-500' },
  { key: 'NEON', label: 'Neon', swatchClass: 'bg-lime-400' },
  { key: 'NUDE', label: 'Nude', swatchClass: 'bg-amber-100 border border-amber-200' },
  { key: 'PASTEL', label: 'Pastel', swatchClass: 'bg-sky-200 border border-sky-300' },
  { key: 'PINK', label: 'Pink', swatchClass: 'bg-pink-400' },
  { key: 'PURPLE', label: 'Purple', swatchClass: 'bg-violet-500' },
  { key: 'RED', label: 'Red', swatchClass: 'bg-red-500' },
  { key: 'WHITE', label: 'White', swatchClass: 'bg-white border border-slate-300' },
  { key: 'YELLOW', label: 'Yellow', swatchClass: 'bg-yellow-300' },
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

// ─────────────────────────────────────────────────────────────────────────────

function isColorsCategoryName(categoryName = '') {
  return normalizeCatalogueToken(categoryName).includes('COLOR')
}

function toTitleCaseLabel(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''

  const minorWords = new Set(['and', 'or', 'to', 'of', 'the', 'a', 'an', 'in', 'on', 'for', 'by', 'with'])

  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      const parts = word.split('-')
      return parts
        .map((part) => {
          if (!part) return part
          if (minorWords.has(part) && index !== 0) return part
          return part.charAt(0).toUpperCase() + part.slice(1)
        })
        .join('-')
    })
    .join(' ')
}

function formatSubcategoryDisplayName(subcategoryName = '') {
  // Transform specific subcategory names for display
  const normalized = normalizeCatalogueToken(subcategoryName)

  if (normalized === 'ALL') return 'All Colors'
  
  // Color subcategories
  if (normalized === 'RONE') return 'GIUP1'
  if (normalized === 'CAT EYE') return 'Cat Eye'
  if (normalized === 'FRENCH') return 'French'
  if (normalized === 'GLITTERS') return 'Glitters'
  if (normalized === 'JELLY') return 'Jelly'
  if (normalized === 'METALLIC COLLECTION') return 'Metallic Collection'
  if (normalized === 'NEW YORK') return 'New York'
  if (normalized === 'NUDE') return 'Nude'
  if (normalized === 'PMA') return 'PMA'
  if (normalized === 'SHIMMER COLORS') return 'Shimmer Colors'
  if (normalized === 'SNOWFLAKE') return 'Snowflake'
  if (normalized === 'SOLID GEL POLISH') return 'Solid Gel Polish'
  if (normalized === 'SPIX & SPEX' || normalized === 'SPIX  SPEX') return 'Spix & Spex'
  if (normalized === 'THERMO') return 'Thermo'
  if (normalized === 'TUTTI FRUTTI GLASS') return 'Tutti Frutti Glass'
  if (normalized === 'GLASS EFFECT') return 'Glass Effect'
  
  // Builder Gel Systems subcategories
  if (normalized === '3INI BUILDER') return '3-in-1 Builder Gel'
  if (normalized === 'PREMIUM BUILDER') return '3-in-1 Premium Builder Gel'
  if (normalized === 'LIQUID POLYGEL') return 'Liquid Polygel'
  if (normalized === 'COMPETE') return 'Compete Acrylic'
  if (normalized === 'MULTIMIX' || normalized === '30 ML') return 'Multimix 30g'
  if (normalized === '60 ML') return 'Multimix 60g'
  if (normalized === 'CDC' || normalized === 'CREME DE LA CREME') return 'Creme de La Creme'
  
  // Bases subcategories
  if (normalized === '5IN1 SUPERIOR BASE') return '5-in-1 Superior Base'
  if (normalized === 'BRUSH ON BUILDER') return 'Brush On Builder'
  if (normalized === 'FLEXI BASE') return 'Flexi Base'
  if (normalized === 'SUPERBOND') return 'Superbond'
  
  // Tops subcategories
  if (normalized === 'CLASSIC TOP COATS') return 'Classic Top Coats'
  if (normalized === 'EFFECT TOPS') return 'Effect Tops'
  if (normalized === 'SHIMMER TOP') return 'Shimmer Top'
  if (normalized === 'SPOT MY TOPS') return 'Spot My Tops'
  
  // Consumables subcategories
  if (normalized === 'CREAMS AND SCRUBS') return 'Creams and Scrubs'
  if (normalized === 'CUTICLE OILS -REMOVERS' || normalized === 'CUTICLE OILS REMOVERS') return 'Cuticle Oils & Removers'
  if (normalized === 'NAIL FILES') return 'Nail Files'
  if (normalized === 'NAIL TIPS') return 'Nail Tips'
  if (normalized === 'DUAL FORMS') return 'Dual Forms'
  if (normalized === 'SOAK OFF GEL TIPS') return 'Soak Off Gel Tips'
  if (normalized === 'NAIL FORMS') return 'Nail Forms'
  // Nail Hand & Foot Care subcategories
  if (normalized === 'NAIL HAND FOOT CARE') return 'Nail, Hand & Foot Care'
  
  // Nail Art subcategories
  if (normalized === 'CUSHION GEL') return 'Cushion Gel'
  if (normalized === 'GLITTER EFFECTS POWEDER' || normalized === 'GLITTER EFFECTS POWDER') return 'Glitter Effects Powder'
  if (normalized === 'MARBLE INK') return 'Marble Ink'
  if (normalized === 'MIRROR POWDERS') return 'Mirror Powders'
  if (normalized === 'STICKERS') return 'Stickers'
  
  // Packages
  if (normalized === 'STUDIO ELITE') return 'Studio Elite'
  if (normalized === 'BOUTIQUE') return 'Boutique'
  if (normalized === 'PROFESSIONAL') return 'Professional'
  if (normalized === 'AUTHORITY') return 'Authority'
  
  // Strip image file extensions and convert underscores → spaces before title-casing
  const cleanName = subcategoryName
    .replace(/\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff?)$/i, '')
    .replace(/_/g, ' ')
  return toTitleCaseLabel(cleanName)
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

  const extensions = ['jpg', 'jpeg', 'png', 'webp']
  const candidates = []

  // Prioritize catalog-heroes (centralized hero images folder)
  baseNames.forEach((baseName) => {
    extensions.forEach((extension) => {
      candidates.push(`/gelitup-content/catalog-heroes/${baseName}.hero.image.${extension}`)
    })
  })

  // Fallback to product-images category folders
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

const PRODUCT_INFORMATION_BY_SUBCATEGORY = {
  'BASES::SUPERBOND': {
    paragraphs: [
      'GEL.IT.UP by GIUP® Superbond is an acid-free primer, safe for the natural nail, and it does not require curing.',
      'It is applied to the free edge of the nail before the base coat, ensuring improved adhesion while providing additional dehydration for longer-lasting results.',
      'It also creates a thin protective film on the nail, helping to protect it from damage.',
    ],
    listItems: [],
  },
  'BASES::5IN1 SUPERIOR BASE': {
    paragraphs: [
      'The 5-in-1 Superior Base Coat is a product that offers 5 different uses in a single bottle.',
    ],
    listItems: [
      'A base before applying semi-permanent colors.',
      'A reinforced base for thin and brittle nails.',
      'A shaping gel.',
      'An adhesive for rhinestones and other 3D nail decorations.',
      'A gel for slight extension and strengthening of the natural nail.',
    ],
  },
  'BUILDER GEL SYSTEMS::3INI BUILDER': {
    paragraphs: [
      'The 3-in-1 Premium Builder Gel is a single-phase structural system engineered for extreme durability and professional control. Infused with fiberglass fibers, this gel provides structural integrity for long extensions and hard-wearing overlays without separate base or top coats.',
    ],
    listItems: [
      'Key Benefits: Fiber-reinforced strength, single-phase efficiency, cool-cure comfort, and 100% HEMA/TPO-free performance.',
      'Application — Preparation: Perform a thorough dry manicure and cleanse the nail plate.',
      'Application — Adhesion: Apply Superbond Primer and air-dry for 30 seconds.',
      'Application — Foundation: Apply a thin slip layer over nail/form (do not cure).',
      'Application — Building: Place a larger bead centrally and guide to edges/apex as it self-levels.',
      'Application — Cure: 60–90s LED (120s UV).',
      'Application — Refinement & Finish: Wipe inhibition layer, file shape, then final gloss layer or proceed with GEL.IT.UP by GIUP® color.',
      'Dual Forms Application — Prep and prime as standard, then apply a thin slip layer of 3-in-1 Premium Builder Gel.',
      'Dual Forms Application — Select the correct dual form size, place a controlled bead in the form, and spread evenly to avoid trapped air.',
      'Dual Forms Application — Press form from cuticle toward free edge, flash cure to lock position, then full-cure and gently remove the form before refinement.',
    ],
  },
  'BUILDER GEL SYSTEMS::PREMIUM BUILDER': {
    paragraphs: [
      'The 3-in-1 Premium Builder Gel is a single-phase structural system engineered for extreme durability and professional control. Infused with fiberglass fibers, this gel provides structural integrity for long extensions and hard-wearing overlays without separate base or top coats.',
    ],
    listItems: [
      'Key Benefits: Fiber-reinforced strength, single-phase efficiency, cool-cure comfort, and 100% HEMA/TPO-free performance.',
      'Application — Preparation: Perform a thorough dry manicure and cleanse the nail plate.',
      'Application — Adhesion: Apply Superbond Primer and air-dry for 30 seconds.',
      'Application — Foundation: Apply a thin slip layer over nail/form (do not cure).',
      'Application — Building: Place a larger bead centrally and guide to edges/apex as it self-levels.',
      'Application — Cure: 60–90s LED (120s UV).',
      'Application — Refinement & Finish: Wipe inhibition layer, file shape, then final gloss layer or proceed with GEL.IT.UP by GIUP® color.',
      'Dual Forms Application — Prep and prime as standard, then apply a thin slip layer of 3-in-1 Premium Builder Gel.',
      'Dual Forms Application — Select the correct dual form size, place a controlled bead in the form, and spread evenly to avoid trapped air.',
      'Dual Forms Application — Press form from cuticle toward free edge, flash cure to lock position, then full-cure and gently remove the form before refinement.',
    ],
  },
  'BUILDER GEL SYSTEMS::MULTIMIX': {
    paragraphs: [
      'MultiMix Synthogel is the ultimate hybrid system, combining the legendary strength of acrylic with the flexible, odorless benefits of gel. This putty-like consistency provides unlimited playtime and cures only when placed in the lamp.',
      'It is ideal for technicians who need hard-system durability without the time pressure of traditional acrylic monomer.',
    ],
    listItems: [
      'Key Benefits: Hybrid strength, zero-gravity feel, odorless environment, and 100% HEMA/TPO-free clean science standard.',
      'Application — Prep: Perform a standard dry manicure and cleanse the nail plate.',
      'Application — Prime: Apply Superbond Primer and air-dry for 30 seconds.',
      'Application — Foundation: Apply a thin layer of 5-in-1 Superior Base and cure (60s LED).',
      'Application — Placement: Dispense MultiMix Synthogel and position with a spatula.',
      'Application — Sculpting: Use a brush with Cleanser/Slip Solution (lightly) to pat and smooth; product remains workable until cured.',
      'Application — Curing: Cure for 60-90 seconds in LED.',
      'Application — Refine: Wipe inhibition layer, file to shape, and finish with GEL.IT.UP by GIUP® color or top coat.',
    ],
  },
  'BUILDER GEL SYSTEMS::30 ML': {
    paragraphs: [
      'MultiMix Synthogel is the ultimate hybrid system, combining the legendary strength of acrylic with the flexible, odorless benefits of gel. This putty-like consistency provides unlimited playtime and cures only when placed in the lamp.',
      'It is ideal for technicians who need hard-system durability without the time pressure of traditional acrylic monomer.',
    ],
    listItems: [
      'Key Benefits: Hybrid strength, zero-gravity feel, odorless environment, and 100% HEMA/TPO-free clean science standard.',
      'Application — Prep: Perform a standard dry manicure and cleanse the nail plate.',
      'Application — Prime: Apply Superbond Primer and air-dry for 30 seconds.',
      'Application — Foundation: Apply a thin layer of 5-in-1 Superior Base and cure (60s LED).',
      'Application — Placement: Dispense MultiMix Synthogel and position with a spatula.',
      'Application — Sculpting: Use a brush with Cleanser/Slip Solution (lightly) to pat and smooth; product remains workable until cured.',
      'Application — Curing: Cure for 60-90 seconds in LED.',
      'Application — Refine: Wipe inhibition layer, file to shape, and finish with GEL.IT.UP by GIUP® color or top coat.',
    ],
  },
  'BUILDER GEL SYSTEMS::60 ML': {
    paragraphs: [
      'MultiMix Synthogel is the ultimate hybrid system, combining the legendary strength of acrylic with the flexible, odorless benefits of gel. This putty-like consistency provides unlimited playtime and cures only when placed in the lamp.',
      'It is ideal for technicians who need hard-system durability without the time pressure of traditional acrylic monomer.',
    ],
    listItems: [
      'Key Benefits: Hybrid strength, zero-gravity feel, odorless environment, and 100% HEMA/TPO-free clean science standard.',
      'Application — Prep: Perform a standard dry manicure and cleanse the nail plate.',
      'Application — Prime: Apply Superbond Primer and air-dry for 30 seconds.',
      'Application — Foundation: Apply a thin layer of 5-in-1 Superior Base and cure (60s LED).',
      'Application — Placement: Dispense MultiMix Synthogel and position with a spatula.',
      'Application — Sculpting: Use a brush with Cleanser/Slip Solution (lightly) to pat and smooth; product remains workable until cured.',
      'Application — Curing: Cure for 60-90 seconds in LED.',
      'Application — Refine: Wipe inhibition layer, file to shape, and finish with GEL.IT.UP by GIUP® color or top coat.',
    ],
  },
  'BUILDER GEL SYSTEMS::COMPETE': {
    paragraphs: [
      'The GEL.IT.UP by GIUP® Acrylic System is a high-performance sculpting range designed for technicians who demand ultimate strength and traditional structural control.',
      'Engineered to work with specialized powders, the system includes two monomer options for different workflows: Professional Fast Liquid for rapid set/high-speed service, and Beginner Slow Liquid for extended playtime and precision architecture.',
    ],
    listItems: [
      'Key Benefits: Superior bond, non-yellowing UV-stable formula, exceptional clarity and strength, and ethical CPNP-notified compliance.',
      'Application — Prep: Conduct a thorough dry manicure and cleanse the nail plate.',
      'Application — Adhesion: Apply Superbond Primer and allow to air-dry for 30 seconds.',
      'Application — Dip: Submerge acrylic brush in chosen liquid (Fast or Slow) and wipe excess on dappen dish side.',
      'Application — Pick-up: Dip brush tip into acrylic powder to create a creamy bead.',
      'Application — Sculpt: Place and guide bead; use Slow for more playtime or Fast for quicker setting.',
      'Application — Refine: Once polymerized, file to shape with professional-grade nail files.',
      'Application — Seal: Finish with GEL.IT.UP by GIUP® Non-Wipe Top Coat and cure 90–120 seconds for a TPO-free high-gloss seal.',
    ],
  },
  'BUILDER GEL SYSTEMS::ACRYLIC': {
    paragraphs: [
      'The GEL.IT.UP by GIUP® Acrylic System is a high-performance sculpting range designed for technicians who demand ultimate strength and traditional structural control.',
      'Engineered to work with specialized powders, the system includes two monomer options for different workflows: Professional Fast Liquid for rapid set/high-speed service, and Beginner Slow Liquid for extended playtime and precision architecture.',
    ],
    listItems: [
      'Key Benefits: Superior bond, non-yellowing UV-stable formula, exceptional clarity and strength, and ethical CPNP-notified compliance.',
      'Application — Prep: Conduct a thorough dry manicure and cleanse the nail plate.',
      'Application — Adhesion: Apply Superbond Primer and allow to air-dry for 30 seconds.',
      'Application — Dip: Submerge acrylic brush in chosen liquid (Fast or Slow) and wipe excess on dappen dish side.',
      'Application — Pick-up: Dip brush tip into acrylic powder to create a creamy bead.',
      'Application — Sculpt: Place and guide bead; use Slow for more playtime or Fast for quicker setting.',
      'Application — Refine: Once polymerized, file to shape with professional-grade nail files.',
      'Application — Seal: Finish with GEL.IT.UP by GIUP® Non-Wipe Top Coat and cure 90–120 seconds for a TPO-free high-gloss seal.',
    ],
  },
  'LINE-IT-UP::ALL': {
    paragraphs: [
      'By choosing the LINE.IT.UP by GIUP® range, you can create linear designs easily and quickly, thanks to the specially designed brush.',
      'It allows you to create everything from fine to thicker lines, depending on the design you wish to draw.',
    ],
    listItems: [],
  },
  'COLORS::ALL': {
    paragraphs: [
      'The GEL.IT.UP by GIUP® gel polish range has stood out in the market thanks to its excellent quality and high durability. It delivers intense shine, removes very easily, and does not wrinkle during curing.',
      'The rich GEL.IT.UP by GIUP® color palette includes more than 500 gel polish shades, with new must-have colors added every season.',
      'All our products are cruelty-free and have been approved by the global organization Leaping Bunny International.',
    ],
    listItems: [],
  },
  'BRUSHES::ACRYLIC BRUSHES': {
    paragraphs: [
      'A brush specially designed for acrylic application. It features a metal body with decorative details. Made with high-quality, durable synthetic bristles, in line with our cruelty-free product policy. Ideal for both beginners and more experienced nail technicians.',
    ],
    listItems: [],
  },
  'BRUSHES::GEL BRUSHES': {
    paragraphs: [
      'A brush specially designed for builder gel application. It features a metal body with decorative details. Made with high-quality, durable synthetic bristles, in line with our cruelty-free product policy. Ideal for both beginners and more experienced nail technicians.',
    ],
    listItems: [],
  },
  'BRUSHES::SYNTHOGEL & POLYGEL': {
    paragraphs: [
      'A brush specially designed for acrygel application. It features a metal body and is dual-ended, with a brush on one side and a specially designed metal spatula on the other. Made with high-quality, durable synthetic bristles, in line with our cruelty-free product policy. Ideal for both beginners and more experienced nail technicians.',
      'Use the spatula side to pick up only the amount of product you need, avoiding unnecessary excess.',
    ],
    listItems: [],
  },
  'BRUSHES::NAIL ART BRUSHES': {
    paragraphs: [
      'Precision nail art brushes with a metal Rose Gold body and decorative details. Made with high-quality, durable synthetic bristles, in line with our cruelty-free product policy.',
    ],
    listItems: [
      'Aquarela Brush — Specially designed for the watercolor technique.',
      'French Nail Brush — Angled blade ideal for the French manicure technique.',
      'Ombré Brush — Wide flat brush for smooth gradient and ombré blends.',
      'Skinny Liner — Ultra-fine liner brush for detailed nail art lines and accents.',
    ],
  },
  'NAIL HAND FOOT CARE::CREAMS AND SCRUBS': {
    paragraphs: [
      'Hand & Body Cream — With Organic Aloe and a unique cocktail of active ingredients, it fragrances and hydrates the skin. It absorbs quickly and leaves no oily residue. Key ingredients: Organic Aloe Vera, Hyaluronic Acid, Panthenol.',
      'Silky Bliss Foot Cream — It absorbs quickly and leaves no oily residue. Key ingredients: Organic Aloe Vera, Avocado Oil, Panthenol.',
    ],
    listItems: [],
  },
  'NAIL HAND FOOT CARE::CUTICLE OILS REMOVERS': {
    paragraphs: [
      'With our Cuticle Oils you will feel your fingers soothed, nourished, and hydrated, while also protecting them from irritation and prolonged sun exposure.',
      'Directions for use: Apply one to two drops to the cuticle area of each nail. Massage the oil around the cuticles and then over the entire surface of the nail. It is important to apply the oil to both the skin and the nails to achieve the full nourishment you desire.',
      'Warnings: For external use only. Keep out of reach of children. Store the product at a temperature below 25°C. Keep away from direct sunlight.',
      'Photo Perfect Cuticle Oil — Your ultimate ally for the perfect photoshoot! A dry cuticle oil that leaves no greasy residue, offering hydrating and nourishing benefits while helping with skin regeneration and healing.',
    ],
    listItems: [
      'Leaves no greasy residue',
      'Fast absorption',
      'Natural ingredients',
      'Convenient brush applicator',
      'Ideal for photoshoots — eliminates imperfections without the need for Photoshop',
    ],
  },
  'TOPS::SPOT MY TOPS': {
    paragraphs: [
      'Create the ultimate trend easily and quickly with FAN12 Rainbow Dreams — an effects top coat featuring the high-gloss finish of a top coat combined with the unique sparkle of microscopic iridescent particles.',
      'You can apply it over any color of your choice.',
    ],
    listItems: [],
  },
  'TOPS::EFFECT TOPS': {
    paragraphs: [
      'The Diamond Top Coat range is the ultimate trend. It delivers the high-gloss finish of a top coat combined with the unique sparkle of flakes. You can apply it over any color of your choice.',
      'It has no sticky layer.',
    ],
    listItems: [],
  },
  'TOPS::CLASSIC TOP COATS': {
    paragraphs: [
      'Non Wipe Top Coat — The well-known Non Wipe Top Coat is a top coat of exceptional durability and shine, with no sticky layer. Thanks to its superior formula, it does not yellow or alter the color, providing outstanding gloss and a long-lasting, flawless finish.',
      'Perfect Shape Non-Wipe Topcoat — Thanks to its rubber-based formula, it provides even coverage that corrects imperfections, delivering shine, durability, and long-lasting wear. Due to its elasticity, it helps prevent scratches. Its thick consistency allows you to create additional reinforcement over gel polish and artificial nails. It does not run into the cuticle area, making it especially helpful for beginner nail technicians.',
      'Milky Non-Wipe Topcoat — Delivers a rich, deep milky tone over your gel polish, enhancing both light and dark shades. It provides the perfect milky finish for ombré and baby boomer designs. Your ideal ally for every nail art and technique.',
    ],
    listItems: [],
  },
  'BASES::FLEXI BASE': {
    paragraphs: [
      'Flexi Base is a base coat suitable for sensitive and damaged nails that break easily. The flexibility it provides enhances the strength of the natural nail, offering greater protection against potential breakage.',
    ],
    listItems: [],
  },
  'BASES::BRUSH ON BUILDER': {
    paragraphs: [
      'Brush On Builder Base is a thick, gel-based base coat, durable and ideal for strengthening the natural nail and for slight extensions with a form up to 3mm.',
      'It is mainly used in cases of nail biting and for brittle nails that break easily.',
    ],
    listItems: [],
  },
  'NAIL ART::CUSHION GEL': {
    paragraphs: [
      'Cushion Gels are color gels with a velvety, creamy texture, enriched with high-intensity pigments that ensure a bold and even result, even from the first application.',
      'They are available in a 5g jar, featuring a specially designed inner stopper at the opening, allowing you to pick up the ideal amount of product each time without waste.',
      'Ideal for creating ombre effects with a sponge, they provide incredibly smooth blending with just one pass. Application is effortless, even for beginner nail technicians, while the final result impresses with its professional finish.',
    ],
    listItems: [],
  },
  'NAIL ART::MARBLE INK': {
    paragraphs: [
      'Marble-It by GIUP® is a water-based color that air-dries on its own — it does not require curing.',
      'The Marble-It range allows you to easily and quickly create marble, smoke, and water-effect nail art designs.',
    ],
    listItems: [],
  },
}

function getSubcategoryProductInformation(categoryName = '', subcategoryName = '') {
  const categoryToken = normalizeCatalogueToken(categoryName)
  const subcategoryToken = normalizeCatalogueToken(subcategoryName)
  if (!categoryToken || !subcategoryToken) return null

  // Exact subcategory match first, then category-level fallback (subcategory === 'ALL')
  return (
    PRODUCT_INFORMATION_BY_SUBCATEGORY[`${categoryToken}::${subcategoryToken}`] ||
    PRODUCT_INFORMATION_BY_SUBCATEGORY[`${categoryToken}::ALL`] ||
    null
  )
}

const SPRING_SUMMER_LOOKBOOK_DEFAULT = {
  title: 'Spring/Summer Collection 2026 Lookbook',
  subtitle: 'Flip through the seasonal edit before exploring the full catalogue.',
  groups: [
    {
      id: 'default',
      title: 'Spring/Summer 2026',
      heroImage: '/gelitup-media/images/news/spring-summer-2026-01.webp',
      pages: [
        {
          title: 'Spring/Summer 2026 · 01',
          imageUrl: '/gelitup-media/images/news/spring-summer-2026-01.webp',
          link: '/portal/login',
        },
        {
          title: 'Spring/Summer 2026 · 02',
          imageUrl: '/gelitup-media/images/news/spring-summer-2026-02.webp',
          link: '/portal/login',
        },
        {
          title: 'Spring/Summer 2026 · 03',
          imageUrl: '/gelitup-media/images/news/spring-summer-2026-03.webp',
          link: '/portal/login',
        },
      ],
    },
  ],
  pages: [
    {
      title: 'Spring/Summer 2026 · 01',
      imageUrl: '/gelitup-media/images/news/spring-summer-2026-01.webp',
      link: '/portal/login',
    },
    {
      title: 'Spring/Summer 2026 · 02',
      imageUrl: '/gelitup-media/images/news/spring-summer-2026-02.webp',
      link: '/portal/login',
    },
    {
      title: 'Spring/Summer 2026 · 03',
      imageUrl: '/gelitup-media/images/news/spring-summer-2026-03.webp',
      link: '/portal/login',
    },
  ],
}

const CATEGORY_LAB_SPECS = {
  'COLORS': { pigmentDots: 3, cure: '60s LED · 120s UV', llab: true },
  'BUILDER GEL SYSTEMS': { pigmentDots: null, cure: '60s LED · 120s UV', llab: true },
  'BASES': { pigmentDots: null, cure: '60s LED · 120s UV', llab: true },
  'CREME DE LA CREME': { pigmentDots: 3, cure: '60s LED · 120s UV', llab: true },
  'MULTIMIX': { pigmentDots: null, cure: '60s LED · 120s UV', llab: true },
  'TOPS': { pigmentDots: null, cure: '60s LED · 120s UV', llab: true },
  'LINE-IT-UP': { pigmentDots: 2, cure: '60s LED · 120s UV', llab: true },
  'TOOLS': { pigmentDots: null, cure: null, llab: true },
  'EQUIPMENT': { pigmentDots: null, cure: null, llab: true },
  'BRUSHES': { pigmentDots: null, cure: null, llab: true },
  'NAIL ART': { pigmentDots: 2, cure: '60s LED · 120s UV', llab: true },
  'CONSUMABLES': { pigmentDots: null, cure: null, llab: true },
  'NAIL HAND & FOOT CARE': { pigmentDots: null, cure: null, llab: true },
  'LIQUIDS': { pigmentDots: null, cure: null, llab: true },
  'BY THE OCEAN': { pigmentDots: 3, cure: '60s LED · 120s UV', llab: true },
}
const DEFAULT_LAB_SPECS = { pigmentDots: null, cure: '60s LED · 120s UV', llab: true }

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
  const [colorTileFrame, setColorTileFrame] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  // solidGelColourFamilies: sku → colorFamily, loaded from JSON built via CSV
  const [solidGelColourFamilies, setSolidGelColourFamilies] = useState({})
  const [springSummerLookbook, setSpringSummerLookbook] = useState(SPRING_SUMMER_LOOKBOOK_DEFAULT)
  const [expandedLookbookGroup, setExpandedLookbookGroup] = useState(0)
  const [selectedLookbookPageByGroup, setSelectedLookbookPageByGroup] = useState({})
  const silverFreeGuarantee = useMemo(() => getSilverFreeGuaranteeText(new Date()), [])
  const virtualContainerRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const loadCatalogue = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [mapResponse, orderResponse, colourFamiliesResponse] = await Promise.all([
          fetch('/gelitup-content/product-image-map.json'),
          fetch('/gelitup-content/catalog-order.json'),
          fetch('/gelitup-content/solid-gel-colour-families.json'),
        ])

        if (!mapResponse.ok) {
          throw new Error(`Catalogue map unavailable (${mapResponse.status})`)
        }

        const payload = await mapResponse.json()
        const manualOrderPayload = orderResponse.ok ? await orderResponse.json() : { rules: [] }
        const colourFamiliesPayload = (colourFamiliesResponse.ok && (colourFamiliesResponse.headers.get('content-type') || '').includes('application/json'))
          ? await colourFamiliesResponse.json()
          : {}
        const manualRuleIndex = buildManualRuleIndex(manualOrderPayload)
        if (!mounted) return

        const nextSections = buildCatalogueSectionsFromImageMap(payload, manualRuleIndex)
        setSections(nextSections)
        setSolidGelColourFamilies(colourFamiliesPayload)
        setHeroCandidateIndexByCategory({})
        setActiveCategory('')
        setActiveSubcategory('')
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

  useEffect(() => {
    let mounted = true

    const loadLookbook = async () => {
      try {
        const response = await fetch('/gelitup-content/spring-summer-catalogue.json')
        if (!response.ok) {
          if (mounted) setSpringSummerLookbook(SPRING_SUMMER_LOOKBOOK_DEFAULT)
          return
        }

        const payload = await response.json()
        if (!mounted) return

        const normalizedPages = Array.isArray(payload?.pages)
          ? payload.pages
            .filter((item) => item && typeof item === 'object')
            .map((item, index) => {
              const imageUrl = String(item?.imageUrl || '').trim()
              if (!imageUrl) return null
              return {
                title: String(item?.title || `Page ${index + 1}`).trim() || `Page ${index + 1}`,
                imageUrl,
                mediaType: String(item?.mediaType || '').trim().toLowerCase() || 'image',
                link: String(item?.link || '').trim(),
              }
            })
            .filter(Boolean)
          : []

        const normalizedGroups = Array.isArray(payload?.groups)
          ? payload.groups
            .filter((group) => group && typeof group === 'object')
            .map((group, groupIndex) => {
              const groupPages = Array.isArray(group?.pages)
                ? group.pages
                  .filter((item) => item && typeof item === 'object')
                  .map((item, index) => {
                    const imageUrl = String(item?.imageUrl || '').trim()
                    if (!imageUrl) return null
                    return {
                      title: String(item?.title || `Page ${index + 1}`).trim() || `Page ${index + 1}`,
                      imageUrl,
                      mediaType: String(item?.mediaType || '').trim().toLowerCase() || 'image',
                      link: String(item?.link || '').trim(),
                    }
                  })
                  .filter(Boolean)
                : []

              if (!groupPages.length) return null

              return {
                id: String(group?.id || `group-${groupIndex + 1}`).trim() || `group-${groupIndex + 1}`,
                title: String(group?.title || `Collection ${groupIndex + 1}`).trim() || `Collection ${groupIndex + 1}`,
                heroImage: String(group?.heroImage || groupPages[0]?.imageUrl || '/logo.png').trim() || '/logo.png',
                pages: groupPages,
              }
            })
            .filter(Boolean)
          : []

        const fallbackPages = normalizedPages.length ? normalizedPages : SPRING_SUMMER_LOOKBOOK_DEFAULT.pages
        const fallbackGroups = normalizedGroups.length
          ? normalizedGroups
          : [{
            id: 'default',
            title: 'Spring/Summer 2026',
            heroImage: fallbackPages[0]?.imageUrl || '/logo.png',
            pages: fallbackPages,
          }]

        setSpringSummerLookbook({
          title: String(payload?.title || SPRING_SUMMER_LOOKBOOK_DEFAULT.title).trim() || SPRING_SUMMER_LOOKBOOK_DEFAULT.title,
          subtitle: String(payload?.subtitle || SPRING_SUMMER_LOOKBOOK_DEFAULT.subtitle).trim() || SPRING_SUMMER_LOOKBOOK_DEFAULT.subtitle,
          groups: fallbackGroups,
          pages: fallbackPages,
        })
      }
      catch {
        if (mounted) setSpringSummerLookbook(SPRING_SUMMER_LOOKBOOK_DEFAULT)
      }
    }

    void loadLookbook()

    return () => {
      mounted = false
    }
  }, [])

  const activeSection = sections.find((section) => section.category === activeCategory) || null
  const subcategoryOptions = useMemo(() => {
    if (!activeSection) return []
    const names = activeSection.subcategories.map((subcategory) => subcategory.name)
    const sorted = names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
    // Pin Solid Gel Polish immediately after ALL
    const SGP = sorted.find((n) => normalizeCatalogueToken(n) === 'SOLID GEL POLISH')
    const rest = sorted.filter((n) => normalizeCatalogueToken(n) !== 'SOLID GEL POLISH')
    return SGP ? ['ALL', SGP, ...rest] : ['ALL', ...sorted]
  }, [activeSection])

  const baseItems = useMemo(() => {
    if (!activeSection) return []
    if (!activeSubcategory) return flattenSectionItems(activeSection)

    if (activeSubcategory === 'ALL') {
      return flattenSectionItems(activeSection)
    }

    const subcategory = activeSection.subcategories.find((item) => item.name === activeSubcategory)
    if (!subcategory) return []

    return subcategory.items.map((item) => ({
      ...item,
      subcategory: subcategory.name,
      colorFamilyKey: resolveColorFamilyKey(item.name),
    }))
  }, [activeSection, activeSubcategory])

  const isColorsCategory = isColorsCategoryName(activeSection?.category)
  const isSolidGelPolish = isColorsCategory && normalizeCatalogueToken(activeSubcategory) === 'SOLID GEL POLISH'

  const lookbookGroups = useMemo(() => {
    const groups = Array.isArray(springSummerLookbook?.groups) ? springSummerLookbook.groups : []
    if (groups.length) return groups

    const pages = Array.isArray(springSummerLookbook?.pages) ? springSummerLookbook.pages : []
    if (!pages.length) return []

    return [{
      id: 'default',
      title: 'Spring/Summer 2026',
      heroImage: pages[0]?.imageUrl || '/logo.png',
      pages,
    }]
  }, [springSummerLookbook])

  const buildRowsOfFour = useCallback((items = []) => {
    const list = Array.isArray(items) ? items : []
    if (!list.length) return []

    const rows = []
    for (let index = 0; index < list.length; index += 4) {
      rows.push(list.slice(index, index + 4))
    }

    return rows
  }, [])

  const displayedLookbookGroups = useMemo(
    () => lookbookGroups,
    [lookbookGroups],
  )

  const lookbookGroupRows = useMemo(
    () => buildRowsOfFour(displayedLookbookGroups),
    [buildRowsOfFour, displayedLookbookGroups],
  )

  const filteredItems = useMemo(() => {
    const resolveFamily = (item) => {
      // Primary: path-derived colour family from physical sub-folder
      if (item.colorFamily) return normalizeCatalogueToken(item.colorFamily)
      // Secondary: manually-curated JSON lookup
      const urlParts = (item.imageUrl || '').split('/')
      const filename = urlParts[urlParts.length - 1] || ''
      const sku = filename.replace(/\.[^.]+$/, '')
      const jsonFamily = solidGelColourFamilies[sku]
      if (jsonFamily) return jsonFamily
      // Fallback: name keyword matching
      return item.colorFamilyKey
    }

    const colorFiltered = (!isSolidGelPolish || activeColorFamily === 'ALL')
      ? baseItems
      : baseItems.filter((item) => resolveFamily(item) === activeColorFamily)

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
  }, [activeColorFamily, baseItems, isSolidGelPolish, solidGelColourFamilies, searchQuery])

  useEffect(() => {
    setScrollTop(0)
  }, [activeCategory, activeSubcategory, activeColorFamily])

  useEffect(() => {
    setScrollTop(0)
  }, [searchQuery])

  useEffect(() => {
    if (activeCategory && !activeSubcategory) {
      setActiveSubcategory('ALL')
    }
  }, [activeCategory, activeSubcategory])

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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setColorTileFrame((current) => current + 1)
    }, 3200)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!displayedLookbookGroups.length) {
      setExpandedLookbookGroup(0)
      return
    }

    if (expandedLookbookGroup > displayedLookbookGroups.length - 1) {
      setExpandedLookbookGroup(displayedLookbookGroups.length - 1)
    }
  }, [displayedLookbookGroups.length, expandedLookbookGroup])

  // Autoplay: advance through pages of the first lookbook group every 3.5 s
  useEffect(() => {
    const group = displayedLookbookGroups[0]
    if (!group) return
    const pages = Array.isArray(group.pages) ? group.pages : []
    if (pages.length <= 1) return
    const timer = setInterval(() => {
      setSelectedLookbookPageByGroup((prev) => {
        const cur = Number(prev[group.id] ?? 0)
        return { ...prev, [group.id]: (cur + 1) % pages.length }
      })
    }, 3500)
    return () => clearInterval(timer)
  }, [displayedLookbookGroups])

  useEffect(() => {
    const availableGroupIds = new Set(displayedLookbookGroups.map((group) => group.id))
    setSelectedLookbookPageByGroup((current) => {
      const next = {}
      let changed = false

      for (const [groupId, value] of Object.entries(current)) {
        if (availableGroupIds.has(groupId)) {
          next[groupId] = value
        }
        else {
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [displayedLookbookGroups])

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

  const chapter02Categories = ['BUILDER GEL SYSTEMS', 'BASES', 'CREME DE LA CREME', 'MULTIMIX']
  const chapter03Categories = ['TOPS', 'TOOLS', 'EQUIPMENT']
  const chapter04Categories = ['NAIL ART', 'CONSUMABLES', 'NAIL HAND & FOOT CARE', 'LIQUIDS', 'BY THE OCEAN']
  const activeProductInformation = useMemo(
    () => getSubcategoryProductInformation(activeCategory, activeSubcategory),
    [activeCategory, activeSubcategory],
  )

  const scrollToCatalogueSection = (categoryName = '') => {
    const normalizedCategory = normalizeCatalogueToken(categoryName)

    let targetId = ''
    if (normalizedCategory.includes('COLOR')) {
      targetId = 'catalogue-section-colours'
    } else if (chapter02Categories.some((name) => normalizeCatalogueToken(name) === normalizedCategory)) {
      targetId = 'catalogue-section-builders'
    } else if (chapter03Categories.some((name) => normalizeCatalogueToken(name) === normalizedCategory)) {
      targetId = 'catalogue-section-tools'
    } else if (chapter04Categories.some((name) => normalizeCatalogueToken(name) === normalizedCategory)) {
      targetId = 'catalogue-section-consumables'
    }

    if (!targetId) return
    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const scrollToCatalogueResults = useCallback(() => {
    requestAnimationFrame(() => {
      const targetElement = document.getElementById(CATALOGUE_RESULTS_ANCHOR_ID)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [])

  const scrollToCategoryDetail = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('catalogue-category-detail')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }, [])

  const openCatalogueCategory = useCallback((categoryName = '', subcategoryName = 'ALL') => {
    if (!categoryName) return
    setActiveCategory(categoryName)
    setActiveSubcategory(subcategoryName || 'ALL')
    setActiveColorFamily('ALL')
    // Scroll to the chapter section containing this category so results start at the top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToCatalogueSection(categoryName)
      })
    })
  }, [scrollToCatalogueResults])

  const getCategoryCoverImage = useCallback((categoryName = '', fallbackImageUrl = '') => {
    const candidates = buildCategoryHeroImageCandidates(categoryName, fallbackImageUrl)
    const candidateIndex = Math.max(0, Number(heroCandidateIndexByCategory[categoryName] || 0))
    return candidates[Math.min(candidateIndex, Math.max(0, candidates.length - 1))] || fallbackImageUrl || '/logo.png'
  }, [heroCandidateIndexByCategory])

  const handleCategoryCoverImageError = useCallback((categoryName = '', fallbackImageUrl = '') => {
    const candidates = buildCategoryHeroImageCandidates(categoryName, fallbackImageUrl)
    setHeroCandidateIndexByCategory((current) => {
      const currentIndex = Math.max(0, Number(current[categoryName] || 0))
      if (currentIndex >= candidates.length - 1) return current
      return {
        ...current,
        [categoryName]: currentIndex + 1,
      }
    })
  }, [])

  const serviceFlowMenu = useMemo(() => {
    const definitions = [
      {
        key: 'COLOURS',
        label: 'COLOURS',
        sectionTokens: ['COLOR'],
        preferredCategories: ['COLORS'],
        subcategories: [
          { label: 'The Solids (Nudes, Reds, Neons)', subcategoryTokens: ['SOLID', 'NUDE', 'RED', 'NEON'] },
          { label: 'Special Effects (Cat Eye, Reflective, Glitter)', subcategoryTokens: ['CAT EYE', 'REFLECT', 'GLITTER', 'SHIMMER'] },
          { label: 'Technical Art (Stamping, Painting, Spider Gels)', subcategoryTokens: ['SPIDER', 'STAMP', 'PAINT'] },
          { label: 'Collections', subcategoryTokens: ['COLLECTION', 'OCEAN', 'AUTUMN', 'NEW YORK', 'TUTTI'] },
        ],
      },
      {
        key: 'PRIMERS_PREP',
        label: 'PRIMERS & PREP',
        sectionTokens: ['LIQUID', 'BASE'],
        preferredCategories: ['LIQUIDS', 'BASES'],
        subcategories: [
          { label: 'Adhesion (Superbond/Acid Primers)', subcategoryTokens: ['SUPERBOND', 'PRIMER'] },
          { label: 'Sanitization', subcategoryTokens: ['SANIT'] },
          { label: 'Nail Prep/Cleansers', subcategoryTokens: ['PREP', 'CLEAN', 'REMOVER'] },
        ],
      },
      {
        key: 'TOPS_BASES',
        label: 'TOPS & BASES',
        sectionTokens: ['TOP', 'BASE'],
        preferredCategories: ['TOPS', 'BASES'],
        subcategories: [
          { label: 'Rubber Bases', subcategoryTokens: ['RUBBER BASE', '5IN1'] },
          { label: 'Flexi/Fiber Bases', subcategoryTokens: ['FLEXI', 'FIBER', 'BRUSH ON BUILDER'] },
          { label: 'No-Wipe Gloss Tops', subcategoryTokens: ['NO WIPE', 'GLOSS', 'CLASSIC TOP'] },
          { label: 'Matte/Effect Tops', subcategoryTokens: ['MATTE', 'EFFECT', 'SHIMMER TOP', 'SPOT MY TOPS'] },
        ],
      },
      {
        key: 'BUILDERS',
        label: 'BUILDER SYSTEMS',
        sectionTokens: ['BUILDER', 'MULTIMIX', 'ACRYLIC'],
        preferredCategories: ['BUILDER GEL SYSTEMS', 'MULTIMIX', 'ACRYLIC'],
        subcategories: [
          { label: '3-in-1 Premium Builders', subcategoryTokens: ['3INI', 'PREMIUM BUILDER'] },
          { label: 'MultiMix Synthogel (Acrygel)', subcategoryTokens: ['MULTIMIX', '30 ML', '60 ML'] },
          { label: 'Builder-in-a-bottle (BIAB)', subcategoryTokens: ['BRUSH ON BUILDER', '5IN1'] },
          { label: 'Acrylic Systems', subcategoryTokens: ['ACRYLIC', 'COMPETE'] },
        ],
      },
      {
        key: 'CONSUMABLES',
        label: 'CONSUMABLES',
        sectionTokens: ['CONSUMABLE'],
        preferredCategories: ['CONSUMABLES'],
        subcategories: [
          { label: 'Files & Buffers', subcategoryTokens: ['FILE', 'BUFFER'] },
          { label: 'Nail Forms & Dual Forms', subcategoryTokens: ['NAIL FORM', 'DUAL FORM'] },
          { label: 'Soak Off Gel Tips', subcategoryTokens: ['SOAK OFF'] },
          { label: 'Wipes & Sticks', subcategoryTokens: ['WIPE', 'STICK'] },
        ],
      },
      {
        key: 'NAIL_HAND_FOOT_CARE',
        label: 'NAIL, HAND & FOOT CARE',
        sectionTokens: ['NAIL HAND', 'FOOT CARE'],
        preferredCategories: ['NAIL HAND & FOOT CARE'],
        subcategories: [
          { label: 'Cuticle Oils & Removers', subcategoryTokens: ['CUTICLE OIL', 'REMOVER'] },
          { label: 'Creams & Scrubs', subcategoryTokens: ['CREAM', 'SCRUB'] },
        ],
      },
      {
        key: 'TOOLS_EQUIPMENT',
        label: 'TOOLS & EQUIPMENT',
        sectionTokens: ['TOOL', 'EQUIP', 'BRUSH'],
        preferredCategories: ['TOOLS', 'EQUIPMENT', 'BRUSHES'],
        subcategories: [
          { label: 'Professional Brushes', subcategoryTokens: ['BRUSH'] },
          { label: 'Implements (Nippers/Scissors)', subcategoryTokens: ['NIPPER', 'SCISSOR'] },
          { label: 'LED/UV Lamps', subcategoryTokens: ['LAMP', 'LED', 'UV'] },
          { label: 'E-Files/Drills', subcategoryTokens: ['DRILL', 'E FILE'] },
        ],
      },
    ]

    return definitions.map((definition) => {
      const matchedSections = sections.filter((section) => {
        const token = normalizeCatalogueToken(section.category)
        return definition.sectionTokens.some((needle) => token.includes(normalizeCatalogueToken(needle)))
      })

      const preferredCategoryTokens = Array.isArray(definition.preferredCategories)
        ? definition.preferredCategories.map((item) => normalizeCatalogueToken(item))
        : []
      const primarySection = matchedSections.find((section) => preferredCategoryTokens.includes(normalizeCatalogueToken(section.category)))
        || matchedSections[0]
        || null
      const orderedSections = primarySection
        ? [primarySection, ...matchedSections.filter((section) => section.category !== primarySection.category)]
        : matchedSections

      const resolvedSubcategories = definition.subcategories.map((sub) => {
        for (const section of orderedSections) {
          const found = section.subcategories.find((entry) => {
            const token = normalizeCatalogueToken(entry.name)
            return sub.subcategoryTokens.some((needle) => token.includes(normalizeCatalogueToken(needle)))
          })

          if (found) {
            return {
              label: sub.label,
              category: section.category,
              subcategory: found.name,
            }
          }
        }

        const fallbackSection = primarySection || matchedSections[0] || null
        return {
          label: sub.label,
          category: fallbackSection?.category || '',
          subcategory: 'ALL',
        }
      })

      return {
        ...definition,
        matchedSections,
        primaryCategory: primarySection?.category || '',
        resolvedSubcategories,
      }
    })
  }, [sections])

  const categoryDetail = activeCategory
    ? (
      <div id="catalogue-category-detail" className="rounded-2xl border border-[#4A4A4A]/30 bg-white p-4 sm:p-5 scroll-mt-28">
        <div className="mb-3">
          <button
            onClick={() => {
              setActiveCategory('')
              setActiveSubcategory('')
              setActiveColorFamily('ALL')
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4A4A4A]/30 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-black/70 transition hover:border-fuchsia-500/50 hover:text-fuchsia-600"
          >
            <span>←</span>
            <span>Back to Categories</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black uppercase tracking-[0.05em] text-black">{activeSection?.category || 'Our Products'}</h2>
            <p className="mt-1 text-xs text-black/55">{filteredItems.length} matching items</p>
          </div>
          <div className="rounded-[12px] border border-fuchsia-200/60 bg-fuchsia-50/70 px-3 py-2 text-xs text-fuchsia-900/80">
            All products are <strong>HEMA-free, TPO-free &amp; Silver (CI 77820)-free</strong>, formulated to strict EU cosmetic regulations. Catalogue view only.
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {subcategoryOptions.map((subcategory) => {
            const isActive = activeSubcategory === subcategory
            const isSGP = normalizeCatalogueToken(subcategory) === 'SOLID GEL POLISH'
            return (
              <button
                key={`subcategory-${subcategory}`}
                onClick={() => { setActiveSubcategory(subcategory); scrollToCategoryDetail() }}
                className={`relative rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition duration-300 ${
                  isActive
                    ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-[0_0_0_2px_rgba(212,55,144,0.25)]'
                    : isSGP
                      ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 hover:border-fuchsia-500 hover:bg-fuchsia-100'
                      : 'border-[#4A4A4A]/35 bg-white text-black/75 hover:border-fuchsia-500'
                }`}
              >
                {isSGP && !isActive && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#D43790] ring-2 ring-white" />
                )}
                {formatSubcategoryDisplayName(subcategory)}
              </button>
            )
          })}
        </div>

        {!activeSubcategory && (
          <div className="mt-3 rounded-[12px] border border-[#4A4A4A]/30 bg-black/[0.02] px-3 py-2 text-xs text-black/60">
            Select a subcategory to view products.
          </div>
        )}

        {!!activeSubcategory && (
          <>
            {(() => {
              const metadata = activeProductInformation
              if (!metadata) return null
              const hasContent = metadata.paragraphs?.length > 0 || metadata.listItems?.length > 0
              if (!hasContent) return null

              const listItems = Array.isArray(metadata.listItems) ? metadata.listItems : []
              const dualFormsItems = listItems
                .filter((item) => /^Dual Forms Application\s*[—-]\s*/i.test(String(item || '')))
                .map((item) => String(item).replace(/^Dual Forms Application\s*[—-]\s*/i, '').trim())
              const applicationItems = listItems
                .filter((item) => /^Application\s*[—-]\s*/i.test(String(item || '')))
                .map((item) => String(item).replace(/^Application\s*[—-]\s*/i, '').trim())
              const nonApplicationItems = listItems.filter((item) => !/^Application\s*[—-]\s*/i.test(String(item || '')) && !/^Dual Forms Application\s*[—-]\s*/i.test(String(item || '')))

              return (
                <div className="mt-4 rounded-[12px] border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-50/60 to-purple-50/40 p-4 sm:p-5">
                  <h3 className="text-base font-bold uppercase tracking-[0.06em] text-fuchsia-900 sm:text-lg">Product Information</h3>
                  {metadata.paragraphs?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {metadata.paragraphs.map((para, idx) => (
                        <p key={idx} className="text-sm leading-relaxed text-fuchsia-900/80">{para}</p>
                      ))}
                    </div>
                  )}
                  {nonApplicationItems.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {nonApplicationItems.map((item, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-fuchsia-900/90">
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fuchsia-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {applicationItems.length > 0 && (
                    <>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-fuchsia-900/70">Application</p>
                      <ul className="mt-2 space-y-1.5">
                        {applicationItems.map((item, idx) => (
                          <li key={`application-${idx}`} className="flex gap-2 text-sm text-fuchsia-900/90">
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fuchsia-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {dualFormsItems.length > 0 && (
                    <details className="mt-3 rounded-[10px] border border-fuchsia-300/50 bg-white/70 p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.1em] text-fuchsia-900/80">Learn More: Dual Forms Application</summary>
                      <ul className="mt-2 space-y-1.5">
                        {dualFormsItems.map((item, idx) => (
                          <li key={`dual-forms-${idx}`} className="flex gap-2 text-sm text-fuchsia-900/90">
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-fuchsia-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )
            })()}

            <div className="mt-3">
              <label className="sr-only" htmlFor="catalog-search">Search catalogue</label>
              <input
                id="catalog-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search product name, code, or subcategory..."
                className="w-full rounded-[12px] border border-[#4A4A4A]/35 bg-white px-3 py-2 text-sm text-black outline-none ring-fuchsia-500/20 focus:ring"
              />
            </div>

            {isSolidGelPolish && (
              <div className="mt-3 rounded-[12px] border border-[#4A4A4A]/30 bg-black/[0.02] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">Quick Filter</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLOR_FAMILY_FILTERS.map((family) => {
                    const isActive = activeColorFamily === family.key
                    return (
                      <button
                        key={family.key}
                        onClick={() => { setActiveColorFamily(family.key); scrollToCategoryDetail() }}
                        className={`inline-flex items-center gap-2 rounded-[12px] border px-2.5 py-1.5 text-xs transition duration-300 ${isActive ? 'border-fuchsia-600 bg-fuchsia-600 text-white' : 'border-[#4A4A4A]/35 bg-white text-black/70 hover:border-fuchsia-500'}`}
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
              className="mt-4 max-h-[68vh] overflow-auto rounded-[14px] border border-[#4A4A4A]/30 bg-white md:max-h-[72vh]"
            >
              <div style={{ height: topSpacerHeight }} />

              <div
                className={`grid gap-3 p-2 sm:p-3 ${bulkMode ? 'grid-cols-1' : ''}`}
                style={bulkMode ? undefined : { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
              >
                {virtualItems.map(({ item, itemIndex }) => {
                  const itemCode = extractProductCode(item.name)

                  if (bulkMode) {
                    return (
                      <div key={`${activeSection?.category}-${item.subcategory}-${item.imageUrl}`} className="flex items-center gap-2 rounded-[12px] border border-[#4A4A4A]/30 bg-[#E8E8E8] px-3 py-2 transition duration-300 hover:border-fuchsia-500/70 hover:bg-[#E8E8E8] hover:shadow-[0_0_0_1px_rgba(212,55,144,0.26)]" data-catalogue-item>
                        <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-[10px] border border-black/10 bg-white object-contain opacity-0 transition-opacity duration-300" loading="lazy" onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')} onError={(e) => { e.currentTarget.closest('[data-catalogue-item]')?.classList.add('!hidden') }} />
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
                    <article key={`${activeSection?.category}-${item.subcategory}-${item.imageUrl}`} className={`overflow-hidden rounded-[14px] border border-[#4A4A4A]/30 bg-[#E8E8E8] transition duration-300 md:hover:scale-[1.03] md:hover:border-fuchsia-500/70 md:hover:bg-[#E8E8E8] md:hover:shadow-[0_0_0_2px_rgba(212,55,144,0.24)] ${getTileVariant(itemIndex)}`} data-catalogue-item>
                      <div className="flex h-44 w-full items-center justify-center overflow-hidden bg-white p-2 sm:h-52 md:h-60">
                        <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full scale-[1.025] object-cover opacity-0 transition-opacity duration-300" onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')} onError={(e) => { e.currentTarget.closest('[data-catalogue-item]')?.classList.add('!hidden') }} />
                      </div>
                      <div className="border-t border-black/10 px-2.5 py-2">
                        <p className="truncate text-[11px] font-light uppercase tracking-[0.08em] text-black/45">{itemCode}</p>
                        <p className="truncate text-xs font-semibold uppercase tracking-[0.02em] text-black">{item.name}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <span className="h-3.5 w-3.5 rounded-full border border-black/15 bg-fuchsia-500" aria-hidden="true" />
                          <p className="truncate text-[11px] font-light text-black/55">{formatSubcategoryDisplayName(item.subcategory)}</p>
                        </div>
                        <div className="mt-2 flex items-center">
                          <NavLink
                            to="/portal/login?mode=create-password"
                            className="ml-auto inline-flex min-h-10 items-center rounded-[10px] bg-fuchsia-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition duration-300 hover:bg-fuchsia-500"
                          >
                            Buy Now
                          </NavLink>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div style={{ height: bottomSpacerHeight }} />
            </div>

            <div className="mt-2 text-xs text-black/55">
              Showing {filteredItems.length} catalogue items. Use Buy Now to sign in or create an account and start purchasing.
            </div>
          </>
        )}
      </div>
    )
    : null

  return (
    <section className="space-y-5">
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#1A1A1A] px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="heading-on-dark text-4xl font-extrabold uppercase tracking-[0.15em] text-white sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}>
            Our Products
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/90 sm:text-lg" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
            Everything you need delivered as one complete system. HEMA & TPO-Free formulations, <a href="https://www.crueltyfreeinternational.org/approved-brands/" target="_blank" rel="noreferrer" className="font-semibold text-fuchsia-300 hover:underline">Cruelty-Free certified</a>, and engineered for professional excellence. Explore every shade, tool, and accessory in our global collection.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/65">
          Loading catalogue...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          Unable to load catalogue: {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && sections.length > 0 && (
        <>
          <div id={CATALOGUE_RESULTS_ANCHOR_ID} className="scroll-mt-28" />

          {/* CHAPTER 01: THE INFINITE SPECTRUM */}
          <div id="catalogue-section-colours" className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen scroll-mt-28 overflow-hidden bg-[#1A1A1A] px-4 py-12 sm:px-8 sm:py-16">
            {/* Ombré layers — fuchsia bloom bottom-left, diagonal sweep, deep violet top-right */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_0%_100%,rgba(212,55,144,0.42)_0%,transparent_65%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(180,30,120,0.18)_0%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(109,40,217,0.18)_0%,transparent_60%)]" />
            <div className="relative mx-auto max-w-6xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">The Core Pigment Library</p>
              <h2 className="heading-on-dark mt-2 text-3xl font-extrabold uppercase tracking-[0.1em] text-white sm:text-4xl">1,000+ Colours</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                The Gelitup Archive. Over 1,000 laboratory-grade shades categorised by undertone and finish. From the deepest onyx to the clearest glass-top, find your signature shade in our comprehensive colour vault.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {
                    const colorsSection = sections.find((s) => isColorsCategoryName(s.category))
                    if (colorsSection) {
                      openCatalogueCategory(colorsSection.category, 'SOLID GEL POLISH')
                    }
                  }}
                  className="rounded-lg bg-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-fuchsia-500"
                >
                  SEE THE FULL COLOUR RANGE
                </button>
              </div>
            </div>
          </div>

          {isColorsCategoryName(activeCategory) && categoryDetail}

          {/* CHAPTER 02: STRUCTURAL ENGINEERING */}
          <div id="catalogue-section-builders" className="space-y-4 scroll-mt-28 py-12 px-4 sm:px-8">
            <div className="mx-auto max-w-6xl px-4 sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D43790]">Laboratory Essentials</p>
              <h2 className="mt-1 text-3xl font-extrabold uppercase tracking-[0.1em] text-[#1A1A1A] sm:text-4xl">Base &amp; Builder Systems</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#1A1A1A]/70 sm:text-base">
                The foundation of every trend. Our Leeukopf-certified base and builder systems provide the architectural support for your colour — engineered for 21-day wear and diamond-grade shine.
              </p>
            </div>

            {/* CATEGORY GRID */}
            <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {chapter02Categories.map((categoryName) => {
                const section = sections.find((s) => s.category === categoryName)
                if (!section) return null
                const itemCount = section.subcategories.reduce((sum, sub) => sum + sub.items.length, 0)
                const coverImageFallback = section.subcategories[0]?.items?.[0]?.imageUrl || '/logo.png'
                const coverImage = getCategoryCoverImage(categoryName, coverImageFallback)
                const specs = CATEGORY_LAB_SPECS[categoryName] ?? DEFAULT_LAB_SPECS
                return (
                  <Fragment key={categoryName}>
                    <button
                      onClick={() => {
                        openCatalogueCategory(categoryName, 'ALL')
                      }}
                      className="group overflow-hidden rounded-lg border border-[#4A4A4A]/30 bg-white transition duration-300 hover:border-fuchsia-500/50 hover:shadow-lg"
                    >
                      <div className="relative h-52 bg-white p-2">
                        <img
                          src={coverImage}
                          alt={categoryName}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={() => handleCategoryCoverImageError(categoryName, coverImageFallback)}
                        />
                        <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-[#D43790]" />
                      </div>
                      <div className="border-t border-[#4A4A4A]/20 p-3">
                        <p className="text-sm font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">{categoryName}</p>
                        <p className="text-xs text-[#1A1A1A]/75">{itemCount} items</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {specs.pigmentDots !== null && (
                            <span className="inline-flex items-center rounded-md border border-[#4A4A4A]/20 bg-[#E8E8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A4A4A]">
                              {specs.pigmentDots >= 1 ? '●' : '○'}{specs.pigmentDots >= 2 ? '●' : '○'}{specs.pigmentDots >= 3 ? '●' : '○'} Pigment
                            </span>
                          )}
                          {specs.cure && (
                            <span className="inline-flex items-center rounded-md border border-[#4A4A4A]/20 bg-[#E8E8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A4A4A]">
                              {specs.cure}
                            </span>
                          )}
                          {specs.llab && (
                            <span className="inline-flex items-center rounded-md border border-fuchsia-200 bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-700">
                              L-Lab ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {activeCategory === categoryName && <div className="col-span-full">{categoryDetail}</div>}
                  </Fragment>
                )
              })}
            </div>
            </div>
          </div>

          {/* CHAPTER 03: THE PROFESSIONAL TOOLSET */}
          <div id="catalogue-section-tools" className="space-y-4 scroll-mt-28 py-12 px-4 sm:px-8">
            <div className="mx-auto max-w-6xl px-4 sm:px-8">
              <h2 className="text-3xl font-extrabold uppercase tracking-[0.12em] text-[#1A1A1A] sm:text-4xl" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}>TOOLS & EQUIPMENT</h2>
              <p className="mt-3 max-w-2xl text-base text-[#1A1A1A]/75" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                Precision finishing products, expert hardware, and maintenance tools for flawless studio finishes.
              </p>
            </div>
            <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {chapter03Categories.map((categoryName) => {
                const section = sections.find((s) => s.category === categoryName)
                if (!section) return null
                const itemCount = section.subcategories.reduce((sum, sub) => sum + sub.items.length, 0)
                const coverImageFallback = section.subcategories[0]?.items?.[0]?.imageUrl || '/logo.png'
                const coverImage = getCategoryCoverImage(categoryName, coverImageFallback)
                const specs = CATEGORY_LAB_SPECS[categoryName] ?? DEFAULT_LAB_SPECS
                return (
                  <Fragment key={categoryName}>
                    <button
                      onClick={() => {
                        openCatalogueCategory(categoryName, 'ALL')
                      }}
                      className="group overflow-hidden rounded-lg border border-[#4A4A4A]/30 bg-white transition duration-300 hover:border-fuchsia-500/50 hover:shadow-lg"
                    >
                      <div className="relative h-52 bg-white p-2">
                        <img
                          src={coverImage}
                          alt={categoryName}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={() => handleCategoryCoverImageError(categoryName, coverImageFallback)}
                        />
                        <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-[#D43790]" />
                      </div>
                      <div className="border-t border-[#4A4A4A]/20 p-3">
                        <p className="text-sm font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">{categoryName}</p>
                        <p className="text-xs text-[#1A1A1A]/75">{itemCount} items</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {specs.pigmentDots !== null && (
                            <span className="inline-flex items-center rounded-md border border-[#4A4A4A]/20 bg-[#E8E8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A4A4A]">
                              {specs.pigmentDots >= 1 ? '●' : '○'}{specs.pigmentDots >= 2 ? '●' : '○'}{specs.pigmentDots >= 3 ? '●' : '○'} Pigment
                            </span>
                          )}
                          {specs.cure && (
                            <span className="inline-flex items-center rounded-md border border-[#4A4A4A]/20 bg-[#E8E8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A4A4A]">
                              {specs.cure}
                            </span>
                          )}
                          {specs.llab && (
                            <span className="inline-flex items-center rounded-md border border-fuchsia-200 bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-700">
                              L-Lab ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {activeCategory === categoryName && <div className="col-span-full">{categoryDetail}</div>}
                  </Fragment>
                )
              })}
            </div>
            </div>
          </div>

          {/* CHAPTER 04: ARTISTIC MASTERY & CARE */}
          <div id="catalogue-section-consumables" className="space-y-4 scroll-mt-28 py-12 px-4 sm:px-8">
            <div className="mx-auto max-w-6xl px-4 sm:px-8">
              <h2 className="text-3xl font-extrabold uppercase tracking-[0.12em] text-[#1A1A1A] sm:text-4xl" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}>CONSUMABLES & ART</h2>
              <p className="mt-3 max-w-2xl text-base text-[#1A1A1A]/75" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                Nail art ecosystem and therapeutic formulations for creative details and professional aftercare.
              </p>
            </div>
            <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {chapter04Categories.map((categoryName) => {
                const section = sections.find((s) => s.category === categoryName)
                if (!section) return null
                const itemCount = section.subcategories.reduce((sum, sub) => sum + sub.items.length, 0)
                const coverImageFallback = section.subcategories[0]?.items?.[0]?.imageUrl || '/logo.png'
                const coverImage = getCategoryCoverImage(categoryName, coverImageFallback)
                const specs = CATEGORY_LAB_SPECS[categoryName] ?? DEFAULT_LAB_SPECS
                return (
                  <Fragment key={categoryName}>
                    <button
                      onClick={() => {
                        openCatalogueCategory(categoryName, 'ALL')
                      }}
                      className="group overflow-hidden rounded-lg border border-[#4A4A4A]/30 bg-white transition duration-300 hover:border-fuchsia-500/50 hover:shadow-lg"
                    >
                      <div className="relative h-52 bg-white p-2">
                        <img
                          src={coverImage}
                          alt={categoryName}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={() => handleCategoryCoverImageError(categoryName, coverImageFallback)}
                        />
                        <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-[#D43790]" />
                      </div>
                      <div className="border-t border-[#4A4A4A]/20 p-3">
                        <p className="text-sm font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">{categoryName}</p>
                        <p className="text-xs text-[#1A1A1A]/75">{itemCount} items</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {specs.pigmentDots !== null && (
                            <span className="inline-flex items-center rounded-md border border-[#4A4A4A]/20 bg-[#E8E8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A4A4A]">
                              {specs.pigmentDots >= 1 ? '●' : '○'}{specs.pigmentDots >= 2 ? '●' : '○'}{specs.pigmentDots >= 3 ? '●' : '○'} Pigment
                            </span>
                          )}
                          {specs.cure && (
                            <span className="inline-flex items-center rounded-md border border-[#4A4A4A]/20 bg-[#E8E8E8] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A4A4A]">
                              {specs.cure}
                            </span>
                          )}
                          {specs.llab && (
                            <span className="inline-flex items-center rounded-md border border-fuchsia-200 bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-700">
                              L-Lab ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {activeCategory === categoryName && <div className="col-span-full">{categoryDetail}</div>}
                  </Fragment>
                )
              })}
            </div>
            </div>

            {chapter04Categories.includes(activeCategory) && categoryDetail}
          </div>

          <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#4A4A4A]/25">
            <div className="grid lg:grid-cols-2">
              {/* LEFT: Cloud Dancer story */}
              <div className="flex flex-col justify-center bg-[#1A1A1A] px-8 py-12 sm:px-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D43790]">New Additions · 2026</p>
                <h2 className="mt-3 text-3xl font-extrabold uppercase leading-tight tracking-[0.06em] text-white sm:text-4xl">
                  Cloud Dancer<br /><span className="text-[#D43790]">The Series</span>
                </h2>
                <div className="mt-3 h-px w-10 bg-[#D43790]/60" />
                <p className="mt-5 text-sm leading-relaxed text-white/65">
                  {HOME_CLOUD_DANCER_DEFAULT.introText}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/40">
                  22 illuminated shades — each one chosen to complement every skin tone and every season. The complete Cloud Dancer collection is available exclusively through our professional portal.
                </p>
                <div className="mt-8">
                  <NavLink
                    to="/become-distributor"
                    className="inline-block rounded-lg bg-[#D43790] px-7 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition duration-300 hover:bg-[#b02d78]"
                  >
                    Add to Your Collection
                  </NavLink>
                </div>
              </div>

              {/* RIGHT: 9:16 portrait carousel */}
              <div className="flex flex-col items-center justify-center bg-[#0F0F0F] p-6 sm:p-8">
                {displayedLookbookGroups.map((group) => {
                  const pages = Array.isArray(group?.pages) ? group.pages : []
                  if (!pages.length) return null
                  const selectedPageIndex = Math.max(0, Math.min(Number(selectedLookbookPageByGroup[group.id] ?? 0), pages.length - 1))
                  const page = pages[selectedPageIndex]
                  const pageType = String(page?.mediaType || '').toLowerCase()
                  return (
                    <div key={group.id} className="w-full max-w-[240px] sm:max-w-[260px]">
                      {/* Portrait stage — 9:16 */}
                      <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A]" style={{ aspectRatio: '9/16' }}>
                        <div className="flex h-full w-full items-center justify-center">
                          {pageType === 'video'
                            ? <video key={page.imageUrl} src={page.imageUrl} className="h-full w-full object-cover" autoPlay muted playsInline preload="metadata" />
                            : <img key={page.imageUrl} src={page.imageUrl || group.heroImage} alt={page.title} className="h-full w-full object-cover" loading="lazy" />}
                        </div>

                        {/* Prev */}
                        <button
                          type="button"
                          onClick={() => setSelectedLookbookPageByGroup((prev) => ({ ...prev, [group.id]: (selectedPageIndex - 1 + pages.length) % pages.length }))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:bg-black/75"
                        >‹</button>
                        {/* Next */}
                        <button
                          type="button"
                          onClick={() => setSelectedLookbookPageByGroup((prev) => ({ ...prev, [group.id]: (selectedPageIndex + 1) % pages.length }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:bg-black/75"
                        >›</button>

                        {/* Dot indicators */}
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                          {pages.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedLookbookPageByGroup((prev) => ({ ...prev, [group.id]: idx }))}
                              className={`h-1.5 rounded-full transition-all duration-300 ${idx === selectedPageIndex ? 'w-5 bg-[#D43790]' : 'w-1.5 bg-white/40'}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Thumbnail filmstrip */}
                      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {pages.map((p, idx) => {
                          const mt = String(p?.mediaType || '').toLowerCase()
                          const isActive = idx === selectedPageIndex
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedLookbookPageByGroup((prev) => ({ ...prev, [group.id]: idx }))}
                              className={`shrink-0 overflow-hidden rounded-md border-2 transition ${isActive ? 'border-[#D43790]' : 'border-transparent opacity-50 hover:opacity-80'}`}
                            >
                              <div className="h-14 w-9 bg-[#222]">
                                {mt === 'video'
                                  ? <video src={p.imageUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                                  : <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* PERSISTENT FOOTER */}
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-[#4A4A4A]/30 bg-[#1A1A1A] px-4 py-8 text-center sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/90">
              All GEL.IT.UP products are 100% HEMA-Free · TPO-Free · Silver (CI 77820)-Free
            </p>
            <p className="mt-2 text-xs tracking-[0.06em] text-white/55">
              Formulated in strict compliance with EU Cosmetics Regulation (EC) No 1223/2009 · CPNP Notified
            </p>
          </div>

        </>
      )}
    </section>
  )
}

function MissingImagesReport() {
  const [sections, setSections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const loadCatalogue = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await fetch('/gelitup-content/product-image-map.json')
        if (!response.ok) {
          throw new Error(`Catalogue map unavailable (${response.status})`)
        }

        const payload = await response.json()
        if (!mounted) return

        const nextSections = buildCatalogueSectionsFromImageMap(payload, new Map())
        setSections(nextSections)
      }
      catch (error) {
        if (!mounted) return
        setSections([])
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

  const missingImages = useMemo(() => {
    const items = []
    sections.forEach((section) => {
      section.subcategories.forEach((subcategory) => {
        subcategory.items.forEach((item) => {
          if (!item.imageUrl || item.imageUrl === '/logo.png' || item.imageUrl.includes('placeholder')) {
            items.push({
              category: section.category,
              subcategory: subcategory.name,
              name: item.name,
              imageUrl: item.imageUrl || 'N/A',
            })
          }
        })
      })
    })
    return items
  }, [sections])

  const categoryGroups = useMemo(() => {
    const groups = new Map()
    missingImages.forEach((item) => {
      if (!groups.has(item.category)) {
        groups.set(item.category, [])
      }
      groups.get(item.category).push(item)
    })
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [missingImages])

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-amber-400/40 bg-amber-50 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Graphics Designer Report</p>
            <h1 className="mt-2 text-xl font-black uppercase tracking-[0.04em] text-amber-900 sm:text-3xl sm:tracking-[0.06em]">Missing or Placeholder Images</h1>
            <p className="mt-2 text-sm text-amber-800">
              Products with missing, placeholder, or default images that need proper photographs.
            </p>
          </div>
          <NavLink
            to="/full-catalogue"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-900 transition hover:border-amber-600"
          >
            <span>←</span>
            <span>Back to Catalogue</span>
          </NavLink>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-black/65">
          Loading catalogue data...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          Unable to load catalogue: {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && missingImages.length === 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
          ✓ All products have images! No missing images found.
        </div>
      )}

      {!isLoading && !errorMessage && missingImages.length > 0 && (
        <>
          <div className="rounded-2xl border border-amber-400/40 bg-white p-5">
            <p className="text-sm font-semibold text-amber-900">
              Total items needing images: <span className="text-lg">{missingImages.length}</span>
            </p>
          </div>

          <div className="space-y-4">
            {categoryGroups.map(([category, items]) => (
              <div key={category} className="rounded-2xl border border-[#4A4A4A]/30 bg-white p-5">
                <h2 className="text-lg font-bold uppercase tracking-[0.04em] text-black">{category}</h2>
                <p className="mt-1 text-xs text-black/55">{items.length} items</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#4A4A4A]/20">
                        <th className="pb-2 pr-4 font-semibold text-black/70">Subcategory</th>
                        <th className="pb-2 pr-4 font-semibold text-black/70">Product Name</th>
                        <th className="pb-2 font-semibold text-black/70">Current Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-[#4A4A4A]/10">
                          <td className="py-2 pr-4 text-black/70">{item.subcategory}</td>
                          <td className="py-2 pr-4 font-medium text-black">{item.name}</td>
                          <td className="py-2 text-xs text-rose-600">{item.imageUrl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function InfoCard({ id, title, children, tone = 'white' }) {
  const toneClass = tone === 'muted'
    ? 'bg-slate-50'
    : tone === 'dark'
      ? 'bg-[#1A1A1A] border-[#4A4A4A] text-white'
      : 'bg-white'
  const headingClass = tone === 'dark' ? 'heading-on-dark text-xl font-extrabold' : 'text-xl font-semibold text-slate-900'
  const bodyClass = tone === 'dark' ? 'mt-2 text-sm text-white/90' : 'mt-2 text-sm text-slate-600'

  return (
    <div id={id} className={`rounded-2xl border border-slate-200 ${toneClass} p-5 sm:p-6`}>
      <h2 className={headingClass}>{title}</h2>
      <div className={bodyClass}>{children}</div>
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

function Nav({ onOpenContactModal }) {
  return (
    <nav className="hidden gap-2 md:flex">
      {navItems.map((item) => {
        if (item.isContactAction) {
          return (
            <button
              key={item.to}
              type="button"
              onClick={onOpenContactModal}
              className="rounded-lg px-4 py-2 text-sm font-medium uppercase tracking-[0.04em] !text-white/90 transition duration-300 hover:bg-white/10 hover:!text-white active:bg-fuchsia-600 active:!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A]"
            >
              {item.label}
            </button>
          )
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              item.highlight
                ? `rounded-lg border px-4 py-2 text-sm font-bold uppercase tracking-[0.06em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] ${
                    isActive
                      ? 'border-fuchsia-400 bg-fuchsia-600 !text-white shadow-[0_0_12px_rgba(212,55,144,0.55)]'
                      : 'border-fuchsia-500 bg-fuchsia-600 !text-white shadow-[0_0_8px_rgba(212,55,144,0.35)] hover:bg-fuchsia-500 hover:shadow-[0_0_14px_rgba(212,55,144,0.6)]'
                  }`
                : `rounded-lg px-4 py-2 text-sm font-medium uppercase tracking-[0.04em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] ${
                    isActive ? 'bg-fuchsia-600 !text-white shadow-[0_0_0_1px_rgba(217,70,239,0.45)]' : '!text-white/90 hover:bg-white/10 hover:!text-white active:bg-fuchsia-600 active:!text-white'
                  }`
            }
          >
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

function MobileNav({ onOpenContactModal }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-black/90 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-xl gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          if (item.isContactAction) {
            return (
              <button
                key={item.to}
                type="button"
                onClick={onOpenContactModal}
                className="min-w-max shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.02em] !text-white/85 transition duration-300 hover:bg-white/10 hover:!text-white active:bg-fuchsia-600 active:!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {item.label}
              </button>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                item.highlight
                  ? `min-w-max shrink-0 whitespace-nowrap rounded-md border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.04em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      isActive
                        ? 'border-fuchsia-400 bg-fuchsia-600 !text-white shadow-[0_0_10px_rgba(212,55,144,0.5)]'
                        : 'border-fuchsia-500 bg-fuchsia-600 !text-white shadow-[0_0_6px_rgba(212,55,144,0.35)] hover:bg-fuchsia-500'
                    }`
                  : `min-w-max shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.02em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      isActive ? 'bg-fuchsia-600 !text-white shadow-[0_0_0_1px_rgba(217,70,239,0.5)]' : '!text-white/85 hover:bg-white/10 hover:!text-white active:bg-fuchsia-600 active:!text-white'
                    }`
              }
            >
              {item.label}
            </NavLink>
          )
        })}
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

function InstagramFeedStrip() {
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'error'

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/.netlify/functions/instagram-feed')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (mounted) {
          setPosts(data.posts || [])
          setStatus((data.posts || []).length > 0 ? 'ok' : 'error')
        }
      } catch {
        if (mounted) setStatus('error')
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (status === 'error' || (status !== 'loading' && posts.length === 0)) return null

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#0F0F0F] py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Instagram gradient icon */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433" />
                  <stop offset="25%" stopColor="#e6683c" />
                  <stop offset="50%" stopColor="#dc2743" />
                  <stop offset="75%" stopColor="#cc2366" />
                  <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="4" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
              <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad)" />
            </svg>
            <span className="text-sm font-bold uppercase tracking-[0.12em] text-white">
              @{INSTAGRAM_HANDLE}
            </span>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold uppercase tracking-widest text-[#D43790] transition hover:text-fuchsia-300"
          >
            Follow Us →
          </a>
        </div>

        {status === 'loading' ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 w-48 flex-shrink-0 animate-pulse rounded-xl bg-white/10" />
            ))}
          </div>
        ) : (
          <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
            {posts.map((post) => {
              const thumb = post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url
              const isVideo = post.media_type === 'VIDEO'
              return (
                <a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative h-48 w-48 flex-shrink-0 snap-start overflow-hidden rounded-xl"
                >
                  <img
                    src={thumb}
                    alt={post.caption ? post.caption.slice(0, 80) : 'Instagram post'}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {isVideo && (
                    <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1">
                      <svg className="h-3 w-3 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100">
                    {post.caption && (
                      <p className="line-clamp-3 p-3 text-[10px] leading-relaxed text-white">{post.caption}</p>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function HomePage({ onOpenContactModal }) {
  const [media, setMedia] = useState(() => ({
    heroImage: '/logo.png',
    heroVideo: null,
    gallery: [],
  }))
  const [homeNewsCarousel, setHomeNewsCarousel] = useState([])
  const [activeHomeNewsSlide, setActiveHomeNewsSlide] = useState(0)
  const [homeCloudStory, setHomeCloudStory] = useState(HOME_CLOUD_DANCER_DEFAULT)

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
    let mounted = true

    const loadHomeCarousel = async () => {
      try {
        const response = await fetch(`/gelitup-content/home-news-carousel.json?v=${CONTENT_CACHE_BUSTER}`)
        if (!response.ok) return

        const payload = await response.json()
        if (!mounted) return

        const items = Array.isArray(payload?.items)
          ? payload.items
            .map((item) => ({
              id: String(item?.id || '').trim(),
              imageUrl: String(item?.imageUrl || '').replace(/\\/g, '/').trim(),
              order: Number(item?.order || 0),
            }))
            .filter((item) => {
              if (!item.imageUrl) return false

              const normalized = item.imageUrl.toLowerCase()
              const decoded = decodeURI(item.imageUrl).toLowerCase()
              const allowedPrefix = HOME_NEWS_CAROUSEL_FOLDER.toLowerCase()

              return normalized.startsWith(allowedPrefix) || decoded.startsWith(allowedPrefix)
            })
            .map((item) => ({
              ...item,
              imageUrl: encodeURI(item.imageUrl),
            }))
          : []

        setHomeNewsCarousel(items)
        setActiveHomeNewsSlide(0)
      }
      catch {
        if (!mounted) return
      }
    }

    void loadHomeCarousel()

    return () => {
      mounted = false
    }
  }, [])


  useEffect(() => {
    if (homeNewsCarousel.length <= 1) return undefined

    const intervalId = window.setInterval(() => {
      setActiveHomeNewsSlide((current) => (current + 1) % homeNewsCarousel.length)
    }, 3500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [homeNewsCarousel.length])

  const safeHomeNewsIndex = homeNewsCarousel.length
    ? Math.min(activeHomeNewsSlide, homeNewsCarousel.length - 1)
    : 0
  const activeHomeNewsItem = homeNewsCarousel[safeHomeNewsIndex] || null
  const homeHeroVideoSource = HOME_HERO_VIDEO_URL || HERO_CINEMATIC_VIDEO_URL || media.heroVideo

  return (
    <section className="space-y-6">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-black">
        <div className="relative h-[70vh] min-h-[460px] w-full sm:h-[78vh]">
          {homeHeroVideoSource
            ? (
              <video
                className="h-full w-full object-cover object-[50%_35%] opacity-0 transition-opacity duration-700"
                src={homeHeroVideoSource}
                muted
                autoPlay
                loop
                playsInline
                controls={false}
                preload="auto"
                disablePictureInPicture
                onCanPlay={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
              />
              )
            : (
              <img
                src={HOME_HERO_POSTER_URL || media.heroImage}
                alt="GEL.IT.UP cinematic hero"
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = media.heroImage || '/logo.png'
                }}
              />
              )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/75" />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="hero-copy-shadow heading-on-dark max-w-5xl text-3xl font-black uppercase leading-[1.2] tracking-[0.19em] text-white sm:text-4xl lg:text-6xl">
              GEL.IT.UP by GIUP®: THE ARCHITECTS OF PROFESSIONAL COLOR.
            </h1>
            <p className="hero-copy-shadow mt-5 max-w-3xl text-sm font-semibold uppercase leading-[1.7] tracking-[0.12em] text-white/95 sm:text-base">
              A DECADE OF PROFESSIONAL MASTERY. EU REGULATED. HEMA & TPO-FREE.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <NavLink to="/become-distributor" className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:bg-fuchsia-500">
                Apply as Distributor
              </NavLink>
              <NavLink to="/portal/login?mode=create-password" className="rounded-lg border-2 border-white bg-white px-4 py-2 text-sm font-semibold text-fuchsia-700 transition duration-300 hover:bg-white/90">
                B2B Salon Purchases
              </NavLink>
            </div>
          </div>

        </div>
      </div>

      <div className="rounded-2xl border border-[#4A4A4A] bg-[#1A1A1A] p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-white/15 bg-black/20 p-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/15 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12l4 4 10-10" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.1em] !text-[#D43790]">CPNP NOTIFIED</p>
            <p className="mt-2 text-sm leading-relaxed text-white">Every formula in The Spectrum is CPNP Notified. This is your legal guarantee that GEL.IT.UP by GIUP® is fully authorized for sale across every EU member state.</p>
          </article>

          <article className="rounded-xl border border-white/15 bg-black/20 p-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/15 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.1em] !text-[#D43790]">STRICTEST SAFETY</p>
            <p className="mt-2 text-sm leading-relaxed text-white">We operate under the world’s strictest safety protocols. Our manufacturing is ISO-certified, ensuring zero hazardous contaminants and 100% batch consistency.</p>
          </article>

          <article className="rounded-xl border border-white/15 bg-black/20 p-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/15 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3v8" />
                <path d="M8 9v5a4 4 0 0 0 8 0V9" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.1em] !text-[#D43790]">CLEAN SCIENCE</p>
            <p className="mt-2 text-sm leading-relaxed text-white">Our clean-science policy enforces HEMA-free and TPO-free formulation standards across current production lines, prioritizing professional safety.</p>
          </article>

          <article className="rounded-xl border border-white/15 bg-black/20 p-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/15 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M8 8c0-2 1-4 2-5 1 1 2 3 2 5" />
                <path d="M12 8c0-2 1-4 2-5 1 1 2 3 2 5" />
                <circle cx="12" cy="14" r="5" />
              </svg>
            </div>
            <a href="https://www.crueltyfreeinternational.org/approved-brands/" target="_blank" rel="noreferrer" className="mt-3 text-sm font-extrabold uppercase tracking-[0.1em] !text-[#D43790] hover:underline">CRUELTY-FREE</a>
            <p className="mt-2 text-sm leading-relaxed text-white">Ethics without compromise. We are 100% <a href="https://www.crueltyfreeinternational.org/approved-brands/" target="_blank" rel="noreferrer" className="font-semibold text-[#D43790] hover:underline">Leaping Bunny Approved</a>—the global gold standard for cruelty-free cosmetics.</p>
          </article>
        </div>

        <p className="mt-5 border-t border-white/20 pt-4 text-center text-sm font-extrabold uppercase tracking-[0.08em] text-white sm:text-base">
          WHEN YOU CHOOSE GEL.IT.UP by GIUP®, YOU ARE BUYING TOTAL REGULATORY PEACE OF MIND.
        </p>
      </div>

      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[#1A1A1A] px-4 py-10 sm:px-8 sm:py-12">
        <video
          src={HOME_NEWS_CLOUD_VIDEO_URL}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          preload="metadata"
          aria-hidden="true"
          onLoadedData={(e) => { e.target.playbackRate = 0.25 }}
        />
        <div className="absolute inset-0 bg-[#1A1A1A]/5" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-8">
            <div className="rounded-2xl border border-white/20 bg-black/35 p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D43790]">Spring / Summer News</p>
              <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.1em] text-white sm:text-3xl">{homeCloudStory.title}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">{homeCloudStory.introText}</p>
              <NavLink
                to={homeCloudStory.ctaLink}
                className="mt-5 inline-flex rounded-lg bg-[#D43790] px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-white transition duration-200 hover:bg-[#BF3182]"
              >
                {homeCloudStory.ctaLabel}
              </NavLink>
            </div>

            <div className="w-full">
              {activeHomeNewsItem && (
                <div className="mx-auto w-full max-w-[520px]">
                  <div className="overflow-hidden rounded-xl border border-white/20 bg-black/20 p-2">
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-[#F8F8F8]">
                      <img
                        src={activeHomeNewsItem.imageUrl}
                        alt="Spring/Summer carousel visual"
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = '/logo.png'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {homeNewsCarousel.length > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {homeNewsCarousel.map((item, index) => (
                    <button
                      key={`${item.id || item.imageUrl}-${index}`}
                      type="button"
                      onClick={() => setActiveHomeNewsSlide(index)}
                      aria-label={`Go to carousel slide ${index + 1}`}
                      className={`h-2.5 rounded-full transition ${index === safeHomeNewsIndex ? 'w-7 bg-[#D43790]' : 'w-2.5 bg-white/35 hover:bg-white/55'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <InfoCard id="products" title="Our Products">
        <p>
          The GEL.IT.UP lineup includes Soak-off Gel Polish, Base and Top Coats, Builder System,
          Nail Polishes, Nail Art, Consumables, and Skin & Nail Care.
          We also maintain a broad color portfolio (800+ shades) for professional channels.
        </p>
        <NavLink to="/full-catalogue" className="mt-3 inline-flex rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-fuchsia-500">
          View our Products
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
          <li>• <a href="https://www.crueltyfreeinternational.org/approved-brands/" target="_blank" rel="noreferrer" className="text-fuchsia-700 hover:underline">Leaping Bunny certified cruelty-free</a> standards for in-house cosmetic and personal care products.</li>
          <li>• EU regulation alignment and GMP (Good Manufacturing Practices) commitment.</li>
          <li>• Professionals-only commercial policy to protect quality and industry standards.</li>
        </ul>
      </InfoCard>

      <InfoCard title="DISTRIBUTOR PACKAGES" tone="dark">
        <p>
          TRUSTED B2B INVENTORY SYSTEMS. VERIFIED DATABASE. STRUCTURED SCALE-UP.
        </p>
        <NavLink to="/distributor-packages" className="mt-4 inline-flex rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:bg-fuchsia-500">
          View Distribution Options
        </NavLink>
      </InfoCard>

      <InstagramFeedStrip />

    </section>
  )
}

function PortalAccessNotice({ onOpenContactModal }) {
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
        <NavLink to="/portal/login?mode=create-password" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-100">
          Buy Now
        </NavLink>
      </div>
    </section>
  )
}

function ContactRequestModal({ isOpen, formState, onChange, onClose, onSubmit, isSubmitting, message, errorMessage }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 sm:p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Contact Us</h2>
            <p className="mt-1 text-xs text-slate-600">Send your request and our team will follow up.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Close</button>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit()
          }}
        >
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
            Name
            <input
              type="text"
              required
              value={formState.name}
              onChange={(event) => onChange('name', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Your full name"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
            Email Address
            <input
              type="email"
              required
              value={formState.email}
              onChange={(event) => onChange('email', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="you@company.com"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
            Contact Number
            <input
              type="text"
              required
              value={formState.phone}
              onChange={(event) => onChange('phone', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="+00 000 000 000"
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {errorMessage && <p className="mt-3 text-xs text-rose-600">{errorMessage}</p>}
        {message && <p className="mt-3 text-xs text-emerald-700">{message}</p>}
      </div>
    </div>
  )
}

function PortalLanding() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-slate-900">B2B Coming Soon</h2>
        <p className="mt-1 text-base font-medium text-[#D43790]">to better assist our GEL.IT.UP Family</p>
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
        <NavLink to="/portal/login?portal=login" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
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

function DistributorsPage() {
  const [selectedCountry, setSelectedCountry] = useState(DISTRIBUTOR_COUNTRY_POINTS[0]?.country ?? '')

  const selectedPoint = useMemo(
    () => DISTRIBUTOR_COUNTRY_POINTS.find((item) => item.country === selectedCountry) || null,
    [selectedCountry],
  )

  const mapCenter = selectedPoint?.coordinates || [27, 15]
  const mapZoom = selectedPoint ? 4 : 2

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-[#1A1A1A] p-5 text-white sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-white/80">Verified Distribution Network</p>
        <h1 className="heading-on-dark mt-2 text-2xl font-extrabold sm:text-4xl">Official GEL.IT.UP by GIUP® Distributors</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold uppercase tracking-[0.08em] text-white/95 sm:text-base">
          LIVE COVERAGE DATA. VERIFIED NETWORK. LEGITIMATE B2B DATABASE.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DISTRIBUTOR_COUNTRY_POINTS.map((item) => (
            <button
              key={item.country}
              type="button"
              onClick={() => setSelectedCountry(item.country)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition ${selectedCountry === item.country
                ? 'border-white bg-white text-[#1A1A1A]'
                : 'border-white/30 bg-white/10 text-white hover:bg-white/20'}`}
            >
              {item.country}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#4A4A4A] bg-[#E8E8E8] p-4 sm:p-5">
        <h2 className="heading-on-light text-lg font-extrabold text-[#1A1A1A] sm:text-xl">Distributor Coverage Map</h2>
        <p className="mt-2 text-sm text-[#1A1A1A]">
          Country-level coverage with one map pin per official market.
          {' '}
          <a href={LEEUKOPF_DISTRIBUTORS_SOURCE_URL} target="_blank" rel="noreferrer" className="font-semibold underline">
            View source
          </a>
        </p>

        <div className="mt-3 overflow-hidden rounded-xl border border-[#4A4A4A] bg-white">
          <MapContainer
            key={selectedCountry || 'all-countries'}
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={false}
            className="h-[320px] w-full sm:h-[420px]"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {DISTRIBUTOR_COUNTRY_POINTS.map((item) => (
              <Marker key={item.country} position={item.coordinates}>
                <Popup>{item.country}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-[#4A4A4A] bg-[#1A1A1A] p-4 text-white sm:p-5">
        <h2 className="heading-on-dark text-lg font-extrabold sm:text-xl">Register Now for Distribution</h2>
        <p className="mt-2 text-sm text-white/90">Client onboarding for verified trade partners is handled through the official B2B registration workflow.</p>
        <div className="mt-4">
          <NavLink to="/become-distributor" className="inline-flex rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:bg-fuchsia-500">
            Open Client Registration
          </NavLink>
        </div>
      </div>
    </section>
  )
}

function PortalLogin({ onLogin, onCheckApproval, onCreatePassword }) {
  const navigate = useNavigate()
  const location = useLocation()
  const loginParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const prefilledEmail = String(loginParams.get('email') || '').trim().toLowerCase()
  const isCreatePasswordMode = loginParams.get('mode') === 'create-password'
  const showDebugTrace = loginParams.get('debug') === '1'
  const [email, setEmail] = useState(prefilledEmail || localStorage.getItem('portalRememberedEmail') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('portalRememberMe') === 'true' || Boolean(localStorage.getItem('portalRememberedEmail')))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingApproval, setIsCheckingApproval] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [applicationStatus, setApplicationStatus] = useState('')
  const [debugTrace, setDebugTrace] = useState('')

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail)
    }
  }, [prefilledEmail])

  useEffect(() => {
    setErrorMessage('')
    setInfoMessage('')
    setApplicationStatus('')
    setDebugTrace('')
  }, [isCreatePasswordMode, location.search])

  return (
    <section className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
      <div className="bg-slate-900 p-8 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">GEL.IT.UP Trade</p>
        <h2 className="heading-on-dark mt-3 text-3xl font-bold">Professional Access</h2>
        <p className="mt-4 text-sm text-slate-300">
          Professional Access. Enter your archives and locked pro-pricing.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-slate-300">
          <li>• Real-time account overview</li>
          <li>• Fast reorder and order intake tracking</li>
          <li>• Dedicated distributor support</li>
        </ul>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-semibold text-slate-900">{isCreatePasswordMode ? 'Create Password' : 'Sign In'}</h3>
        <p className="mt-2 text-xs text-slate-600">
          Non-distributor clients can create access immediately. Distributor accounts require approved website application.
        </p>
        <div className="mt-2 text-xs text-slate-600">
          {isCreatePasswordMode
            ? (
              <>
                Returning client?{' '}
                <NavLink
                  to={prefilledEmail ? `/portal/login?email=${encodeURIComponent(prefilledEmail)}` : '/portal/login'}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Sign in
                </NavLink>
              </>
            )
            : (
              <>
                First time here?{' '}
                <NavLink
                  to={email ? `/portal/login?mode=create-password&email=${encodeURIComponent(email)}` : '/portal/login?mode=create-password'}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Create password
                </NavLink>
              </>
            )}
        </div>
        <form autoComplete="on" className="mt-5 space-y-4" onSubmit={async (event) => {
          event.preventDefault()
          setIsSubmitting(true)
          setErrorMessage('')
          setInfoMessage('')
          setApplicationStatus('')
          setDebugTrace('')

          if (isCreatePasswordMode) {
            const result = await onCreatePassword({
              email,
              password,
              confirmPassword,
              rememberMe,
            })

            setIsSubmitting(false)

            if (!result.ok) {
              setErrorMessage(result.message || 'Unable to create password.')
              return
            }

            if (result.infoMessage) {
              setInfoMessage(result.infoMessage)
            }

            if (result.debugTrace) {
              setDebugTrace(result.debugTrace)
            }

            if (result.navigateToDashboard) {
              navigate('/portal/dashboard/overview')
            }

            return
          }

          const result = await onLogin(email, password)
          setIsSubmitting(false)

          if (result.debugTrace) {
            setDebugTrace(result.debugTrace)
          }

          if (!result.ok) {
            const nextErrorMessage = result.message || 'Unable to sign in.'
            const isNoRegistrationMessage = /no\s+b2b\s+registration/i.test(nextErrorMessage)

            setErrorMessage(
              isNoRegistrationMessage
                ? 'No account profile was found for this email. Use Create password to initialize access, then continue in Buy Now.'
                : nextErrorMessage,
            )
            if (result.applicationStatus) {
              setApplicationStatus(isNoRegistrationMessage ? '' : result.applicationStatus)
            }
            return
          }

          if (result.applicationStatus) {
            setApplicationStatus(result.applicationStatus)
          }

          if (rememberMe) {
            localStorage.setItem('portalRememberedEmail', String(email || '').trim().toLowerCase())
            localStorage.setItem('portalRememberMe', 'true')
          }
          else {
            localStorage.removeItem('portalRememberedEmail')
            localStorage.removeItem('portalRememberMe')
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
              required={hasSupabaseConfig}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value.trim().toLowerCase())
                setErrorMessage('')
                setInfoMessage('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="you@company.com"
              readOnly={Boolean(prefilledEmail)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {isCreatePasswordMode ? 'Create Password' : 'Password'}
            <input
              id="portal-login-password"
              name="password"
              type="password"
              autoComplete={isCreatePasswordMode ? 'new-password' : 'current-password'}
              required={hasSupabaseConfig}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrorMessage('')
                setInfoMessage('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="••••••••"
            />
          </label>

          {isCreatePasswordMode && (
            <label className="block text-sm font-medium text-slate-700">
              Confirm Password
              <input
                id="portal-login-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setErrorMessage('')
                  setInfoMessage('')
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="••••••••"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
            />
            Remember me
          </label>

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting ? (isCreatePasswordMode ? 'Creating password...' : 'Signing in...') : (isCreatePasswordMode ? 'Create Password & Continue' : 'Enter Professional Access')}
          </button>
        </form>

        {!hasSupabaseConfig && (
          <p className="mt-3 text-xs text-amber-600">
            Demo auth mode active. Add Supabase env vars in `.env` to enable production authentication.
          </p>
        )}

        {errorMessage && <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>}
        {infoMessage && <p className="mt-2 text-xs text-emerald-700">{infoMessage}</p>}
        {showDebugTrace && debugTrace && <p className="mt-2 text-xs text-amber-700">Debug trace: {debugTrace}</p>}
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
                      : applicationStatus === 'submitted'
                        ? 'bg-sky-100 text-sky-800'
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
                    : applicationStatus === 'submitted'
                      ? 'Order request is stored. Portal access still requires approved distributor application.'
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
            <NavLink to="/?portal=admin" className="font-medium text-slate-700 hover:text-slate-900">
              Admin login
            </NavLink>
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
              Distributor onboarding only:{' '}
              <NavLink to="/become-distributor" className="font-semibold text-slate-900 hover:underline">
                Apply now
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PortalAdminLogin({ onAdminLogin, onAdminCreatePassword }) {
  const navigate = useNavigate()
  const location = useLocation()
  const loginParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const prefilledEmail = String(loginParams.get('email') || '').trim().toLowerCase()
  const isCreatePasswordMode = loginParams.get('mode') === 'create-password'
  const [email, setEmail] = useState(prefilledEmail || localStorage.getItem('adminRememberedEmail') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('adminRememberMe') === 'true' || Boolean(localStorage.getItem('adminRememberedEmail')))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail)
    }
  }, [prefilledEmail])

  useEffect(() => {
    setErrorMessage('')
    setInfoMessage('')
  }, [isCreatePasswordMode, location.search])

  return (
    <section className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
      <div className="bg-slate-900 p-8 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">GEL.IT.UP Trade</p>
        <h2 className="heading-on-dark mt-3 text-3xl font-bold">{isCreatePasswordMode ? 'Admin Setup' : 'Admin Login'}</h2>
        <p className="mt-4 text-sm text-slate-300">
          {isCreatePasswordMode
            ? 'Create your admin password and continue to reviewer access.'
            : 'Reviewer access for approving pending B2B applications.'}
        </p>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-semibold text-slate-900">{isCreatePasswordMode ? 'Create Admin Password' : 'Sign In as Admin'}</h3>
        <form autoComplete="on" className="mt-5 space-y-4" onSubmit={async (event) => {
          event.preventDefault()
          setIsSubmitting(true)
          setErrorMessage('')
          setInfoMessage('')

          if (isCreatePasswordMode) {
            const createResult = await onAdminCreatePassword({
              email,
              password,
              confirmPassword,
              rememberMe,
            })
            setIsSubmitting(false)

            if (!createResult.ok) {
              setErrorMessage(createResult.message || 'Unable to create admin password.')
              return
            }

            setInfoMessage(createResult.message || 'Password setup completed. Please sign in as admin.')
            if (createResult.navigateToDashboard) {
              navigate('/portal/dashboard/applications')
            }
            return
          }

          const result = await onAdminLogin(email, password)
          setIsSubmitting(false)

          if (!result.ok) {
            setErrorMessage(result.message || 'Unable to sign in as admin.')
            return
          }

          if (rememberMe) {
            localStorage.setItem('adminRememberedEmail', String(email || '').trim().toLowerCase())
            localStorage.setItem('adminRememberMe', 'true')
          }
          else {
            localStorage.removeItem('adminRememberedEmail')
            localStorage.removeItem('adminRememberMe')
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
              onChange={(event) => {
                setEmail(event.target.value.trim().toLowerCase())
                setErrorMessage('')
                setInfoMessage('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="admin@company.com"
              readOnly={Boolean(prefilledEmail)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {isCreatePasswordMode ? 'Create Password' : 'Password'}
            <input
              id="portal-admin-login-password"
              name="password"
              type="password"
              autoComplete={isCreatePasswordMode ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrorMessage('')
                setInfoMessage('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              placeholder="••••••••"
            />
          </label>

          {isCreatePasswordMode && (
            <label className="block text-sm font-medium text-slate-700">
              Confirm Password
              <input
                id="portal-admin-login-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setErrorMessage('')
                  setInfoMessage('')
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder="••••••••"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
              required={isCreatePasswordMode}
            />
            Remember me
          </label>

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting
              ? (isCreatePasswordMode ? 'Creating password...' : 'Signing in...')
              : (isCreatePasswordMode ? 'Create Password & Continue' : 'Access Applications')}
          </button>
        </form>

        {errorMessage && <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>}
        {infoMessage && <p className="mt-2 text-xs text-emerald-700">{infoMessage}</p>}

        <div className="mt-4 text-xs text-slate-600">
          {isCreatePasswordMode
            ? (
              <>
                Already set up?{' '}
                <NavLink to="/portal/admin-login" className="font-semibold text-slate-900 hover:underline">
                  Back to Admin Sign In
                </NavLink>
              </>
            )
            : (
              <>
                First-time admin?{' '}
                <NavLink to="/portal/admin-login?mode=create-password" className="font-semibold text-slate-900 hover:underline">
                  Create password
                </NavLink>
                {' • '}
                <NavLink to="/portal/login" className="font-semibold text-slate-900 hover:underline">
                  Back to Portal Login
                </NavLink>
              </>
            )}
        </div>
      </div>
    </section>
  )
}

function PortalRegister({ onRegister }) {
  const [application, setApplication] = useState({
    applicationType: 'distributor',
    orderProfile: 'business',
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
    yearsInBusiness: '',
    distributionCountryInterests: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isDistributorFlow = application.applicationType === 'distributor'
  const isB2BOrderFlow = application.applicationType === 'b2b_order'
  const isBusinessOrderProfile = application.orderProfile === 'business'

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
        <h2 className="heading-on-dark mt-3 text-3xl font-bold">Choose Application Type</h2>
        <p className="mt-4 text-sm text-slate-300">
          Choose Distribution Application or B2B (Client) Request. Submissions are uploaded automatically and reviewed by the B2B team.
        </p>
      </div>

      <div className="p-8">
        <h3 className="text-xl font-semibold text-slate-900">
          {isDistributorFlow ? 'Distributor Application' : 'B2B Order Request'}
        </h3>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setApplication((current) => ({
                ...current,
                applicationType: 'distributor',
                customerType: 'company',
              }))
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${isDistributorFlow ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            Distribution Application
          </button>
          <button
            type="button"
            onClick={() => {
              setApplication((current) => ({
                ...current,
                applicationType: 'b2b_order',
                customerType: current.orderProfile === 'personal' ? 'personal' : 'company',
              }))
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${isB2BOrderFlow ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            B2B (Client)
          </button>
        </div>

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
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Application Service
              <select
                required
                value={application.applicationType}
                onChange={(event) => {
                  const nextType = event.target.value
                  setApplication((current) => ({
                    ...current,
                    applicationType: nextType,
                    customerType: nextType === 'distributor' ? 'company' : current.customerType,
                  }))
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              >
                <option value="distributor">Distributor Application</option>
                <option value="b2b_order">B2B Order Form</option>
              </select>
            </label>

            {isB2BOrderFlow && (
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Buyer Type
                <select
                  required
                  value={application.orderProfile}
                  onChange={(event) => {
                    const nextProfile = event.target.value
                    setApplication((current) => ({
                      ...current,
                      orderProfile: nextProfile,
                      customerType: nextProfile === 'personal' ? 'personal' : 'company',
                    }))
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                >
                  <option value="business">Business (VAT required)</option>
                  <option value="personal">Personal (EU purchases)</option>
                </select>
              </label>
            )}

            <label className="block text-sm font-medium text-slate-700">
              {isDistributorFlow ? 'Client Type' : 'Order Account'}
              <select
                required
                value={application.customerType}
                onChange={(event) => setField('customerType', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
              >
                {isDistributorFlow
                  ? (
                    <>
                      <option value="company">Company</option>
                      <option value="client">Client</option>
                    </>
                  )
                  : (
                    <>
                      <option value="company">Business</option>
                      <option value="personal">Personal</option>
                    </>
                  )}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              {(application.customerType === 'company' || isDistributorFlow) ? 'Company Name' : 'Full Name'}
              <input
                type="text"
                required
                value={application.companyName}
                onChange={(event) => setField('companyName', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder={(application.customerType === 'company' || isDistributorFlow) ? 'Company Ltd' : 'Full Name'}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              VAT Number
              <input
                type="text"
                required={isDistributorFlow || isBusinessOrderProfile}
                value={application.vatNumber}
                onChange={(event) => setField('vatNumber', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                placeholder={(isDistributorFlow || isBusinessOrderProfile) ? 'EU123456789' : 'Optional for personal purchases'}
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
                onChange={(event) => {
                  const nextCountry = event.target.value
                  setApplication((current) => ({
                    ...current,
                    invoiceCountry: nextCountry,
                    phone: withCountryDialCode(current.phone, nextCountry),
                    shippingPhone: current.shippingSameAsInvoice
                      ? withCountryDialCode(current.shippingPhone || current.phone, nextCountry)
                      : current.shippingPhone,
                  }))
                }}
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
                    onChange={(event) => {
                      const nextCountry = event.target.value
                      setApplication((current) => ({
                        ...current,
                        shippingCountry: nextCountry,
                        shippingPhone: withCountryDialCode(current.shippingPhone, nextCountry),
                      }))
                    }}
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
                required={isDistributorFlow}
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

            {isDistributorFlow && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Years in Business
                  <input
                    type="text"
                    required
                    value={application.yearsInBusiness}
                    onChange={(event) => setField('yearsInBusiness', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="e.g. 5"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                  Distribution Country Interests
                  <input
                    type="text"
                    required
                    value={application.distributionCountryInterests}
                    onChange={(event) => setField('distributionCountryInterests', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
                    placeholder="Countries or regions you want distribution rights for"
                  />
                </label>
              </>
            )}

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
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const isAdminReset = params.get('admin') === '1'
  const prefilledEmail = String(params.get('email') || '').trim().toLowerCase()
  const [email, setEmail] = useState(prefilledEmail || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail)
    }
  }, [prefilledEmail])

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail) {
      setErrorMessage('Business email is required.')
      return
    }

    if (!hasSupabaseConfig || !supabase) {
      setErrorMessage('Live auth is not configured.')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}${isAdminReset ? '/portal/admin-login' : '/portal/login'}`,
    })

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message || 'Unable to send reset link.')
      setSuccessMessage('If this email exists in the portal, a reset link has been issued. Check inbox and spam.')
      return
    }

    setSuccessMessage('If this email exists in the portal, a reset link has been issued. Check inbox and spam.')
  }

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8">
      <h2 className="text-2xl font-semibold text-slate-900">{isAdminReset ? 'Reset Admin Password' : 'Reset Password'}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enter your business email and we’ll send a password reset link. Manual support:
        {' '}
        <a href={`mailto:${B2B_EMAIL}`} className="font-medium text-slate-800 underline">
          {B2B_EMAIL}
        </a>
      </p>
      <form className="mt-5 space-y-4" onSubmit={handleResetPassword}>
        <label className="block text-sm font-medium text-slate-700">
          Business Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value.trim().toLowerCase())}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-900/20 focus:ring"
            placeholder="you@company.com"
            readOnly={Boolean(prefilledEmail)}
          />
        </label>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {isSubmitting ? 'Sending reset link...' : 'Send Reset Link'}
        </button>
      </form>
      {errorMessage && <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>}
      {successMessage && <p className="mt-2 text-xs text-emerald-700">{successMessage}</p>}
      <p className="mt-3 text-xs text-slate-600">
        Need distributor access?{' '}
        <NavLink to="/become-distributor" className="font-semibold text-slate-900 hover:underline">
          Apply now
        </NavLink>
      </p>
      <NavLink to={isAdminReset ? '/portal/admin-login' : '/portal/login'} className="mt-4 inline-block text-sm font-medium text-slate-600 hover:text-slate-900">
        Back to {isAdminReset ? 'Admin Sign In' : 'Sign In'}
      </NavLink>
    </section>
  )
}

function ProductsModule({ moduleView = 'products' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [isLoadingFeed, setIsLoadingFeed] = useState(false)
  const [feedMessage, setFeedMessage] = useState('Live product feed not loaded yet.')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [orderInboxEmailStatus, setOrderInboxEmailStatus] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedCodes, setSelectedCodes] = useState([])
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [showCleanScienceOnly, setShowCleanScienceOnly] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState(new Set())
  const [itemQtys, setItemQtys] = useState({})
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [packageTier, setPackageTier] = useState('Silver')
  const [draftInvoice, setDraftInvoice] = useState('')
  const [dismissedTechnicalUpsell, setDismissedTechnicalUpsell] = useState(false)
  const [dismissedMagnetUpsell, setDismissedMagnetUpsell] = useState(false)
  const [dismissedSuperbondUpsell, setDismissedSuperbondUpsell] = useState(false)
  const [dismissedCleanserUpsell, setDismissedCleanserUpsell] = useState(false)
  const [dismissedSynthoUpsell, setDismissedSynthoUpsell] = useState(false)
  const [dismissedTipsBaseUpsell, setDismissedTipsBaseUpsell] = useState(false)
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
  // priceMap: normalised-key → { name, price }  (loaded from b2b-price-list.json)
  const [priceMap, setPriceMap] = useState(() => new Map())
  const [shippingMetadata, setShippingMetadata] = useState(SHIPPING_RULES)
  const [shippingMetadataStatus, setShippingMetadataStatus] = useState('Using embedded shipping metadata rules.')
  const isDistributorRole = useMemo(() => String(b2bUserRole || '').trim().toLowerCase().includes('distributor'), [b2bUserRole])
  const productsTable = import.meta.env.VITE_B2B_PRODUCTS_TABLE || DEFAULT_PRODUCTS_TABLE
  const ordersTable = import.meta.env.VITE_B2B_ORDERS_TABLE || DEFAULT_ORDERS_TABLE
  const silverFreeGuarantee = useMemo(() => getSilverFreeGuaranteeText(new Date()), [])

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
  const selectedQtyTotal = selectedCodes.reduce((s, c) => s + (itemQtys[c] || 1), 0)
  const totalUnits = selectedQtyTotal + packageUnits + (includeProfessionalBasePack ? PROFESSIONAL_BASE_PACK.qty : 0)
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
  const hasCatEyeSignal = useCallback((...values) => {
    return values.some((value) => {
      const normalizedToken = normalizeCatalogueToken(value)
      const normalizedSku = normalizeSkuCode(value)

      return normalizedToken.includes('CAT EYE')
        || normalizedSku.includes('GCE')
        || normalizedSku.includes('CATEYE')
        || normalizedSku.includes('CAT_EYE')
    })
  }, [])
  const hasMagnetSignal = useCallback((...values) => {
    return values.some((value) => {
      const normalizedToken = normalizeCatalogueToken(value)
      const normalizedSku = normalizeSkuCode(value)

      return normalizedToken.includes('MAGNET') || normalizedSku.includes('MAGNET')
    })
  }, [])

  // Returns true only for actual physical magnet tools (EQUIPMENT category), not Cat Eye colour names
  const isActualMagnetTool = useCallback((product) => {
    if (!product) return false
    const cat = normalizeCatalogueToken(product.category || '')
    const sub = normalizeCatalogueToken(product.subcategory || '')
    const name = normalizeCatalogueToken(product.name || '')
    const sku = normalizeSkuCode(product.sku || product.code || '')
    // Must NOT be a colour category
    if (cat.includes('COLOR')) return false
    // Must have MAGNET in subcategory, category, name, or sku
    return sub.includes('MAGNET') || cat.includes('EQUIPMENT') && (name.includes('MAGNET') || sku.includes('MAGNET'))
  }, [])

  const hasCatEyeInCart = useMemo(() => {
    const selectedHasCatEye = selectedCodes.some((code) => {
      const product = catalogBySku.get(normalizeSkuCode(code))
      return hasCatEyeSignal(code, product?.name, product?.subcategory, product?.category)
    })

    if (selectedHasCatEye) return true

    return packageCartItems.some((item) => hasCatEyeSignal(item?.sku, item?.code, item?.name, item?.subcategory, item?.category))
  }, [catalogBySku, hasCatEyeSignal, packageCartItems, selectedCodes])
  const hasMagnetInCart = useMemo(() => {
    const selectedHasMagnet = selectedCodes.some((code) => {
      const product = catalogBySku.get(normalizeSkuCode(code))
      return isActualMagnetTool(product)
    })

    if (selectedHasMagnet) return true

    return packageCartItems.some((item) => isActualMagnetTool(item))
  }, [catalogBySku, isActualMagnetTool, packageCartItems, selectedCodes])
  const shouldShowMagnetUpsellToast = hasCatEyeInCart && !hasMagnetInCart
  const magnetUpsellProduct = useMemo(() => {
    // First priority: actual magnet tool (EQUIPMENT > MAGNETS) — not a Cat Eye colour named "Magnetic xxx"
    return products.find((product) => isActualMagnetTool(product))
      || products.find((product) => hasMagnetSignal(product?.code, product?.sku, product?.name) && !normalizeCatalogueToken(product?.category || '').includes('COLOR'))
      || null
  }, [hasMagnetSignal, isActualMagnetTool, products])

  // ── Superbond upsell — any base purchased, Superbond not yet in cart ──────
  const hasNonSuperbondBase = useCallback((product, code = '') => {
    const cat = normalizeCatalogueToken(product?.category || '')
    const sub = normalizeCatalogueToken(product?.subcategory || '')
    const img = normalizeCatalogueToken(product?.imageUrl || code)
    const isBase = cat.includes('BASE') || img.includes('BASES')
    const isSuperbond = sub.includes('SUPERBOND') || img.includes('SUPERBOND')
      || normalizeSkuCode(product?.code || product?.sku || code).startsWith('GIUPSB')
    return isBase && !isSuperbond
  }, [])

  const hasSuperbondSignal = useCallback((product, code = '') => {
    const sub = normalizeCatalogueToken(product?.subcategory || '')
    const img = normalizeCatalogueToken(product?.imageUrl || code)
    const sku = normalizeSkuCode(product?.code || product?.sku || code)
    return sub.includes('SUPERBOND') || img.includes('SUPERBOND') || sku.startsWith('GIUPSB') || sku === 'SBAC'
  }, [])

  const hasBaseInCart = useMemo(() => {
    if (selectedCodes.some((code) => hasNonSuperbondBase(catalogBySku.get(normalizeSkuCode(code)), code))) return true
    return packageCartItems.some((item) => hasNonSuperbondBase(item, item?.code || ''))
  }, [catalogBySku, hasNonSuperbondBase, packageCartItems, selectedCodes])

  const hasSuperbondInCart = useMemo(() => {
    if (selectedCodes.some((code) => hasSuperbondSignal(catalogBySku.get(normalizeSkuCode(code)), code))) return true
    return packageCartItems.some((item) => hasSuperbondSignal(item, item?.code || ''))
  }, [catalogBySku, hasSuperbondSignal, packageCartItems, selectedCodes])

  const shouldShowSuperbondUpsell = hasBaseInCart && !hasSuperbondInCart

  // ── Cleanser upsell — Wipe-Off Top Coat purchased, Cleanser not in cart ──
  const hasWotcInCart = useMemo(() => {
    if (selectedCodes.some((code) => normalizeSkuCode(code).includes('WOTC'))) return true
    return packageCartItems.some((item) => normalizeSkuCode(item?.code || item?.sku || '').includes('WOTC'))
  }, [packageCartItems, selectedCodes])

  const hasCleanserInCart = useMemo(() => {
    if (selectedCodes.some((code) => {
      const t = normalizeCatalogueToken(code)
      return t.includes('CLEANSER') || normalizeCatalogueToken(catalogBySku.get(normalizeSkuCode(code))?.name || '').includes('CLEANSER')
    })) return true
    return packageCartItems.some((item) => normalizeCatalogueToken(item?.name || item?.code || '').includes('CLEANSER'))
  }, [catalogBySku, packageCartItems, selectedCodes])

  const shouldShowCleanserUpsell = hasWotcInCart && !hasCleanserInCart

  // ── Syntho accessories upsell — MultiMix bought, accessories not in cart ──
  const hasMultiMixInCart = useMemo(() => {
    if (selectedCodes.some((code) => {
      const product = catalogBySku.get(normalizeSkuCode(code))
      const cat = normalizeCatalogueToken(product?.category || '')
      const img = normalizeCatalogueToken(product?.imageUrl || code)
      return cat.includes('MULTIMIX') || img.includes('MULTIMIX') || normalizeCatalogueToken(code).includes('MULTIMIX')
    })) return true
    return packageCartItems.some((item) => normalizeCatalogueToken(item?.category || item?.name || '').includes('MULTIMIX'))
  }, [catalogBySku, packageCartItems, selectedCodes])

  // Matches accessories for MultiMix: liquid, brushes, or Dual Form tips (filename prefix "Dual Form/Dual Forms")
  const hasSynthoAccessoriesInCart = useMemo(() => {
    const isDualForm = (token) => token.includes('DUAL FORM') || token.includes('DUAL FORMS')
    if (selectedCodes.some((code) => {
      const product = catalogBySku.get(normalizeSkuCode(code))
      const t = normalizeCatalogueToken(product?.name || product?.imageUrl || code)
      return t.includes('POLYGEL') || t.includes('SYNTHOGEL') || t.includes('MULTI LIQUID') || t.includes('SYNTHOLIQUID') || isDualForm(t)
    })) return true
    return packageCartItems.some((item) => {
      const t = normalizeCatalogueToken(item?.name || item?.imageUrl || item?.subcategory || '')
      return t.includes('POLYGEL') || t.includes('SYNTHOGEL') || t.includes('MULTI LIQUID') || isDualForm(t)
    })
  }, [catalogBySku, packageCartItems, selectedCodes])

  const shouldShowSynthoUpsell = hasMultiMixInCart && !hasSynthoAccessoriesInCart

  // ── 5-in-1 Clear Base upsell — Soak-off Gel Tips specifically (filename prefix "Soak off Gel tips")
  const hasNailTipsInCart = useMemo(() => {
    const isSoakOffTip = (token) => token.includes('SOAK OFF')
    if (selectedCodes.some((code) => {
      const product = catalogBySku.get(normalizeSkuCode(code))
      const t = normalizeCatalogueToken(product?.name || product?.imageUrl || code)
      return isSoakOffTip(t)
    })) return true
    return packageCartItems.some((item) => {
      const t = normalizeCatalogueToken(item?.name || item?.imageUrl || item?.subcategory || '')
      return isSoakOffTip(t)
    })
  }, [catalogBySku, packageCartItems, selectedCodes])

  const has5in1ClearInCart = useMemo(() => {
    if (selectedCodes.some((code) => normalizeSkuCode(code).includes('SBCCLR'))) return true
    return packageCartItems.some((item) => normalizeSkuCode(item?.code || item?.sku || '').includes('SBCCLR'))
  }, [packageCartItems, selectedCodes])

  const shouldShowTipsBaseUpsell = hasNailTipsInCart && !has5in1ClearInCart

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
    if (!shouldShowMagnetUpsellToast) {
      setDismissedMagnetUpsell(false)
    }
  }, [shouldShowMagnetUpsellToast])

  useEffect(() => {
    if (!shouldShowSuperbondUpsell) setDismissedSuperbondUpsell(false)
  }, [shouldShowSuperbondUpsell])

  useEffect(() => {
    if (!shouldShowCleanserUpsell) setDismissedCleanserUpsell(false)
  }, [shouldShowCleanserUpsell])

  useEffect(() => {
    if (!shouldShowSynthoUpsell) setDismissedSynthoUpsell(false)
  }, [shouldShowSynthoUpsell])

  useEffect(() => {
    if (!shouldShowTipsBaseUpsell) setDismissedTipsBaseUpsell(false)
  }, [shouldShowTipsBaseUpsell])

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

  // Load B2B price list (public/gelitup-content/b2b-price-list.json)
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/gelitup-content/b2b-price-list.json')
        if (!res.ok) return
        const payload = await res.json()
        const items = Array.isArray(payload?.items) ? payload.items : []
        const map = new Map()
        const stripSuffix = (s) => String(s || '').replace(/\s*[-–]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '').trim()
        for (const { name, sku, price } of items) {
          const cleanName = stripSuffix(name)
          const entry = { name: cleanName, price }
          const keys = [
            normalizeSkuCode(sku),
            normalizeSkuCode(stripSuffix(sku)),
            normalizeProductName(name),
            normalizeProductName(cleanName),
          ]
          // Also index by leading colour number so "01 Ice Ice Baby" matches catalog code "GIUP 01"
          const numMatch = cleanName.match(/^(\d+[A-Z]?)\s/)
          if (numMatch) keys.push(numMatch[1].padStart(2, '0'), numMatch[1])
          // Index "PMA #1 Champagne Blizzard" → "PMA 1", "PMA 01"
          const seriesNumMatch = cleanName.match(/^([A-Z]+)\s*#\s*(\d+[A-Z]?)\b/i)
          if (seriesNumMatch) {
            const s = seriesNumMatch[1].toUpperCase()
            const n = seriesNumMatch[2]
            keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
          }
          // Index "New York Party #NYP01" → "NYP 01", "NYP 1", "NYP01"
          const embeddedCodeMatch = cleanName.match(/#([A-Z]+)(\d+[A-Z]?)\b/i)
          if (embeddedCodeMatch) {
            const s = embeddedCodeMatch[1].toUpperCase()
            const n = embeddedCodeMatch[2]
            keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
          }
          for (const k of keys) {
            if (k && !map.has(k)) map.set(k, entry)
          }
        }
        if (mounted) setPriceMap(map)
      } catch { /* price list is optional */ }
    }
    load()
    return () => { mounted = false }
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
            // Mirror the public catalogue exactly — load from product-image-map.json
            // so every product has the same category, name and image as shown on the site.
            const response = await fetch('/gelitup-content/product-image-map.json')
            if (!response.ok) throw new Error('Could not load product image map')
            const mapPayload = await response.json()
            const sections = buildCatalogueSectionsFromImageMap(mapPayload)
            return sections.flatMap((section) =>
              section.subcategories.flatMap((sub) =>
                sub.items.map((item) => ({
                  // For COLORS use the subcategory (SOLID GEL POLISH, CAT EYE, etc.)
                  // For all other top-level categories use the section name (BRUSHES, TOOLS, etc.)
                  category: section.category === 'COLORS' ? sub.name : section.category,
                  code: item.name,
                  sku: item.name,
                  name: item.name,
                  imageUrl: item.imageUrl,
                  preview: null,
                }))
              )
            )
          })()

        const normalized = sourceItems
          .map((item, index) => {
            const code = item.code || item.sku || item.id || `GIUP-PD-${String(index + 1).padStart(4, '0')}`
            const sku = item.sku || code
            const categoryName = item.category || item.family || item.group || item.type || PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length]
            const preview = item.preview || item.hex || item.hex_color || item.color || `hsl(${(index * 17) % 360} 82% 56%)`
            // Standalone prefix map: DCE1 → "Dreamy Cat Eye 1" etc.
            const COLOUR_PREFIX_MAP = {
              DCE: 'Dreamy Cat Eye',
              GCE: 'Glass Cat Eye',
              MC: 'Mirror Chrome',
              RQCE: 'Rose Quartz Cat Eye',
              SH: 'Shimmer',
              TFG: 'Tutti Frutti Glass',
              FAN: 'Fantasy',
              JNF: 'Jelly Neon',
            }
            // GIUP series map: GIUP BTO01 → "By The Ocean 01" etc.
            const GIUP_SERIES_MAP = {
              // Main colour series
              R: 'Rone',
              N: 'Nude',
              C: 'Cat Eye',
              CT: 'Cat Eye',
              DT: 'Duo Tone',
              FAN: 'Fantasy',
              FFF: 'Solid Colour',
              FR: 'French Collection',
              JNF: 'Jelly Neon',
              CMU: 'Color Mix Up',
              SS: 'Spring Summer',
              // Special collections
              BTO: 'By The Ocean',
              CDC: 'Creme de la Creme',
              CDCL: 'Creme de la Creme',
              NYP: 'New York Party',
              PMA: 'PMA',
              // Top coats
              MT: 'Top Coat Effects',
              NW: 'Non-Wipe Top Coat',
              NWT: 'Non-Wipe Top Coat',
              WOTC: 'Wipe-Off Top Coat',
              SATMAT: 'Satin Matt',
              // Brush on Builder
              BOB: 'Brush on Builder',
              BOBBLPN: 'Brush on Builder',
              BOBCLR: 'Brush on Builder',
              BOBCOV: 'Brush on Builder',
              BOBCRM: 'Brush on Builder',
              BOBDS: 'Brush on Builder',
              BOBGLMG: 'Brush on Builder',
              BOBGLPN: 'Brush on Builder',
              BOBGLROS: 'Brush on Builder',
              BOBGLSLM: 'Brush on Builder',
              BOBLIL: 'Brush on Builder',
              BOBMILK: 'Brush on Builder',
              BOBNUD: 'Brush on Builder',
              BOBPNK: 'Brush on Builder',
              BOBPRL: 'Brush on Builder',
              BOBPURGL: 'Brush on Builder',
              BOBSTPN: 'Brush on Builder',
              // B2B colour samples
              B: 'Colour Sample',
            }
            const rawCodeName = item.name || item.title || code
            const rawName = (() => {
              // "GIUP BTO01" → "By The Ocean 01"
              const giupSeriesMatch = rawCodeName.match(/^GIUP[- ]([A-Z]+)(\d+[A-Z]*)?$/i)
              if (giupSeriesMatch) {
                const series = giupSeriesMatch[1].toUpperCase()
                const num = giupSeriesMatch[2] || ''
                const expanded = GIUP_SERIES_MAP[series]
                if (expanded) return expanded + (num ? ' ' + num : '')
              }
              // "GIUP 3TFS", "GIUP 1MOF" → "Glass Effect 3TFS" (digit-led suffix = Glass Effect)
              const giupGlassMatch = rawCodeName.match(/^GIUP[- ](\d+[A-Z].*)$/i)
              if (giupGlassMatch) return `Glass Effect ${giupGlassMatch[1]}`
              // "GIUP 01 FFF" → "GIUP FFF" (number then named suffix)
              const giupNumSuffixMatch = rawCodeName.match(/^(GIUP)[- ]\d+[A-Z]?\s+(.+)$/i)
              if (giupNumSuffixMatch) return `GIUP ${giupNumSuffixMatch[2]}`
              // Standalone: "DCE1" → "Dreamy Cat Eye 1"
              const prefixMatch = rawCodeName.match(/^([A-Z]+)(\d+[A-Z]?)$/i)
              if (prefixMatch) {
                const expanded = COLOUR_PREFIX_MAP[prefixMatch[1].toUpperCase()]
                if (expanded) return `${expanded} ${prefixMatch[2]}`
              }
              return rawCodeName
            })()
            const description = item.description || item.short_description || ''
            const mapImageUrl = localImageMap.get(normalizeSkuCode(sku))
              || localImageMap.get(normalizeSkuCode(code))
              || localImageMap.get(normalizeProductName(rawName))
              || null
            const imageUrl = mapImageUrl || item.image_url || item.imageUrl || item?.images?.[0]?.src || null

            // Merge price-list data (name override + price)
            // For codes like "GIUP 01" extract the number to match "01 Ice Ice Baby"
            const giupNumMatch = normalizeSkuCode(code).match(/^(?:GIUP\s+)?(\d+[A-Z]?)$/)
            // For codes like "GIUP NYP01" extract "NYP 01" to match "New York Party #NYP01"
            const giupSeriesCodeMatch = normalizeSkuCode(code).match(/^(?:GIUP\s+)?([A-Z]+)(\d+[A-Z]?)$/)
            const priceEntry = priceMap.get(normalizeSkuCode(sku))
              || priceMap.get(normalizeSkuCode(code))
              || priceMap.get(normalizeProductName(rawName))
              || (giupNumMatch ? priceMap.get(giupNumMatch[1].padStart(2, '0')) || priceMap.get(giupNumMatch[1]) : null)
              || (giupSeriesCodeMatch ? (
                  priceMap.get(`${giupSeriesCodeMatch[1]} ${giupSeriesCodeMatch[2]}`)
                  || priceMap.get(`${giupSeriesCodeMatch[1]} ${giupSeriesCodeMatch[2].padStart(2, '0')}`)
                ) : null)
              || null
            const name = priceEntry?.name || rawName
            const price = priceEntry?.price ?? null

            return {
              code,
              sku,
              name,
              description,
              category: categoryName,
              preview,
              imageUrl,
              price,
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
          setProducts([])
          setFeedMessage('Live product feed unavailable.')
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
  }, [localImageMap, priceMap, productsTable])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.code.toLowerCase().includes(query.toLowerCase())
        || (product.name || '').toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category === 'All' || product.category === category
      const matchesSelected = !showSelectedOnly || selectedCodes.includes(product.code)
      const matchesCleanScience = !showCleanScienceOnly || hasReachedComplianceDate(new Date())

      return matchesSearch && matchesCategory && matchesSelected && matchesCleanScience
    })
  }, [category, products, query, selectedCodes, showSelectedOnly, showCleanScienceOnly])

  // Group filtered products by category for sectioned display
  const groupedFilteredProducts = useMemo(() => {
    const groups = new Map()
    for (const product of filteredProducts) {
      const cat = product.category || 'Other'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat).push(product)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredProducts])

  // All unique categories from loaded products (for the tab bar)
  const allCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Other'))
    return ['All', ...Array.from(cats).sort()]
  }, [products])

  const selectedProducts = useMemo(() => {
    return selectedCodes.map((code) => {
      const found = products.find((p) => p.code === code)
      return found || { code, sku: code, name: code, category: 'Unknown', preview: '#e2e8f0', imageUrl: null }
    })
  }, [selectedCodes, products])

  // Colour family breakdown for selected products
  const colourFamilyBreakdown = useMemo(() => {
    const counts = {}
    for (const p of selectedProducts) {
      const family = resolveColorFamilyKey(p.name)
      if (family && family !== 'OTHER') counts[family] = (counts[family] || 0) + 1
    }
    return COLOR_FAMILY_FILTERS
      .filter(f => f.key !== 'ALL' && counts[f.key])
      .map(f => ({ ...f, count: counts[f.key] }))
      .sort((a, b) => b.count - a.count)
  }, [selectedProducts])

  const orderTotal = useMemo(() => {
    const itemsTotal = selectedProducts.reduce((s, p) => s + (p.price != null ? Number(p.price) * (itemQtys[p.code] || 1) : 0), 0)
    const pkgTotal = packageCartItems.reduce((s, item) => s + (item.price != null ? Number(item.price) * item.qty : 0), 0)
    return itemsTotal + pkgTotal
  }, [selectedProducts, packageCartItems, itemQtys])

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const toggleSelection = (code) => {
    setSelectedCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  const copyCodes = async () => {
    if (!selectedCodes.length) return
    await navigator.clipboard.writeText(
      selectedCodes.map(c => (itemQtys[c] || 1) > 1 ? `${c} x${itemQtys[c]}` : c).join(', '),
    )
  }

  const createPackageDraft = async () => {
    if (!isDistributorRole) {
      setCheckoutError('Tier packages are available for approved distributor accounts only.')
      setCheckoutMessage('')
      return
    }

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
    const silverFreeBadge = getSilverFreeGuaranteeText(lastProformaInvoice?.createdAtIso)

    doc.setFontSize(12)
    doc.text(`Grand Total (EUR): ${currencyFormatter(lastProformaInvoice.grandTotalEur)}`, pageWidth - margin, footerY, { align: 'right' })

    if (silverFreeBadge) {
      doc.setFontSize(9)
      doc.setTextColor(217, 70, 239)
      doc.text(silverFreeBadge, margin, footerY)
      doc.setTextColor(...textColor)
    }

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
      setCheckoutError('Select at least one product to finalize order.')
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
    const selectedCodesWithQty = selectedCodes.map(code => (itemQtys[code] || 1) > 1 ? `${code} x${itemQtys[code]}` : code)
    const checkoutItems = includeProfessionalBasePack
      ? [...selectedCodesWithQty, ...packageItemsPayload, `${PROFESSIONAL_BASE_PACK.sku} x${PROFESSIONAL_BASE_PACK.qty}`]
      : [...selectedCodesWithQty, ...packageItemsPayload]

    const verifiedUnits = selectedCodes.reduce((s, c) => s + (itemQtys[c] || 1), 0)
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

    const backupNotificationResult = ORDER_BACKUP_INBOX_EMAIL && ORDER_BACKUP_INBOX_EMAIL !== ORDER_INBOX_EMAIL
      ? await sendPortalEmailNotification({
          eventType: 'b2b_order_backup_copy',
          to: ORDER_BACKUP_INBOX_EMAIL,
          subject: `B2B Portal Backup Copy [#${insertedOrder?.id ?? '-'}]`,
          html: `<p>Backup copy for a new B2B portal order.</p><p><strong>Order ID:</strong> ${insertedOrder?.id ?? '-'}</p><p><strong>Customer Email:</strong> ${userData?.user?.email ?? '-'}</p><p><strong>Total Units:</strong> ${totalUnits}</p>${invoiceBlockHtml}${shippingBlockHtml}<p><strong>Items:</strong> ${checkoutItems.join(', ')}</p>`,
          orderId: insertedOrder?.id,
          customerEmail: userData?.user?.email ?? null,
          totalUnits,
          items: checkoutItems,
          invoice,
          shipping,
          totalValueEurBase: proformaInvoice.grandTotalEur,
        })
      : { ok: true, skipped: true, message: ORDER_BACKUP_INBOX_EMAIL ? 'Backup inbox same as primary inbox.' : 'Backup inbox not configured.' }

    const customerEmailTarget = String(invoice.contactEmail || userData?.user?.email || '').trim().toLowerCase()

    const customerNotificationResult = customerEmailTarget
      ? await sendPortalEmailNotification({
          eventType: 'b2b_order_customer_copy',
          to: customerEmailTarget,
          subject: `Your GEL.IT.UP B2B Order Copy [#${insertedOrder?.id ?? '-'}]`,
          html: `<p>Hello,</p><p>Thank you for your GEL.IT.UP by GIUP® order submission.</p><p><strong>Order ID:</strong> ${insertedOrder?.id ?? '-'}</p><p><strong>Total Units:</strong> ${totalUnits}</p>${invoiceBlockHtml}${shippingBlockHtml}<p><strong>Items:</strong> ${checkoutItems.join(', ')}</p><p>You can keep this email as your order record. You can also download your pro-forma PDF directly from the portal.</p><p>Best regards,<br/>GEL.IT.UP Distribution Team</p>`,
          orderId: insertedOrder?.id,
          customerEmail: customerEmailTarget,
          totalUnits,
          items: checkoutItems,
          invoice,
          shipping,
          totalValueEurBase: proformaInvoice.grandTotalEur,
        })
      : { ok: false, skipped: true, message: 'No customer email available for order copy.' }

    const inboxEmailStatusText = inboxNotificationResult.ok
      ? `Inbox notification sent to ${ORDER_INBOX_EMAIL}.`
      : inboxNotificationResult.skipped
        ? `Inbox notification skipped: ${inboxNotificationResult.message}`
        : `Inbox notification failed: ${inboxNotificationResult.message}`

    const customerEmailStatusText = customerNotificationResult.ok
      ? `Customer order copy sent to ${customerEmailTarget}.`
      : customerNotificationResult.skipped
        ? `Customer order copy skipped: ${customerNotificationResult.message}`
        : `Customer order copy failed: ${customerNotificationResult.message}`

    const backupEmailStatusText = backupNotificationResult.ok
      ? `Backup copy sent to ${ORDER_BACKUP_INBOX_EMAIL}.`
      : backupNotificationResult.skipped
        ? `Backup copy skipped: ${backupNotificationResult.message}`
        : `Backup copy failed: ${backupNotificationResult.message}`

    setOrderInboxEmailStatus(`${inboxEmailStatusText} ${customerEmailStatusText} ${backupEmailStatusText}`)

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

    const emailSentOk = customerNotificationResult.ok && inboxNotificationResult.ok
    const emailNote = emailSentOk
      ? ` Confirmation emails sent.`
      : ` ⚠️ Email notifications could not be sent — see details below.`
    setCheckoutMessage(`Order received (#${insertedOrder?.id ?? '-'} | ${totalUnits} units). Order stored successfully.${emailNote}${zohoStatusNote}`)
    setSelectedCodes([])
    setItemQtys({})
    setPackageCartItems([])
    setGeneratedPackageTier('')
    setIncludeProfessionalBasePack(false)
    setIsSubmittingOrder(false)
  }

  const checkoutHref = useMemo(() => {
    const subject = encodeURIComponent(`GEL.IT.UP B2B Order Intake (${totalUnits} units)`)
    const packageItemsPayload = packageCartItems.map((item) => `${item.sku} x${item.qty}`)
    const mailCodesWithQty = selectedCodes.map(code => (itemQtys[code] || 1) > 1 ? `${code} x${itemQtys[code]}` : code)
    const mailItems = includeProfessionalBasePack
      ? [...mailCodesWithQty, ...packageItemsPayload, `${PROFESSIONAL_BASE_PACK.sku} x${PROFESSIONAL_BASE_PACK.qty}`]
      : [...mailCodesWithQty, ...packageItemsPayload]
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
      : 'Unavailable'

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
  const actionButtonBaseClass = 'inline-flex min-h-[40px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition duration-200'
  const actionButtonSecondaryClass = `${actionButtonBaseClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`
  const actionButtonPrimaryClass = `${actionButtonBaseClass} border-fuchsia-600 bg-fuchsia-600 text-white hover:bg-fuchsia-500`
  const filterControlClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700'

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

  // ── My Information view ────────────────────────────────────────────────────
  if (moduleView === 'profile') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600">Step 3 of 3</p>
              <h3 className="mt-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-lg font-semibold text-transparent">My Information</h3>
              <p className="mt-1 text-xs text-slate-500">Saved for future orders — fill in once, reuse every time.</p>
            </div>
            <button onClick={() => navigate('/portal/dashboard/products')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              ← Back to My Order
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Required fields are marked with <span className="font-semibold text-rose-600">*</span></p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-700">Type <span className="text-rose-600">*</span>
              <select value={clientProfile.customerType} onChange={(e) => setClientField('customerType', e.target.value)} className={getClientInputClass('customerType')}>
                <option value="company">Company</option><option value="client">Client</option>
              </select>
            </label>
            <label className="text-xs text-slate-700">Shipping Type <span className="text-rose-600">*</span>
              <select value={clientProfile.shippingType} onChange={(e) => setClientField('shippingType', e.target.value)} className={getClientInputClass('shippingType')}>
                <option value="road">Road</option><option value="air">Air</option><option value="self_arranged">Self-arranged</option>
              </select>
            </label>
            <label className="text-xs text-slate-700">{clientProfile.customerType === 'company' ? 'Company Name' : 'Client Name'} <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.customerName} onChange={(e) => setClientField('customerName', e.target.value)} className={getClientInputClass('customerName')} placeholder={clientProfile.customerType === 'company' ? 'Company name' : 'Client name'} />
            </label>
            <label className="text-xs text-slate-700">VAT Number <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.vatNumber} onChange={(e) => setClientField('vatNumber', e.target.value)} className={getClientInputClass('vatNumber')} placeholder="VAT / Tax ID" />
            </label>
            <label className="text-xs text-slate-700">Contact Number (with country code) <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.contactPhone} onChange={(e) => setClientField('contactPhone', e.target.value)} className={getClientInputClass('contactPhone')} placeholder="+359..." />
            </label>
            <label className="text-xs text-slate-700">Contact Email <span className="text-rose-600">*</span>
              <input type="email" value={clientProfile.contactEmail} onChange={(e) => setClientField('contactEmail', e.target.value)} className={getClientInputClass('contactEmail')} placeholder="name@company.com" />
            </label>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-900">Invoice Address</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-700">Address line 1 <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoiceAddressLine1} onChange={(e) => setClientField('invoiceAddressLine1', e.target.value)} placeholder="Address line 1" className={getClientInputClass('invoiceAddressLine1')} />
            </label>
            <label className="text-xs text-slate-700">Address line 2 <span className="text-slate-500">(optional)</span>
              <input type="text" value={clientProfile.invoiceAddressLine2} onChange={(e) => setClientField('invoiceAddressLine2', e.target.value)} placeholder="Address line 2" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700" />
            </label>
            <label className="text-xs text-slate-700">Area / City <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoiceArea} onChange={(e) => setClientField('invoiceArea', e.target.value)} placeholder="Area / City" className={getClientInputClass('invoiceArea')} />
            </label>
            <label className="text-xs text-slate-700">Region / State <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoiceRegion} onChange={(e) => setClientField('invoiceRegion', e.target.value)} placeholder="Region / State" className={getClientInputClass('invoiceRegion')} />
            </label>
            <label className="text-xs text-slate-700">Country <span className="text-rose-600">*</span>
              <select value={clientProfile.invoiceCountry} onChange={(e) => setClientField('invoiceCountry', e.target.value)} className={getClientInputClass('invoiceCountry')}>
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((country) => (<option key={`inv-${country}`} value={country}>{country}</option>))}
              </select>
            </label>
            <label className="text-xs text-slate-700">Postal code <span className="text-rose-600">*</span>
              <input type="text" value={clientProfile.invoicePostalCode} onChange={(e) => setClientField('invoicePostalCode', e.target.value)} placeholder="Postal code" className={getClientInputClass('invoicePostalCode')} />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={clientProfile.shippingSameAsInvoice} onChange={(e) => setClientField('shippingSameAsInvoice', e.target.checked)} />
            Shipping address is same as invoice address
          </label>
          {!clientProfile.shippingSameAsInvoice && (
            <>
              <p className="mt-3 text-xs font-semibold text-slate-900">Shipping Address</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-700">Shipping contact name <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingName} onChange={(e) => setClientField('shippingName', e.target.value)} placeholder="Shipping contact name" className={getClientInputClass('shippingName')} />
                </label>
                <label className="text-xs text-slate-700">Shipping contact number <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingPhone} onChange={(e) => setClientField('shippingPhone', e.target.value)} placeholder="Shipping contact number" className={getClientInputClass('shippingPhone')} />
                </label>
                <label className="text-xs text-slate-700">Address line 1 <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingAddressLine1} onChange={(e) => setClientField('shippingAddressLine1', e.target.value)} placeholder="Address line 1" className={getClientInputClass('shippingAddressLine1')} />
                </label>
                <label className="text-xs text-slate-700">Address line 2 <span className="text-slate-500">(optional)</span>
                  <input type="text" value={clientProfile.shippingAddressLine2} onChange={(e) => setClientField('shippingAddressLine2', e.target.value)} placeholder="Address line 2" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700" />
                </label>
                <label className="text-xs text-slate-700">Area / City <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingArea} onChange={(e) => setClientField('shippingArea', e.target.value)} placeholder="Area / City" className={getClientInputClass('shippingArea')} />
                </label>
                <label className="text-xs text-slate-700">Region / State <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingRegion} onChange={(e) => setClientField('shippingRegion', e.target.value)} placeholder="Region / State" className={getClientInputClass('shippingRegion')} />
                </label>
                <label className="text-xs text-slate-700">Country <span className="text-rose-600">*</span>
                  <select value={clientProfile.shippingCountry} onChange={(e) => setClientField('shippingCountry', e.target.value)} className={getClientInputClass('shippingCountry')}>
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((country) => (<option key={`sh-${country}`} value={country}>{country}</option>))}
                  </select>
                </label>
                <label className="text-xs text-slate-700">Postal code <span className="text-rose-600">*</span>
                  <input type="text" value={clientProfile.shippingPostalCode} onChange={(e) => setClientField('shippingPostalCode', e.target.value)} placeholder="Postal code" className={getClientInputClass('shippingPostalCode')} />
                </label>
              </div>
            </>
          )}
          {showClientValidation && clientValidation.hasMissing && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Please complete all required fields marked with *.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={submitOrder} disabled={isSubmittingOrder} className={`${actionButtonPrimaryClass} disabled:cursor-not-allowed disabled:border-fuchsia-300 disabled:bg-fuchsia-300`}>
              {isSubmittingOrder ? 'Submitting...' : `Place Order (${totalUnits} units)`}
            </button>
            <button onClick={() => navigate('/portal/dashboard/products')} className={actionButtonSecondaryClass}>
              ← Back to Review
            </button>
          </div>
          {checkoutMessage && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{checkoutMessage}</p>}
          {checkoutError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{checkoutError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Lightbox modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="" className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-800 shadow-lg">×</button>
          </div>
        </div>
      )}
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

      {/* Stacked upsell toasts (bottom-right column) */}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,440px)] flex-col gap-3">

        {shouldShowTechnicalUpsellToast && !dismissedTechnicalUpsell && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Professional Tip</p>
            <p className="mt-1 text-sm text-amber-900">Your chosen shades perform best with the 5-in-1 Superior Base. Add a professional 6-pack at 15% discount?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => { setIncludeProfessionalBasePack(true); setDismissedTechnicalUpsell(true) }} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Add 6-pack</button>
              <button onClick={() => setDismissedTechnicalUpsell(true)} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800">Dismiss</button>
            </div>
          </div>
        )}

        {shouldShowMagnetUpsellToast && !dismissedMagnetUpsell && (
          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">Cat Eye Essential</p>
            <p className="mt-1 text-sm text-fuchsia-900">Don't forget your magnet - Cat Eye shades need it to create the signature effect.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {magnetUpsellProduct?.code && (
                <button onClick={() => { setSelectedCodes((c) => c.includes(magnetUpsellProduct.code) ? c : [...c, magnetUpsellProduct.code]); setDismissedMagnetUpsell(true) }} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Add Magnet</button>
              )}
              <button onClick={() => setDismissedMagnetUpsell(true)} className="rounded-lg border border-fuchsia-300 px-3 py-1.5 text-xs font-semibold text-fuchsia-800">Dismiss</button>
            </div>
          </div>
        )}

        {shouldShowSuperbondUpsell && !dismissedSuperbondUpsell && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Adhesion Tip</p>
            <p className="mt-1 text-sm text-sky-900">Superbond Primer maximises adhesion for any base coat - avoid lifting from day one.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setDismissedSuperbondUpsell(true)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">View Superbond</button>
              <button onClick={() => setDismissedSuperbondUpsell(true)} className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-800">Dismiss</button>
            </div>
          </div>
        )}

        {shouldShowCleanserUpsell && !dismissedCleanserUpsell && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Complete the Finish</p>
            <p className="mt-1 text-sm text-emerald-900">Wipe-Off Top Coat requires a cleanser to remove the inhibition layer - add the Cleanser Liquid.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setDismissedCleanserUpsell(true)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">View Cleanser</button>
              <button onClick={() => setDismissedCleanserUpsell(true)} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800">Dismiss</button>
            </div>
          </div>
        )}

        {shouldShowSynthoUpsell && !dismissedSynthoUpsell && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">MultiMix System</p>
            <p className="mt-1 text-sm text-violet-900">MultiMix Synthogel works best with Syntholiquid, the Synthogel brush, Polygel spatulas, and Dual Form tips.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setDismissedSynthoUpsell(true)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">View Accessories</button>
              <button onClick={() => setDismissedSynthoUpsell(true)} className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-800">Dismiss</button>
            </div>
          </div>
        )}

        {shouldShowTipsBaseUpsell && !dismissedTipsBaseUpsell && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Tip Application</p>
            <p className="mt-1 text-sm text-rose-900">Soak-Off Gel Tips bond best with the 5-in-1 Superior Base Clear (15ml) - add it to complete the system.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setDismissedTipsBaseUpsell(true)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">View 5-in-1 Clear</button>
              <button onClick={() => setDismissedTipsBaseUpsell(true)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-800">Dismiss</button>
            </div>
          </div>
        )}

      </div>

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

      {/* ── ORDER FLOW STEPS ── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/portal/dashboard/catalog')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${moduleView === 'catalog' ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${moduleView === 'catalog' ? 'bg-white/30 text-white' : 'bg-slate-400 text-white'}`}>1</span>
            Shop
          </button>
          <svg className="h-3 w-3 flex-none text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <button onClick={() => navigate('/portal/dashboard/products')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${moduleView === 'products' ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${moduleView === 'products' ? 'bg-white/30 text-white' : 'bg-slate-400 text-white'}`}>2</span>
            Review Order
          </button>
          <svg className="h-3 w-3 flex-none text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <button onClick={() => navigate('/portal/dashboard/profile')} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${moduleView === 'profile' ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${moduleView === 'profile' ? 'bg-white/30 text-white' : 'bg-slate-400 text-white'}`}>3</span>
            My Details
          </button>
          {orderTotal > 0 && <span className="ml-auto text-xs font-bold text-fuchsia-700">€{orderTotal.toFixed(2)}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-sm font-semibold text-transparent">Connection Status</h3>
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
              <span>{isLoadingFeed ? 'Fetching products' : 'Collection source'}</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Finalize Order Endpoint</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${checkoutBadgeClass}`}>
                {checkoutIsLive ? 'Live' : 'Unavailable'}
              </span>
              <span>{checkoutIsLive ? `Supabase table: ${ordersTable}` : ORDER_INBOX_EMAIL}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-sm font-semibold text-transparent">B2B Portal</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{selectedLineItems} items</span>
            <span>/</span>
            <span>{totalUnits} total units</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{isLoadingFeed ? 'Loading live feed...' : feedMessage}</p>
        <p className="mt-1 text-[11px] text-slate-500">{shippingMetadataStatus}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/portal/dashboard/catalog')}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Browse & Buy Products
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh Feed
          </button>
        </div>

        {/* ── LIVE COLOUR CHART (order review) ── */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900">
              Colour Chart
              {(selectedCodes.length + packageCartItems.length) > 0
                ? ` — ${selectedCodes.length + packageCartItems.length} lines selected`
                : ''}
            </p>
            {(selectedCodes.length > 0 || packageCartItems.length > 0) && (
              <button
                onClick={() => { setSelectedCodes([]); setItemQtys({}); setPackageCartItems([]); setGeneratedPackageTier('') }}
                className="text-[11px] font-semibold text-rose-500 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          {(selectedCodes.length === 0 && packageCartItems.length === 0)
            ? <p className="mt-2 text-[11px] italic text-slate-400">No products selected yet — go to Shop to start adding items.</p>
            : (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {selectedProducts.map((product) => (
                  <div
                    key={product.code}
                    className="group relative flex w-[68px] flex-none flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div
                      className="relative h-[68px] w-full flex-none"
                      style={{ backgroundColor: product.preview || '#e2e8f0' }}
                    >
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                        : null}
                      <button
                        onClick={() => toggleSelection(product.code)}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-slate-700 shadow opacity-0 transition group-hover:opacity-100"
                        aria-label={`Remove ${product.code}`}
                      >×</button>
                    </div>
                    <div className="p-1.5">
                      <p className="truncate text-[10px] font-semibold leading-tight text-slate-900">{product.code}</p>
                      <p className="truncate text-[9px] leading-tight text-slate-500">{product.name}</p>
                      <p className="truncate text-[9px] leading-tight text-slate-400">{product.category}</p>
                    </div>
                  </div>
                ))}
                {packageCartItems.map((item) => {
                  const resolvedImg = resolveCatalogImageUrl(item)
                  const itemPreview = item.preview || item.hex_color || '#e2e8f0'
                  return (
                    <div
                      key={`pkg-${item.sku}-${item.code}`}
                      className="relative flex w-[68px] flex-none flex-col overflow-hidden rounded-lg border border-fuchsia-300 bg-white shadow-sm"
                    >
                      <div
                        className="relative h-[68px] w-full flex-none"
                        style={{ backgroundColor: itemPreview }}
                      >
                        {resolvedImg
                          ? <img src={resolvedImg} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                          : null}
                        <span className="absolute left-0.5 top-0.5 rounded-full bg-fuchsia-600 px-1 py-0.5 text-[9px] font-bold leading-none text-white">{item.qty}×</span>
                      </div>
                      <div className="p-1.5">
                        <p className="truncate text-[10px] font-semibold leading-tight text-slate-900">{item.code}</p>
                        <p className="truncate text-[9px] leading-tight text-fuchsia-700">{item.name}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </div>

        {/* ── ORDER SUMMARY TABLE ── */}
        {selectedProducts.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900">Order Summary</p>
              <button onClick={() => navigate('/portal/dashboard/catalog')} className="text-[11px] font-semibold text-fuchsia-600 hover:underline">+ Add more products</button>
            </div>
            <div className="mt-2 divide-y divide-slate-100">
              {selectedProducts.map(product => {
                const qty = itemQtys[product.code] || 1
                const lineTotal = product.price != null ? Number(product.price) * qty : null
                return (
                  <div key={product.code} className="flex items-center gap-2 py-2">
                    <div
                      className="h-9 w-9 flex-none cursor-zoom-in overflow-hidden rounded-md border border-slate-100"
                      style={{ backgroundColor: product.preview || '#e2e8f0' }}
                      onClick={() => product.imageUrl && setLightboxUrl(product.imageUrl)}
                    >
                      {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-slate-900">{product.name}</p>
                      <p className="text-[10px] text-slate-400">{product.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { const q = qty - 1; if (q <= 0) toggleSelection(product.code); else setItemQtys(prev => ({...prev, [product.code]: q})) }} className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">−</button>
                      <span className="w-6 text-center text-xs font-semibold text-slate-900">{qty}</span>
                      <button onClick={() => setItemQtys(prev => ({...prev, [product.code]: qty + 1}))} className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">+</button>
                    </div>
                    <div className="w-16 text-right">
                      {lineTotal != null ? <p className="text-xs font-semibold text-fuchsia-700">€{lineTotal.toFixed(2)}</p> : <p className="text-xs text-slate-400">—</p>}
                    </div>
                    <button onClick={() => toggleSelection(product.code)} className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Remove">×</button>
                  </div>
                )
              })}
            </div>
            {orderTotal > 0 && (
              <div className="mt-2 border-t border-slate-200 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">Estimated Total</span>
                  <span className="font-bold text-fuchsia-700">€{orderTotal.toFixed(2)}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">Excl. shipping. Final invoice issued by GEL.IT.UP.</p>
              </div>
            )}
          </div>
        )}
        {/* ── YOUR DETAILS STATUS ── */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-900">Your Details</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Required for order submission.</p>
            </div>
            {clientValidation.hasMissing
              ? <button onClick={() => navigate('/portal/dashboard/profile')} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Complete details →</button>
              : <button onClick={() => navigate('/portal/dashboard/profile')} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">✓ Ready — edit</button>
            }
          </div>
          {clientValidation.hasMissing && <p className="mt-2 text-[11px] text-rose-600">Billing &amp; shipping details incomplete — needed to process your order.</p>}
          {!clientValidation.hasMissing && (
            <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
              <p>{clientProfile.customerName}{clientProfile.contactEmail ? ` · ${clientProfile.contactEmail}` : ''}</p>
              <p>{invoiceAddressComposed}</p>
            </div>
          )}
        </div>
        <div className="mt-3 hidden">
          <p className="text-xs font-semibold text-slate-900 hidden">Client details (saved for next orders)</p>
          <p className="mt-1 text-[11px] text-slate-500 hidden">
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
            onClick={() => clientValidation.hasMissing ? navigate('/portal/dashboard/profile') : submitOrder()}
            disabled={isSubmittingOrder}
            className={`${actionButtonPrimaryClass} disabled:cursor-not-allowed disabled:border-fuchsia-300 disabled:bg-fuchsia-300`}
          >
            {isSubmittingOrder ? 'Submitting...' : clientValidation.hasMissing ? 'Complete Details →' : `Place Order (${totalUnits} units)`}
          </button>
          <a
            href={checkoutHref}
            onClick={(event) => {
              if (!selectedCodes.length && !packageCartItems.length && !includeProfessionalBasePack) event.preventDefault()
            }}
            className={actionButtonSecondaryClass}
          >
            Send to Order Inbox
          </a>
          <button
            onClick={copyCodes}
            className={actionButtonSecondaryClass}
          >
            Copy list
          </button>
          <button
            onClick={() => {
              setSelectedCodes([])
              setItemQtys({})
              setPackageCartItems([])
              setGeneratedPackageTier('')
              setIncludeProfessionalBasePack(false)
              setLastPackingList(null)
              setLastProformaInvoice(null)
            }}
            className={actionButtonSecondaryClass}
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

        {!isCatalogView && isDistributorRole && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales Manager</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Create Package</p>
          <div className="mt-2">
            <button
              onClick={() => navigate('/portal/dashboard/catalog')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Browse products
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

        {!isCatalogView && !isDistributorRole && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <p className="text-xs text-slate-600">
              Tier packages are available for approved distributor accounts only. Continue ordering directly via My Order.
            </p>
          </div>
        )}

        {checkoutError && <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{checkoutError}</p>}
        {checkoutMessage && <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{checkoutMessage}</p>}
        {orderInboxEmailStatus && (
          <p className={`mt-1 rounded-lg border px-3 py-2 text-xs ${
            orderInboxEmailStatus.includes('failed') || orderInboxEmailStatus.includes('skipped')
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>{orderInboxEmailStatus}</p>
        )}
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">GEL.IT.UP Products</h3>
            <p className="mt-1 text-xs text-slate-500">Browse and tap a product to add it to your order.</p>
          </div>
          <button
            onClick={() => navigate('/portal/dashboard/products')}
            className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500"
          >
            Review Order ({totalUnits}{orderTotal > 0 ? ` · €${orderTotal.toFixed(2)}` : ''}) →
          </button>
        </div>
        {/* Full-width search bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 pointer-events-none text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, shade or code..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        {/* Filter row */}
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-fuchsia-400 focus:outline-none"
          >
            <option value="All">All categories</option>
            {PRODUCT_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={showSelectedOnly}
              onChange={(event) => setShowSelectedOnly(event.target.checked)}
            />
            Selected only
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={showCleanScienceOnly}
              onChange={(event) => setShowCleanScienceOnly(event.target.checked)}
            />
            Clean Science only
          </label>
        </div>

        <div className="mt-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3 text-xs text-fuchsia-900">
          <p className="font-semibold uppercase tracking-wide">Why HEMA & TPO-Free standards matter?</p>
          <p className="mt-1">Reduce insurance risks and client reactions by switching to Gelitup’s regulated, clean chemistry.</p>
        </div>

                {/* COLOUR_CHART_PLACEHOLDER */}

                {/* â”€â”€ STICKY LIVE COLOUR CHART (catalog browsing) â”€â”€ */}
        <div className="sticky top-0 z-20 -mx-4 mt-4 border-y border-slate-200 bg-white px-4 pb-3 pt-3 sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900">
              {(selectedCodes.length + packageCartItems.length) > 0
                ? `Your Selection â€” ${selectedCodes.length + packageCartItems.length} items Â· ${totalUnits} units`
                : 'Your Selection â€” tap products below to add'}
            </p>
            <div className="flex items-center gap-3">
              {(selectedCodes.length > 0 || packageCartItems.length > 0) && (
                <button
                  onClick={() => { setSelectedCodes([]); setItemQtys({}); setPackageCartItems([]); setGeneratedPackageTier('') }}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => navigate('/portal/dashboard/products')}
                className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-fuchsia-500"
              >
                Review Order ({totalUnits}{orderTotal > 0 ? ` · €${orderTotal.toFixed(2)}` : ''}) →
              </button>
            </div>
          </div>
          {(selectedCodes.length === 0 && packageCartItems.length === 0)
            ? <p className="mt-1 text-[11px] italic text-slate-400">Nothing selected yet.</p>
            : (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {selectedProducts.map((product) => (
                  <div
                    key={product.code}
                    className="group relative flex w-[64px] flex-none flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div
                      className="relative h-[64px] w-full flex-none"
                      style={{ backgroundColor: product.preview || '#e2e8f0' }}
                    >
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                        : null}
                      <button
                        onClick={() => toggleSelection(product.code)}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-slate-700 shadow opacity-0 transition group-hover:opacity-100"
                        aria-label={`Remove ${product.code}`}
                      >&times;</button>
                    </div>
                    <div className="p-1">
                      <p className="truncate text-[10px] font-semibold leading-tight text-slate-900">{product.code}</p>
                      <p className="truncate text-[9px] leading-tight text-slate-500">{product.name}</p>
                    </div>
                  </div>
                ))}
                {packageCartItems.map((item) => {
                  const resolvedImg = resolveCatalogImageUrl(item)
                  const itemPreview = item.preview || item.hex_color || '#e2e8f0'
                  return (
                    <div
                      key={`pkg-${item.sku}-${item.code}`}
                      className="relative flex w-[64px] flex-none flex-col overflow-hidden rounded-lg border border-fuchsia-300 bg-white shadow-sm"
                    >
                      <div
                        className="relative h-[64px] w-full flex-none"
                        style={{ backgroundColor: itemPreview }}
                      >
                        {resolvedImg
                          ? <img src={resolvedImg} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                          : null}
                        <span className="absolute left-0.5 top-0.5 rounded-full bg-fuchsia-600 px-1 py-0.5 text-[9px] font-bold leading-none text-white">{item.qty}&times;</span>
                      </div>
                      <div className="p-1">
                        <p className="truncate text-[10px] font-semibold leading-tight text-slate-900">{item.code}</p>
                        <p className="truncate text-[9px] leading-tight text-fuchsia-700">{item.name}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </div>
{groupedFilteredProducts.length === 0
          ? (
            <p className="mt-6 text-sm text-slate-400 italic">No products match your search.</p>
          )
          : groupedFilteredProducts.map(([cat, catProducts]) => {
            const isExpanded = query ? true : expandedCategories.has(cat)
            const selectedInCat = catProducts.filter(p => selectedCodes.includes(p.code)).length
            return (
            <div key={cat} className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Category header — click to expand/collapse */}
              <button
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-900">{cat}</h4>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{catProducts.length}</span>
                  {selectedInCat > 0 && (
                    <span className="rounded-full bg-fuchsia-600 px-2 py-0.5 text-[11px] font-bold text-white">{selectedInCat} selected</span>
                  )}
                </div>
                <svg
                  className={`h-4 w-4 flex-none text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Products grid — only rendered when expanded */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {catProducts.map((product) => {
                    const selected = selectedCodes.includes(product.code)
                    const qty = itemQtys[product.code] || 1
                    return (
                      <div
                        key={product.code}
                        className={`flex flex-col rounded-xl border transition ${
                          selected ? 'border-fuchsia-500 bg-white shadow-md shadow-fuchsia-100' : 'border-slate-200 bg-white hover:border-fuchsia-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Image — click to zoom, selected ring */}
                        <div
                          className={`relative h-24 w-full cursor-zoom-in overflow-hidden rounded-t-xl ${selected ? 'ring-2 ring-fuchsia-500 ring-offset-0' : ''}`}
                          title="Click to enlarge"
                          onClick={() => product.imageUrl && setLightboxUrl(product.imageUrl)}
                        >
                          <div className="absolute inset-0" style={{ backgroundColor: product.preview }} />
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.name} loading="lazy" className="relative z-10 h-full w-full object-cover" />
                          )}
                          {selected && (
                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-600 text-[10px] font-bold text-white shadow">
                              {qty}
                            </span>
                          )}
                        </div>

                        {/* Name + price */}
                        <div className="flex flex-1 flex-col gap-0.5 px-2 pt-1.5 pb-1">
                          <p className="text-[11px] font-semibold leading-tight text-slate-900 line-clamp-2">{product.name}</p>
                          {product.price != null && (
                            <p className="text-[11px] font-bold text-fuchsia-700">€{Number(product.price).toFixed(2)}</p>
                          )}
                        </div>

                        {/* Action row */}
                        {selected ? (
                          /* Qty stepper + remove */
                          <div className="flex items-center justify-between gap-1 border-t border-fuchsia-100 px-2 py-1.5">
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => { const q = qty - 1; if (q <= 0) toggleSelection(product.code); else setItemQtys(prev => ({...prev, [product.code]: q})) }}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-fuchsia-200 bg-fuchsia-50 text-sm font-bold text-fuchsia-700 hover:bg-fuchsia-100"
                              >−</button>
                              <span className="w-6 text-center text-xs font-bold text-slate-800">{qty}</span>
                              <button
                                onClick={() => setItemQtys(prev => ({...prev, [product.code]: qty + 1}))}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-fuchsia-200 bg-fuchsia-50 text-sm font-bold text-fuchsia-700 hover:bg-fuchsia-100"
                              >+</button>
                            </div>
                            {product.price != null && qty > 1 && (
                              <span className="text-[10px] font-semibold text-fuchsia-600">€{(Number(product.price) * qty).toFixed(2)}</span>
                            )}
                            <button
                              onClick={() => toggleSelection(product.code)}
                              className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                              title="Remove"
                            >×</button>
                          </div>
                        ) : (
                          /* Add to cart button */
                          <button
                            onClick={() => toggleSelection(product.code)}
                            className="mt-auto w-full rounded-b-xl border-t border-slate-100 bg-slate-50 py-1.5 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-600 hover:text-white transition"
                          >
                            + Add to cart
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            )
          })
        }
        {!isLoadingFeed && !filteredProducts.length && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p>Live product feed is unavailable right now.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-md border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-800"
              >
                Retry now
              </button>
              <button
                onClick={() => navigate('/portal/dashboard/products')}
                className="rounded-md border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-800"
              >
                Go to My Order
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

function OrdersModule() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedOrderId, setCopiedOrderId] = useState(null)
  const [showBuilderDetails, setShowBuilderDetails] = useState(false)
  const [userEmail, setUserEmail] = useState('')
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
        .select('id, created_at, total_units, status, payment_status, items, customer_email, consignee_name, consignee_phone, shipping_address, zoho_salesorder_id, zoho_invoice_id, zoho_invoice_number, zoho_invoice_total')
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

  // Fetch current user email for Realtime filter
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  // Subscribe to order updates via Supabase Realtime
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase || !userEmail) return
    const channel = supabase
      .channel(`order-updates-${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: ordersTable,
          filter: `customer_email=eq.${userEmail}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o)),
          )
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userEmail, ordersTable])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-lg font-semibold text-transparent">Support & Tracking</h3>
        <p className="mt-1 text-sm text-slate-600">Track order submission/receipt status and contact support directly from this workspace.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <a href={`tel:${String(PROFORMA_LEEUKOPF_PHONE || '').replace(/\s+/g, '')}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <span className="font-semibold text-slate-900">Phone:</span>{' '}
            {PROFORMA_LEEUKOPF_PHONE}
          </a>
          {SUPPORT_WHATSAPP_URL
            ? (
                <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  <span className="font-semibold text-slate-900">WhatsApp:</span>{' '}
                  Chat with Us
                </a>
              )
            : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">WhatsApp:</span>{' '}
                  Coming soon
                </div>
              )}
          <a href={`mailto:${B2B_EMAIL}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <span className="font-semibold text-slate-900">Email:</span>{' '}
            {B2B_EMAIL}
          </a>
        </div>
        <p className="mt-2 text-xs text-slate-500">Online help/support bot will be added in a future release.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-lg font-semibold text-transparent">Submitted Orders</h3>
        <p className="mt-1 text-xs text-slate-500">
          Orders are stored in Supabase table: {ordersTable}. Invoicing is handled offline from {ORDER_INBOX_EMAIL}.
        </p>
      </div>

      {orders.some((o) => o.payment_status === 'invoice_ready') && (
        <div className="rounded-2xl border-2 border-fuchsia-400/50 bg-fuchsia-50 p-4 sm:p-6">
          <h3 className="bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-lg font-semibold text-transparent">
            Action Required — Invoice Ready
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            The following orders have been confirmed. Complete payment to proceed with fulfilment.
          </p>
          <div className="mt-4 space-y-4">
            {orders.filter((o) => o.payment_status === 'invoice_ready').map((order) => (
              <div key={order.id} className="rounded-xl border border-fuchsia-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">Order #{order.id}</p>
                    {order.zoho_invoice_number && (
                      <p className="text-sm text-slate-600">Zoho Invoice: <span className="font-medium">{order.zoho_invoice_number}</span></p>
                    )}
                    {order.zoho_invoice_total != null && (
                      <p className="mt-1 text-xl font-bold text-fuchsia-700">
                        {Number(order.zoho_invoice_total).toLocaleString('en-EU', { style: 'currency', currency: order.zoho_invoice_currency || 'EUR' })}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">Invoice Ready</span>
                </div>
                {PAYMENT_BANK_DETAILS && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank Transfer</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{PAYMENT_BANK_DETAILS}</p>
                  </div>
                )}
                {(PAYMENT_REVOLUT_URL || PAYMENT_STRIPE_URL || PAYMENT_PAYPAL_URL) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PAYMENT_REVOLUT_URL && (
                      <a href={PAYMENT_REVOLUT_URL} target="_blank" rel="noreferrer"
                        className="rounded-lg bg-[#1a1a2e] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                        Pay via Revolut
                      </a>
                    )}
                    {PAYMENT_STRIPE_URL && (
                      <a href={PAYMENT_STRIPE_URL} target="_blank" rel="noreferrer"
                        className="rounded-lg bg-[#635bff] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                        Pay via Stripe
                      </a>
                    )}
                    {PAYMENT_PAYPAL_URL && (
                      <a href={PAYMENT_PAYPAL_URL} target="_blank" rel="noreferrer"
                        className="rounded-lg bg-[#0070ba] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                        Pay via PayPal
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th className="py-2 pr-4">Zoho Invoice</th>
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
                    <td className="py-2 pr-4">
                      {order.payment_status === 'invoice_ready'
                        ? <span className="font-semibold text-fuchsia-600">Invoice Ready</span>
                        : order.status}
                    </td>
                    <td className="py-2 pr-4">{order.zoho_invoice_number || '-'}</td>
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

                {/* STRUCTURAL EXCELLENCE: 3-IN-1 PREMIUM BUILDER GEL */}
                <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#1A1A1A] px-4 py-12 sm:px-8 sm:py-16">
                  <div className="mx-auto max-w-6xl">
                    <div className="grid items-center gap-8 sm:grid-cols-2">
                      {/* Product Details */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                          Structural Excellence
                        </p>
                        <h3 className="mt-3 text-4xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}>
                          The Architect of Strength
                        </h3>
                        <p className="mt-4 text-base text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                          3-in-1 Premium Builder Gel delivers resilient structure with professional clarity and precision. Available in Clear, Pink, and Cover to match every studio system.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowBuilderDetails((current) => !current)}
                          className="mt-5 rounded-lg border border-[#D43790]/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition duration-300 hover:bg-[#D43790]/20"
                        >
                          {showBuilderDetails ? 'Show Less' : 'Learn More'}
                        </button>
                        {showBuilderDetails && (
                          <>
                            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Key Benefits</p>
                            <ul className="mt-2 space-y-2 text-sm text-white/75">
                              <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#D43790]" />
                                <span>Fiber-reinforced strength: fiberglass particles create a cross-linked mesh for resistance against cracking and snapping.</span>
                              </li>
                              <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#D43790]" />
                                <span>Single-phase efficiency: functions as base, builder, and high-shine top coat in one service flow.</span>
                              </li>
                              <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#D43790]" />
                                <span>Cool cure technology: formulated to minimize heat spikes during curing for improved client comfort.</span>
                              </li>
                              <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#D43790]" />
                                <span>Toxin-free performance: 100% HEMA and TPO free.</span>
                              </li>
                            </ul>
                            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">How to Use / Application</p>
                            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-white/75">
                              <li><span className="font-semibold text-white/90">Preparation:</span> Perform a thorough dry manicure and cleanse the nail plate.</li>
                              <li><span className="font-semibold text-white/90">Adhesion:</span> Apply Superbond Primer and allow to air-dry for 30 seconds.</li>
                              <li><span className="font-semibold text-white/90">Foundation Layer:</span> Apply a thin slip layer over the nail (and form if extending). Do not cure.</li>
                              <li><span className="font-semibold text-white/90">Building:</span> Place a larger bead in the center and guide to edges, allowing self-leveling apex formation.</li>
                              <li><span className="font-semibold text-white/90">Curing:</span> Cure for 60-90 seconds in LED or 120 seconds in UV.</li>
                              <li><span className="font-semibold text-white/90">Refinement:</span> Wipe inhibition layer with cleanser and file to shape.</li>
                              <li><span className="font-semibold text-white/90">Finishing:</span> Apply a final thin layer of the same gel for gloss, or proceed with GEL.IT.UP by GIUP® color.</li>
                            </ol>
                          </>
                        )}
                        <button
                          onClick={() => {
                            const builderSection = sections.find((s) => s.category === 'BUILDER GEL SYSTEMS')
                            if (builderSection) {
                              setActiveCategory(builderSection.category)
                              setActiveSubcategory('ALL')
                            }
                          }}
                          className="mt-8 rounded-lg bg-[#D43790] px-8 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:bg-[#C32680]"
                        >
                          Shop the Builder System
                        </button>
                      </div>

                      {/* Product Visuals */}
                      <div className="flex flex-col items-center gap-5">
                        <div className="relative h-80 w-64 rounded-xl border border-white/20 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] p-6 flex items-center justify-center">
                          <img
                            src="/gelitup-content/product-images/BUILDER GEL/3INI BUILDER/3-in-1-builder-gel.hero.image.jpg"
                            alt="3-in-1 Premium Builder Gel bottle"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/logo.png'
                            }}
                          />
                        </div>
                        <div className="grid w-full grid-cols-3 gap-3">
                          {[
                            { label: 'Clear', src: '/gelitup-content/product-images/BUILDER GEL/3INI BUILDER/3-in-1_clear.jpg' },
                            { label: 'Pink', src: '/gelitup-content/product-images/BUILDER GEL/3INI BUILDER/3in1pink.jpg' },
                            { label: 'Cover', src: '/gelitup-content/product-images/BUILDER GEL/3INI BUILDER/3in1cover.jpg' },
                          ].map((shade) => (
                            <div key={shade.label} className="rounded-lg border border-white/15 bg-[#111111] p-2 text-center">
                              <div className="h-20 w-full overflow-hidden rounded-md bg-black/20">
                                <img src={shade.src} alt={`${shade.label} Builder Gel shade`} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/70" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                                {shade.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionDrafts, setActionDrafts] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingId, setIsSavingId] = useState(null)
  const [copiedApplicationId, setCopiedApplicationId] = useState(null)
  const [copiedInvoiceId, setCopiedInvoiceId] = useState(null)
  const [copiedShippingId, setCopiedShippingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const registrationsTable = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || DEFAULT_REGISTRATIONS_TABLE
  const statusFilterOptions = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: 'pending', label: 'Pending' },
      { key: 'submitted', label: 'Submitted' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
    ],
    [],
  )

  const getStatusBadgeClass = useCallback((statusValue) => {
    const normalized = String(statusValue || '').trim().toLowerCase()
    if (normalized === 'approved') return 'bg-emerald-100 text-emerald-700'
    if (normalized === 'rejected') return 'bg-rose-100 text-rose-700'
    if (normalized === 'submitted') return 'bg-sky-100 text-sky-800'
    if (normalized === 'pending') return 'bg-amber-100 text-amber-800'
    return 'bg-slate-100 text-slate-800'
  }, [])

  const loadPendingApplications = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) {
      setErrorMessage('Supabase is not configured.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from(registrationsTable)
      .select('id, created_at, customer_type, company_name, vat_number, contact_name, contact_email, phone, shipping_type, country, business_type, status, notes, admin_comment, order_action, order_payment_status, order_shipping_status, tracking_number, tracking_url, action_updated_at, action_updated_by, invoice_address_line1, invoice_area, invoice_region, invoice_country, invoice_postal_code, shipping_same_as_invoice, shipping_name, shipping_phone, shipping_address_line1, shipping_area, shipping_region, shipping_country, shipping_postal_code')
      .in('status', ['pending', 'submitted', 'approved', 'rejected'])
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      setApplications([])
      setIsLoading(false)
      return
    }

    setApplications(data || [])
    setIsLoading(false)
  }, [registrationsTable])

  const visibleApplications = useMemo(
    () => applications.filter((application) => {
      if (statusFilter === 'all') return true
      return String(application?.status || '').trim().toLowerCase() === statusFilter
    }),
    [applications, statusFilter],
  )

  const reviewedApplications = useMemo(
    () => applications
      .filter((application) => {
        const status = String(application?.status || '').trim().toLowerCase()
        return status === 'approved' || status === 'rejected'
      })
      .sort((left, right) => {
        const leftTime = new Date(left.action_updated_at || left.created_at || 0).getTime()
        const rightTime = new Date(right.action_updated_at || right.created_at || 0).getTime()
        return rightTime - leftTime
      })
      .slice(0, 80),
    [applications],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPendingApplications()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadPendingApplications])

  const getActionDraft = (application) => {
    const storedDraft = actionDrafts[application.id]
    if (storedDraft) return storedDraft

    return {
      adminComment: String(application.admin_comment || ''),
      orderAction: String(application.order_action || (isDistributorSubmission(application) ? '' : 'requested')),
      paymentStatus: String(application.order_payment_status || (isDistributorSubmission(application) ? '' : 'unpaid')),
      shippingStatus: String(application.order_shipping_status || (isDistributorSubmission(application) ? '' : 'not_ready')),
      trackingNumber: String(application.tracking_number || ''),
      trackingUrl: String(application.tracking_url || ''),
    }
  }

  const setActionDraftField = (applicationId, fieldName, value) => {
    setActionDrafts((current) => ({
      ...current,
      [applicationId]: {
        ...(current[applicationId] || {}),
        [fieldName]: value,
      },
    }))
  }

  const saveWorkflowAction = async (application) => {
    if (!hasSupabaseConfig || !supabase) {
      setErrorMessage('Supabase is not configured.')
      return
    }

    const draft = getActionDraft(application)

    setIsSavingId(application.id)
    setErrorMessage('')
    setSuccessMessage('')

    const { data: userData } = await supabase.auth.getUser()
    const reviewerEmail = userData?.user?.email ?? null

    const updates = {
      admin_comment: draft.adminComment.trim() || null,
      order_action: draft.orderAction.trim() || null,
      order_payment_status: draft.paymentStatus.trim() || null,
      order_shipping_status: draft.shippingStatus.trim() || null,
      tracking_number: draft.trackingNumber.trim() || null,
      tracking_url: draft.trackingUrl.trim() || null,
      action_updated_at: new Date().toISOString(),
      action_updated_by: reviewerEmail,
    }

    const { error } = await supabase
      .from(registrationsTable)
      .update(updates)
      .eq('id', application.id)

    if (error) {
      setErrorMessage(error.message)
      setIsSavingId(null)
      return
    }

    setSuccessMessage(`Workflow details saved for #${application.id}.`)
    setIsSavingId(null)
    await loadPendingApplications()
  }

  const copyApplicationDetails = async (application) => {
    const applicationType = getApplicationTypeFromRecord(application)
    const orderProfile = getOrderProfileFromRecord(application)
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
      `Type: ${applicationType === 'distributor' ? 'Distributor Application' : 'B2B Order Request'}`,
      `Order Profile: ${applicationType === 'b2b_order' ? orderProfile : '-'}`,
      `Submission Status: ${application.status || '-'}`,
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
      `Admin Comment: ${application.admin_comment || '-'}`,
      `Order Action: ${application.order_action || '-'}`,
      `Payment Status: ${application.order_payment_status || '-'}`,
      `Shipping Status: ${application.order_shipping_status || '-'}`,
      `Tracking Number: ${application.tracking_number || '-'}`,
      `Tracking URL: ${application.tracking_url || '-'}`,
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
    if (!isDistributorSubmission(application)) {
      setErrorMessage('Approve/reject is available only for distributor applications.')
      return
    }

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

    const createPasswordLink = `${window.location.origin}/portal/login?mode=create-password&email=${encodeURIComponent(application.contact_email || '')}`

    const subject = status === 'approved'
      ? `Welcome to GEL.IT.UP Portal, ${application.contact_name}`
      : `GEL.IT.UP Portal application update`

    const html = status === 'approved'
      ? `<p>Hello ${application.contact_name},</p><p>Welcome to <strong>GEL.IT.UP by GIUP®</strong>.</p><p>Your distributor account for <strong>${application.company_name}</strong> has been approved.</p><p>Please open your login page below. Your email is prefilled; create your password, confirm it, and tick the Remember me checkbox.</p><p><a href="${createPasswordLink}">Create password and continue to login</a></p><p>Best regards,<br/>GEL.IT.UP Distribution Team</p>`
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
        <h3 className="text-lg font-semibold text-slate-900">Approvals & Order Requests</h3>
        <p className="mt-1 text-xs text-slate-500">
          Manage distributor approvals and B2B order workflow updates in one queue.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {statusFilterOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setStatusFilter(option.key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] ${statusFilter === option.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-slate-600">Loading submissions...</p>}
        {!isLoading && errorMessage && <p className="text-sm text-rose-600">Unable to load applications: {errorMessage}</p>}
        {!isLoading && !errorMessage && !visibleApplications.length && (
          <p className="text-sm text-slate-600">No submissions match this status filter.</p>
        )}

        {!isLoading && !errorMessage && visibleApplications.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Business</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Shipping</th>
                  <th className="py-2 pr-4">Workflow</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((application) => {
                  const isDistributor = isDistributorSubmission(application)
                  const draft = getActionDraft(application)
                  return (
                  <tr key={application.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-4 font-semibold">#{application.id}</td>
                    <td className="py-2 pr-4">{new Date(application.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDistributor ? 'bg-fuchsia-100 text-fuchsia-800' : 'bg-sky-100 text-sky-800'}`}>
                        {isDistributor ? 'Distributor' : 'B2B Order'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(application.status)}`}>
                        {application.status || '-'}
                      </span>
                    </td>
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
                    <td className="py-2 pr-4 align-top">
                      <div className="grid min-w-[220px] gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Admin Comment
                          <textarea
                            rows={2}
                            value={draft.adminComment}
                            onChange={(event) => setActionDraftField(application.id, 'adminComment', event.target.value)}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            placeholder="Reviewer notes"
                          />
                        </label>

                        {!isDistributor && (
                          <>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Order Action
                              <select
                                value={draft.orderAction}
                                onChange={(event) => setActionDraftField(application.id, 'orderAction', event.target.value)}
                                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              >
                                <option value="requested">Requested</option>
                                <option value="order_placed">Order Placed</option>
                                <option value="payment_received">Payment Received</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Payment
                              <select
                                value={draft.paymentStatus}
                                onChange={(event) => setActionDraftField(application.id, 'paymentStatus', event.target.value)}
                                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              >
                                <option value="unpaid">Unpaid</option>
                                <option value="paid">Paid</option>
                                <option value="refunded">Refunded</option>
                              </select>
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Shipping
                              <select
                                value={draft.shippingStatus}
                                onChange={(event) => setActionDraftField(application.id, 'shippingStatus', event.target.value)}
                                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              >
                                <option value="not_ready">Not Ready</option>
                                <option value="packed">Packed</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Tracking Number
                              <input
                                type="text"
                                value={draft.trackingNumber}
                                onChange={(event) => setActionDraftField(application.id, 'trackingNumber', event.target.value)}
                                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                                placeholder="Tracking code"
                              />
                            </label>
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Tracking URL
                              <input
                                type="url"
                                value={draft.trackingUrl}
                                onChange={(event) => setActionDraftField(application.id, 'trackingUrl', event.target.value)}
                                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                                placeholder="https://"
                              />
                            </label>
                          </>
                        )}

                        <button
                          onClick={() => {
                            void saveWorkflowAction(application)
                          }}
                          disabled={isSavingId === application.id}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                        >
                          {isSavingId === application.id ? 'Saving...' : 'Save workflow'}
                        </button>

                        <div className="text-[10px] text-slate-500">
                          {application.action_updated_at
                            ? `Updated ${new Date(application.action_updated_at).toLocaleString()}${application.action_updated_by ? ` by ${application.action_updated_by}` : ''}`
                            : 'No workflow updates yet.'}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {isDistributor && application.status === 'pending' && (
                          <>
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
                          </>
                        )}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {successMessage && <p className="mt-3 text-xs text-emerald-700">{successMessage}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-slate-900">Reviewed Applications</h4>
          <p className="text-xs text-slate-500">Recently reviewed submissions, including workflow notes and tracking values.</p>
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
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Reviewed</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Shipping</th>
                  <th className="py-2 pr-4">Workflow</th>
                  <th className="py-2 pr-4">Copy</th>
                </tr>
              </thead>
              <tbody>
                {reviewedApplications.map((application) => {
                  const isDistributor = isDistributorSubmission(application)
                  return (
                  <tr key={`reviewed-${application.id}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-4 font-semibold">#{application.id}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(application.status)}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDistributor ? 'bg-fuchsia-100 text-fuchsia-800' : 'bg-sky-100 text-sky-800'}`}>
                        {isDistributor ? 'Distributor' : 'B2B Order'}
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
                      <div className="text-xs text-slate-700">Comment: {application.admin_comment || '-'}</div>
                      <div className="text-xs text-slate-500">Action: {application.order_action || '-'}</div>
                      <div className="text-xs text-slate-500">Payment: {application.order_payment_status || '-'}</div>
                      <div className="text-xs text-slate-500">Shipping: {application.order_shipping_status || '-'}</div>
                      <div className="text-xs text-slate-500">Tracking: {application.tracking_number || '-'}</div>
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
                  )
                })}
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

  const printComplianceCertificate = useCallback(async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const margin = 44
    const titleY = 72
    const now = new Date()
    const dateLabel = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    let distributorLabel = 'Approved GEL.IT.UP Distributor'

    if (hasSupabaseConfig && supabase) {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      const userMeta = user?.user_metadata || {}
      const companyName = String(userMeta.company_name || userMeta.full_name || user?.email || '').trim()
      if (companyName) distributorLabel = companyName
    }

    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('GEL.IT.UP COMPLIANCE CERTIFICATE', margin, titleY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Issued: ${dateLabel}`, margin, titleY + 24)
    doc.text(`Certificate Holder: ${distributorLabel}`, margin, titleY + 40)

    doc.setDrawColor(217, 70, 239)
    doc.line(margin, titleY + 52, 550, titleY + 52)

    const statements = [
      'Declaration 1: HEMA-FREE formulation standard is active across current production lines.',
      'Declaration 2: TPO-FREE photoinitiator policy is active across current production lines.',
      `Declaration 3: CI 77820 (Silver) FREE transition has been active since ${new Date(`${COMPLIANCE_DATE}T00:00:00.000Z`).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}.`,
      'Regulatory Note: Legacy stock (pre-Dec 2025) may contain trace levels (<0.2%) in line with EC 1223/2009 requirements at time of manufacture.',
      'Current Pigment Strategy: Aluminium and mica-based alternatives, including CI 77000, CI 77891, Synthetic Fluorphlogopite, and Calcium Aluminium Borosilicate.',
    ]

    doc.setFontSize(11)
    let cursorY = titleY + 84
    statements.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 510)
      doc.text(wrapped, margin, cursorY)
      cursorY += (wrapped.length * 15) + 6
    })

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(217, 70, 239)
    doc.text('Professional Choice. Professional Results.', margin, Math.min(cursorY + 16, 760))

    doc.save(`gelitup-compliance-certificate-${now.toISOString().slice(0, 10)}.pdf`)
  }, [])

  const modules = useMemo(
    () => [
      { key: 'overview', label: 'Overview' },
      { key: 'products', label: 'My Order' },
      { key: 'profile', label: 'My Information' },
      { key: 'orders', label: 'Orders' },
      { key: 'catalog', label: 'Shop' },
      { key: 'support', label: 'Support & Tracking' },
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
                  isActive
                    ? 'bg-fuchsia-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {module.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={onLogout} className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#4A4A4A]">
          Sign Out
        </button>
      </aside>

      <div className="space-y-4">
        {activeModule === 'products' || activeModule === 'catalog' || activeModule === 'profile' ? (
          <ProductsModule moduleView={activeModule} />
        ) : activeModule === 'orders' || activeModule === 'support' ? (
          <OrdersModule />
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-2xl font-semibold text-transparent">{modules.find((module) => module.key === activeModule)?.label}</h2>
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

            {activeModule === 'overview' && (
              <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">B2B Regulatory Docs</p>
                <p className="mt-2 text-sm text-fuchsia-900">Generate the inspector-ready certificate including HEMA-Free, TPO-Free, and CI 77820-Free declarations.</p>
                <button
                  type="button"
                  onClick={() => {
                    void printComplianceCertificate()
                  }}
                  className="mt-3 inline-flex rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-fuchsia-500"
                >
                  Print Compliance Certificate
                </button>
              </div>
            )}


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
  const routerLocation = useLocation()
  const navigate = useNavigate()
  const [isPortalAuthenticated, setIsPortalAuthenticated] = useState(() => localStorage.getItem('portalAuth') === 'true')
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig)
  const [hasAcceptedCookies, setHasAcceptedCookies] = useState(() => localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === 'accepted')
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactRequestForm, setContactRequestForm] = useState({ name: '', email: '', phone: '' })
  const [isSubmittingContactRequest, setIsSubmittingContactRequest] = useState(false)
  const [contactRequestMessage, setContactRequestMessage] = useState('')
  const [contactRequestError, setContactRequestError] = useState('')
  const registrationsTable = import.meta.env.VITE_B2B_REGISTRATIONS_TABLE || DEFAULT_REGISTRATIONS_TABLE
  const adminsTable = import.meta.env.VITE_B2B_ADMINS_TABLE || 'b2b_admins'
  const requireApproval = import.meta.env.VITE_REQUIRE_B2B_APPROVAL !== 'false'
  const [showBackToTop, setShowBackToTop] = useState(false)

  const handleAcceptCookies = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted')
    setHasAcceptedCookies(true)
  }, [])

  useEffect(() => {
    const onWindowScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onWindowScroll, { passive: true })
    return () => window.removeEventListener('scroll', onWindowScroll)
  }, [])

  const openContactModal = useCallback(() => {
    setContactRequestError('')
    setContactRequestMessage('')
    setIsContactModalOpen(true)
  }, [])

  const closeContactModal = useCallback(() => {
    if (isSubmittingContactRequest) return
    setIsContactModalOpen(false)
  }, [isSubmittingContactRequest])

  const setContactField = useCallback((key, value) => {
    setContactRequestForm((current) => ({ ...current, [key]: value }))
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

  useEffect(() => {
    const isHomeRoute = routerLocation.pathname === '/' || routerLocation.pathname === '/home'
    if (!isHomeRoute) {
      return
    }

    const params = new URLSearchParams(routerLocation.search)
    const portalTarget = String(params.get('portal') || '').trim().toLowerCase()

    if (!portalTarget) {
      return
    }

    if (portalTarget === 'login') {
      navigate('/portal/login', { replace: true })
      return
    }

    if (portalTarget === 'admin') {
      navigate('/portal/admin-login', { replace: true })
    }
  }, [navigate, routerLocation.pathname, routerLocation.search])

  const fetchLatestRegistrationByEmail = async (normalizedEmail, selectColumns = '*') => {
    if (!normalizedEmail || !hasSupabaseConfig || !supabase) {
      return { data: null, error: null }
    }

    const queryLatest = async (column) => {
      const { data, error } = await supabase
        .from(registrationsTable)
        .select(selectColumns)
        .ilike(column, normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        const missingColumn = /column .* does not exist/i.test(String(error.message || ''))
        if (missingColumn) return { data: null, error: null }
        return { data: null, error }
      }

      return { data: data?.[0] || null, error: null }
    }

    const primaryResult = await queryLatest('contact_email')
    if (primaryResult.error || primaryResult.data) {
      return primaryResult
    }

    return queryLatest('email')
  }

  const handlePortalLogin = async (email, password) => {
    if (hasSupabaseConfig && supabase) {
      const normalizedEmail = String(email || '').trim().toLowerCase()
      const isInternalBypassEmail = PORTAL_INTERNAL_BYPASS_EMAILS.has(normalizedEmail)
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

      if (error) {
        const authErrorMessage = String(error.message || '').trim()
        const isInvalidCredentials = /invalid login credentials/i.test(authErrorMessage)

        if (!isInvalidCredentials) {
          return {
            ok: false,
            message: authErrorMessage || 'Unable to sign in.',
            applicationStatus: '',
            debugTrace: `login-error:${authErrorMessage || 'unknown'} bypass=${isInternalBypassEmail ? 'yes' : 'no'}`,
          }
        }

        const registrationResult = await fetchLatestRegistrationByEmail(normalizedEmail, 'status, notes')
        const latestRegistration = registrationResult.data || null

        const status = String(latestRegistration?.status || '').trim().toLowerCase()
        const applicationType = latestRegistration ? getApplicationTypeFromRecord(latestRegistration) : 'b2b_order'
        const isDistributorRegistration = applicationType === 'distributor'

        if (isDistributorRegistration && requireApproval && status !== 'approved') {
          if (status === 'rejected') {
            return {
              ok: false,
              message: 'Your B2B application was rejected. Contact distribution support for next steps.',
              applicationStatus: 'rejected',
              debugTrace: 'login-invalid-credentials -> distributor-rejected',
            }
          }

          if (status === 'submitted') {
            return {
              ok: false,
              message: 'Your order request is stored and under processing. Portal sign-in requires an approved distributor application.',
              applicationStatus: 'submitted',
              debugTrace: 'login-invalid-credentials -> distributor-submitted',
            }
          }

          return {
            ok: false,
            message: 'Your B2B application is pending approval. Access is enabled after manual review.',
            applicationStatus: 'pending',
            debugTrace: 'login-invalid-credentials -> distributor-pending',
          }
        }

        const signUpResult = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal/login`,
          },
        })

        const signUpMessage = signUpResult?.error?.message || ''
        const isAlreadyRegistered = /already registered|already been registered/i.test(signUpMessage)
        const isExistingAccount = isExistingUserSignUpResult(signUpResult)
        let canSignInNow = hasActiveSignUpSession(signUpResult)

        if (signUpResult.error && !isAlreadyRegistered) {
          return {
            ok: false,
            message: signUpResult.error.message || 'Unable to initialize account access.',
            applicationStatus: '',
            debugTrace: 'login-invalid-credentials -> auto-provision-signup-error',
          }
        }

        if (!canSignInNow) {
          const { error: immediateSignInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })

          if (!immediateSignInError) {
            canSignInNow = true
          }
        }

        if (canSignInNow) {
          setIsPortalAuthenticated(true)
          return {
            ok: true,
            applicationStatus: 'approved',
            debugTrace: 'login-invalid-credentials -> auto-provision-success',
          }
        }

        return {
          ok: false,
          message: (isAlreadyRegistered || isExistingAccount)
            ? 'Invalid login credentials. Use Forgot password to reset access.'
            : 'Account setup completed. Please sign in again.',
          applicationStatus: status || '',
          debugTrace: 'login-invalid-credentials -> auto-provision-signin-required',
        }
      }

      if (requireApproval) {
        const { data: adminRows, error: adminError } = await supabase
          .from(adminsTable)
          .select('email')
          .ilike('email', normalizedEmail)
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

        const registrationResult = await fetchLatestRegistrationByEmail(normalizedEmail, '*')
        const registrationError = registrationResult.error

        if (registrationError) {
          await supabase.auth.signOut()
          return {
            ok: false,
            message: `Login blocked: registration status could not be verified (${registrationError.message}).`,
            applicationStatus: '',
          }
        }

        const latestRegistration = registrationResult.data
        const status = String(latestRegistration?.status || '').trim().toLowerCase()
        const applicationType = getApplicationTypeFromRecord(latestRegistration)
        const isDistributorRegistration = applicationType === 'distributor'

        if (!latestRegistration) {
          if (isInternalBypassEmail) {
            setIsPortalAuthenticated(true)
            return { ok: true, applicationStatus: 'approved', debugTrace: 'login-success -> bypass-approved (no registration row)' }
          }

          setIsPortalAuthenticated(true)
          return {
            ok: true,
            applicationStatus: 'approved',
            debugTrace: 'login-success -> no-registration-row-allowed',
          }
        }

        if (isDistributorRegistration && requireApproval && status !== 'approved') {
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

          if (status === 'submitted') {
            return {
              ok: false,
              message: 'Your order request is stored and under processing. Portal sign-in requires an approved distributor application.',
              applicationStatus: 'submitted',
            }
          }

          return {
            ok: false,
            message: 'No approved B2B application found for this email.',
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
      return { ok: true, applicationStatus: 'approved', debugTrace: 'login-success -> approved' }
    }

    // Demo mode — skip credential check
    setIsPortalAuthenticated(true)
    return { ok: true, applicationStatus: 'approved', debugTrace: 'login-demo-mode -> approved' }
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
      .ilike('email', normalizedEmail)
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

  const handleCreateAdminPassword = async ({ email, password, confirmPassword, rememberMe }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      return { ok: false, message: 'Admin email is required.' }
    }

    if (!password || password.length < 8) {
      return { ok: false, message: 'Password must be at least 8 characters.' }
    }

    if (password !== confirmPassword) {
      return { ok: false, message: 'Password and confirmation do not match.' }
    }

    if (!rememberMe) {
      return { ok: false, message: 'Please confirm the remember me checkbox.' }
    }

    if (!hasSupabaseConfig || !supabase) {
      return { ok: false, message: 'Live auth is not configured.' }
    }

    const signUpResult = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/admin-login`,
      },
    })

    const signUpMessage = signUpResult?.error?.message || ''
    const isAlreadyRegistered = /already registered|already been registered/i.test(signUpMessage)
    const isExistingAccount = isExistingUserSignUpResult(signUpResult)
    const hasActiveSession = hasActiveSignUpSession(signUpResult)
    let canSignInNow = hasActiveSession

    if (signUpResult.error && !isAlreadyRegistered) {
      return { ok: false, message: signUpResult.error.message }
    }

    if (!canSignInNow) {
      const { error: immediateSignInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (!immediateSignInError) {
        canSignInNow = true
      }
    }

    if ((isAlreadyRegistered || isExistingAccount) && !canSignInNow) {
      return {
        ok: false,
        message: 'This admin account already exists. Use your existing password or reset it via Forgot password.',
      }
    }

    localStorage.setItem('adminRememberedEmail', normalizedEmail)

    if (canSignInNow) {
      const { data: adminRows, error: adminError } = await supabase
        .from(adminsTable)
        .select('email')
        .ilike('email', normalizedEmail)
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
    }

    return {
      ok: true,
      message: canSignInNow
        ? 'Password created. Email confirmation is not required; you are now signed in as admin.'
        : 'Password setup completed. Please sign in as admin.',
      navigateToDashboard: canSignInNow,
    }
  }

  const handleCreatePortalPassword = async ({ email, password, confirmPassword, rememberMe }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const isInternalBypassEmail = PORTAL_INTERNAL_BYPASS_EMAILS.has(normalizedEmail)

    if (!normalizedEmail) {
      return { ok: false, message: 'Business email is required.' }
    }

    if (!password || password.length < 8) {
      return { ok: false, message: 'Password must be at least 8 characters.' }
    }

    if (password !== confirmPassword) {
      return { ok: false, message: 'Password and confirmation do not match.' }
    }

    if (!rememberMe) {
      return { ok: false, message: 'Please confirm the remember me checkbox.' }
    }

    if (!hasSupabaseConfig || !supabase) {
      return { ok: false, message: 'Live auth is not configured.' }
    }

    const signUpResult = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/login`,
      },
    })

    const signUpMessage = signUpResult?.error?.message || ''
    const isAlreadyRegistered = /already registered|already been registered/i.test(signUpMessage)
    const isExistingAccount = isExistingUserSignUpResult(signUpResult)
    const hasActiveSession = hasActiveSignUpSession(signUpResult)
    let canSignInNow = hasActiveSession

    if (signUpResult.error && !isAlreadyRegistered) {
      return { ok: false, message: signUpResult.error.message }
    }

    if (!canSignInNow) {
      const { error: immediateSignInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (!immediateSignInError) {
        canSignInNow = true
      }
    }

    if ((isAlreadyRegistered || isExistingAccount) && !canSignInNow) {
      return {
        ok: false,
        message: 'This account already exists. Use your existing password or reset it via Forgot password.',
      }
    }

    localStorage.setItem('portalRememberedEmail', normalizedEmail)
    if (canSignInNow) {
      const registrationResult = await fetchLatestRegistrationByEmail(normalizedEmail, 'status, notes')
      const registrationError = registrationResult.error

      if (registrationError) {
        await supabase.auth.signOut()
        return { ok: false, message: `Registration status check failed (${registrationError.message}).` }
      }

      const latestRegistration = registrationResult.data || null
      if (!latestRegistration) {
        if (isInternalBypassEmail) {
          setIsPortalAuthenticated(true)
          return {
            ok: true,
            infoMessage: 'Password created successfully. Internal account access granted.',
            navigateToDashboard: true,
            debugTrace: 'create-password -> bypass-approved (no registration row)',
          }
        }

        setIsPortalAuthenticated(true)
        return {
          ok: true,
          infoMessage: 'Password created successfully. No B2B registration profile was found yet; submit a distributor application if approval-gated access is needed.',
          navigateToDashboard: true,
          debugTrace: 'create-password -> no-registration-row-allowed',
        }
      }

      const registrationStatus = String(latestRegistration?.status || '').trim().toLowerCase()
      const applicationType = getApplicationTypeFromRecord(latestRegistration)
      const isDistributorRegistration = applicationType === 'distributor'

      if (isDistributorRegistration && requireApproval && registrationStatus !== 'approved') {
        await supabase.auth.signOut()

        if (registrationStatus === 'rejected') {
          return { ok: false, message: 'Your distributor application was rejected. Contact distribution support for next steps.' }
        }

        return { ok: false, message: 'Your distributor application is pending approval. Access is enabled after manual review.' }
      }

      setIsPortalAuthenticated(true)
    }

    return {
      ok: true,
      infoMessage: canSignInNow
        ? 'Password created successfully. Email verification is not required; you are now signed in.'
        : 'Password setup completed. Please sign in.',
      navigateToDashboard: canSignInNow,
      debugTrace: canSignInNow ? 'create-password -> signed-in' : 'create-password -> account-ready-sign-in-required',
    }
  }

  const handlePortalRegister = async (application) => {
    if (hasSupabaseConfig && supabase) {
      const applicationType = String(application.applicationType || 'distributor').trim().toLowerCase()
      const orderProfile = String(application.orderProfile || 'business').trim().toLowerCase()
      const isDistributorApplication = applicationType === 'distributor'
      const isBusinessOrder = orderProfile !== 'personal'
      const shippingSameAsInvoice = application.shippingSameAsInvoice !== false
      const invoiceCountry = application.invoiceCountry.trim()
      const invoiceArea = application.invoiceArea.trim()
      const invoiceRegion = application.invoiceRegion.trim()
      const invoicePostalCode = application.invoicePostalCode.trim()
      const invoiceAddressLine1 = application.invoiceAddressLine1.trim()
      const yearsInBusiness = String(application.yearsInBusiness || '').trim()
      const distributionCountryInterests = String(application.distributionCountryInterests || '').trim()

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
        ['contact name', application.contactName],
        ['contact email', application.contactEmail],
        ['phone', application.phone],
        ['shipping type', application.shippingType],
        ['invoice address line 1', invoiceAddressLine1],
        ['invoice area/city', invoiceArea],
        ['invoice region/state', invoiceRegion],
        ['invoice country', invoiceCountry],
        ['invoice postal code', invoicePostalCode],
      ]

      if (isDistributorApplication || isBusinessOrder) {
        requiredFields.push(['VAT number', application.vatNumber])
      }

      if (isDistributorApplication) {
        requiredFields.push(
          ['business type', application.businessType],
          ['years in business', yearsInBusiness],
          ['distribution country interests', distributionCountryInterests],
        )
      }

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

      const submissionStatus = isDistributorApplication ? 'pending' : 'submitted'
      const derivedBusinessType = isDistributorApplication
        ? application.businessType.trim()
        : `B2B Order - ${isBusinessOrder ? 'Business' : 'Personal'}`

      const notesSections = [
        `[APPLICATION_TYPE:${isDistributorApplication ? 'distributor' : 'b2b_order'}]`,
        `[ORDER_PROFILE:${isBusinessOrder ? 'business' : 'personal'}]`,
      ]

      if (isDistributorApplication) {
        notesSections.push(
          `Years in business: ${yearsInBusiness}`,
          `Distribution country interests: ${distributionCountryInterests}`,
        )
      }

      if (application.notes?.trim()) {
        notesSections.push(`Additional notes: ${application.notes.trim()}`)
      }

      const payload = {
        customer_type: application.customerType.trim(),
        company_name: application.companyName.trim(),
        vat_number: application.vatNumber.trim() || null,
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
        business_type: derivedBusinessType,
        application_type: isDistributorApplication ? 'distributor' : 'b2b_order',
        order_profile: isBusinessOrder ? 'business' : 'personal',
        admin_comment: null,
        order_action: null,
        order_payment_status: isDistributorApplication ? null : 'unpaid',
        order_shipping_status: isDistributorApplication ? null : 'not_ready',
        tracking_number: null,
        tracking_url: null,
        action_updated_at: null,
        action_updated_by: null,
        notes: notesSections.join('\n'),
        status: submissionStatus,
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

      const inboxNotificationResult = await sendPortalEmailNotification({
        eventType: isDistributorApplication ? 'distributor_application_submitted' : 'b2b_order_request_submitted',
        to: ORDER_INBOX_EMAIL,
        subject: `${isDistributorApplication ? 'Distributor Application' : 'B2B Order Request'} #${createdApplication?.id} — ${payload.company_name}`,
        html: `<p>New ${isDistributorApplication ? 'distributor application' : 'B2B order request'} received.</p><p><strong>Application ID:</strong> ${createdApplication?.id}</p><p><strong>Company/Client:</strong> ${payload.company_name}</p><p><strong>Contact:</strong> ${payload.contact_name} (${payload.contact_email})</p><p><strong>Status:</strong> ${payload.status}</p><p><strong>Business Type:</strong> ${payload.business_type}</p><p><strong>VAT:</strong> ${payload.vat_number || '-'}</p><p><strong>Invoice Country:</strong> ${payload.invoice_country}</p>`,
        applicationId: createdApplication?.id,
        companyName: payload.company_name,
        contactName: payload.contact_name,
        status: payload.status,
      })

      const applicantNotificationResult = await sendPortalEmailNotification({
        eventType: 'application_received',
        to: payload.contact_email,
        subject: `${isDistributorApplication ? 'Distributor application received' : 'B2B order request received'}: ${payload.company_name}`,
        html: isDistributorApplication
          ? `<p>Hello ${payload.contact_name},</p><p>Welcome to <strong>GEL.IT.UP by GIUP®</strong>.</p><p>Thank you for submitting your distributor information for <strong>${payload.company_name}</strong>.</p><p>Your submission has been sent to ${ORDER_INBOX_EMAIL}. You will soon receive an approval email confirming that you can log in to the portal.</p><p>Best regards,<br/>GEL.IT.UP Distribution Team</p>`
          : `<p>Hello ${payload.contact_name},</p><p>Thank you for your B2B order request for <strong>${payload.company_name}</strong>.</p><p>Your request has been sent to ${ORDER_INBOX_EMAIL} and stored in our admin portal for processing.</p><p>Best regards,<br/>GEL.IT.UP Distribution Team</p>`,
        applicationId: createdApplication?.id,
        companyName: payload.company_name,
        contactName: payload.contact_name,
      })

      if (!applicantNotificationResult.ok && !applicantNotificationResult.skipped) {
        return {
          ok: true,
          message: `Submission stored, but confirmation email failed: ${applicantNotificationResult.message}`,
        }
      }

      if (!inboxNotificationResult.ok && !inboxNotificationResult.skipped) {
        return {
          ok: true,
          message: `Submission stored, but inbox notification failed: ${inboxNotificationResult.message}`,
        }
      }

      if (applicantNotificationResult.skipped || inboxNotificationResult.skipped) {
        return {
          ok: true,
          message: 'Submission stored. Email webhook is not configured yet.',
        }
      }

      return {
        ok: true,
        message: isDistributorApplication
          ? `Distributor application submitted, sent to ${ORDER_INBOX_EMAIL}, and queued for admin approval.`
          : `B2B order request submitted, sent to ${ORDER_INBOX_EMAIL}, and stored in admin submissions.`,
      }
    }

    const missingEnvVars = [
      !import.meta.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : null,
      !import.meta.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : null,
    ].filter(Boolean)

    return {
      ok: false,
      message: missingEnvVars.length
        ? `Live registration is not configured. Missing env: ${missingEnvVars.join(', ')}`
        : 'Live registration is not configured.',
    }
  }

  const handleSubmitContactRequest = async () => {
    const contactName = String(contactRequestForm.name || '').trim()
    const contactEmail = String(contactRequestForm.email || '').trim().toLowerCase()
    const contactPhone = String(contactRequestForm.phone || '').trim()

    if (!contactName || !contactEmail || !contactPhone) {
      setContactRequestError('Name, email address, and contact number are required.')
      return
    }

    if (!hasSupabaseConfig || !supabase) {
      setContactRequestError('Contact form is unavailable because portal storage is not configured.')
      return
    }

    setIsSubmittingContactRequest(true)
    setContactRequestError('')
    setContactRequestMessage('')

    const payload = {
      customer_type: 'company',
      company_name: 'Contact Request',
      vat_number: 'N/A',
      contact_name: contactName,
      contact_email: contactEmail,
      phone: contactPhone,
      shipping_type: 'road',
      address: 'N/A',
      city: 'N/A',
      postal_code: 'N/A',
      country: 'N/A',
      business_type: 'contact_request',
      application_type: 'contact_request',
      status: 'submitted',
      notes: '[CONTACT_REQUEST] Public contact modal submission.',
      order_profile: null,
      admin_comment: null,
      order_action: null,
      order_payment_status: null,
      order_shipping_status: null,
      tracking_number: null,
      tracking_url: null,
      action_updated_at: null,
      action_updated_by: null,
    }

    const { data: createdRequest, error } = await supabase
      .from(registrationsTable)
      .insert([payload])
      .select('id')
      .single()

    if (error) {
      setIsSubmittingContactRequest(false)
      setContactRequestError(error.message || 'Unable to save contact request.')
      return
    }

    const notificationResult = await sendPortalEmailNotification({
      eventType: 'contact_request_submitted',
      to: CONTACT_INBOX_EMAIL,
      subject: `Contact Request #${createdRequest?.id} — ${contactName}`,
      html: `<p>New contact request submitted.</p><p><strong>Request ID:</strong> ${createdRequest?.id}</p><p><strong>Name:</strong> ${contactName}</p><p><strong>Email:</strong> ${contactEmail}</p><p><strong>Phone:</strong> ${contactPhone}</p>`,
      applicationId: createdRequest?.id,
      contactName,
      status: 'submitted',
    })

    setIsSubmittingContactRequest(false)

    if (!notificationResult.ok && !notificationResult.skipped) {
      setContactRequestError(`Request saved, but notification email failed: ${notificationResult.message}`)
      return
    }

    setContactRequestMessage(`Thanks. Your message has been submitted and sent to ${CONTACT_INBOX_EMAIL}.`)
    setContactRequestForm({ name: '', email: '', phone: '' })
  }

  const handleResendConfirmation = async (email) => {
    if (!email) {
      return { ok: false, message: 'Enter your email first.' }
    }

    return { ok: false, message: 'Email confirmation is disabled. Use Forgot password if you need to reset access.' }
  }

  const handleCheckApproval = async (email) => {
    if (!email) {
      return { ok: false, message: 'Enter your business email first.' }
    }

    if (!hasSupabaseConfig || !supabase) {
      return { ok: false, message: 'Live auth is not configured.' }
    }

    const normalizedEmail = email.trim().toLowerCase()

    const registrationResult = await fetchLatestRegistrationByEmail(normalizedEmail, 'status, notes')
    const error = registrationResult.error

    if (error) {
      return { ok: false, message: error.message }
    }

    const latestRegistration = registrationResult.data || null
    if (!latestRegistration) {
      return { ok: true, applicationStatus: 'pending' }
    }

    const status = String(latestRegistration?.status || '').trim().toLowerCase() || 'pending'
    const applicationType = getApplicationTypeFromRecord(latestRegistration)
    const isDistributorRegistration = applicationType === 'distributor'

    if (!isDistributorRegistration) {
      return { ok: true, applicationStatus: 'approved' }
    }

    return { ok: true, applicationStatus: status }
  }

  const handlePortalLogout = async () => {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut()
    }

    setIsPortalAuthenticated(false)
    localStorage.removeItem('portalAuth')
  }

  const isPortalRoute = location.pathname.startsWith('/portal') || location.pathname === '/admin-login'

  return (
    <div className="lux-theme min-h-screen pb-24 md:pb-8">
      <ScrollToTopOnRouteChange />
      <header className="sticky top-0 z-40 border-b border-white/15 bg-black/80 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 md:px-6 md:py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-white/25 bg-white/95 px-2 md:h-11 md:w-[72px]">
              <img src={appLogo} alt="GEL.IT.UP by GIUP® logo" className="max-h-6 w-auto object-contain md:max-h-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase leading-none tracking-[0.07em] text-white md:text-sm md:tracking-[0.08em]">GEL.IT.UP</p>
              <p className="text-[11px] text-white/65 md:text-xs">Distributor Website</p>
            </div>
          </div>
          <Nav />
        </div>
      </header>

      <main className={`mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-10 ${isPortalRoute ? 'portal-luxe' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={<HomePage />}
          />
          <Route path="/home" element={<HomePage />} />
          <Route
            path="/about-us"
            element={<Navigate to="/pages/about-us" replace />}
          />
          <Route path="/our-products" element={<Navigate to="/distributor-packages" replace />} />
          <Route
            path="/distributors"
            element={<DistributorsPage />}
          />

          <Route path="/products" element={<Navigate to="/distributor-packages" replace />} />
          <Route path="/distributor-packages" element={<DistributorPackagesPage />} />
          <Route path="/full-catalogue" element={<FullCataloguePage />} />
          <Route path="/admin/missing-images" element={<MissingImagesReport />} />
          <Route path="/catalogue" element={<Navigate to="/full-catalogue" replace />} />
          <Route path="/packages" element={<Navigate to="/distributor-packages" replace />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
          <Route path="/certifications" element={<HomePage />} />
          <Route path="/contact" element={<Navigate to="/become-distributor" replace />} />
          <Route path="/baseline" element={<Navigate to="/" replace />} />
          <Route path="/baseline/:slug" element={<Navigate to="/" replace />} />

          <Route path="/application-services" element={<Navigate to="/become-distributor" replace />} />
          <Route path="/application-services/*" element={<Navigate to="/become-distributor" replace />} />
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
                      onCheckApproval={handleCheckApproval}
                      onCreatePassword={handleCreatePortalPassword}
                    />
                  )}
                />
                <Route
                  path="/portal/admin-login"
                  element={<PortalAdminLogin onAdminLogin={handleAdminLogin} onAdminCreatePassword={handleCreateAdminPassword} />}
                />
                <Route
                  path="/portal/admin-login/*"
                  element={<PortalAdminLogin onAdminLogin={handleAdminLogin} onAdminCreatePassword={handleCreateAdminPassword} />}
                />
                <Route path="/admin-login" element={<Navigate to="/portal/admin-login" replace />} />
                <Route path="/portal-client-login" element={<Navigate to="/portal/login" replace />} />
                <Route path="/portal-admin-login" element={<Navigate to="/portal/admin-login" replace />} />
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
            <p className="mt-2 text-sm font-semibold text-white">GEL.IT.UP by GIUP® Professional</p>
            <p className="mt-1">Global Professional Distribution Network</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Contact</p>
            <p className="mt-2">Phone: {PROFORMA_LEEUKOPF_PHONE}</p>
            <p className="mt-1">Email: {CONTACT_INBOX_EMAIL}</p>
            <p className="mt-1">Orders: {B2B_EMAIL}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Menu</p>
            <div className="mt-2 space-y-1.5">
              <NavLink to="/" className="block transition duration-300 hover:text-fuchsia-300">Home</NavLink>
              <NavLink to="/about-us" className="block transition duration-300 hover:text-fuchsia-300">About Us</NavLink>
              <NavLink to="/full-catalogue" className="block transition duration-300 hover:text-fuchsia-300">Catalogue</NavLink>
              <NavLink to="/distributor-packages" className="block transition duration-300 hover:text-fuchsia-300">Distribution Options</NavLink>
              <NavLink to="/become-distributor" className="block transition duration-300 hover:text-fuchsia-300">Become Distributor</NavLink>
              <NavLink to="/become-distributor" className="block transition duration-300 hover:text-fuchsia-300">Client Registration</NavLink>
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

      {/* Floating social + back-to-top */}
      <div className="fixed bottom-20 right-3 z-50 flex flex-col items-center gap-2 md:bottom-6 md:right-4">
        {FOOTER_SOCIAL_LINKS.filter(s => ['tiktok','instagram','facebook'].includes(s.key)).map((social) => (
          <a
            key={social.key}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            aria-label={social.label}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-xl transition duration-300 hover:border-fuchsia-500 hover:bg-fuchsia-600 hover:text-white"
          >
            <FooterSocialIcon platform={social.key} />
          </a>
        ))}
        <button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-xl transition duration-300 hover:border-fuchsia-500 hover:bg-fuchsia-600 hover:text-white ${
            showBackToTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <MobileNav />
      <PWABadge />
    </div>
  )
}

export default App
