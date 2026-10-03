import { useId, type ReactNode } from 'react';

import { cx } from '@/shared/helpers/cx';

import styles from './Panel.module.scss';

interface PanelProps {
  title: string;
  description?: ReactNode;
  /** Controls shown on the right side of the header, such as "Clear all". */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Titled card section. The heading labels the region for assistive technology. */
export function Panel({ title, description, actions, className, children }: PanelProps) {
  const headingId = useId();
  return (
    <section className={cx(styles.panel, className)} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
