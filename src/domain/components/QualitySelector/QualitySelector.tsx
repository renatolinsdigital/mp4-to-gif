import { QUALITY_PRESETS, QUALITY_PRESET_ORDER } from '@/domain/helpers/qualityPresets';
import type { QualityPreset } from '@/domain/types/conversion';
import { SegmentedControl } from '@/shared/components/SegmentedControl';

import styles from './QualitySelector.module.scss';

interface QualitySelectorProps {
  value: QualityPreset;
  onChange: (value: QualityPreset) => void;
  disabled?: boolean;
}

const OPTIONS = QUALITY_PRESET_ORDER.map((preset) => ({
  value: preset,
  label: QUALITY_PRESETS[preset].label,
  hint: QUALITY_PRESETS[preset].hint,
}));

export function QualitySelector({ value, onChange, disabled }: QualitySelectorProps) {
  return (
    <div className={styles.wrapper}>
      <SegmentedControl
        legend="Quality"
        options={OPTIONS}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <div className={styles.scale} aria-hidden="true">
        <span>← Smaller file</span>
        <span>Better quality →</span>
      </div>
      <p className={styles.summary} aria-live="polite">
        {QUALITY_PRESETS[value].summary}
      </p>
    </div>
  );
}
