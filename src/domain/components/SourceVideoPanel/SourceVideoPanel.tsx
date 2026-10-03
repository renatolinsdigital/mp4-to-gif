import { useRef, useState } from 'react';

import { resolveSection } from '@/domain/helpers/conversionPlan';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { ConversionJob } from '@/domain/types/job';
import { Button } from '@/shared/components/Button';
import { Panel } from '@/shared/components/Panel';
import { Icon } from '@/shared/icons';
import {
  formatBytes,
  formatDimensions,
  formatDuration,
  formatSeconds,
} from '@/shared/helpers/formatters';

import styles from './SourceVideoPanel.module.scss';

interface SourceVideoPanelProps {
  job: ConversionJob;
  settings: ConversionSettings;
  onRemove: () => void;
  /** Playback position, so the settings can set a section from the current frame. */
  onTimeChange: (seconds: number) => void;
}

/** The video being converted: playback, file facts and the section that will be converted. */
export function SourceVideoPanel({ job, settings, onRemove, onTimeChange }: SourceVideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playingSection, setPlayingSection] = useState(false);

  const { file, metadata, status } = job;
  const section = metadata ? resolveSection(settings.section, metadata.duration) : null;
  // Analysis failures leave no metadata; conversion failures are shown with the settings.
  const analysisError = !metadata && status === 'error' ? job.error : null;

  const playSection = () => {
    const video = videoRef.current;
    if (!video || !section) return;
    video.currentTime = section.start;
    setPlayingSection(true);
    void video.play();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    onTimeChange(video.currentTime);
    if (playingSection && section && video.currentTime >= section.end) {
      video.pause();
      setPlayingSection(false);
    }
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
            ref={videoRef}
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
            onPause={() => setPlayingSection(false)}
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
          {section && (
            <div className={styles.section}>
              <p>
                Converting <strong>{formatSeconds(section.start)}</strong> to{' '}
                <strong>{formatSeconds(section.end)}</strong>
              </p>
              <Button
                label="Play this section"
                icon="play"
                size="sm"
                variant="secondary"
                onClick={playSection}
              />
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
