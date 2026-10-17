// CoinGecko free API — CORS-enabled, no auth. Aggressive rate limits (5-15/min).
// Docs: https://docs.coingecko.com/reference/introduction

const BASE = 'https://api.coingecko.com/api/v3'

export async function fetchTrending() {
  const res = await fetch(`${BASE}/search/trending`)
  if (!res.ok) throw new Error(`CoinGecko /search/trending failed: ${res.status}`)
  return res.json()
}

export async function fetchTopMovers({ order = 'percent_change_24h', direction = 'desc', limit = 10 } = {}) {
  const url = new URL(`${BASE}/coins/markets`)
  url.searchParams.set('vs_currency', 'usd')
  url.searchParams.set('order', 'market_cap_desc')
  url.searchParams.set('per_page', '250')
  url.searchParams.set('page', '1')
  url.searchParams.set('price_change_percentage', '24h')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko /coins/markets failed: ${res.status}`)
  const data = await res.json()
  const sorted = [...data].sort((a, b) => {
    const av = a.price_change_percentage_24h ?? 0
    const bv = b.price_change_percentage_24h ?? 0
    return direction === 'desc' ? bv - av : av - bv
  })
  return sorted.slice(0, limit)
}

// Convert trending list → bullish signals (someone's searching for these hard)
export async function fetchTrendingSignalCandidates() {
  const data = await fetchTrending()
  if (!data?.coins) return []

  return data.coins.slice(0, 7).map(({ item }, i) => ({
    source: 'CoinGecko',
    sourceType: 'on-chain',
    token: item.symbol?.toUpperCase() || item.name,
    tokenName: item.name,
    direction: 'bullish',
    // Higher on the trending list = stronger signal
    confidence: Math.round(75 - i * 3),
    headline: `${item.name} (${item.symbol?.toUpperCase()}) trending #${i + 1} on CoinGecko`,
    reason: `Rank ${item.market_cap_rank ?? 'unranked'} by market cap. Retail search velocity is a leading indicator for altcoin runs.`,
    url: `https://www.coingecko.com/en/coins/${item.id}`,
    icon: item.small || item.thumb,
    timestamp: new Date().toISOString(),
  }))
}

// Top gainers/losers → bullish/bearish signals
export async function fetchMoversSignalCandidates() {
  const [gainers, losers] = await Promise.all([
    fetchTopMovers({ direction: 'desc', limit: 5 }),
    fetchTopMovers({ direction: 'asc', limit: 3 }),
  ])

  const toSignal = (coin, direction) => ({
    source: 'CoinGecko',
    sourceType: 'on-chain',
    token: coin.symbol?.toUpperCase(),
    tokenName: coin.name,
    direction,
    // Scale magnitude to confidence — bigger move = more confident it's a real signal
    confidence: Math.round(
      Math.min(90, 55 + Math.abs(coin.price_change_percentage_24h ?? 0) * 0.6)
    ),
    headline: `${coin.name} ${direction === 'bullish' ? 'up' : 'down'} ${(coin.price_change_percentage_24h ?? 0).toFixed(1)}% in 24h`,
    reason: `Currently ${direction === 'bullish' ? 'a top gainer' : 'a top loser'} by 24h change across CoinGecko's tracked market. Price at $${formatPrice(coin.current_price)}.`,
    url: `https://www.coingecko.com/en/coins/${coin.id}`,
    icon: coin.image,
    timestamp: new Date().toISOString(),
  })

  return [
    ...gainers.map((c) => toSignal(c, 'bullish')),
    ...losers.map((c) => toSignal(c, 'bearish')),
  ]
}

function formatPrice(n) {
  if (n == null) return '—'
  if (n < 0.001) return n.toExponential(2)
  if (n < 1) return n.toFixed(4)
  if (n < 100) return n.toFixed(2)
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
