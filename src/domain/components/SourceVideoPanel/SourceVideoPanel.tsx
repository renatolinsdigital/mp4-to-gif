import type { SyntheticEvent } from 'react';

import type { ConversionJob } from '@/domain/types/job';
import { Button } from '@/shared/components/Button';
import { Panel } from '@/shared/components/Panel';
import { Icon } from '@/shared/icons';
import { formatBytes, formatDimensions, formatDuration } from '@/shared/helpers/formatters';

import styles from './SourceVideoPanel.module.scss';

interface SourceVideoPanelProps {
  job: ConversionJob;
  onRemove: () => void;
  /** Playback position, so the settings can set a section from the current frame. */
  onTimeChange: (seconds: number) => void;
}

/** The video being converted: playback and file facts. */
export function SourceVideoPanel({ job, onRemove, onTimeChange }: SourceVideoPanelProps) {
  const { file, metadata, status } = job;
  // Analysis failures leave no metadata; conversion failures are shown with the settings.
  const analysisError = !metadata && status === 'error' ? job.error : null;

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    onTimeChange(event.currentTarget.currentTime);
  };

  return (
    <Panel
      title="Video"
      description={<span className={styles.fileName}>{file.name}</span>}
      actions={<Button label="Remove" icon="trash" size="sm" variant="ghost" onClick={onRemove} />}
    >
      <div className={styles.body}>
        {metadata ? (
          <video
            className={styles.video}
            src={job.sourceUrl}
            poster={job.posterUrl ?? undefined}
            controls
            muted
            playsInline
            preload="metadata"
            aria-label={`Preview of ${file.name}`}
            onLoadedMetadata={() => onTimeChange(0)}
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleTimeUpdate}
          />
        ) : (
          <div className={styles.placeholder}>
            <Icon name={analysisError ? 'alert' : 'film'} size={32} />
            <p role={analysisError ? 'alert' : 'status'}>
              {analysisError ? analysisError.message : 'Reading the video…'}
            </p>
          </div>
        )}

        <div className={styles.footer}>
          <p className={styles.meta}>
            {metadata && (
              <>
                <span>{formatDuration(metadata.duration)}</span>
                <span>{formatDimensions(metadata.width, metadata.height)}</span>
              </>
            )}
            <span>{formatBytes(file.size)}</span>
          </p>
        </div>
      </div>
    </Panel>
  );
}
