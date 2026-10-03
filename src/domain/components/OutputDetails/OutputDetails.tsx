import { buildConversionPlan, gifDurationSeconds } from '@/domain/helpers/conversionPlan';
import { QUALITY_PRESETS, isPresetAdjusted } from '@/domain/helpers/qualityPresets';
import type { ConversionSettings, VideoMetadata } from '@/domain/types/conversion';
import { formatDimensions, formatSeconds, formatSpeed } from '@/shared/helpers/formatters';

import styles from './OutputDetails.module.scss';

interface OutputDetailsProps {
  settings: ConversionSettings;
  metadata: VideoMetadata;
}

/** What the GIF will look like with these settings, before converting. */
export function OutputDetails({ settings, metadata }: OutputDetailsProps) {
  const plan = buildConversionPlan(settings, metadata);
  const rows: Array<[string, string]> = [
    [
      'Dimensions',
      `${formatDimensions(plan.output.width, plan.output.height)}${plan.widthCapped ? ' (capped at source width)' : ''}`,
    ],
    ['Section', `${formatSeconds(plan.start)} to ${formatSeconds(plan.end)}`],
    ['Speed', formatSpeed(plan.speed)],
    ['GIF length', formatSeconds(gifDurationSeconds(plan))],
    ['Frame rate', `${plan.fps} FPS`],
    ['Frames', String(plan.frameTimes.length)],
    [
      'Preset',
      `${QUALITY_PRESETS[settings.quality].label}${isPresetAdjusted(settings) ? ' (adjusted)' : ''}`,
    ],
    ['Loop', settings.loop === 'infinite' ? 'Infinite' : 'Once'],
  ];

  return (
    <dl className={styles.list}>
      {rows.map(([term, detail]) => (
        <div key={term} className={styles.row}>
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
