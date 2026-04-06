// Netlify serverless function — validates EU VAT numbers via the VIES REST API.
// POST { vatNumber: "EL123456789" }
// Returns { valid, name, address, countryCode, vatNumber, requestDate }

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let vatNumber
  try {
    const body = JSON.parse(event.body || '{}')
    vatNumber = String(body.vatNumber || '').trim().toUpperCase().replace(/[\s\-\.]/g, '')
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  if (!vatNumber || vatNumber.length < 4) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'VAT number is required (min 4 characters)' }) }
  }

  // Extract 2-letter country code (Greece uses EL in VIES, not GR)
  const countryCode = vatNumber.slice(0, 2)
  const number = vatNumber.slice(2)

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'VAT number must start with a 2-letter country code (e.g. EL, DE, FR)' }) }
  }

  try {
    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber: number }),
    })

    if (!response.ok) {
      // VIES occasionally returns 5xx when a member state service is down
      const text = await response.text().catch(() => '')
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'VIES service temporarily unavailable. Please try again shortly.',
          viesStatus: response.status,
          detail: text.slice(0, 200),
        }),
      }
    }

    const data = await response.json()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: data.valid === true,
        name: data.name || '',
        address: data.address || '',
        countryCode: data.countryCode || countryCode,
        vatNumber: data.vatNumber || number,
        requestDate: data.requestDate || new Date().toISOString().split('T')[0],
      }),
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Unable to reach VIES service. Please try again later.' }),
    }
  }
}
