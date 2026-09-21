import { useMemo } from 'react'
import { resolveTierFromSignal } from './b2bTiers'

function toMoney(value) {
  return Math.max(0, Number(value || 0))
}

export default function useB2BIntelligence({ cartTotalItems = 0, userRole = '' }) {
  return useMemo(() => {
    const activeTier = resolveTierFromSignal({
      totalItems: cartTotalItems,
      userRole,
    })

    if (!activeTier) {
      return {
        activeTier: null,
        recommendedProduct: null,
      }
    }

    const upsell = activeTier.upsells[0]
    const basePrice = toMoney(upsell.basePrice)
    const discountPercent = Number(upsell.discountPercent || 0)
    const tierOnlyPrice = Math.max(0, Number((basePrice * (1 - discountPercent / 100)).toFixed(2)))

    return {
      activeTier,
      recommendedProduct: {
        name: upsell.name,
        basePrice,
        discountPercent,
        tierOnlyPrice,
        imageURL: upsell.imageURL,
      },
    }
  }, [cartTotalItems, userRole])
}
