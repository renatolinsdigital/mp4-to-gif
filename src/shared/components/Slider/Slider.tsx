import { useId } from 'react';

import { cx } from '@/shared/helpers/cx';

import styles from './Slider.module.scss';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Readable value, such as "2×". Shown beside the label and announced by screen readers. */
  valueText?: string;
  hint?: string;
  /** Labels under the track, spread evenly from min to max. An empty string leaves a gap. */
  scale?: readonly string[];
  disabled?: boolean;
}

/** Native range input, so arrow keys, Home/End and Page Up/Down work out of the box. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueText,
  hint,
  scale,
  disabled,
}: SliderProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className={cx(styles.field, disabled && styles.disabled)}>
      <div className={styles.header}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        <output className={styles.value} htmlFor={id}>
          {valueText ?? value}
        </output>
      </div>
      <input
        id={id}
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {scale && (
        <div className={styles.scale} aria-hidden="true">
          {scale.map((mark, index) => (
            <span key={index} className={styles.mark}>
              {mark}
            </span>
          ))}
        </div>
      )}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
