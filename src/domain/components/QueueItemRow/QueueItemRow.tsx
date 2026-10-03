import {
  buildConversionPlan,
  estimateGifSize,
  exceedsMemoryBudget,
  maxSecondsWithinBudget,
} from '@/domain/helpers/conversionPlan';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { QueueItem, QueueItemStatus } from '@/domain/types/queue';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { Icon, type IconName } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';
import { formatBytes, formatDimensions, formatDuration } from '@/shared/helpers/formatters';

import styles from './QueueItemRow.module.scss';

interface QueueItemRowProps {
  item: QueueItem;
  settings: ConversionSettings;
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
  onRequeue: (id: string) => void;
}

const STATUS_BADGES: Record<
  QueueItemStatus,
  { label: string; tone: 'neutral' | 'info' | 'success' | 'error' | 'primary'; icon: IconName }
> = {
  analyzing: { label: 'Reading', tone: 'neutral', icon: 'info' },
  waiting: { label: 'Waiting', tone: 'neutral', icon: 'film' },
  processing: { label: 'Processing', tone: 'primary', icon: 'cpu' },
  completed: { label: 'Completed', tone: 'success', icon: 'check' },
  error: { label: 'Error', tone: 'error', icon: 'alert' },
};

export function QueueItemRow({
  item,
  settings,
  onPreview,
  onRemove,
  onRequeue,
}: QueueItemRowProps) {
  const { file, metadata, status } = item;
  const badge = STATUS_BADGES[status];
  const plan = metadata && status === 'waiting' ? buildConversionPlan(settings, metadata) : null;
  const tooLarge = plan !== null && exceedsMemoryBudget(plan);
  const estimate = plan && !tooLarge ? estimateGifSize(plan) : null;
  const canRequeue = !!metadata && (status === 'error' || status === 'completed');

  return (
    <li
      className={cx(styles.row, status === 'error' && styles.hasError, tooLarge && styles.tooLarge)}
    >
      <div className={styles.thumbnail}>
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" />
        ) : (
          <Icon name="film" size={24} />
        )}
      </div>

      <div className={styles.details}>
        <p className={styles.name} title={file.name}>
          {file.name}
        </p>
        <p className={styles.meta}>
          {metadata ? (
            <>
              <span>{formatDuration(metadata.duration)}</span>
              <span>{formatDimensions(metadata.width, metadata.height)}</span>
            </>
          ) : null}
          <span>{formatBytes(file.size)}</span>
        </p>
        {plan && (
          <p className={styles.output}>
            → {formatDimensions(plan.output.width, plan.output.height)}
            {plan.widthCapped && ' (not upscaled)'} · {plan.frameTimes.length} frames
            {estimate !== null && ` · GIF about ${formatBytes(estimate)}`}
          </p>
        )}

        <div className={styles.statusLine}>
          {tooLarge ? (
            <Badge tone="warning" icon="alert">
              Too large
            </Badge>
          ) : (
            <Badge tone={badge.tone} icon={badge.icon}>
              {badge.label}
            </Badge>
          )}
          {item.customSettings && <Badge tone="info">Custom settings</Badge>}
          {status === 'waiting' && item.wasCancelled && (
            <span className={styles.note}>Cancelled. It will convert on the next run.</span>
          )}
          {status === 'completed' && item.result && (
            <span className={styles.note}>
              {item.result.fileName} · {formatBytes(item.result.size)}
            </span>
          )}
        </div>

        {status === 'processing' && (
          <ProgressBar
            value={item.progress}
            label={`Converting ${file.name}`}
            size="sm"
            showValue
          />
        )}
        {tooLarge && plan && (
          <p className={styles.warning}>
            <Icon name="alert" size={18} />
            <span>
              Too long for this size in browser memory. Trim it to{' '}
              {maxSecondsWithinBudget(plan.output, plan.fps)} s, or lower the frame rate or
              resolution.
            </span>
          </p>
        )}
        {status === 'error' && item.error && <p className={styles.error}>{item.error.message}</p>}
      </div>

      <div className={styles.actions}>
        <Button
          label={`Preview ${file.name}`}
          icon="eye"
          iconOnly
          variant="ghost"
          disabled={!metadata}
          onClick={() => onPreview(item.id)}
        />
        {canRequeue && (
          <Button
            label={status === 'error' ? `Retry ${file.name}` : `Convert ${file.name} again`}
            icon="refresh"
            iconOnly
            variant="ghost"
            onClick={() => onRequeue(item.id)}
          />
        )}
        <Button
          label={`Remove ${file.name}`}
          icon="trash"
          iconOnly
          variant="danger"
          onClick={() => onRemove(item.id)}
        />
      </div>
    </li>
  );
}
