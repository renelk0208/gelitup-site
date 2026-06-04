import { useState } from 'react'

/**
 * AcademyFAQ
 *
 * Replaces the open wall-of-text FAQ section on the Academies page
 * with a clean collapsible accordion.
 *
 * Usage — in your Academies page component:
 *   import AcademyFAQ from '../components/AcademyFAQ'
 *
 *   Find the FAQ section (contains "Can we order a sample kit...")
 *   and replace the entire block with:
 *   <AcademyFAQ />
 */

const FAQS = [
  {
    q: 'Can we order a sample kit before committing to a full order?',
    a: 'Yes. Registered academy accounts can request sample packs before placing bulk orders. Contact us via WhatsApp or through your B2B dashboard to arrange a sample selection.',
  },
  {
    q: 'Are your products safe for repeated daily use in a training environment?',
    a: 'Yes. All products in current production are HEMA-free and TPO-free — the two most common sensitisers in gel products. We supply SDS documentation for all products on request.',
  },
  {
    q: 'Do your products comply with EU cosmetics regulations?',
    a: 'Yes. Every formula is CPNP Notified under EC 1223/2009 and fully compliant for sale and professional use across all EU member states.',
  },
  {
    q: 'What are the minimum order quantities for academy accounts?',
    a: 'No minimum order quantity is required for registered B2B accounts. Volume pricing tiers apply to larger orders, which your account manager can discuss with you directly.',
  },
  {
    q: 'Can we incorporate GEL.IT.UP products into our course curriculum?',
    a: 'Absolutely. We can provide product information, application guides, and technical details to support your course materials. Get in touch after registering your academy account.',
  },
]

function ChevronIcon({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        transition: 'transform 0.25s ease',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function AcademyFAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i)

  return (
    <section style={{ padding: '56px 0' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px' }}>

        {/* Section header */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#D43790',
            marginBottom: '6px',
          }}>
            Common questions
          </p>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1a1a1a',
            margin: 0,
          }}>
            Academy FAQs
          </h2>
        </div>

        {/* Accordion items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                style={{
                  border: `1px solid ${isOpen ? '#D43790' : '#e8e8e8'}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease',
                  background: '#fff',
                }}
              >
                {/* Question row */}
                <button
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '18px 20px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: isOpen ? '#D43790' : '#1a1a1a',
                    transition: 'color 0.2s ease',
                  }}
                >
                  <span style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}>
                    {faq.q}
                  </span>
                  <ChevronIcon open={isOpen} />
                </button>

                {/* Answer panel */}
                <div
                  style={{
                    maxHeight: isOpen ? '300px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                  }}
                >
                  <p style={{
                    margin: 0,
                    padding: '0 20px 18px',
                    fontSize: '14px',
                    color: '#555',
                    lineHeight: 1.7,
                    borderTop: '1px solid #f5f5f5',
                    paddingTop: '14px',
                  }}>
                    {faq.a}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <p style={{
          marginTop: '24px',
          fontSize: '13px',
          color: '#888',
          textAlign: 'center',
        }}>
          Still have questions?{' '}
          <a
            href="https://wa.me/35973891041"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#D43790', fontWeight: 600, textDecoration: 'none' }}
          >
            Chat with us on WhatsApp →
          </a>
        </p>

      </div>
    </section>
  )
}
