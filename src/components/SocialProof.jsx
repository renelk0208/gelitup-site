/**
 * SocialProof
 *
 * Reusable social proof bar used in two places:
 *   variant="register"  — sits below the CTA button on the register page
 *   variant="hero"      — sits below the hero paragraph on the homepage
 *
 * Usage:
 *   <SocialProof variant="register" />
 *   <SocialProof variant="hero" />
 */

const STATS = [
  { value: '1,000+', label: 'professionals' },
  { value: '1,000+', label: 'shades' },
  { value: '15+',    label: 'countries' },
]

export default function SocialProof({ variant = 'hero' }) {

  // ─── Register page — below CTA button, above "Already have an account?" ────
  if (variant === 'register') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        margin: '14px 0 4px',
        padding: '10px 0',
        borderTop: '1px solid #f0f0f0',
      }}>
        {STATS.map((s, i) => (
          <>
            <span key={`stat-${i}`} style={{ fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
              <strong style={{ color: '#1a1a1a' }}>{s.value}</strong> {s.label}
            </span>
            {i < STATS.length - 1 && (
              <span key={`dot-${i}`} style={{ color: '#D43790', fontSize: '10px', lineHeight: 1 }}>·</span>
            )}
          </>
        ))}
      </div>
    )
  }

  // ─── Homepage hero — below paragraph, above category nav ────────────────────
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      flexWrap: 'wrap',
      margin: '20px 0 0',
    }}>
      {STATS.map((s, i) => (
        <>
          <div key={`stat-${i}`} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '0 20px 0 0',
            ...(i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '20px' } : {}),
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
              {s.value}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
              {s.label}
            </span>
          </div>
        </>
      ))}
    </div>
  )
}
