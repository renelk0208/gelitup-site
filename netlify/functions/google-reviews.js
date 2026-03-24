/**
 * Netlify serverless function: google-reviews
 * Fetches Google Place reviews via the Places Details API.
 * Setting language=en causes Google to auto-translate non-English reviews
 * (e.g. Greek) into English — no separate Translation API is needed.
 *
 * Required env vars (set in Netlify dashboard):
 *   GOOGLE_PLACES_API_KEY  — Google Cloud API key with Places API enabled
 *   GOOGLE_PLACE_ID        — Place ID for the business
 *                            Find yours at:
 *                            https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
 *
 * Optional env vars:
 *   GOOGLE_REVIEWS_LIMIT   — number of reviews to return (1-5, Google caps at 5, default 5)
 *
 * The function caches publicly for 1 hour (s-maxage) so Netlify CDN won't
 * re-call Google on every page load.
 */

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/details/json'

export const handler = async () => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const placeId = process.env.GOOGLE_PLACE_ID
  const limit = Math.min(parseInt(process.env.GOOGLE_REVIEWS_LIMIT || '5', 10), 5)

  if (!apiKey || !placeId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID env vars are required.',
      }),
    }
  }

  // Construct URL — API key stays server-side, never exposed to the browser
  const url =
    `${PLACES_BASE}` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=name,rating,user_ratings_total,reviews,url` +
    `&language=en` +
    `&reviews_sort=most_relevant` +
    `&key=${apiKey}`

  try {
    const res = await fetch(url)

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Places API responded with HTTP ${res.status}` }),
      }
    }

    const data = await res.json()

    if (data.status !== 'OK') {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `Places API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`,
        }),
      }
    }

    const reviews = (data.result?.reviews || [])
      .slice(0, limit)
      .map((r) => ({
        author: r.author_name,
        authorPhoto: r.profile_photo_url || null,
        rating: r.rating,
        text: r.text,
        translated: r.translated || false,
        originalLanguage: r.original_language || null,
        relativeTime: r.relative_time_description,
        time: r.time,
      }))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache on Netlify CDN for 1 hour; serve stale for up to 24 hours while revalidating
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
      body: JSON.stringify({
        placeName: data.result?.name || 'GEL.IT.UP',
        overallRating: data.result?.rating ?? null,
        totalRatings: data.result?.user_ratings_total ?? null,
        googleMapsUrl: data.result?.url ?? null,
        reviews,
      }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
