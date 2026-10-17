// Vercel serverless route — proxies RSS fetches to bypass browser CORS.
// Mirrors the Vite dev plugin at src/server/api-plugin.js so client code
// hits the same /api/rss?url=... in both dev and production.

import { fetchRss } from '../src/server/handlers/rss.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  try {
    const feedUrl = (req.query && req.query.url) || new URL(req.url, 'http://x').searchParams.get('url')
    if (!feedUrl) {
      res.status(400).json({ error: 'url required' })
      return
    }

    const items = await fetchRss(feedUrl)

    // Edge CDN cache: 90s fresh, 300s stale-while-revalidate.
    res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=300')
    res.status(200).json({ items })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
