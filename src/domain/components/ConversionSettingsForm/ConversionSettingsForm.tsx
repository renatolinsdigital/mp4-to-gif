import { useState } from 'react';

import { QualitySelector } from '@/domain/components/QualitySelector';
import { QualityTuningFields } from '@/domain/components/QualityTuningFields';
import { SectionFields } from '@/domain/components/SectionFields';
import { maxSecondsWithinBudget, resolveFrameRate } from '@/domain/helpers/conversionPlan';
import { QUALITY_PRESETS } from '@/domain/helpers/qualityPresets';
import {
  MAX_CUSTOM_WIDTH,
  MIN_CUSTOM_WIDTH,
  validateCustomWidth,
} from '@/domain/helpers/settingsSchema';
import type {
  ConversionSettings,
  FrameRateOption,
  LoopMode,
  WidthOption,
} from '@/domain/types/conversion';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { TextField } from '@/shared/components/TextField';

import styles from './ConversionSettingsForm.module.scss';

interface ConversionSettingsFormProps {
  value: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
  /** Present when editing one file's settings. */
  duration?: number;
  currentTime?: number;
  disabled?: boolean;
}

const FRAME_RATES: readonly FrameRateOption[] = ['auto', 10, 15, 20, 24, 30];
const WIDTHS: ReadonlyArray<{ value: WidthOption; label: string; hint: string }> = [
  { value: 320, label: '320', hint: 'px' },
  { value: 480, label: '480', hint: 'px' },
  { value: 720, label: '720', hint: 'px' },
  { value: 1280, label: 'HD', hint: '1280 px' },
  { value: 1920, label: 'Full HD', hint: '1920 px' },
  { value: 'original', label: 'Original', hint: 'source' },
  { value: 'custom', label: 'Custom', hint: `${MIN_CUSTOM_WIDTH}–${MAX_CUSTOM_WIDTH}` },
];
const WIDTH_OPTIONS = WIDTHS.map((width) => ({ ...width, value: String(width.value) }));
const LOOP_OPTIONS = [
  { value: 'infinite', label: 'Infinite' },
  { value: 'once', label: 'Once' },
] as const;

// Widths from here up get a note about how long a clip can be before memory runs out.
const LARGE_WIDTH = 1280;

function parseFrameRate(raw: string): FrameRateOption {
  return raw === 'auto' ? 'auto' : (Number(raw) as FrameRateOption);
}

function parseWidth(raw: string): WidthOption {
  return raw === 'original' || raw === 'custom' ? raw : (Number(raw) as WidthOption);
}

function widthHint(width: WidthOption): string {
  switch (width) {
    case 1920:
      return 'Full HD: 1920 × 1080 for 16:9 video. Smaller videos are never upscaled.';
    case 1280:
      return 'HD: 1280 × 720 for 16:9 video. Smaller videos are never upscaled.';
    case 'original':
      return 'Keeps each video’s own width.';
    case 'custom':
      return 'Any width in pixels. Height follows the video’s aspect ratio.';
    default:
      return 'Height follows the video’s aspect ratio. Videos are never upscaled.';
  }
}

/** "At 30 FPS, 16:9 clips up to 19 s fit…" for large widths, or null. */
function memoryHint(settings: ConversionSettings): string | null {
  const width =
    settings.width === 'custom'
      ? settings.customWidth
      : settings.width === 'original'
        ? null
        : settings.width;
  if (width === null || width < LARGE_WIDTH) return null;
  const height = Math.round((width * 9) / 16);
  const fps = resolveFrameRate(settings);
  const seconds = maxSecondsWithinBudget({ width, height }, fps);
  return `At ${fps} FPS, 16:9 clips up to ${seconds} s fit in browser memory at ${width} × ${height}.`;
}

export function ConversionSettingsForm({
  value,
  onChange,
  duration,
  currentTime,
  disabled,
}: ConversionSettingsFormProps) {
  const [customWidthDraft, setCustomWidthDraft] = useState(String(value.customWidth));
  const [customWidthError, setCustomWidthError] = useState<string | null>(null);

  const update = <K extends keyof ConversionSettings>(key: K, next: ConversionSettings[K]) =>
    onChange({ ...value, [key]: next });

  const changeCustomWidth = (raw: string) => {
    setCustomWidthDraft(raw);
    const result = validateCustomWidth(raw);
    if ('error' in result) {
      setCustomWidthError(result.error);
      return;
    }
    setCustomWidthError(null);
    update('customWidth', result.value);
  };

  const autoFps = QUALITY_PRESETS[value.quality].autoFrameRate;
  const budget = memoryHint(value);

  return (
    <div className={styles.form}>
      <QualitySelector
        value={value.quality}
        // A new preset starts from its own defaults, so earlier fine-tuning is cleared.
        onChange={(quality) => onChange({ ...value, quality, tuning: {} })}
        disabled={disabled}
      />

      <div className={styles.group}>
        <SegmentedControl
          legend="Resolution"
          options={WIDTH_OPTIONS}
          value={String(value.width)}
          disabled={disabled}
          onChange={(raw) => update('width', parseWidth(raw))}
        />
        {value.width === 'custom' && (
          <TextField
            label="Custom width"
            type="number"
            inputMode="numeric"
            min={MIN_CUSTOM_WIDTH}
            max={MAX_CUSTOM_WIDTH}
            step={1}
            suffix="px"
            size="sm"
            value={customWidthDraft}
            error={customWidthError ?? undefined}
            disabled={disabled}
            onChange={changeCustomWidth}
          />
        )}
        <div className={styles.note}>
          <p>{widthHint(value.width)}</p>
          {budget && <p className={styles.budget}>{budget}</p>}
        </div>
      </div>

      <SegmentedControl
        legend="Frame rate"
        options={FRAME_RATES.map((rate) => ({
          value: String(rate),
          label: rate === 'auto' ? 'Auto' : String(rate),
          hint: rate === 'auto' ? `${autoFps} FPS` : 'FPS',
        }))}
        value={String(value.frameRate)}
        disabled={disabled}
        compact
        onChange={(raw) => update('frameRate', parseFrameRate(raw))}
      />

      <QualityTuningFields
        quality={value.quality}
        value={value.tuning}
        disabled={disabled}
        onChange={(tuning) => update('tuning', tuning)}
      />

      <SegmentedControl
        legend="Loop"
        options={LOOP_OPTIONS}
        value={value.loop}
        disabled={disabled}
        onChange={(loop: LoopMode) => update('loop', loop)}
      />

      <SectionFields
        value={value.section}
        duration={duration}
        currentTime={currentTime}
        disabled={disabled}
        onChange={(section) => update('section', section)}
      />
    </div>
  );
}
