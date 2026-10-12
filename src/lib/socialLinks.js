// Clean Instagram / TikTok handles as typed on the application form
// ("@name", "name ", full profile links with ?utm_source…, stray spaces)
// into a handle and a working profile link.

function cleanHandle(value, host) {
  let raw = String(value || '').trim()
  if (!raw) return ''
  const urlMatch = raw.match(new RegExp(`${host}\\.com/@?([^/?#\\s]+)`, 'i'))
  if (urlMatch) raw = urlMatch[1]
  return raw.replace(/^@+/, '').replace(/\s+/g, '').replace(/[/?#].*$/, '')
}

export function instagramHandle(value) {
  return cleanHandle(value, 'instagram')
}

export function instagramUrl(value) {
  const handle = instagramHandle(value)
  return handle ? `https://www.instagram.com/${encodeURIComponent(handle)}/` : ''
}

export function tiktokHandle(value) {
  return cleanHandle(value, 'tiktok')
}

export function tiktokUrl(value) {
  const handle = tiktokHandle(value)
  return handle ? `https://www.tiktok.com/@${encodeURIComponent(handle)}` : ''
}
