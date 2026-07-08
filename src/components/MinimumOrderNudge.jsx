import { Link } from 'react-router-dom'

/**
 * MinimumOrderNudge
 *
 * Two-stage nudge for the small-order shipping model:
 *   below `minimum`        — "Add €X more to place your order" (checkout locked)
 *   minimum → freeShippingAt — "Add €X more for FREE shipping" (fee applies now)
 *   at/above freeShippingAt  — renders nothing
 *
 * Props:
 *   currentTotal    — number, e.g. 27.80
 *   minimum         — number, checkout floor (default 49)
 *   freeShippingAt  — number, free-shipping threshold (default 100)
 *   shippingFee     — number|null, the fee that applies below freeShippingAt
 *                     for the buyer's country (null = unknown/not eligible)
 *   browseUrl       — string, default '/full-catalogue'
 */
export default function MinimumOrderNudge({
  currentTotal = 0,
  minimum = 49,
  freeShippingAt = 100,
  shippingFee = null,
  browseUrl = '/full-catalogue',
}) {
  if (currentTotal >= freeShippingAt) return null

  const belowMinimum = currentTotal < minimum
  const target = belowMinimum ? minimum : freeShippingAt
  const remaining = Math.max(0, target - currentTotal).toFixed(2)
  const percentFilled = Math.min(100, (currentTotal / target) * 100)

  // How many typical items would fill the gap?
  // Average gel polish ~€4.50 — gives a concrete, actionable number
  const AVG_ITEM_PRICE = 4.5
  const itemsNeeded = Math.ceil((target - currentTotal) / AVG_ITEM_PRICE)

  const headline = belowMinimum
    ? `Add €${remaining} more to place your order`
    : `Add €${remaining} more for FREE EU shipping${shippingFee != null ? ` — save the €${shippingFee.toFixed(2)} fee` : ''}`

  const body = belowMinimum
    ? `GEL.IT.UP has a €${minimum} minimum for wholesale orders. You're ${Math.round(percentFilled)}% there — roughly `
    : `Orders over €${freeShippingAt} ship free across the EU. You're ${Math.round(percentFilled)}% there — roughly `

  return (
    <div style={{
      border: '1px solid #D43790',
      borderRadius: '8px',
      padding: '16px 18px',
      marginBottom: '16px',
      background: '#fff8f9',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D43790" strokeWidth="2" aria-hidden="true">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a' }}>
          {headline}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '6px',
        background: '#f0f0f0',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '10px',
      }}>
        <div style={{
          height: '100%',
          width: `${percentFilled}%`,
          background: '#D43790',
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Actionable message */}
      <p style={{ fontSize: '13px', color: '#555', margin: '0 0 12px 0', lineHeight: 1.5 }}>
        {body}<strong>{itemsNeeded} more items</strong> like your current selection will get you there.
      </p>

      {/* CTA */}
      <Link
        to={browseUrl}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#D43790',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          padding: '8px 16px',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Browse catalogue to top up
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>
    </div>
  )
}
