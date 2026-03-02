/**
 * Netlify serverless function: instagram-feed
 * Proxies Instagram Graph API so the access token stays server-side.
 * Returns the latest posts for the connected Business account.
 *
 * Required env var (set in Netlify dashboard):
 *   INSTAGRAM_ACCESS_TOKEN  — long-lived access token for the Business/Creator account
 *
 * Optional env var:
 *   INSTAGRAM_POST_LIMIT    — number of posts to return (default 12)
 */

const GRAPH_API_BASE = 'https://graph.instagram.com/v21.0'
const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'

export const handler = async () => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const limit = parseInt(process.env.INSTAGRAM_POST_LIMIT || '12', 10)

  if (!token) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Instagram access token not configured.' }),
    }
  }

  try {
    const url = `${GRAPH_API_BASE}/me/media?fields=${FIELDS}&limit=${limit}&access_token=${token}`
    const response = await fetch(url)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[instagram-feed] Graph API error:', response.status, errorBody)
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Graph API responded with ${response.status}` }),
      }
    }

    const data = await response.json()

    // Filter to only IMAGE and VIDEO posts (exclude CAROUSEL_ALBUM children that lack media_url)
    const posts = (data.data || []).filter(
      (post) => post.media_type === 'IMAGE' || post.media_type === 'VIDEO' || post.media_type === 'CAROUSEL_ALBUM'
    )

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache for 15 minutes on CDN
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
      },
      body: JSON.stringify({ posts }),
    }
  } catch (err) {
    console.error('[instagram-feed] Unexpected error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch Instagram feed.' }),
    }
  }
}
