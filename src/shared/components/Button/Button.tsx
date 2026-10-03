import { Icon, type IconName } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';

import styles from './Button.module.scss';

interface ButtonProps {
  label: string;
  /** `primary` is the one main action; `accent` (blue) is for strong secondary actions. */
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  /** Shows only the icon; `label` becomes the accessible name and tooltip. */
  iconOnly?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconOnly = false,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        iconOnly && styles.iconOnly,
        fullWidth && styles.fullWidth,
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      onClick={onClick}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 16 : size === 'lg' ? 24 : 18} />
      )}
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}
