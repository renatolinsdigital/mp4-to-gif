import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';

import styles from './Badge.module.scss';

interface BadgeProps {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'primary' | 'accent';
  icon?: IconName;
  children: ReactNode;
}

/** Small status label. The text carries the meaning; color only reinforces it. */
export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone])}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
