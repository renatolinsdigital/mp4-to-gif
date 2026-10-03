import type { ReactNode } from 'react';

import { ConversionSettingsForm } from '@/domain/components/ConversionSettingsForm';
import type { ConversionSettings } from '@/domain/types/conversion';
import { Button } from '@/shared/components/Button';
import { Panel } from '@/shared/components/Panel';
import { Icon } from '@/shared/icons';
import { formatBytes, pluralize } from '@/shared/helpers/formatters';

import styles from './OutputPanel.module.scss';

interface OutputPanelProps {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  waitingCount: number;
  customSettingsCount: number;
  /** Waiting files too large for browser memory with their settings. */
  oversizedCount?: number;
  estimatedSize: number | null;
  isRunning: boolean;
  onConvertAll: () => void;
  /** Batch progress, shown under the Convert All button while running. */
  children?: ReactNode;
}

export function OutputPanel({
  settings,
  onSettingsChange,
  waitingCount,
  customSettingsCount,
  oversizedCount = 0,
  estimatedSize,
  isRunning,
  onConvertAll,
  children,
}: OutputPanelProps) {
  const canConvert = waitingCount > 0 && !isRunning;
  const description =
    customSettingsCount > 0
      ? `Applies to all files except ${pluralize(customSettingsCount, 'file')} with custom settings.`
      : 'Applies to all files. Use a file’s preview to give it its own settings.';

  return (
    <Panel title="Output" description={description}>
      <ConversionSettingsForm value={settings} onChange={onSettingsChange} />

      <div className={styles.convert}>
        {estimatedSize !== null && !isRunning && (
          <p className={styles.estimate}>
            <span className={styles.estimateLabel}>
              Estimated output for {pluralize(waitingCount - oversizedCount, 'file')}
            </span>
            <strong className={styles.estimateValue}>about {formatBytes(estimatedSize)}</strong>
          </p>
        )}
        {oversizedCount > 0 && !isRunning && (
          <p className={styles.warning}>
            <Icon name="alert" size={18} />
            {pluralize(oversizedCount, 'file is', 'files are')} too large for browser memory at
            these settings and will fail. Check the queue for how far to trim them.
          </p>
        )}
        <Button
          label={
            isRunning
              ? 'Converting…'
              : waitingCount > 1
                ? `Convert All (${waitingCount})`
                : 'Convert All'
          }
          icon="sparkle"
          size="lg"
          fullWidth
          loading={isRunning}
          disabled={!canConvert}
          onClick={onConvertAll}
        />
        {waitingCount === 0 && !isRunning && (
          <p className={styles.hint}>Add at least one valid MP4 file to start converting.</p>
        )}
        {isRunning && (
          <p className={styles.hint}>Files you add now will be converted in this batch.</p>
        )}
        {estimatedSize !== null && !isRunning && (
          <p className={styles.hint}>
            GIF size depends heavily on the video’s content. Treat it as a guide.
          </p>
        )}
        {children}
      </div>
    </Panel>
  );
}
