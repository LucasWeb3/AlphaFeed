// News signals — pulls major crypto RSS feeds via our /api proxy.
// Gemini re-classifies direction; the source heuristic here is neutral/weak.

const FEEDS = [
  // Mainstream crypto news
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss', label: 'CoinDesk' },
  { url: 'https://cointelegraph.com/rss', label: 'Cointelegraph' },
  { url: 'https://decrypt.co/feed', label: 'Decrypt' },
  { url: 'https://www.theblock.co/rss.xml', label: 'The Block' },
  { url: 'https://blockworks.co/feed', label: 'Blockworks' },
  { url: 'https://beincrypto.com/feed/', label: 'BeInCrypto' },
  { url: 'https://cryptoslate.com/feed/', label: 'CryptoSlate' },
  { url: 'https://u.today/rss', label: 'U.Today' },
  { url: 'https://cryptobriefing.com/feed/', label: 'CryptoBriefing' },
  { url: 'https://cryptopotato.com/feed/', label: 'CryptoPotato' },
  { url: 'https://coingape.com/feed/', label: 'CoinGape' },
  { url: 'https://www.newsbtc.com/feed/', label: 'NewsBTC' },
  { url: 'https://bitcoinist.com/feed/', label: 'Bitcoinist' },
  // Bitcoin-focused
  { url: 'https://bitcoinmagazine.com/feed', label: 'Bitcoin Magazine' },
  // DeFi / newsletters / breaking
  { url: 'https://newsletter.banklesshq.com/feed', label: 'Bankless' },
  { url: 'https://thedefiant.io/feed', label: 'The Defiant' },
  { url: 'https://watcher.guru/feed', label: 'Watcher.Guru' },
  { url: 'https://protos.com/feed/', label: 'Protos' },
  // Interviews / investigations
  { url: 'https://unchainedcrypto.com/feed/', label: 'Unchained' },
  // Exploits / rekt — great source for bearish signals
  { url: 'https://rekt.news/rss/feed.xml', label: 'Rekt' },
  // Ecosystem / research
  { url: 'https://blog.ethereum.org/en/feed.xml', label: 'Ethereum Foundation' },
  { url: 'https://a16zcrypto.com/feed/', label: 'a16z Crypto' },
  { url: 'https://blog.coingecko.com/feed/', label: 'CoinGecko Blog' },
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

async function fetchOne(feed) {
  const res = await fetch(`/api/rss?url=${encodeURIComponent(feed.url)}`)
  if (!res.ok) throw new Error(`rss ${feed.label} failed: ${res.status}`)
  const { items } = await res.json()
  return items.map((it) => ({ ...it, sourceLabel: feed.label }))
}

export async function fetchRssSignalCandidates() {
  const settled = await Promise.allSettled(FEEDS.map(fetchOne))
  const items = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))

  const cutoff = Date.now() - 24 * 60 * 60 * 1000 // last 24h only

  return items
    .filter((it) => it.publishedAt && new Date(it.publishedAt).getTime() > cutoff)
    .map(itemToSignal)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40)
}

function itemToSignal(item) {
  const ticker = extractTicker(item.title) || extractTicker(item.description)
  return {
    source: item.sourceLabel,
    sourceType: 'news',
    token: ticker || 'MARKET',
    direction: 'neutral', // Gemini re-classifies
    confidence: 60,
    headline: item.title,
    reason: item.description || `Latest from ${item.sourceLabel}`,
    url: item.link,
    timestamp: item.publishedAt,
  }
}
