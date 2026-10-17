import { useState } from 'react'
import styles from './Settings.module.css'

const DEFAULT_SOURCES = [
  { key: 'on-chain', label: 'On-chain (Dexscreener, DeFiLlama, CoinGecko)', enabled: true },
  { key: 'news', label: 'News (CoinDesk, Cointelegraph, Decrypt, The Block)', enabled: true },
  { key: 'reddit', label: 'Reddit (r/CryptoCurrency, r/CryptoMarkets, r/ethfinance)', enabled: true },
  { key: 'telegram', label: 'Telegram public channels', enabled: false },
]

export default function Settings() {
  const [threshold, setThreshold] = useState(75)
  const [telegramHandle, setTelegramHandle] = useState('')
  const [sources, setSources] = useState(DEFAULT_SOURCES)

  const toggleSource = (key) => {
    setSources((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>
          <span className={styles.eyebrowNum}>02</span>
          <span>Settings</span>
        </span>
        <h1 className={styles.title}>Tune your feed.</h1>
        <p className={styles.subtitle}>
          Configure which sources feed the pipeline, when Telegram wakes you
          up, and what counts as a high-confidence signal.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Telegram bot handle</label>
          <input
            className={styles.input}
            placeholder="@your_handle"
            value={telegramHandle}
            onChange={(e) => setTelegramHandle(e.target.value)}
          />
          <p className={styles.hint}>
            Message <span className={styles.code}>/start</span> to{' '}
            <span className={styles.code}>@alphafeed_bot</span> to connect —
            we'll ping you when a signal crosses the threshold below.
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Notify threshold <span className={styles.thresholdVal}>{threshold}</span>
          </label>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className={styles.slider}
          />
          <p className={styles.hint}>
            Only signals scoring above this fire a push. Default 75 = roughly 3–8 alerts/day.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data sources</h2>
        <ul className={styles.sourceList}>
          {sources.map((s) => (
            <li key={s.key} className={styles.sourceRow}>
              <div className={styles.sourceInfo}>
                <span className={styles.sourceKey}>{s.key}</span>
                <span className={styles.sourceLabel}>{s.label}</span>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${s.enabled ? styles.toggleOn : ''}`}
                onClick={() => toggleSource(s.key)}
                aria-pressed={s.enabled}
              >
                <span className={styles.toggleKnob} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tracked tokens</h2>
        <p className={styles.hint}>
          Leave empty to receive signals for everything the pipeline surfaces.
          Add tickers (comma-separated) to filter the feed.
        </p>
        <input
          className={styles.input}
          placeholder="e.g. SOL, ETH, HYPE"
        />
      </section>

      <footer className={styles.foot}>
        <button className={styles.saveBtn}>Save settings</button>
        <p className={styles.footNote}>
          Not financial advice. Signals are aggregated from public sources and
          intended as research aids, not trade recommendations.
        </p>
      </footer>
    </div>
  )
}
