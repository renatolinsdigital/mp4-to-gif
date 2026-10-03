import { Link } from 'react-router';

import styles from './NotFoundPage.module.scss';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1>Page not found</h1>
      <p>That page doesn&apos;t exist.</p>
      <Link to="/converter">Go to the converter</Link>
    </div>
  );
}
