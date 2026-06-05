import { Link } from 'react-router-dom'
import SocialProof from './SocialProof'

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
export default function HeroCTA() {
  return (
    <div style={{ marginTop: '24px' }}>

      {/* Primary CTA buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Link
          to="/distributor-packages"
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
          Get B2B Pricing →
        </Link>

        <Link
          to="/full-catalogue"
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
          Shop the Catalogue
        </Link>
      </div>

      {/* Social proof */}
      <SocialProof variant="hero" />

    </div>
  )
}
