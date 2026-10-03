import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';

import { Icon } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';
import { useTheme } from '@/shared/hooks/useTheme';

import styles from './AppLayout.module.scss';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/converter', label: 'Converter', end: false },
  { to: '/docs', label: 'Docs', end: false },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cx(styles.navLink, isActive && styles.active);
}

export function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const { theme, toggleTheme } = useTheme();

  // Move focus to the new page after client-side navigation so screen reader and keyboard
  // users start at the content, like they would after a full page load.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand} aria-label="MP4 to GIF, home">
            <span className={styles.logo} aria-hidden="true">
              <Icon name="film" size={20} />
            </span>
            <span className={styles.wordmark} aria-hidden="true">
              MP4→GIF
            </span>
          </NavLink>
          {/* The mobile nav row has no room for a fourth link, so on mobile Donate is this
              icon in the brand row instead. Only one of the two is ever displayed. */}
          <NavLink
            to="/donate"
            className={({ isActive }) => cx(styles.donateShortcut, isActive && styles.active)}
            aria-label="Donate"
            title="Donate"
          >
            <Icon name="heart" size={20} />
          </NavLink>
          <div className={styles.headerEnd}>
            <nav aria-label="Main" className={styles.navWrapper}>
              <ul className={styles.nav} role="list">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to} className={styles.navItem}>
                    <NavLink to={item.to} end={item.end} className={navLinkClass}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
                <li className={cx(styles.navItem, styles.donateNavItem)}>
                  <NavLink to="/donate" className={navLinkClass}>
                    <Icon name="heart" size={18} /> Donate
                  </NavLink>
                </li>
              </ul>
            </nav>
            <button
              type="button"
              className={styles.themeToggle}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
            </button>
          </div>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <div key={pathname} className={styles.page}>
          <Outlet />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerNote}>
            <Icon name="lock" size={16} /> Files are processed in your browser and never uploaded
          </p>
          <p className={styles.copyright}>
            © {new Date().getFullYear()}{' '}
            <a
              className={styles.copyrightLink}
              href="https://www.linkedin.com/in/renatolinsdigital"
              target="_blank"
              rel="noopener noreferrer"
            >
              Renato Lins<span className="visually-hidden"> (opens LinkedIn in a new tab)</span>
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
