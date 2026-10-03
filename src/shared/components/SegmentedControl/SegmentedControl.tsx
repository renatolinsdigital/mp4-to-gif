import { useId } from 'react';

import { cx } from '@/shared/helpers/cx';

import styles from './SegmentedControl.module.scss';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Small second line under the label, such as "1920 px". Part of the option's name. */
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Narrower options, for short labels like frame rates. */
  compact?: boolean;
  /** Taller options with display-size labels, for a few prominent choices like amounts. */
  large?: boolean;
}

/** Radio group styled as connected buttons. Arrow keys move between options natively. */
export function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  compact = false,
  large = false,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset
      className={cx(styles.fieldset, compact && styles.compact, large && styles.large)}
      disabled={disabled}
    >
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.group}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(styles.option, option.value === value && styles.selected)}
          >
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
            {/* The space keeps the accessible name readable: "Full HD 1920 px". */}
            {option.hint && (
              <>
                {' '}
                <span className={styles.hint}>{option.hint}</span>
              </>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
