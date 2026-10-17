// Reddit signals — pulls new posts from major crypto subs via our /api proxy.
// Confidence is a rough heuristic from upvotes and comments; Gemini re-scores.

const SUBS = ['CryptoCurrency', 'CryptoMarkets', 'ethfinance', 'defi']

// Very light token extractor — finds $TICKER or common CoinGecko-style names in title.
const TICKER_RE = /\$([A-Z]{2,10})\b|\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|SHIB|AVAX|LINK|MATIC|DOT|LTC|ARB|OP|SUI|APT|SEI|INJ|TIA|WIF|PEPE|BONK|JTO|JUP|PYTH|HYPE)\b/g

function extractTicker(text) {
  if (!text) return null
  TICKER_RE.lastIndex = 0
  const m = TICKER_RE.exec(text)
  return m ? (m[1] || m[2]) : null
}

async function fetchOne(sub) {
  const res = await fetch(`/api/reddit?sub=${encodeURIComponent(sub)}&limit=25`)
  if (!res.ok) throw new Error(`reddit ${sub} failed: ${res.status}`)
  const { posts } = await res.json()
  return posts.map((p) => ({ ...p, sub }))
}

export async function fetchRedditSignalCandidates() {
  const settled = await Promise.allSettled(SUBS.map(fetchOne))
  const posts = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))

  return posts
    .map(postToSignal)
    .filter(Boolean)
    // Prefer higher-engagement posts and drop obvious noise
    .sort((a, b) => (b.engagement || 0) - (a.engagement || 0))
    .slice(0, 15)
}

function postToSignal(p) {
  const ticker = extractTicker(p.title) || extractTicker(p.selftext)
  const engagement = (p.score || 0) + (p.numComments || 0) * 2
  // Skip low-engagement posts with no obvious token — pure noise.
  if (!ticker && engagement < 30) return null

  return {
    source: `r/${p.sub}`,
    sourceType: 'reddit',
    token: ticker || p.sub,
    direction: 'neutral', // Gemini re-classifies
    // Base confidence 45-70 depending on engagement; Gemini will re-score.
    confidence: Math.min(70, 45 + Math.round(Math.log10(engagement + 1) * 8)),
    headline: p.title,
    reason: p.selftext
      ? `${p.selftext.slice(0, 160)}${p.selftext.length > 160 ? '…' : ''}`
      : `${p.score} upvotes · ${p.numComments} comments on r/${p.sub}${p.linkFlair ? ` · ${p.linkFlair}` : ''}`,
    url: p.permalink,
    timestamp: p.createdAt,
    engagement,
  }
}
