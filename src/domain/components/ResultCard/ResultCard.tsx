import { useState } from 'react';

import type { GifResult } from '@/domain/types/queue';
import { Button } from '@/shared/components/Button';
import { formatBytes, formatDimensions } from '@/shared/helpers/formatters';

import styles from './ResultCard.module.scss';

interface ResultCardProps {
  sourceName: string;
  result: GifResult;
  onDownload: () => void;
  onRemove: () => void;
}

export function ResultCard({ sourceName, result, onDownload, onRemove }: ResultCardProps) {
  // Remounting the <img> restarts the animation, which is the only way to replay a GIF.
  const [playKey, setPlayKey] = useState(0);
  const loopsOnce = result.settings.loop === 'once';

  return (
    <li className={styles.card}>
      <div className={styles.preview}>
        <img key={playKey} src={result.url} alt={`GIF preview of ${sourceName}`} loading="lazy" />
      </div>
      <div className={styles.body}>
        <p className={styles.gifName} title={result.fileName}>
          {result.fileName}
        </p>
        <p className={styles.source} title={sourceName}>
          from {sourceName}
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(result.size)}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>{formatDimensions(result.dimensions.width, result.dimensions.height)}</dd>
          </div>
          <div>
            <dt>Frames</dt>
            <dd>{result.frameCount}</dd>
          </div>
          <div>
            <dt>Loop</dt>
            <dd>{loopsOnce ? 'Once' : 'Infinite'}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <Button label="Download" icon="download" size="sm" onClick={onDownload} />
          <Button
            label="Replay"
            icon="play"
            size="sm"
            variant="secondary"
            onClick={() => setPlayKey((key) => key + 1)}
          />
          <Button
            label={`Remove ${result.fileName}`}
            icon="trash"
            iconOnly
            size="sm"
            variant="danger"
            onClick={onRemove}
          />
        </div>
      </div>
    </li>
  );
}
