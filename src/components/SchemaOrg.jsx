// src/components/SchemaOrg.jsx
// Drop <SchemaOrg type="organization" /> in your root layout,
// and <SchemaOrg type="product" product={...} /> on product pages.

export default function SchemaOrg({ type = 'organization', product = null }) {
  if (type === 'organization') {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'GEL.IT.UP by GIUP®',
      url: 'https://gelitup.com',
      logo: 'https://gelitup.com/gelitup_logo.png',
      description:
        'Professional gel polish with 1,000+ shades, builder gel systems, base coats and top coats. HEMA-free, TPO-free, EU certified. Wholesale to professional nail technicians worldwide.',
      email: 'info@gelitup.com',
      sameAs: [
        'https://www.instagram.com/gelitupinternational/',
        'https://www.tiktok.com/@gelitupinternational',
        'https://gr.linkedin.com/company/gel-it-up-by-giup',
        'https://www.facebook.com/GEL.IT.UP.Greece/',
        'https://www.youtube.com/@GELITUP',
      ],
    }
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    )
  }

  if (type === 'product' && product) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || `Professional gel polish by GEL.IT.UP by GIUP®. HEMA-free, EU certified.`,
      brand: { '@type': 'Brand', name: 'GEL.IT.UP by GIUP®' },
      image: product.imageUrl ? [`https://gelitup.com${product.imageUrl}`] : [],
      sku: product.sku || product.code,
      offers: product.price != null
        ? {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: Number(product.price).toFixed(2),
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: 'GEL.IT.UP by GIUP®' },
          }
        : undefined,
    }
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    )
  }

  return null
}
