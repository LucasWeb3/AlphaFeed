// Client-side classifier — calls OUR /api/classify endpoint which proxies
// Gemini server-side so the API key stays private. Falls back gracefully if
// the server returns `enabled: false` (key not set in env).

const BATCH_SIZE = 25
let enabledState = true // optimistic; flipped if /api/classify reports off

export function geminiEnabledInit() {
  return enabledState
}

const cache = new Map()

function cacheKey(signal) {
  return `${signal.source}::${signal.token}::${signal.headline}`
}

export async function classifySignals(signals) {
  if (!signals.length) return { signals, enabled: enabledState }

  const results = new Array(signals.length)
  const uncached = []
  const uncachedIndices = []

  signals.forEach((s, i) => {
    const hit = cache.get(cacheKey(s))
    if (hit) {
      results[i] = { ...s, ...hit, classifiedBy: 'gemini' }
    } else {
      uncached.push(s)
      uncachedIndices.push(i)
    }
  })

  const freshClassified = []
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE)
    const classified = await classifyBatch(batch)
    freshClassified.push(...classified)
  }

  freshClassified.forEach((s, i) => {
    const originalIndex = uncachedIndices[i]
    results[originalIndex] = s
    if (s.classifiedBy === 'gemini') {
      cache.set(cacheKey(s), {
        direction: s.direction,
        confidence: s.confidence,
        reason: s.reason,
      })
    }
  })

  // Backfill any gaps (defensive — shouldn't happen).
  for (let i = 0; i < results.length; i++) {
    if (results[i] == null) results[i] = signals[i]
  }

  return { signals: results, enabled: enabledState }
}

async function classifyBatch(batch) {
  const payload = batch.map((s, i) => ({
    idx: i,
    token: s.token,
    source: s.source,
    sourceType: s.sourceType,
    headline: s.headline,
    context: s.reason,
    initialConfidence: s.confidence,
    initialDirection: s.direction,
  }))

  // Abort the Gemini call after 30s so a slow backend never stalls the
  // whole refresh — fall back to heuristic scores if it misses.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)

  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
      signal: ctrl.signal,
    })

    if (!res.ok) {
      // Treat non-OK as transient — keep original signals, keep enabled flag.
      return batch
    }

    const data = await res.json()
    if (data.enabled === false) {
      enabledState = false
      return batch
    }
    enabledState = true

    const classifications = Array.isArray(data.classifications) ? data.classifications : []
    if (!classifications.length) return batch

    return batch.map((s, i) => {
      const c = classifications[i]
      if (!c) return s
      return {
        ...s,
        direction: c.direction || s.direction,
        confidence: Number.isFinite(c.confidence) ? clamp(c.confidence) : s.confidence,
        reason: c.reason || s.reason,
        classifiedBy: 'gemini',
      }
    })
  } catch (err) {
    console.warn('[classify] error:', err.message)
    return batch
  } finally {
    clearTimeout(timer)
  }
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}
