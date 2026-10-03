import { useState, type SyntheticEvent } from 'react';

import { ConversionSettingsForm } from '@/domain/components/ConversionSettingsForm';
import { OutputDetails } from '@/domain/components/OutputDetails';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { QueueItem } from '@/domain/types/queue';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { formatBytes, formatDimensions } from '@/shared/helpers/formatters';

import styles from './VideoPreviewModal.module.scss';

interface VideoPreviewModalProps {
  item: QueueItem;
  globalSettings: ConversionSettings;
  onCustomSettingsChange: (id: string, settings: ConversionSettings | null) => void;
  onClose: () => void;
}

export function VideoPreviewModal({
  item,
  globalSettings,
  onCustomSettingsChange,
  onClose,
}: VideoPreviewModalProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [gifKey, setGifKey] = useState(0);

  const { metadata, result } = item;
  const settings = item.customSettings ?? globalSettings;
  const isLocked = item.status === 'processing';

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(event.currentTarget.currentTime);
  };

  return (
    <Modal open title={item.file.name} size="lg" onClose={onClose}>
      <div className={styles.layout}>
        {result && (
          <section className={styles.result} aria-label="Converted GIF">
            <div className={styles.gifFrame}>
              <img key={gifKey} src={result.url} alt={`GIF preview of ${item.file.name}`} />
            </div>
            <div className={styles.resultInfo}>
              <h3 className={styles.subheading}>{result.fileName}</h3>
              <dl className={styles.resultFacts}>
                <dt>Dimensions</dt>
                <dd>{formatDimensions(result.dimensions.width, result.dimensions.height)}</dd>
                <dt>Frames</dt>
                <dd>{result.frameCount}</dd>
                <dt>File size</dt>
                <dd>{formatBytes(result.size)}</dd>
                <dt>Loop</dt>
                <dd>{result.settings.loop === 'infinite' ? 'Infinite' : 'Once'}</dd>
              </dl>
              <Button
                label="Replay GIF"
                icon="play"
                size="sm"
                variant="secondary"
                onClick={() => setGifKey((key) => key + 1)}
              />
            </div>
          </section>
        )}

        <div className={styles.columns}>
          <div className={styles.videoColumn}>
            <h3 className={styles.subheading}>Source video</h3>
            <video
              className={styles.video}
              src={item.sourceUrl}
              controls
              muted
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onSeeked={handleTimeUpdate}
            />
            {metadata && (
              <>
                <h3 className={styles.subheading}>Estimated GIF</h3>
                <OutputDetails settings={settings} metadata={metadata} />
              </>
            )}
          </div>

          <div className={styles.settingsColumn}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={item.customSettings !== null}
                disabled={isLocked}
                onChange={(event) =>
                  onCustomSettingsChange(item.id, event.target.checked ? { ...globalSettings } : null)
                }
              />
              <span>
                <strong>Use custom settings for this file</strong>
                <span className={styles.toggleHint}>
                  Turn on to pick a section of this video or override the Output settings.
                </span>
              </span>
            </label>
            {isLocked && <p className={styles.lockedHint}>Settings are locked while this file converts.</p>}
            {item.customSettings && metadata && (
              <ConversionSettingsForm
                value={item.customSettings}
                duration={metadata.duration}
                currentTime={currentTime}
                disabled={isLocked}
                onChange={(next) => onCustomSettingsChange(item.id, next)}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
