// Dexscreener — free public API, CORS-enabled, no auth.
// Docs: https://docs.dexscreener.com/api/reference

const BASE = 'https://api.dexscreener.com'

// Top-boosted tokens across chains — proxy for "trending / paid attention right now"
export async function fetchTopBoosted() {
  const res = await fetch(`${BASE}/token-boosts/top/v1`)
  if (!res.ok) throw new Error(`Dexscreener /token-boosts/top failed: ${res.status}`)
  return res.json()
}

// Latest boosted (fresher, less filtered)
export async function fetchLatestBoosted() {
  const res = await fetch(`${BASE}/token-boosts/latest/v1`)
  if (!res.ok) throw new Error(`Dexscreener /token-boosts/latest failed: ${res.status}`)
  return res.json()
}

// Given a token address, get its pairs (for price/volume/liquidity)
export async function fetchTokenPairs(chain, tokenAddress) {
  const res = await fetch(`${BASE}/tokens/v1/${chain}/${tokenAddress}`)
  if (!res.ok) return []
  return res.json()
}

// Turn boosted tokens into raw signal candidates.
// Confidence baseline scales with boost amount (proxy for how much someone's paying to promote).
export async function fetchBoostedSignalCandidates() {
  const boosted = await fetchTopBoosted()
  if (!Array.isArray(boosted)) return []

  return boosted.slice(0, 12).map((b) => {
    // Dexscreener returns either `amount` (current active boost) or `totalAmount` (lifetime).
    // Some responses omit one or both — coerce and floor at 1 so log10 stays finite.
    const boostValue = Math.max(
      Number(b.amount) || Number(b.totalAmount) || 0,
      1
    )
    const symbol = symbolFromDescription(b.description) || truncateAddress(b.tokenAddress)
    const desc = shortDescription(b.description)

    return {
      source: 'Dexscreener',
      sourceType: 'on-chain',
      token: symbol,
      tokenAddress: b.tokenAddress,
      chain: b.chainId,
      direction: 'bullish',
      // Boost value scaled to a 55–90 confidence band. Real pipeline will
      // also weight liquidity/volume — this is boost attention only.
      confidence: clampConfidence(55 + Math.log10(boostValue) * 10),
      headline: desc
        ? `${symbol} — ${desc}`
        : `${symbol} boosted on ${b.chainId}`,
      reason: `Someone paid ${boostValue.toLocaleString()} boost credits to promote this token on Dexscreener — a leading indicator of active attention campaigns.`,
      url: b.url,
      icon: b.icon,
      boostAmount: b.amount,
      totalAmount: b.totalAmount,
      timestamp: new Date().toISOString(),
    }
  })
}

function symbolFromDescription(desc) {
  if (!desc) return null
  const match = desc.match(/\$([A-Z0-9]{2,10})/)
  return match ? match[1] : null
}

function shortDescription(desc) {
  if (!desc) return ''
  return desc.length > 70 ? desc.slice(0, 70) + '…' : desc
}

function truncateAddress(addr) {
  if (!addr) return 'unknown'
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

function clampConfidence(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}
