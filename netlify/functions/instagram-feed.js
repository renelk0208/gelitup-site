/**
 * Netlify serverless function: instagram-feed
 * Uses the Instagram Graph API (Business/Creator) via graph.facebook.com.
 * NOTE: graph.instagram.com (Basic Display API) was shut down Sept 2024 — use graph.facebook.com.
 *
 * Required env vars (set in Netlify dashboard):
 *   INSTAGRAM_ACCESS_TOKEN  — long-lived User or Page access token with instagram_basic +
 *                             pages_show_list + pages_read_engagement permissions
 *
 * Optional env vars:
 *   INSTAGRAM_USER_ID       — numeric Instagram Business/Creator Account ID (skips auto-discovery)
 *   INSTAGRAM_POST_LIMIT    — number of posts to return (default 12)
 *
 * To find INSTAGRAM_USER_ID without this function:
 *   GET https://graph.facebook.com/v21.0/me/accounts?access_token=TOKEN
 *   Then: GET https://graph.facebook.com/v21.0/{page-id}?fields=instagram_business_account&access_token=TOKEN
 *   The id inside instagram_business_account is your INSTAGRAM_USER_ID.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'
const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'

/** Auto-discover Instagram Business Account ID from the token's linked Facebook Pages. */
async function discoverIgUserId(token) {
  // 1. List all Pages this token has access to
  const pagesRes = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${token}`)
  const pagesData = await pagesRes.json()
  if (pagesData.error) {
    console.error('[instagram-feed] /me/accounts error:', JSON.stringify(pagesData.error))
    return null
  }
  const pages = pagesData.data || []
  if (pages.length === 0) {
    console.error('[instagram-feed] No Facebook Pages found for this token.')
    return null
  }

  // 2. For each Page, look for a linked Instagram Business Account
  for (const page of pages) {
    const pageRes = await fetch(
      `${GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${token}`
    )
    const pageData = await pageRes.json()
    if (pageData.instagram_business_account?.id) {
      console.log(`[instagram-feed] Found IG Business Account ${pageData.instagram_business_account.id} via Page ${page.id} (${page.name})`)
      return pageData.instagram_business_account.id
    }
  }

  console.error('[instagram-feed] No Instagram Business Account linked to any accessible Page.')
  return null
}

export const handler = async () => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const limit = parseInt(process.env.INSTAGRAM_POST_LIMIT || '12', 10)
  let igUserId = process.env.INSTAGRAM_USER_ID || null

  if (!token) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Instagram access token not configured.' }),
    }
  }

  try {
    // Discover IG User ID if not explicitly configured
    if (!igUserId) {
      igUserId = await discoverIgUserId(token)
    }

    if (!igUserId) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Instagram Business Account not found. Ensure the Instagram account is a Business/Creator account linked to a Facebook Page, and that INSTAGRAM_ACCESS_TOKEN has pages_show_list + instagram_basic permissions. You can also set INSTAGRAM_USER_ID directly.',
        }),
      }
    }

    const url = `${GRAPH_BASE}/${igUserId}/media?fields=${FIELDS}&limit=${limit}&access_token=${token}`
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

    const posts = (data.data || []).filter(
      (post) => post.media_type === 'IMAGE' || post.media_type === 'VIDEO' || post.media_type === 'CAROUSEL_ALBUM'
    )

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
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
