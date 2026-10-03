import { useId, useState } from 'react';

import { LOSSY_TOLERANCES, QUALITY_PRESETS, isTuned } from '@/domain/helpers/qualityPresets';
import type {
  DitherMode,
  LossyLevel,
  PaletteMode,
  PixelSkipLevel,
  QualityPreset,
  QualityTuning,
} from '@/domain/types/conversion';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { Icon } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';

import styles from './QualityTuningFields.module.scss';

interface QualityTuningFieldsProps {
  quality: QualityPreset;
  value: QualityTuning;
  onChange: (tuning: QualityTuning) => void;
  disabled?: boolean;
}

const COLOR_OPTIONS = [
  { value: '64', label: '64', hint: 'flat' },
  { value: '128', label: '128', hint: 'balanced' },
  { value: '256', label: '256', hint: 'max' },
] as const;

const DITHER_OPTIONS: ReadonlyArray<{ value: DitherMode; label: string; hint: string }> = [
  { value: 'off', label: 'Off', hint: 'banding' },
  { value: 'ordered', label: 'Ordered', hint: 'Bayer' },
  { value: 'diffusion', label: 'Diffusion', hint: 'Floyd–Steinberg' },
];

const PALETTE_OPTIONS: ReadonlyArray<{ value: PaletteMode; label: string; hint: string }> = [
  { value: 'global', label: 'Shared', hint: 'smaller' },
  { value: 'perFrame', label: 'Adaptive', hint: 'truer color' },
];

const PIXEL_SKIP_OPTIONS: ReadonlyArray<{ value: PixelSkipLevel; label: string; hint: string }> = [
  { value: 'off', label: 'Off', hint: 'lossless' },
  { value: 'light', label: 'Light', hint: '≤ 4' },
  { value: 'medium', label: 'Medium', hint: '≤ 12' },
  { value: 'strong', label: 'Strong', hint: '≤ 24' },
];

const LOSSY_OPTIONS: ReadonlyArray<{ value: LossyLevel; label: string; hint: string }> = [
  { value: 'off', label: 'Off', hint: 'exact' },
  { value: 'light', label: 'Light', hint: `≤ ${LOSSY_TOLERANCES.light}` },
  { value: 'medium', label: 'Medium', hint: `≤ ${LOSSY_TOLERANCES.medium}` },
  { value: 'strong', label: 'Strong', hint: `≤ ${LOSSY_TOLERANCES.strong}` },
];

/**
 * Collapsible advanced controls that override parts of the quality preset. A value equal
 * to the preset's is dropped from the tuning, so "Tuned" only shows for real changes.
 */
export function QualityTuningFields({
  quality,
  value,
  onChange,
  disabled,
}: QualityTuningFieldsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const preset = QUALITY_PRESETS[quality];
  const tuned = isTuned(quality, value);

  const update = <K extends keyof QualityTuning>(key: K, next: NonNullable<QualityTuning[K]>) => {
    const rest = Object.fromEntries(
      Object.entries(value).filter(([field]) => field !== key),
    ) as QualityTuning;
    onChange(next === preset[key] ? rest : { ...rest, [key]: next });
  };

  return (
    <div className={cx(styles.box, open && styles.open)}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span className={styles.toggleLabel}>Fine-tune quality</span>
        <span className={styles.toggleEnd}>
          {tuned && <Badge tone="accent">Tuned from {preset.label}</Badge>}
          <Icon name="chevronDown" size={16} className={styles.chevron} />
        </span>
      </button>

      {open && (
        <div id={panelId} className={styles.panel}>
          <SegmentedControl
            legend="Colors per palette"
            options={COLOR_OPTIONS}
            value={String(value.maxColors ?? preset.maxColors) as '64' | '128' | '256'}
            disabled={disabled}
            compact
            onChange={(raw) => update('maxColors', Number(raw) as 64 | 128 | 256)}
          />
          <div className={styles.group}>
            <SegmentedControl
              legend="Dithering"
              options={DITHER_OPTIONS}
              value={value.dither ?? preset.dither}
              disabled={disabled}
              onChange={(dither) => update('dither', dither)}
            />
            <p className={styles.hint}>
              Diffusion gives the smoothest gradients and skin tones, at the largest size.
            </p>
          </div>
          <SegmentedControl
            legend="Palette"
            options={PALETTE_OPTIONS}
            value={value.paletteMode ?? preset.paletteMode}
            disabled={disabled}
            onChange={(paletteMode) => update('paletteMode', paletteMode)}
          />
          <div className={styles.group}>
            <SegmentedControl
              legend="Skip unchanged pixels"
              options={PIXEL_SKIP_OPTIONS}
              value={value.pixelSkip ?? preset.pixelSkip}
              disabled={disabled}
              compact
              onChange={(pixelSkip) => update('pixelSkip', pixelSkip)}
            />
            <p className={styles.hint}>
              Off keeps every changed pixel. Stronger settings ignore more video noise in still
              areas; anything that actually moves is always redrawn.
            </p>
          </div>
          <div className={styles.group}>
            <SegmentedControl
              legend="Lossy compression"
              options={LOSSY_OPTIONS}
              value={value.lossy ?? preset.lossy}
              disabled={disabled}
              compact
              onChange={(lossy) => update('lossy', lossy)}
            />
            <p className={styles.hint}>
              Reuses a nearly identical color where that compresses better. The loss shows as fine
              grain, never streaks; biggest savings on dithered or noisy footage.
            </p>
          </div>
          {tuned && (
            <div>
              <Button
                label="Reset fine-tuning"
                icon="refresh"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => onChange({})}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
