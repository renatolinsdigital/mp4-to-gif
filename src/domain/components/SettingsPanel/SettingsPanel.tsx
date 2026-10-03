import { ConversionSettingsForm } from '@/domain/components/ConversionSettingsForm';
import { OutputDetails } from '@/domain/components/OutputDetails';
import {
  buildConversionPlan,
  exceedsMemoryBudget,
  maxSecondsWithinBudget,
} from '@/domain/helpers/conversionPlan';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { ConversionJob } from '@/domain/types/job';
import { Button } from '@/shared/components/Button';
import { Panel } from '@/shared/components/Panel';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { Icon } from '@/shared/icons';

import styles from './SettingsPanel.module.scss';

interface SettingsPanelProps {
  job: ConversionJob;
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  /** Playback position of the source video, for setting a section from the current frame. */
  currentTime: number;
  onConvert: () => void;
  onCancel: () => void;
}

function convertLabel(job: ConversionJob): string {
  if (job.status === 'processing') return 'Converting…';
  if (job.result) return 'Convert again';
  return 'Convert to GIF';
}

/** Output settings for the current video, a summary of the GIF they make, and the Convert action. */
export function SettingsPanel({
  job,
  settings,
  onSettingsChange,
  currentTime,
  onConvert,
  onCancel,
}: SettingsPanelProps) {
  const { metadata, status } = job;
  const isProcessing = status === 'processing';
  const plan = metadata ? buildConversionPlan(settings, metadata) : null;
  const tooLarge = plan !== null && exceedsMemoryBudget(plan);
  const canConvert = plan !== null && !tooLarge && !isProcessing;
  // Analysis failures have no metadata and are shown with the video instead.
  const conversionError = metadata && status === 'error' ? job.error : null;

  return (
    <Panel title="Settings" className={styles.panel}>
      <ConversionSettingsForm
        value={settings}
        duration={metadata?.duration}
        currentTime={metadata ? currentTime : undefined}
        disabled={isProcessing}
        onChange={onSettingsChange}
      />

      <div className={styles.convert}>
        {metadata && !isProcessing && (
          <div>
            <h3 className={styles.subheading}>Output</h3>
            <OutputDetails settings={settings} metadata={metadata} />
          </div>
        )}
        {tooLarge && plan && (
          <p className={styles.warning}>
            <Icon name="alert" size={16} />
            <span>
              Too long for this size in browser memory. Trim it to{' '}
              {maxSecondsWithinBudget(plan.output, plan.fps)} s, or lower the frame rate or
              resolution.
            </span>
          </p>
        )}
        {conversionError && (
          <p className={styles.error} role="alert">
            {conversionError.message}
          </p>
        )}

        <Button
          label={convertLabel(job)}
          icon="sparkle"
          size="lg"
          fullWidth
          loading={isProcessing}
          disabled={!canConvert}
          onClick={onConvert}
        />

        {isProcessing && (
          <div className={styles.progress}>
            <ProgressBar value={job.progress} label="Conversion progress" showValue />
            <Button label="Cancel" icon="stop" size="sm" variant="danger" onClick={onCancel} />
          </div>
        )}
        {status === 'analyzing' && <p className={styles.hint}>Reading the video…</p>}
      </div>
    </Panel>
  );
}
