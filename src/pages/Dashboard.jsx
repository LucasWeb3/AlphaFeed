import { useMemo, useState } from 'react'
import mockSignals from '../data/mockSignals'
import Filters from '../components/Filters'
import SignalCard from '../components/SignalCard'
import { useSignals } from '../hooks/useSignals'
import styles from './Dashboard.module.css'

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

export default function Dashboard() {
  const [direction, setDirection] = useState('all')
  const [source, setSource] = useState('all')
  const [minConfidence, setMinConfidence] = useState(0)

  // Live data, refreshing every 60s. Falls back to mock signals if all sources fail.
  const { signals, errors, loading, fetchedAt, refresh, classifierEnabled } = useSignals({
    intervalMs: 60_000,
    mockFallback: mockSignals,
  })

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      if (direction !== 'all' && s.direction !== direction) return false
      if (source !== 'all' && s.sourceType !== source) return false
      if (s.confidence < minConfidence) return false
      return true
    })
  }, [signals, direction, source, minConfidence])

  const stats = useMemo(() => {
    const bullish = signals.filter((s) => s.direction === 'bullish').length
    const bearish = signals.filter((s) => s.direction === 'bearish').length
    const highConf = signals.filter((s) => s.confidence >= 80).length
    return { bullish, bearish, highConf, total: signals.length }
  }, [signals])

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowBracket}>[</span>
            <span className={styles.eyebrowNum}>01</span>
            <span className={styles.eyebrowBracket}>]</span>
            <span>// live feed</span>
          </span>
          <h1 className={styles.title}>
            Everything the internet is <em>saying</em>
          </h1>
          <p className={styles.subtitle}>
            Real-time classification of on-chain movement, news, and public
            crypto channels. Signals are scored by confidence — cross-source
            correlation weighs highest.
          </p>
        </div>

        <dl className={styles.stats}>
          <div>
            <dt>Bullish</dt>
            <dd className={styles.statBullish}>{stats.bullish}</dd>
          </div>
          <div>
            <dt>Bearish</dt>
            <dd className={styles.statBearish}>{stats.bearish}</dd>
          </div>
          <div>
            <dt>High conf</dt>
            <dd>{stats.highConf}</dd>
          </div>
          <div>
            <dt>Total 24h</dt>
            <dd className={styles.statMuted}>{stats.total}</dd>
          </div>
        </dl>
      </header>

      <Filters
        direction={direction}
        onDirectionChange={setDirection}
        source={source}
        onSourceChange={setSource}
        minConfidence={minConfidence}
        onMinConfidenceChange={setMinConfidence}
        count={filtered.length}
      />

      <div className={styles.feedBar}>
        <span className={styles.feedStatus}>
          {loading ? 'Refreshing…' : fetchedAt ? `Updated ${relativeTime(fetchedAt)}` : 'Idle'}
        </span>
        <span className={`${styles.classifierPill} ${classifierEnabled ? styles.classifierOn : styles.classifierOff}`}>
          <span className={styles.classifierDot} />
          Gemini {classifierEnabled ? 'on' : 'off'}
        </span>
        {errors.length > 0 && (
          <span className={styles.feedError}>
            {errors.length} source{errors.length > 1 ? 's' : ''} failed
          </span>
        )}
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className={styles.refreshBtn}
        >
          Refresh
        </button>
      </div>

      <div className={styles.feed}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>No signals match these filters.</p>
            <p className={styles.emptyHint}>Try lowering the confidence threshold.</p>
          </div>
        ) : (
          filtered.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        )}
      </div>
    </div>
  )
}
