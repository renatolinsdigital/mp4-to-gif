import { useId } from 'react';

import { cx } from '@/shared/helpers/cx';

import styles from './TextField.module.scss';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'number';
  multiline?: boolean;
  error?: string;
  hint?: string;
  /** Unit shown inside the input, e.g. "px". */
  suffix?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email';
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number | 'any';
  /** `sm` is for dense forms such as the conversion settings. */
  size?: 'md' | 'sm';
}

export function TextField({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  multiline = false,
  error,
  hint,
  suffix,
  required,
  autoComplete,
  inputMode,
  disabled,
  min,
  max,
  step,
  size = 'md',
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const sharedProps = {
    id,
    value,
    disabled,
    required,
    autoComplete,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onBlur,
  };

  return (
    <div className={cx(styles.field, size === 'sm' && styles.sm)}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className={cx(styles.control, error && styles.invalid)}>
        {multiline ? (
          <textarea
            {...sharedProps}
            className={styles.textarea}
            rows={5}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            {...sharedProps}
            className={styles.input}
            type={type}
            inputMode={inputMode}
            min={min}
            max={max}
            step={step}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {suffix && (
          <span className={styles.suffix} aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
