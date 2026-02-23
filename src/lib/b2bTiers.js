export const B2B_TIER_ENGINE = {
  salon: {
    key: 'salon',
    name: 'Salon',
    trigger: { minUnits: 20 },
    upsells: [
      {
        name: 'Professional System Essentials',
        basePrice: 79,
        discountPercent: 12,
        imageURL: '/gelitup_logo.png',
      },
    ],
  },
  distributor: {
    key: 'distributor',
    name: 'Distributor',
    trigger: { minUnits: 500 },
    upsells: [
      {
        name: 'Branded Display Stands',
        basePrice: 320,
        discountPercent: 30,
        imageURL: '/logo.png',
      },
      {
        name: 'Marketing Swatch Books',
        basePrice: 140,
        discountPercent: 22,
        imageURL: '/gelitup_logo.png',
      },
    ],
  },
  privateLabel: {
    key: 'privateLabel',
    name: 'Private Label',
    trigger: { role: 'manufacturer' },
    upsells: [
      {
        name: 'Label Compliance Review',
        basePrice: 590,
        discountPercent: 18,
        imageURL: '/leeukopf_black_logo.png',
      },
      {
        name: 'Bulk Packaging Fulfillment',
        basePrice: 980,
        discountPercent: 20,
        imageURL: '/leeukopf_black_logo.png',
      },
    ],
  },
}

export function normalizeRole(value) {
  return String(value || '').trim().toLowerCase()
}

export function resolveTierFromSignal({ totalItems = 0, userRole = '' }) {
  const role = normalizeRole(userRole)

  if (role.includes('manufacturer')) {
    return B2B_TIER_ENGINE.privateLabel
  }

  if (Number(totalItems) >= B2B_TIER_ENGINE.distributor.trigger.minUnits) {
    return B2B_TIER_ENGINE.distributor
  }

  if (Number(totalItems) >= B2B_TIER_ENGINE.salon.trigger.minUnits) {
    return B2B_TIER_ENGINE.salon
  }

  return null
}
