// Telegram public channel signals — pulls recent messages via the public
// t.me/s/{channel} preview through our /api/telegram proxy.
//
// Default channel set is skewed toward news + Asian market alpha; add/remove
// by editing CHANNELS. Requires no auth.

const CHANNELS = [
  { handle: 'WuBlockchain', label: 'Wu Blockchain' },
  { handle: 'cointelegraph', label: 'Cointelegraph TG' },
  { handle: 'cryptonews', label: 'CryptoNews TG' },
  { handle: 'unfolded', label: 'Unfolded' },
]

const TICKER_RE = /\$([A-Z]{2,10})\b|\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|SHIB|AVAX|LINK|MATIC|DOT|LTC|ARB|OP|SUI|APT|SEI|INJ|TIA|WIF|PEPE|BONK|JTO|JUP|PYTH|HYPE|Bitcoin|Ethereum|Solana)\b/g

function extractTicker(text) {
  if (!text) return null
  TICKER_RE.lastIndex = 0
  const m = TICKER_RE.exec(text)
  if (!m) return null
  const raw = m[1] || m[2]
  const mapWords = { Bitcoin: 'BTC', Ethereum: 'ETH', Solana: 'SOL' }
  return mapWords[raw] || raw.toUpperCase()
}

async function fetchOne(channel) {
  const res = await fetch(`/api/telegram?channel=${encodeURIComponent(channel.handle)}`)
  if (!res.ok) throw new Error(`telegram ${channel.handle} failed: ${res.status}`)
  const { messages } = await res.json()
  return messages.map((m) => ({ ...m, sourceLabel: channel.label }))
}

export async function fetchTelegramSignalCandidates() {
  const settled = await Promise.allSettled(CHANNELS.map(fetchOne))
  const messages = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))

  const cutoff = Date.now() - 24 * 60 * 60 * 1000

  return messages
    .filter((m) => m.publishedAt && new Date(m.publishedAt).getTime() > cutoff)
    .map(messageToSignal)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
}

function messageToSignal(msg) {
  const ticker = extractTicker(msg.text)
  const headline = msg.text.length > 140 ? msg.text.slice(0, 140) + '…' : msg.text

  return {
    source: msg.sourceLabel,
    sourceType: 'telegram',
    token: ticker || 'MARKET',
    direction: 'neutral',
    confidence: 55,
    headline,
    reason: `Posted in @${msg.channel} on Telegram — Gemini will re-classify sentiment.`,
    url: msg.url,
    timestamp: msg.publishedAt,
  }
}
