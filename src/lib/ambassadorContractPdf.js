// Generates the GEL.IT.UP Ambassador Agreement as a professional PDF (English —
// the governing version of the contract). jsPDF is loaded lazily so it never
// weighs down the main bundle; the PDF is built on demand when a form is
// submitted or an application is approved.
//
// Returns { base64, filename } where base64 is the raw base64 (no data: prefix),
// ready to hand to the email webhook as an attachment.
//
// In the browser the logo is fetched from /logo.png automatically. A caller may
// also pass { logoBase64 } (raw PNG base64) to supply it directly (used by the
// preview script / non-browser environments).

import { AGREEMENT_SECTIONS, AGREEMENT_VERSION } from '../data/ambassadorAgreement.js'
import { resolveContractLang } from '../data/ambassadorContractI18n.js'
import { AGREEMENT_I18N } from '../data/ambassadorAgreementI18n.js'

// ── Company letterhead details — edit freely. ──
export const CONTRACT_COMPANY = {
  brand: 'Thermitek Ltd — GEL.IT.UP by GIUP®',
  addressLine: '8 Racho Dimchev, Sofia, Bulgaria, 2700   ·   VAT BG202102027',
  contactLine: 'info@gelitup.com   ·   gelitup.com',
  footer: 'Thermitek Ltd — GEL.IT.UP by GIUP® · VAT BG202102027 · Governed by the laws of Bulgaria.',
}

const PINK = [212, 55, 144]
const INK = [26, 26, 26]
const MUTED = [110, 110, 110]
const LOGO_RATIO = 1881 / 2481 // height / width of public/logo.png

// ── "About Us" creator brief — sent with the shipment/tracking email. Edit freely. ──
const BRIEF_TITLE = 'Before you film — a little about us'
const BRIEF_INTRO = 'Before filming your content, we’d like to give you a little background about who we are.'
const BRIEF_PARAS = [
  'GEL.IT.UP by GIUP® is our professional nail brand, trusted by nail technicians and distributors in many countries. Our focus is on developing high-quality products that combine performance, safety and innovation for professionals.',
  'Behind the brand is Leeukopf Laboratories, our manufacturing and research division — where our products are formulated, tested and manufactured. As well as producing the GEL.IT.UP range, we work with salons, educators, distributors and entrepreneurs to develop and manufacture their own private-label nail brands: everything from product development and colour creation to packaging and regulatory support.',
  'The purpose of this collaboration is to introduce your audience not only to our products, but also to the people and expertise behind them.',
]
const BRIEF_ASK = 'During your unboxing, it would be great if you could briefly mention that GEL.IT.UP is our professional nail brand and that Leeukopf Laboratories is the manufacturer behind it — helping create both our own collections and brands for customers around the world.'
const BRIEF_OUTRO = 'Please don’t feel you have to use these exact words — what matters most is that you explain it naturally, in your own style and personality.'

async function resolveLogo(logoBase64) {
  if (logoBase64) return logoBase64
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    try {
      const res = await fetch('/logo.png')
      const bytes = new Uint8Array(await res.arrayBuffer())
      let bin = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
      }
      return btoa(bin)
    } catch { return null }
  }
  return null
}

// ── Unicode font embedding ──
// jsPDF's built-in fonts only cover WinAnsi (Latin-1), so Greek, Cyrillic and
// Latin-Extended characters (Polish, Romanian, Hungarian…) render as garbage.
// We embed DejaVu Sans (public/fonts) so the contract is readable in every
// supported language. Cached across calls; falls back to helvetica if the
// files can't be fetched (e.g. non-browser build/prerender — no PDFs there).
let _pdfFontCache = null

async function fetchFontBase64(url) {
  if (typeof fetch !== 'function') return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    let bin = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
    }
    return btoa(bin)
  } catch { return null }
}

