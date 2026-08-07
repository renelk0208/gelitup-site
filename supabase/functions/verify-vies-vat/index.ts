import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VIES_ENDPOINT = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService'

const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR',
  'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  'XI',
])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeCountryCode(raw: string) {
  const upper = String(raw || '').trim().toUpperCase()
  if (!upper) return ''
  if (upper === 'GR') return 'EL'
  return upper
}

function normalizeVatNumber(raw: string) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s.\-_/]+/g, '')
}

function decodeXmlText(raw: string) {
  return String(raw || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function firstMatch(xml: string, regex: RegExp) {
  const match = xml.match(regex)
  return decodeXmlText(match?.[1] || '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405)
  }

  let payload: { countryCode?: string; vatNumber?: string } | null = null
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const rawVatInput = normalizeVatNumber(payload?.vatNumber || '')
  if (!rawVatInput) {
    return json({ error: 'vatNumber is required.' }, 400)
  }

  const prefixedMatch = rawVatInput.match(/^([A-Z]{2})([A-Z0-9]+)$/)
  const requestCountry = normalizeCountryCode(payload?.countryCode || prefixedMatch?.[1] || '')
  const vatNumber = (prefixedMatch && requestCountry === normalizeCountryCode(prefixedMatch[1]))
    ? prefixedMatch[2]
    : rawVatInput

  if (!requestCountry) {
    return json({ error: 'countryCode is required (or include an EU prefix in vatNumber).' }, 400)
  }
  if (!EU_COUNTRY_CODES.has(requestCountry)) {
    return json({ error: `Unsupported EU country code: ${requestCountry}` }, 400)
  }
  if (!vatNumber || !/^[A-Z0-9]{2,20}$/.test(vatNumber)) {
    return json({ error: 'vatNumber format is invalid after normalization.' }, 400)
  }

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <tns:checkVat>
      <tns:countryCode>${requestCountry}</tns:countryCode>
      <tns:vatNumber>${vatNumber}</tns:vatNumber>
    </tns:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`

  let viesResponse: Response
  try {
    viesResponse = await fetch(VIES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'checkVat',
      },
      body: envelope,
    })
  } catch (error) {
    return json({ error: `VIES request failed: ${error instanceof Error ? error.message : String(error)}` }, 502)
  }

  const xml = await viesResponse.text()
  const faultString = firstMatch(xml, /<faultstring>([\s\S]*?)<\/faultstring>/i)
  if (faultString) {
    const status = /SERVICE_UNAVAILABLE|MS_UNAVAILABLE|TIMEOUT/i.test(faultString) ? 503 : 400
    return json({
      ok: false,
      valid: false,
      countryCode: requestCountry,
      vatNumber,
      error: faultString,
    }, status)
  }

  const validText = firstMatch(xml, /<valid>(true|false)<\/valid>/i)
  if (!validText) {
    return json({ error: 'Unexpected VIES response format.' }, 502)
  }

  const requestDate = firstMatch(xml, /<requestDate>([\s\S]*?)<\/requestDate>/i)
  const name = firstMatch(xml, /<name>([\s\S]*?)<\/name>/i)
  const address = firstMatch(xml, /<address>([\s\S]*?)<\/address>/i)

  return json({
    ok: true,
    valid: validText.toLowerCase() === 'true',
    countryCode: requestCountry,
    vatNumber,
    requestDate,
    name,
    address,
  })
})
