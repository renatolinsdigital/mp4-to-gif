import { useEffect } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

import { Button } from '@/shared/components/Button';

import styles from './RouteErrorPage.module.scss';

// A page's code chunk can't be loaded, usually because a new version was deployed while
// the tab was open, or the connection dropped. Reloading fixes both.
const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function describe(error: unknown): { title: string; text: string; detail: string } {
  if (isRouteErrorResponse(error)) {
    return {
      title: `Error ${error.status}`,
      text: 'This page couldn’t be loaded.',
      detail: `${error.status} ${error.statusText}`,
    };
  }
  const detail = error instanceof Error ? error.message : String(error);
  if (CHUNK_LOAD_ERROR.test(detail)) {
    return {
      title: 'Page needs a reload',
      text: 'This page couldn’t be downloaded. The site may have been updated, or the connection dropped. Reloading usually fixes it.',
      detail,
    };
  }
  return {
    title: 'Something broke',
    text: 'This page hit an unexpected error. Reloading usually fixes it.',
    detail,
  };
}

/**
 * Shown in place of a page that throws while loading or rendering. The site header stays,
 * so the rest of the app is still reachable.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const { title, text, detail } = describe(error);

  useEffect(() => {
    console.error('Route error', error);
  }, [error]);

  return (
    <div className={styles.page} role="alert">
      <p className={styles.eyebrow}>Error</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <Button label="Reload page" icon="refresh" onClick={() => window.location.reload()} />
        <Link to="/" className={styles.homeLink}>
          Go to Home
        </Link>
      </div>
      {import.meta.env.DEV && (
        <details className={styles.details}>
          <summary>Technical details</summary>
          <pre>{error instanceof Error && error.stack ? error.stack : detail}</pre>
        </details>
      )}
    </div>
  );
}