// Registers DejaVu Sans (normal + bold) on the doc and returns the family name
// to use, or 'helvetica' if the font could not be loaded.
async function registerUnicodeFont(doc) {
  try {
    if (!_pdfFontCache) {
      const [reg, bold] = await Promise.all([
        fetchFontBase64('/fonts/DejaVuSans.ttf'),
        fetchFontBase64('/fonts/DejaVuSans-Bold.ttf'),
      ])
      if (!reg) return 'helvetica'
      _pdfFontCache = { reg, bold }
    }
    doc.addFileToVFS('DejaVuSans.ttf', _pdfFontCache.reg)
    doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal')
    if (_pdfFontCache.bold) {
      doc.addFileToVFS('DejaVuSans-Bold.ttf', _pdfFontCache.bold)
      doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold')
    } else {
      doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'bold')
    }
    return 'DejaVuSans'
  } catch { return 'helvetica' }
}

export async function buildAmbassadorContractPdf(applicant = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  // Embed a Unicode font so Greek, Cyrillic and Latin-Extended languages
  // (Polish, Romanian, Hungarian…) render correctly; falls back to helvetica.
  const FONT = await registerUnicodeFont(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentW = pageW - margin * 2
  let y = margin

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin - 28) {
      doc.addPage()
      y = margin
    }
  }

  // ── Letterhead: logo + company details (reused per page) ──
  const logo = await resolveLogo(applicant.logoBase64)
  const renderLetterhead = () => {
    if (logo) {
      const logoW = 96
      const logoH = logoW * LOGO_RATIO
      try {
        doc.addImage(`data:image/png;base64,${logo}`, 'PNG', (pageW - logoW) / 2, y, logoW, logoH, undefined, 'FAST')
        y += logoH + 6
      } catch { /* fall through without logo */ }
    } else {
      doc.setFont(FONT, 'bold')
      doc.setFontSize(18)
      doc.setTextColor(...INK)
      doc.text(CONTRACT_COMPANY.brand, pageW / 2, y + 14, { align: 'center' })
      y += 30
    }
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(CONTRACT_COMPANY.addressLine, pageW / 2, y, { align: 'center' })
    y += 12
    doc.text(CONTRACT_COMPANY.contactLine, pageW / 2, y, { align: 'center' })
    y += 16
    doc.setDrawColor(...PINK)
    doc.setLineWidth(1.2)
    doc.line(margin, y, pageW - margin, y)
    y += 22
  }

  // ── Full translated agreement in the ambassador's language (English governs) ──
  // The complete contract is rendered in the applicant's language first, then the
  // English governing version follows on a fresh page. Translations are drafts —
  // only the English version is authoritative (see ambassadorAgreementI18n.js).
  const lang = resolveContractLang(applicant.lang, applicant.country)
  const tr = lang !== 'en' ? AGREEMENT_I18N[lang] : null
  if (tr) {
    renderLetterhead()
    doc.setFont(FONT, 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...INK)
    doc.text(tr.title || 'Ambassador Agreement', margin, y)
    y += 14
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    const subtitle = doc.splitTextToSize(tr.referenceNote, contentW)
    doc.text(subtitle, margin, y)
    y += subtitle.length * 11 + 12

    // Translated sections — mirrors the English AGREEMENT_SECTIONS layout.
    tr.sections.forEach((section) => {
      ensureSpace(28)
      doc.setFont(FONT, 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...INK)
      doc.text(section.heading, margin, y)
      y += 13
      doc.setFont(FONT, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      section.points.forEach((point) => {
        const lines = doc.splitTextToSize(`•  ${point}`, contentW - 6)
        ensureSpace(lines.length * 11 + 4)
        doc.text(lines, margin + 4, y)
        y += lines.length * 11 + 3
      })
      y += 6
    })

    if (tr.governingNote) {
      ensureSpace(30)
      y += 4
      doc.setFont(FONT, 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...MUTED)
      const govLines = doc.splitTextToSize(tr.governingNote, contentW)
      doc.text(govLines, margin, y)
    }

    doc.addPage()
    y = margin
  }

  // ── English governing agreement ──
  renderLetterhead()

  // ── Title ──
  doc.setFont(FONT, 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...INK)
  doc.text('Ambassador Agreement', margin, y)
  y += 13
  doc.setFont(FONT, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(`Version ${AGREEMENT_VERSION} — English (governing version)`, margin, y)
  y += 16

  // ── Applicant / signature block ──
  const boxLines = [
    ['Name (electronic signature)', applicant.fullName || '—'],
    ['Email', applicant.email || '—'],
    ['Phone', applicant.phone || '—'],
    ['Instagram', applicant.instagram ? `@${applicant.instagram}` : '—'],
    ['TikTok', applicant.tiktok ? `@${applicant.tiktok}` : '—'],
    ['Qualified nail technician', applicant.qualifiedTech ? 'Yes' : (applicant.qualifiedTech === false ? 'No' : '—')],
    ['Shows own work on profile', applicant.workShown ? 'Yes' : (applicant.workShown === false ? 'No' : '—')],
    ['More than 500 followers', applicant.followersOver500 ? 'Yes' : (applicant.followersOver500 === false ? 'No' : '—')],
    ['Shipping address', applicant.address || '—'],
    ['Signed on', applicant.signedDate || '—'],
  ]
  const boxPad = 9
  const rowH = 13
  const labelW = 175
  const valueX = margin + boxPad + labelW
  const valueW = contentW - boxPad * 2 - labelW
  doc.setFontSize(8.5)
  const wrapped = boxLines.map(([label, value]) => {
    doc.setFont(FONT, 'bold')
    const labelLines = doc.splitTextToSize(String(label).toUpperCase(), labelW - 4)
    doc.setFont(FONT, 'normal')
    const valueLines = doc.splitTextToSize(String(value), valueW)
    return { labelLines, valueLines }
  })
  const totalRows = wrapped.reduce((n, r) => n + Math.max(r.labelLines.length, r.valueLines.length), 0)
  const boxH = boxPad * 2 + totalRows * rowH
  ensureSpace(boxH + 10)
  doc.setDrawColor(228, 228, 228)
  doc.setLineWidth(0.6)
  doc.setFillColor(249, 249, 249)
  doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'FD')
  let by = y + boxPad + 10
  wrapped.forEach(({ labelLines, valueLines }) => {
    doc.setFont(FONT, 'bold')
    doc.setTextColor(...MUTED)
    doc.text(labelLines, margin + boxPad, by)
    doc.setFont(FONT, 'normal')
    doc.setTextColor(...INK)
    doc.text(valueLines, valueX, by)
    by += Math.max(labelLines.length, valueLines.length) * rowH
  })
  y += boxH + 14

  // ── Agreement sections ──
  AGREEMENT_SECTIONS.forEach((section) => {
    ensureSpace(28)
    doc.setFont(FONT, 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...INK)
    doc.text(section.heading, margin, y)
    y += 13
    doc.setFont(FONT, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    section.points.forEach((point) => {
      const lines = doc.splitTextToSize(`•  ${point}`, contentW - 6)
      ensureSpace(lines.length * 11 + 4)
      doc.text(lines, margin + 4, y)
      y += lines.length * 11 + 3
    })
    y += 6
  })

  // ── Signature confirmation ──
  ensureSpace(46)
  y += 6
  doc.setDrawColor(228, 228, 228)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageW - margin, y)
  y += 16
  doc.setFont(FONT, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  const confirm = doc.splitTextToSize(
    `Signed electronically by ${applicant.fullName || '—'} on ${applicant.signedDate || '—'} by submitting the ambassador application at gelitup.com/ambassadors. This English version is the governing version of the agreement.`,
    contentW,
  )
  doc.text(confirm, margin, y)

  // ── Page footers (company line + page numbers) ──
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(235, 235, 235)
    doc.setLineWidth(0.5)
    doc.line(margin, pageH - 34, pageW - margin, pageH - 34)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    // Constrain the footer so it can never run into the page number on the right.
    const footerLine = doc.splitTextToSize(CONTRACT_COMPANY.footer, contentW - 60)[0]
    doc.text(footerLine, margin, pageH - 22)
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 22, { align: 'right' })
  }

  const safeName = String(applicant.fullName || 'applicant').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'applicant'
  const filename = `GELITUP-Ambassador-Agreement-${safeName}.pdf`

  const dataUri = doc.output('datauristring')
  const base64 = dataUri.includes('base64,') ? dataUri.split('base64,')[1] : ''

  return { base64, filename, pages: doc.getNumberOfPages() }
}

