import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SocialProof from './SocialProof'
import {
  TRIAL_PACK_KEY,
  TRIAL_PACK_CODE,
  TRIAL_PACK_NAME,
  TRIAL_PACK_PRICE,
  TRIAL_PACK_LIST_PRICE,
  TRIAL_PACK_DESCRIPTION,
  TRIAL_PACK_CONTENTS,
} from '../data/trialPack.js'

const QUICK_CART_STORAGE_KEY = 'gelitup.catalogue.quick_cart.v1'

/**
 * HeroCTA
 *
 * Drop-in addition to the homepage hero section.
 * Adds a primary "Shop the catalogue" button and the social proof bar
 * below the existing hero paragraph.
 *
 * Usage — add directly after the existing hero <p> tag:
 *   <HeroCTA />
 */
export default function HeroCTA({ showTrialPack = false }) {
  const [quickCart, setQuickCart] = useState(() => {
    try {
      const saved = localStorage.getItem(QUICK_CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (!showTrialPack) return undefined
    try { localStorage.setItem(QUICK_CART_STORAGE_KEY, JSON.stringify(quickCart)) } catch { return undefined }
    window.dispatchEvent(new Event('gelitup:cart-change'))
    return undefined
  }, [quickCart, showTrialPack])

  useEffect(() => {
    if (!showTrialPack) return undefined
    const syncCart = () => {
      try {
        const saved = localStorage.getItem(QUICK_CART_STORAGE_KEY)
        setQuickCart(saved ? JSON.parse(saved) : {})
      } catch { return undefined }
    }
    window.addEventListener('gelitup:cart-change', syncCart)
    return () => window.removeEventListener('gelitup:cart-change', syncCart)
  }, [showTrialPack])

  const addQuickItem = () => {
    const qty = 1
    setQuickCart((current) => ({
      ...current,
      [TRIAL_PACK_KEY]: Number(current[TRIAL_PACK_KEY] || 0) + qty,
    }))
    if (window.gtag) {
      window.gtag('event', 'add_to_cart', { currency: 'EUR', items: [{ item_name: TRIAL_PACK_NAME, quantity: qty }] })
      window.gtag('event', 'conversion', { send_to: 'AW-1008159504/m23ACI_9w6oaEJCW3eAD', value: 1.0, currency: 'EUR' })
    }
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'add_to_cart',
      ecommerce: { currency: 'EUR', value: TRIAL_PACK_PRICE * qty, items: [{ item_id: TRIAL_PACK_CODE, item_name: TRIAL_PACK_NAME, price: TRIAL_PACK_PRICE, quantity: qty }] },
    })
  }

  return (
    <div style={{ marginTop: '24px' }}>
      {showTrialPack ? (
        <div className="rounded-2xl border-2 border-fuchsia-500/60 bg-gradient-to-r from-fuchsia-50 to-white p-4 text-black shadow-[0_4px_24px_rgba(212,55,144,0.18)]">
          <span className="inline-flex rounded-full bg-fuchsia-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Featured — Start Here
          </span>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-black uppercase">{TRIAL_PACK_NAME}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-black/65">{TRIAL_PACK_DESCRIPTION}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-black/45">
                Includes: {TRIAL_PACK_CONTENTS.join(' · ')}
              </p>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-xs text-black/40 line-through">€{TRIAL_PACK_LIST_PRICE.toFixed(2)}</span>
                <span className="text-lg font-bold text-fuchsia-700">€{TRIAL_PACK_PRICE.toFixed(2)}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                  Save €{(TRIAL_PACK_LIST_PRICE - TRIAL_PACK_PRICE).toFixed(2)}
                </span>
              </div>
            </div>
            <button type="button" onClick={addQuickItem} className="shrink-0 rounded-[10px] bg-fuchsia-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-fuchsia-500">
              + Add Trial Pack to Cart
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-black/55">
            <Link to="/full-catalogue" className="text-fuchsia-700 hover:underline">Browse full catalogue</Link>
            <Link to="/portal/register" className="text-fuchsia-700 hover:underline">Register for B2B pricing</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            to="/full-catalogue"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#D43790',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            Shop the Catalogue →
          </Link>

          <Link
            to="/distributor-packages"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              padding: '11px 20px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.35)',
              textDecoration: 'none',
            }}
          >
            Get B2B Pricing
          </Link>
        </div>
      )}

      {/* Social proof */}
      <SocialProof variant="hero" />

    </div>
  )
}
