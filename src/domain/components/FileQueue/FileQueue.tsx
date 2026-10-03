import { QueueItemRow } from '@/domain/components/QueueItemRow';
import { effectiveSettings } from '@/domain/helpers/queueSelectors';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { QueueItem } from '@/domain/types/queue';
import { Button } from '@/shared/components/Button';
import { Panel } from '@/shared/components/Panel';
import { pluralize } from '@/shared/helpers/formatters';

import styles from './FileQueue.module.scss';

interface FileQueueProps {
  items: QueueItem[];
  settings: ConversionSettings;
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
  onRequeue: (id: string) => void;
  onClearAll: () => void;
}

export function FileQueue({ items, settings, onPreview, onRemove, onRequeue, onClearAll }: FileQueueProps) {
  const failed = items.filter((item) => item.status === 'error').length;
  const description = `${pluralize(items.length, 'file')}${failed > 0 ? `, ${failed} with problems` : ''}`;

  return (
    <Panel
      title="Files"
      description={description}
      actions={
        <Button label="Clear all" icon="trash" size="sm" variant="ghost" onClick={onClearAll} />
      }
    >
      <ul className={styles.list} role="list">
        {items.map((item) => (
          <QueueItemRow
            key={item.id}
            item={item}
            settings={effectiveSettings(item, settings)}
            onPreview={onPreview}
            onRemove={onRemove}
            onRequeue={onRequeue}
          />
        ))}
      </ul>
    </Panel>
  );
}