// "About Us" creator brief letter — attached to the shipment/tracking email.
export async function buildAmbassadorBriefPdf(applicant = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentW = pageW - margin * 2
  let y = margin

  const ensureSpace = (needed) => { if (y + needed > pageH - margin - 30) { doc.addPage(); y = margin } }
  const para = (text, size = 10, gap = 9, color = [55, 55, 55]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, contentW)
    ensureSpace(lines.length * (size + 3.5))
    doc.text(lines, margin, y)
    y += lines.length * (size + 3.5) + gap
  }

  // Letterhead
  const logo = await resolveLogo(applicant.logoBase64)
  if (logo) {
    const logoW = 96
    const logoH = logoW * LOGO_RATIO
    try {
      doc.addImage(`data:image/png;base64,${logo}`, 'PNG', (pageW - logoW) / 2, y, logoW, logoH, undefined, 'FAST')
      y += logoH + 6
    } catch { /* skip logo */ }
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(CONTRACT_COMPANY.addressLine, pageW / 2, y, { align: 'center' })
  y += 12
  doc.text(CONTRACT_COMPANY.contactLine, pageW / 2, y, { align: 'center' })
  y += 16
  doc.setDrawColor(...PINK)
  doc.setLineWidth(1.2)
  doc.line(margin, y, pageW - margin, y)
  y += 22

  // Title + greeting
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...INK)
  doc.text(BRIEF_TITLE, margin, y)
  y += 20
  if (applicant.fullName) para(`Hi ${String(applicant.fullName).split(' ')[0]},`, 10.5, 9, INK)

  para(BRIEF_INTRO, 10, 9, INK)
  BRIEF_PARAS.forEach((p) => para(p))

  // Highlighted "please mention" box
  doc.setFontSize(9.5)
  const boxLines = doc.splitTextToSize(BRIEF_ASK, contentW - 24)
  const boxH = 20 + boxLines.length * 13 + 12
  ensureSpace(boxH + 8)
  doc.setFillColor(250, 237, 246)
  doc.setDrawColor(...PINK)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PINK)
  doc.text('DURING YOUR UNBOXING, PLEASE MENTION', margin + 12, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(60, 60, 60)
  doc.text(boxLines, margin + 12, y + 32)
  y += boxH + 14

  para(BRIEF_OUTRO, 10, 10)
  para('Thank you — we can’t wait to see what you create!\nThe GEL.IT.UP Team', 10, 0, INK)

  // Footer
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(235, 235, 235)
    doc.setLineWidth(0.5)
    doc.line(margin, pageH - 34, pageW - margin, pageH - 34)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    const footerLine = doc.splitTextToSize(CONTRACT_COMPANY.footer, contentW - 60)[0]
    doc.text(footerLine, margin, pageH - 22)
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 22, { align: 'right' })
  }

  const safe = String(applicant.fullName || 'ambassador').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'ambassador'
  const filename = `GELITUP-About-Us-${safe}.pdf`
  const dataUri = doc.output('datauristring')
  const base64 = dataUri.includes('base64,') ? dataUri.split('base64,')[1] : ''
  return { base64, filename, pages: doc.getNumberOfPages() }
}

