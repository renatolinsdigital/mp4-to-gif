import { useState } from 'react';

import type { GifResult } from '@/domain/types/job';
import { Button } from '@/shared/components/Button';
import { Panel } from '@/shared/components/Panel';
import { downloadUrl } from '@/shared/helpers/downloadFile';
import { formatBytes, formatDimensions } from '@/shared/helpers/formatters';

import styles from './ResultPanel.module.scss';

interface ResultPanelProps {
  sourceName: string;
  result: GifResult;
}

/** The finished GIF with its facts, a download and a replay button. */
export function ResultPanel({ sourceName, result }: ResultPanelProps) {
  // Remounting the <img> restarts the animation, which is the only way to replay a GIF.
  const [playKey, setPlayKey] = useState(0);

  return (
    <Panel title="GIF" description={<span className={styles.fileName}>{result.fileName}</span>}>
      <div className={styles.layout}>
        <div className={styles.preview}>
          <img key={playKey} src={result.url} alt={`GIF preview of ${sourceName}`} />
        </div>
        <div className={styles.info}>
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
              <dd>{result.settings.loop === 'infinite' ? 'Infinite' : 'Once'}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <Button
              label="Download GIF"
              icon="download"
              variant="accent"
              size="lg"
              onClick={() => downloadUrl(result.url, result.fileName)}
            />
            <Button
              label="Replay"
              icon="play"
              variant="secondary"
              onClick={() => setPlayKey((key) => key + 1)}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}
