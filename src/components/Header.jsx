import { NavLink } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 20 L10 4 L14 14 L17 8 L21 20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="square"
                strokeLinejoin="miter"
                fill="none"
              />
            </svg>
          </span>
          <span className={styles.brandText}>
            ALPHA<em>FEED</em>
          </span>
          <span className={styles.tag}>v0.1</span>
        </NavLink>

        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ''}`
            }
          >
            <span className={styles.linkPrefix}>&gt;</span> feed
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.linkActive : ''}`
            }
          >
            <span className={styles.linkPrefix}>&gt;</span> settings
          </NavLink>
        </nav>

        <div className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span className={styles.statusLabel}>LIVE</span>
          <span className={styles.statusCursor}>_</span>
        </div>
      </div>
      <div className={styles.scanline} aria-hidden="true" />
    </header>
  )
}