// Personalised "Welcome to the family!" letter sent inside the PR/sample box.
// Replaces the static PDF that had [name] and [discount code] placeholders.
export async function buildAmbassadorWelcomeLetterPdf(applicant = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentW = pageW - margin * 2
  let y = margin

  const ensureSpace = (needed) => { if (y + needed > pageH - margin - 30) { doc.addPage(); y = margin } }
  const para = (text, size = 10, gap = 9, color = [55, 55, 55]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, contentW)
    ensureSpace(lines.length * (size + 3.5))
    doc.text(lines, margin, y)
    y += lines.length * (size + 3.5) + gap
  }
  const boldPara = (label, rest, size = 10, gap = 9) => {
    doc.setFontSize(size)
    doc.setTextColor(...INK)
    const labelLines = doc.splitTextToSize(label, contentW)
    ensureSpace(labelLines.length * (size + 3.5))
    doc.setFont('helvetica', 'bold')
    doc.text(labelLines, margin, y)
    const labelW = doc.getTextWidth(label.split('\n')[0])
    if (rest) {
      doc.setFont('helvetica', 'normal')
      const restLines = doc.splitTextToSize(rest, contentW - labelW - 4)
      doc.text(restLines, margin + labelW + 4, y)
      y += Math.max(labelLines.length, restLines.length) * (size + 3.5) + gap
    } else {
      y += labelLines.length * (size + 3.5) + gap
    }
  }

  const firstName = String(applicant.fullName || '').trim().split(' ')[0] || 'Ambassador'
  const discountCode = String(applicant.discountCode || '').trim()

  // Letterhead
  const logo = await resolveLogo(applicant.logoBase64)
  if (logo) {
    const logoW = 96
    const logoH = logoW * LOGO_RATIO
    try {
      doc.addImage(`data:image/png;base64,${logo}`, 'PNG', (pageW - logoW) / 2, y, logoW, logoH, undefined, 'FAST')
      y += logoH + 6
    } catch { /* skip logo */ }
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(CONTRACT_COMPANY.addressLine, pageW / 2, y, { align: 'center' })
  y += 12
  doc.text(CONTRACT_COMPANY.contactLine, pageW / 2, y, { align: 'center' })
  y += 16
  doc.setDrawColor(...PINK)
  doc.setLineWidth(1.2)
  doc.line(margin, y, pageW - margin, y)
  y += 22

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text('Welcome to the family!', margin, y)
  y += 26

  // Greeting
  para(`Dear ${firstName},`, 10.5, 10, INK)

  // Intro
  para('Welcome to the GEL.IT.UP Ambassador family! We\'re so excited to have you on board, and even more excited for you to open your first box.', 10, 10)

  // Unboxing heading
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.text('Before you dive in, here\'s how to make the most of your unboxing:', margin, y)
  y += 16

  // Unboxing steps
  const steps = [
    ['1. Film before you open it.', '  Start recording before you cut the tape — the reveal is the best part, and your audience will want to see it too.'],
    ['2. Show every piece.', '  Take a moment to show off each shade and product clearly — good lighting works best.'],
    ['3. Share your first impressions.', '  Tell your audience what you\'re most excited to try first.'],
    ['4. Use your code' + (discountCode ? ` ${discountCode}.` : '.'), '  Your personal discount code is included in this box — share it with your followers for 20% off. Please note that the discount code is only valid for www.gelitup.com and should not be shared publicly but on private messages to your subscribers / followers.'],
    ['5. Post it.', '  Share your unboxing on Instagram or TikTok.'],
  ]
  steps.forEach(([label, rest]) => boldPara(label, rest, 10, 10))

  y += 4
  // Highlighted reminder box
  doc.setFontSize(9.5)
  const dontForgetLines = doc.splitTextToSize('DON\'T FORGET — tag us @gelitup and use the hashtag #gelitup so we can share your content with our community!', contentW - 24)
  const boxH = 20 + dontForgetLines.length * 13 + 12
  ensureSpace(boxH + 8)
  doc.setFillColor(250, 237, 246)
  doc.setDrawColor(...PINK)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PINK)
  doc.text('DON\'T FORGET', margin + 12, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(60, 60, 60)
  doc.text(dontForgetLines, margin + 12, y + 32)
  y += boxH + 18

  // Sign-off
  para(`Welcome to the family, ${firstName}. We can't wait to see what you create.`, 10, 6, INK)
  para('With love,\nThe GEL.IT.UP Team', 10, 0, INK)

  // Footer
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(235, 235, 235)
    doc.setLineWidth(0.5)
    doc.line(margin, pageH - 34, pageW - margin, pageH - 34)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(150, 150, 150)
    const footerLine = doc.splitTextToSize(CONTRACT_COMPANY.footer, contentW - 60)[0]
    doc.text(footerLine, margin, pageH - 22)
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 22, { align: 'right' })
  }

  const safe = String(applicant.fullName || 'ambassador').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'ambassador'
  const filename = `GELITUP-Welcome-Letter-${safe}.pdf`
  const dataUri = doc.output('datauristring')
  const base64 = dataUri.includes('base64,') ? dataUri.split('base64,')[1] : ''
  return { base64, filename, pages: doc.getNumberOfPages() }
}

