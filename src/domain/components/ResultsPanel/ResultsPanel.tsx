import { ResultCard } from '@/domain/components/ResultCard';
import { useResultDownloads } from '@/domain/hooks/useResultDownloads';
import type { QueueItem } from '@/domain/types/queue';
import { Button } from '@/shared/components/Button';
import { Panel } from '@/shared/components/Panel';
import { formatBytes, pluralize } from '@/shared/helpers/formatters';

import styles from './ResultsPanel.module.scss';

interface ResultsPanelProps {
  /** Completed queue items; each has a result. */
  items: QueueItem[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}

export function ResultsPanel({ items, onRemove, onClearCompleted }: ResultsPanelProps) {
  const { downloadOne, downloadAll, isPackaging } = useResultDownloads();
  const results = items.flatMap((item) => (item.result ? [item.result] : []));
  const totalSize = results.reduce((sum, result) => sum + result.size, 0);

  return (
    <Panel
      title="Results"
      description={`${pluralize(results.length, 'GIF')}, ${formatBytes(totalSize)} in total`}
      actions={
        <Button label="Clear completed" size="sm" variant="ghost" onClick={onClearCompleted} />
      }
    >
      <ul className={styles.grid} role="list">
        {items.map(({ id, file, result }) =>
          result ? (
            <ResultCard
              key={id}
              sourceName={file.name}
              result={result}
              onDownload={() => downloadOne(result)}
              onRemove={() => onRemove(id)}
            />
          ) : null,
        )}
      </ul>
      <div className={styles.footer}>
        <Button
          label={results.length > 1 ? `Download All (${results.length}) as ZIP` : 'Download All'}
          icon={results.length > 1 ? 'archive' : 'download'}
          size="lg"
          variant="accent"
          loading={isPackaging}
          onClick={() => void downloadAll(results)}
        />
      </div>
    </Panel>
  );
}
