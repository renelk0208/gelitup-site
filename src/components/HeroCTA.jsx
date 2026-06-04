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
          Shop the catalogue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>

        <Link
          to="/portal/register"
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
          Get B2B pricing
        </Link>
      </div>

      {/* Social proof */}
      <SocialProof variant="hero" />

    </div>
  )
}
