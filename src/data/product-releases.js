export const WINTER_VAULT_REVEAL_AT = '2026-09-01T00:00:00+03:00'

export const SPIRAL_SHIMMERS_PRODUCTS = Array.from({ length: 5 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return {
    code: `Spiral_shimmers_${number} -HTF`,
    name: `Spiral Shimmers ${number}`,
    imageUrl: `/gelitup-content/product-images/COLORS/SPIRAL SHIMMERS/spiral_shimmers_${number}.webp`,
  }
})

export function isWinterVaultOpen(now = Date.now()) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now)
  return timestamp >= new Date(WINTER_VAULT_REVEAL_AT).getTime()
}

export function isSpiralShimmersProduct(...values) {
  return values.some((value) => /SPIRAL[\s_-]*SHIMMERS/i.test(String(value || '')))
}

export function filterReleaseGatedImageMap(payload, now = Date.now()) {
  if (!payload || typeof payload !== 'object' || isWinterVaultOpen(now)) return payload
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => !isSpiralShimmersProduct(key, value)),
  )
}
