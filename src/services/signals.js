import {
  fetchBoostedSignalCandidates,
} from './sources/dexscreener'
import {
  fetchTrendingSignalCandidates,
  fetchMoversSignalCandidates,
} from './sources/coingecko'
import { fetchRedditSignalCandidates } from './sources/reddit'
import { fetchRssSignalCandidates } from './sources/rss'
import { fetchTelegramSignalCandidates } from './sources/telegram'
import {
  fetchDefiLlamaProtocolCandidates,
  fetchDefiLlamaChainCandidates,
} from './sources/defillama'
import { classifySignals } from './classify'

// Fetch every browser-safe source in parallel and merge into a single signal list.
// Failures in one source don't kill the others.
export async function fetchAllSignals() {
  const jobs = [
    { name: 'dexscreener:boosted', fn: fetchBoostedSignalCandidates },
    { name: 'coingecko:trending', fn: fetchTrendingSignalCandidates },
    { name: 'coingecko:movers', fn: fetchMoversSignalCandidates },
    { name: 'defillama:protocols', fn: fetchDefiLlamaProtocolCandidates },
    { name: 'defillama:chains', fn: fetchDefiLlamaChainCandidates },
    { name: 'news:rss', fn: fetchRssSignalCandidates },
    { name: 'telegram', fn: fetchTelegramSignalCandidates },
    // Reddit disabled: their public endpoints reject unauthed requests from
    // most server IPs. Requires OAuth app registration to re-enable.
    // { name: 'reddit', fn: fetchRedditSignalCandidates },
  ]

  const settled = await Promise.allSettled(jobs.map((j) => j.fn()))
  const signals = []
  const errors = []

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      signals.push(...result.value)
    } else {
      errors.push({ source: jobs[i].name, message: result.reason?.message || String(result.reason) })
    }
  })

  const withIds = signals.map((s, i) => ({
    ...s,
    id: `${s.source}-${s.token}-${i}-${Date.now()}`,
  }))

  const deduped = dedupeByTokenAndSource(withIds)

  // Gemini classification pass — re-scores confidence, direction, and reason
  // via our server-side /api/classify route. Reports back whether Gemini is
  // actually enabled (server env var present) so the UI can show on/off state.
  const { signals: classified, enabled: classifierEnabled } = await classifySignals(deduped)

  const sorted = [...classified].sort((a, b) => b.confidence - a.confidence)

  return {
    signals: sorted,
    errors,
    fetchedAt: new Date().toISOString(),
    classifierEnabled,
  }
}

// Same token from the same source shouldn't appear twice in one poll.
function dedupeByTokenAndSource(signals) {
  const seen = new Map()
  for (const s of signals) {
    const key = `${s.source}::${s.token}::${s.direction}`
    if (!seen.has(key)) seen.set(key, s)
  }
  return Array.from(seen.values())
}