export async function buildAmbassadorFactoryPrepPdf({ ambassadors = [], generatedAt = new Date().toISOString() } = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const FONT = await registerUnicodeFont(doc)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 42
  const contentW = pageW - margin * 2
  let y = margin

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const printLabelValue = (label, value) => {
    doc.setFont(FONT, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(label, margin + 10, y)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    const wrapped = doc.splitTextToSize(String(value || '—'), contentW - 110)
    doc.text(wrapped, margin + 95, y)
    y += Math.max(14, wrapped.length * 12)
  }

  doc.setFont(FONT, 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text('GEL.IT.UP Ambassador Factory Prep List', margin, y)
  y += 24
  doc.setFont(FONT, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text(`Generated: ${new Date(generatedAt).toLocaleString()}`, margin, y)
  y += 14
  doc.text(`Approved ambassadors included: ${ambassadors.length}`, margin, y)
  y += 18
  doc.setDrawColor(...PINK)
  doc.setLineWidth(0.9)
  doc.line(margin, y, pageW - margin, y)
  y += 16

  ambassadors.forEach((ambassador, idx) => {
    const items = Array.isArray(ambassador?.packItems) ? ambassador.packItems : []
    let estimatedHeight = 128 + (items.length > 0 ? items.length * 13 : 14)
    if (estimatedHeight < 170) estimatedHeight = 170
    ensureSpace(estimatedHeight + 10)

    doc.setDrawColor(228, 228, 233)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, y, contentW, estimatedHeight, 8, 8, 'FD')
    y += 18

    doc.setFont(FONT, 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(`${idx + 1}. ${ambassador?.fullName || 'Unknown ambassador'}`, margin + 10, y)
    y += 16

    const subtitleBits = [
      ambassador?.packTitle ? `Pack: ${ambassador.packTitle}` : '',
      ambassador?.discountCode ? `Code: ${ambassador.discountCode}` : '',
      ambassador?.instagram ? `@${String(ambassador.instagram).replace(/^@+/, '')}` : '',
    ].filter(Boolean)
    if (subtitleBits.length > 0) {
      doc.setFont(FONT, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      const subtitle = doc.splitTextToSize(subtitleBits.join('  •  '), contentW - 20)
      doc.text(subtitle, margin + 10, y)
      y += subtitle.length * 11 + 4
    }

    printLabelValue('Address', ambassador?.address || 'Address not provided')
    printLabelValue('Email', ambassador?.email || '—')

    doc.setFont(FONT, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text('Kit items', margin + 10, y)
    y += 13
    doc.setFont(FONT, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    if (items.length === 0) {
      const fallback = doc.splitTextToSize('Ambassador package type is not set yet. Assign type in Admin before shipment.', contentW - 35)
      doc.text(fallback, margin + 22, y)
      y += fallback.length * 12
    } else {
      items.forEach((item) => {
        const wrapped = doc.splitTextToSize(String(item || ''), contentW - 35)
        doc.text(`• ${wrapped[0] || ''}`, margin + 22, y)
        y += 12
        for (let i = 1; i < wrapped.length; i += 1) {
          doc.text(wrapped[i], margin + 32, y)
          y += 12
        }
      })
    }

    y += 14
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(235, 235, 235)
    doc.setLineWidth(0.5)
    doc.line(margin, pageH - 28, pageW - margin, pageH - 28)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`Page ${page} of ${pageCount}`, pageW - margin, pageH - 14, { align: 'right' })
  }

  const datePart = String(generatedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
  const filename = `GELITUP-Ambassador-Factory-Prep-${datePart}.pdf`
  const blob = doc.output('blob')
  return { blob, filename, count: ambassadors.length, pages: pageCount }
}
