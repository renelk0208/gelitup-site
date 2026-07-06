/**
 * HowItWorks
 *
 * Explains the B2B ordering process clearly so visitors are
 * never surprised by the pro forma invoice model.
 *
 * Two variants:
 *   variant="banner"   — compact horizontal strip for checkout sidebar (default)
 *   variant="section"  — full homepage section with icons and descriptions
 *
 * Usage:
 *   Checkout sidebar:   <HowItWorks variant="banner" />
 *   Homepage:           <HowItWorks variant="section" />
 */

const STEPS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    title: 'Browse & add to cart',
    desc: 'Shop the full catalogue at B2B wholesale prices. No approval needed to browse.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: 'Place your order',
    desc: 'Fill in your details and confirm. No payment taken at this step.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    title: 'Pay online or by invoice',
    desc: "Pay right away by card, PayPal, or Revolut — or wait for the pro forma invoice we email once your order is confirmed.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
    title: 'We ship your order',
    desc: 'Once payment is received your order ships. Free shipping on all EU orders.',
  },
]

export default function HowItWorks({ variant = 'banner' }) {

  // ─── Compact checkout sidebar banner ────────────────────────────────────────
  if (variant === 'banner') {
    return (
      <div style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '14px 16px',
        marginBottom: '16px',
        background: '#fafafa',
      }}>
        <p style={{ fontWeight: 600, fontSize: '13px', margin: '0 0 10px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D43790" strokeWidth="2.2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          How ordering works
        </p>
        <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#444', lineHeight: 1.7 }}>
          <li>Add products and complete your details</li>
          <li>Place order — <strong>no payment taken yet</strong></li>
          <li>Pay online right away, or wait for our pro forma invoice and pay by transfer</li>
          <li>Payment received → we ship immediately</li>
        </ol>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#888' }}>
          Accepted: Apple Pay · Google Pay · Mastercard · PayPal · Revolut · Visa
        </p>
      </div>
    )
  }

  // ─── Full homepage section ───────────────────────────────────────────────────
  return (
    <section style={{ padding: '60px 0', background: '#fff' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D43790', marginBottom: '8px' }}>
            Simple wholesale ordering
          </p>
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 12px 0', color: '#1a1a1a' }}>
            How it works
          </h2>
          <p style={{ fontSize: '15px', color: '#666', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
            No approval. No surprises at checkout. Order in minutes and pay by invoice.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
        }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '24px',
              border: '1px solid #ebebeb',
              borderRadius: '10px',
              background: '#fff',
              position: 'relative',
            }}>
              {/* Step number */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#fff0f3',
                color: '#D43790',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {i + 1}
              </div>

              {/* Icon */}
              <div style={{ color: '#D43790' }}>
                {step.icon}
              </div>

              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 6px 0', color: '#1a1a1a' }}>
                  {step.title}
                </p>
                <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance strip */}
        <div style={{
          marginTop: '32px',
          padding: '16px 24px',
          background: '#fff8f9',
          border: '1px solid #fcd0d8',
          borderRadius: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {[
            '✓ No approval needed',
            '✓ Minimum order €100',
            '✓ Free EU shipping on all orders',
            '✓ VAT invoice included',
            '✓ Pay by card, PayPal or Revolut',
          ].map((item, i) => (
            <span key={i} style={{ fontSize: '13px', color: '#c00030', fontWeight: 500 }}>{item}</span>
          ))}
        </div>

      </div>
    </section>
  )
}
