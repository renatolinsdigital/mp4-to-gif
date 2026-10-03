import type { BatchProgressSummary } from '@/domain/helpers/queueSelectors';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';

import styles from './BatchProgress.module.scss';

interface BatchProgressProps {
  summary: BatchProgressSummary;
  onCancelCurrent: () => void;
  onCancelAll: () => void;
}

export function BatchProgress({ summary, onCancelCurrent, onCancelAll }: BatchProgressProps) {
  const { currentItem } = summary;
  return (
    <section className={styles.progress} aria-label="Conversion progress">
      <p className={styles.heading} aria-live="polite">
        Converting {summary.currentPosition} of {summary.total}
      </p>
      <ProgressBar value={summary.overallProgress} label="Overall progress" size="lg" showValue />

      {currentItem && (
        <div className={styles.current}>
          <p className={styles.fileName} title={currentItem.file.name}>
            {currentItem.file.name}
          </p>
          <ProgressBar value={currentItem.progress} label="Current file progress" showValue />
        </div>
      )}

      <dl className={styles.counts}>
        <div>
          <dt>Completed</dt>
          <dd>{summary.completed}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{summary.remaining}</dd>
        </div>
        {summary.failed > 0 && (
          <div className={styles.failed}>
            <dt>Failed</dt>
            <dd>{summary.failed}</dd>
          </div>
        )}
      </dl>

      <div className={styles.actions}>
        <Button
          label="Cancel current file"
          size="sm"
          variant="secondary"
          disabled={!currentItem}
          onClick={onCancelCurrent}
        />
        <Button label="Cancel all" icon="stop" size="sm" variant="danger" onClick={onCancelAll} />
      </div>
    </section>
  );
}
