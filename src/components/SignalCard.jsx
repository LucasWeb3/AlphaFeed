import { SOURCE_META } from '../data/mockSignals'
import styles from './SignalCard.module.css'

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export default function SignalCard({ signal }) {
  const src = SOURCE_META[signal.sourceType] || { label: signal.source, color: 'var(--text-mute)' }
  const dirClass = styles[signal.direction] || ''

  return (
    <article className={`${styles.card} ${dirClass}`}>
      <header className={styles.head}>
        <div className={styles.headLeft}>
          <span className={styles.token}>{signal.token}</span>
          <span
            className={`${styles.dirPill} ${styles[`pill_${signal.direction}`]}`}
          >
            <span className={styles.dirDot} aria-hidden="true" />
            {signal.direction}
          </span>
          <span
            className={styles.sourcePill}
            style={{ '--src-color': src.color }}
          >
            {src.label}
          </span>
          {signal.classifiedBy === 'gemini' && (
            <span className={styles.aiPill} title="Re-scored by Gemini">AI</span>
          )}
        </div>

        <div className={styles.headRight}>
          <div className={styles.confidence}>
            <span className={styles.confLabel}>Conf</span>
            <span className={styles.confValue}>{signal.confidence}</span>
            <div className={styles.confBar} aria-hidden="true">
              <div
                className={styles.confFill}
                style={{ width: `${signal.confidence}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <h3 className={styles.headline}>{signal.headline}</h3>
      <p className={styles.reason}>{signal.reason}</p>

      <footer className={styles.foot}>
        <span className={styles.meta}>{signal.source}</span>
        <span className={styles.metaSep}>·</span>
        <span className={styles.meta}>{relativeTime(signal.timestamp)}</span>
        {signal.url && signal.url !== '#' && (
          <>
            <span className={styles.metaSep}>·</span>
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Open source
              <span aria-hidden="true">&#8599;</span>
            </a>
          </>
        )}
      </footer>
    </article>
  )
}
