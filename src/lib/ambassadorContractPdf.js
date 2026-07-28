// Generates the GEL.IT.UP® Ambassador Agreement as a professional PDF (English —
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
  brand: 'Thermitek Ltd — GEL.IT.UP® by GIUP®',
  addressLine: '8 Racho Dimchev, Sofia, Bulgaria, 2700   ·   VAT BG202102027',
  contactLine: 'info@gelitup.com   ·   gelitup.com',
  footer: 'Thermitek Ltd (GEL.IT.UP® by GIUP®) · VAT BG202102027 · 8 Racho Dimchev, Sofia, Bulgaria, 2700. This agreement is governed by the laws of Bulgaria.',
}

const PINK = [212, 55, 144]
const INK = [26, 26, 26]
const MUTED = [110, 110, 110]
const LOGO_RATIO = 1881 / 2481 // height / width of public/logo.png

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
    ['Instagram following', applicant.followers || '—'],
    ['Professional nail technician', applicant.isProfessional ? 'Yes' : (applicant.isProfessional === false ? 'No' : '—')],
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
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(CONTRACT_COMPANY.footer, margin, pageH - 22)
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 22, { align: 'right' })
  }

  const safeName = String(applicant.fullName || 'applicant').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'applicant'
  const filename = `GELITUP-Ambassador-Agreement-${safeName}.pdf`

  const dataUri = doc.output('datauristring')
  const base64 = dataUri.includes('base64,') ? dataUri.split('base64,')[1] : ''

  return { base64, filename, pages: doc.getNumberOfPages() }
}
