// Vite dev plugin that mounts JSON API routes for browser-side code to hit.
// Bypasses CORS by proxying Reddit / RSS fetches through Node.
// Same handlers can be re-exposed later as Cloudflare Worker routes.

import { fetchSubreddit } from './handlers/reddit.js'
import { fetchRss } from './handlers/rss.js'
import { fetchTelegramChannel } from './handlers/telegram.js'

const CACHE = new Map()
const CACHE_TTL_MS = 90 * 1000 // 90s — keeps repeat fetches cheap

async function cached(key, ttl, fn) {
  const entry = CACHE.get(key)
  if (entry && Date.now() - entry.t < ttl) return entry.v
  const v = await fn()
  CACHE.set(key, { v, t: Date.now() })
  return v
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

// Dev-mode Gemini proxy — reads the key from either VITE_GEMINI_API_KEY (old
// local setup) or GEMINI_API_KEY (what we'll use in Vercel) so the same
// `.env.local` works. Mirrors api/classify.js behavior.
async function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

async function proxyClassifyToGemini(body) {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!key) return { enabled: false, classifications: [] }

  const items = Array.isArray(body?.items) ? body.items : []
  if (items.length === 0) return { enabled: true, classifications: [] }

  const SYSTEM = `
You classify crypto trading signals. For each input item, output a JSON object with:
- direction: "bullish" | "bearish" | "neutral"
- confidence: integer 0-100 (short-term, next 24h)
- reason: one short sentence (max 25 words), reference specific evidence.
Rules: Boost/promo alone = 50-70. Top gainers/losers >20% = 80+, 10-20% = 65-80, <10% = 50-65.
Trending-only = 55-70. Opinion-only = 40-55 neutral. Prefer bearish/neutral when evidence is thin.
Return ONLY a JSON array in the same order as inputs. No prose, no markdown.
`.trim()

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${SYSTEM}\n\nItems:\n${JSON.stringify(items)}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: 'application/json' },
      }),
    }
  )

  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    console.warn('[classify-dev] Gemini', r.status, txt.slice(0, 200))
    return { enabled: true, classifications: [] }
  }

  const data = await r.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const trimmed = text.trim()
  const s = trimmed.indexOf('['), e = trimmed.lastIndexOf(']')
  let classifications = []
  if (s !== -1 && e > s) {
    try { classifications = JSON.parse(trimmed.slice(s, e + 1)) } catch { /* noop */ }
  }
  return { enabled: true, classifications }
}

export function apiPlugin() {
  return {
    name: 'alphafeed-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        try {
          const url = new URL(req.url, 'http://localhost')
          const path = url.pathname

          if (path === '/reddit') {
            const sub = url.searchParams.get('sub')
            const limit = Number(url.searchParams.get('limit') || 25)
            if (!sub) return send(res, 400, { error: 'sub required' })
            const posts = await cached(`reddit:${sub}:${limit}`, CACHE_TTL_MS, () => fetchSubreddit(sub, { limit }))
            return send(res, 200, { posts })
          }

          if (path === '/rss') {
            const feedUrl = url.searchParams.get('url')
            if (!feedUrl) return send(res, 400, { error: 'url required' })
            const items = await cached(`rss:${feedUrl}`, CACHE_TTL_MS, () => fetchRss(feedUrl))
            return send(res, 200, { items })
          }

          if (path === '/telegram') {
            const channel = url.searchParams.get('channel')
            if (!channel) return send(res, 400, { error: 'channel required' })
            const messages = await cached(`tg:${channel}`, CACHE_TTL_MS, () => fetchTelegramChannel(channel))
            return send(res, 200, { messages })
          }

          if (path === '/classify' && req.method === 'POST') {
            const body = await readJson(req)
            const result = await proxyClassifyToGemini(body)
            return send(res, 200, result)
          }

          return next()
        } catch (err) {
          console.warn('[api]', req.url, err.message)
          return send(res, 502, { error: err.message })
        }
      })
    },
  }
}
