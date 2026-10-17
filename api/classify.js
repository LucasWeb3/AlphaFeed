// Server-side Gemini classifier.
// Key is read from process.env.GEMINI_API_KEY (set in Vercel project settings
// as a server-only env var — never bundled into the browser).

export const config = { runtime: 'nodejs' }

const KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-flash-latest'
const ENDPOINT = (apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

const SYSTEM_INSTRUCTIONS = `
You classify crypto trading signals. For each input item, output a JSON object with:
- direction: "bullish" | "bearish" | "neutral"
- confidence: integer 0-100 (how strong the signal is for a short-term move, next 24h)
- reason: one short sentence explaining WHY this classification (max 25 words). Reference the specific evidence.

Rules:
- Boost/promotion campaigns alone = 50-70 confidence unless volume/liquidity is exceptional.
- Top gainers/losers by %: > 20% move = 80+, 10-20% = 65-80, <10% = 50-65.
- Trending-only mentions with no other catalyst = 55-70.
- Vague or opinion-only sources = 40-55, neutral direction.
- Prefer bearish/neutral over bullish when evidence is thin — false bullish is worse than a missed call.

Return ONLY a JSON array in the same order as inputs. No prose, no markdown fences.
`.trim()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  if (!KEY) {
    // Signal that Gemini isn't configured — client will fall back to heuristic scores.
    res.status(200).json({ enabled: false, classifications: [] })
    return
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
    const items = Array.isArray(body.items) ? body.items : []
    if (items.length === 0) {
      res.status(200).json({ enabled: true, classifications: [] })
      return
    }

    const prompt = `${SYSTEM_INSTRUCTIONS}\n\nItems:\n${JSON.stringify(items)}`

    const r = await fetch(ENDPOINT(KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!r.ok) {
      const text = await r.text().catch(() => '')
      res.status(502).json({ enabled: true, error: `Gemini ${r.status}: ${text.slice(0, 200)}` })
      return
    }

    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const classifications = extractJsonArray(text) || []
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ enabled: true, classifications })
  } catch (err) {
    res.status(500).json({ enabled: true, error: err.message })
  }
}

function extractJsonArray(text) {
  const trimmed = text.trim()
  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    return null
  }
}
