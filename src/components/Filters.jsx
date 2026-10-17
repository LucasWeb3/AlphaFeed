import styles from './Filters.module.css'

const DIRECTIONS = [
  { key: 'all', label: 'All' },
  { key: 'bullish', label: 'Bullish' },
  { key: 'bearish', label: 'Bearish' },
  { key: 'neutral', label: 'Neutral' },
]

const SOURCES = [
  { key: 'all', label: 'All sources' },
  { key: 'on-chain', label: 'On-chain' },
  { key: 'news', label: 'News' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'reddit', label: 'Reddit' },
]

export default function Filters({
  direction,
  onDirectionChange,
  source,
  onSourceChange,
  minConfidence,
  onMinConfidenceChange,
  count,
}) {
  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        <span className={styles.label}>Direction</span>
        <div className={styles.segments}>
          {DIRECTIONS.map((d) => (
            <button
              key={d.key}
              className={`${styles.chip} ${direction === d.key ? styles.chipActive : ''}`}
              onClick={() => onDirectionChange(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Source</span>
        <div className={styles.segments}>
          {SOURCES.map((s) => (
            <button
              key={s.key}
              className={`${styles.chip} ${source === s.key ? styles.chipActive : ''}`}
              onClick={() => onSourceChange(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>
          Min conf <span className={styles.labelVal}>{minConfidence}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minConfidence}
          onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
          className={styles.slider}
        />
      </div>

      <div className={styles.count}>
        {count} {count === 1 ? 'signal' : 'signals'}
      </div>
    </div>
  )
}
