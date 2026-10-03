import { useEffect, useState } from 'react';

import { Icon, type IconName } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';

import styles from './Toast.module.scss';
import type { ToastVariant } from './toastContext';

export const TOAST_DURATION_MS = 3000;
const EXIT_DURATION_MS = 200;

const VARIANT_ICONS: Record<ToastVariant, IconName> = {
  success: 'check',
  error: 'alert',
  warning: 'alert',
  info: 'info',
};

interface ToastProps {
  id?: number;
  variant: ToastVariant;
  message: string;
  /** Called once the toast has timed out. Must be stable, or the timer restarts. */
  onDismiss?: (id: number) => void;
}

/** Auto-dismissing notification. Errors use role="alert" so they interrupt; others don't. */
export function Toast({ id = 0, variant, message, onDismiss }: ToastProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!onDismiss) return;
    const exitTimer = setTimeout(() => setLeaving(true), TOAST_DURATION_MS - EXIT_DURATION_MS);
    const dismissTimer = setTimeout(() => onDismiss(id), TOAST_DURATION_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [id, onDismiss]);

  return (
    <div
      className={cx(styles.toast, styles[variant], leaving && styles.leaving)}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon name={VARIANT_ICONS[variant]} size={18} className={styles.icon} />
      <p className={styles.message}>{message}</p>
      <span className={styles.timer} aria-hidden="true" />
    </div>
  );
}
