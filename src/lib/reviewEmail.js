import { productUrl } from './reviewProducts.js'
import { reviewEmailText } from './reviewEmailText.js'

const escAmb = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// One email with every product she received, each with a button to its review
// form on shop.gelitup.com. The reviews are collected by Judge.me.
export function buildAmbassadorReviewRequestEmail(row, products, lang) {
  const t = reviewEmailText(lang || row?.language)
  const firstName = String(row?.full_name || '').trim().split(/\s+/)[0] || 'there'
  const name = firstName.charAt(0).toUpperCase() + firstName.slice(1)
  const cards = (products || []).map((p) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #e8e8e8">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="72" valign="middle" style="padding-right:14px">${p.image ? `<img src="${escAmb(`${p.image}${String(p.image).includes('?') ? '&' : '?'}width=200`)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e8e8e8"/>` : ''}</td>
          <td valign="middle" style="font-size:14px;color:#1a1a1a;font-weight:700">${escAmb(p.title)}</td>
          <td valign="middle" align="right" style="white-space:nowrap"><a href="${escAmb(productUrl(p.handle))}" style="display:inline-block;background:#d43790;color:#ffffff;padding:9px 14px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:13px">${t.button}</a></td>
        </tr></table>
      </td></tr>`).join('')
  return {
    subject: t.subject(name),
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#4a4a4a;line-height:1.6;max-width:600px">
      <p style="color:#1a1a1a">${t.hi(escAmb(name))}</p>
      <p>${t.thanks}</p>
      <p>${t.ask}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0">${cards}</table>
      <p style="background:#f8f8f6;border-left:3px solid #d43790;padding:10px 14px;margin:18px 0"><strong style="color:#1a1a1a">${t.howTitle}</strong> ${t.how(escAmb(row?.email || ''))}</p>
      <p>${t.gifted}</p>
      <p>${t.closing}</p>
      <p>${t.love}<br/>René Krallis<br/>Marketing Director, GEL.IT.UP International</p>
    </div>`,
  }
}

