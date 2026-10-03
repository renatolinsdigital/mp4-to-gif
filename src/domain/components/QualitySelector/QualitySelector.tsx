import { QUALITY_PRESETS, QUALITY_PRESET_ORDER, presetHint } from '@/domain/helpers/qualityPresets';
import type { QualityPreset } from '@/domain/types/conversion';
import { SegmentedControl } from '@/shared/components/SegmentedControl';

import styles from './QualitySelector.module.scss';

interface QualitySelectorProps {
  value: QualityPreset;
  /** True when the settings below no longer match the preset. Offers a reset. */
  adjusted?: boolean;
  onChange: (value: QualityPreset) => void;
  disabled?: boolean;
}

const OPTIONS = QUALITY_PRESET_ORDER.map((preset) => ({
  value: preset,
  label: QUALITY_PRESETS[preset].label,
  hint: presetHint(preset),
}));

export function QualitySelector({ value, adjusted, onChange, disabled }: QualitySelectorProps) {
  return (
    <div className={styles.wrapper}>
      <SegmentedControl
        legend="Preset"
        options={OPTIONS}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <div className={styles.scale} aria-hidden="true">
        <span>← Smaller file</span>
        <span>Better quality →</span>
      </div>
      <div className={styles.summary} aria-live="polite">
        <p>{QUALITY_PRESETS[value].summary}</p>
        {adjusted && (
          <p className={styles.adjusted}>
            You changed some settings below.{' '}
            {/* Re-checking the selected radio fires no change event, so reset needs its own control. */}
            <button
              type="button"
              className={styles.reset}
              disabled={disabled}
              onClick={() => onChange(value)}
            >
              Reset to {QUALITY_PRESETS[value].label}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
