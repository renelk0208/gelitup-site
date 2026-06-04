import { Link } from 'react-router-dom'

/**
 * InspirationTeaser
 *
 * Branded teaser section linking to the /inspiration page.
 * Used on the About Us page and homepage.
 */
export default function InspirationTeaser() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1a2e 100%)',
      borderRadius: '12px',
      padding: '40px 32px',
      margin: '32px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative background accent */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'rgba(212, 55, 144, 0.12)',
        pointerEvents: 'none',
      }} />

      <p style={{
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#D43790',
        margin: 0,
      }}>
        Get inspired
      </p>

      <h2 style={{
        fontSize: '24px',
        fontWeight: 800,
        color: '#fff',
        margin: 0,
        lineHeight: 1.2,
        fontFamily: 'Montserrat, sans-serif',
      }}>
        See GEL.IT.UP in action
      </h2>

      <p style={{
        fontSize: '14px',
        color: 'rgba(255,255,255,0.65)',
        margin: 0,
        maxWidth: '420px',
        lineHeight: 1.6,
      }}>
        Browse nail art inspiration, colour combinations, and professional looks created with the GEL.IT.UP range.
      </p>

      <Link
        to="/inspiration"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#D43790',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 700,
          padding: '10px 20px',
          borderRadius: '6px',
          textDecoration: 'none',
          marginTop: '4px',
        }}
      >
        View Inspiration
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>
    </div>
  )
}
