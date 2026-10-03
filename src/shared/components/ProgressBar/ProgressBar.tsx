import { cx } from '@/shared/helpers/cx';

import styles from './ProgressBar.module.scss';

interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'primary' | 'success' | 'error';
  showValue?: boolean;
}

export function ProgressBar({
  value,
  label,
  size = 'md',
  tone = 'primary',
  showValue = false,
}: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={styles.wrapper}>
      <div
        className={cx(styles.track, styles[size])}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={cx(styles.fill, styles[tone])} style={{ width: `${percent}%` }} />
      </div>
      {showValue && (
        <span className={styles.value} aria-hidden="true">
          {percent}%
        </span>
      )}
    </div>
  );
}
