// DefiLlama — free public API, CORS-enabled, no auth.
// TVL swings on protocols/chains are a leading indicator: capital shows up
// before headlines, and drains before rugs.

const PROTOCOLS_URL = 'https://api.llama.fi/protocols'
const CHAINS_URL = 'https://api.llama.fi/chains'

// Only surface protocols/chains with material TVL. Sub-$10M is noisy
// (small pools with %-move spikes that don't matter).
const MIN_TVL = 10_000_000

export async function fetchProtocols() {
  const res = await fetch(PROTOCOLS_URL)
  if (!res.ok) throw new Error(`DefiLlama /protocols failed: ${res.status}`)
  return res.json()
}

export async function fetchChains() {
  const res = await fetch(CHAINS_URL)
  if (!res.ok) throw new Error(`DefiLlama /chains failed: ${res.status}`)
  return res.json()
}

// Protocol TVL movers — signals on protocols whose 1d TVL change is meaningful.
export async function fetchDefiLlamaProtocolCandidates() {
  const data = await fetchProtocols()
  if (!Array.isArray(data)) return []

  // Sort by |1d change| desc; take material protocols
  const filtered = data
    .filter((p) => (p.tvl || 0) >= MIN_TVL && Number.isFinite(p.change_1d))
    .sort((a, b) => Math.abs(b.change_1d) - Math.abs(a.change_1d))
    .slice(0, 12)

  return filtered.map((p) => {
    const change = p.change_1d
    const bullish = change > 0
    return {
      source: 'DefiLlama',
      sourceType: 'on-chain',
      token: (p.symbol && p.symbol !== '-' ? p.symbol.toUpperCase() : p.name),
      tokenName: p.name,
      direction: bullish ? 'bullish' : 'bearish',
      // Base confidence 60–90 scaled by magnitude of TVL move.
      confidence: Math.round(
        Math.min(90, 60 + Math.min(Math.abs(change) * 1.5, 30))
      ),
      headline: `${p.name} TVL ${bullish ? 'up' : 'down'} ${change.toFixed(1)}% in 24h ($${formatTvl(p.tvl)})`,
      reason: `${p.category || 'DeFi protocol'} on ${(p.chains || []).slice(0, 3).join(', ') || 'multi-chain'}. Capital ${bullish ? 'flowing in' : 'draining'} — often front-runs price action.`,
      url: p.url || `https://defillama.com/protocol/${p.slug || ''}`,
      icon: p.logo,
      timestamp: new Date().toISOString(),
    }
  })
}

// Chain TVL movers — same idea but at the chain level (broader signal).
export async function fetchDefiLlamaChainCandidates() {
  const data = await fetchChains()
  if (!Array.isArray(data)) return []

  const filtered = data
    .filter((c) => (c.tvl || 0) >= MIN_TVL * 5) // higher bar for chains
    .filter((c) => Number.isFinite(c.change_1d))
    .sort((a, b) => Math.abs(b.change_1d) - Math.abs(a.change_1d))
    .slice(0, 5)

  return filtered.map((c) => {
    const change = c.change_1d
    const bullish = change > 0
    return {
      source: 'DefiLlama',
      sourceType: 'on-chain',
      token: c.tokenSymbol?.toUpperCase() || c.name.toUpperCase(),
      tokenName: c.name,
      direction: bullish ? 'bullish' : 'bearish',
      confidence: Math.round(
        Math.min(88, 62 + Math.min(Math.abs(change) * 1.4, 26))
      ),
      headline: `${c.name} chain TVL ${bullish ? 'up' : 'down'} ${change.toFixed(1)}% in 24h ($${formatTvl(c.tvl)})`,
      reason: `Chain-wide TVL move — broader signal than a single protocol. ${bullish ? 'Rotation into' : 'Rotation out of'} this ecosystem is underway.`,
      url: `https://defillama.com/chain/${encodeURIComponent(c.name)}`,
      timestamp: new Date().toISOString(),
    }
  })
}

function formatTvl(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}
