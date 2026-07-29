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

export async function buildAmbassadorContractPdf(applicant = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

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

  // ── Letterhead: logo + company details ──
  const logo = await resolveLogo(applicant.logoBase64)
  if (logo) {
    const logoW = 96
    const logoH = logoW * LOGO_RATIO
    try {
      doc.addImage(`data:image/png;base64,${logo}`, 'PNG', (pageW - logoW) / 2, y, logoW, logoH, undefined, 'FAST')
      y += logoH + 6
    } catch { /* fall through without logo */ }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...INK)
    doc.text(CONTRACT_COMPANY.brand, pageW / 2, y + 14, { align: 'center' })
    y += 30
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

  // ── Title ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...INK)
  doc.text('Ambassador Agreement', margin, y)
  y += 13
  doc.setFont('helvetica', 'normal')
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
  const labelW = 150
  const valueX = margin + boxPad + labelW
  const valueW = contentW - boxPad * 2 - labelW
  doc.setFontSize(8.5)
  const wrapped = boxLines.map(([label, value]) => ({ label, lines: doc.splitTextToSize(String(value), valueW) }))
  const totalRows = wrapped.reduce((n, r) => n + r.lines.length, 0)
  const boxH = boxPad * 2 + totalRows * rowH
  ensureSpace(boxH + 10)
  doc.setDrawColor(228, 228, 228)
  doc.setLineWidth(0.6)
  doc.setFillColor(249, 249, 249)
  doc.roundedRect(margin, y, contentW, boxH, 6, 6, 'FD')
  let by = y + boxPad + 10
  wrapped.forEach(({ label, lines }) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MUTED)
    doc.text(String(label).toUpperCase(), margin + boxPad, by)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(lines, valueX, by)
    by += lines.length * rowH
  })
  y += boxH + 14

  // ── Agreement sections ──
  AGREEMENT_SECTIONS.forEach((section) => {
    ensureSpace(28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...INK)
    doc.text(section.heading, margin, y)
    y += 13
    doc.setFont('helvetica', 'normal')
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
  doc.setFont('helvetica', 'normal')
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
    doc.setFont('helvetica', 'normal')
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
