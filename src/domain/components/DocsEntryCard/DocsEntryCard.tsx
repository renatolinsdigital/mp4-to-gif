import { Link } from 'react-router';

import type { DocsEntry, DocsImpact } from '@/domain/types/docs';
import { Highlight } from '@/shared/components/Highlight';
import { Icon } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';

import styles from './DocsEntryCard.module.scss';

interface DocsEntryCardProps {
  entry: DocsEntry;
  /** Search terms to highlight. */
  terms: readonly string[];
  /** Titles of the entries in `entry.related`, in the same order. */
  related: ReadonlyArray<{ id: string; title: string }>;
}

function PairGrid({
  label,
  pairs,
  terms,
  tone,
}: {
  label: string;
  pairs: readonly DocsImpact[];
  terms: readonly string[];
  tone: 'facts' | 'impact';
}) {
  return (
    <div className={styles.pairs}>
      <h4 className={styles.pairsLabel}>{label}</h4>
      <dl className={cx(styles.grid, tone === 'impact' && styles.impact)}>
        {pairs.map((pair) => (
          <div key={pair.aspect}>
            <dt>
              <Highlight text={pair.aspect} terms={terms} />
            </dt>
            <dd>
              <Highlight text={pair.effect} terms={terms} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** One documented term: what it is, how it works, and what changing it does to the GIF. */
export function DocsEntryCard({ entry, terms, related }: DocsEntryCardProps) {
  const headingId = `${entry.id}-heading`;

  return (
    <article id={entry.id} className={styles.card} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h3 id={headingId} className={styles.title}>
          <Highlight text={entry.title} terms={terms} />
        </h3>
        <a href={`#${entry.id}`} className={styles.permalink} aria-label={`Link to ${entry.title}`}>
          #
        </a>
      </header>

      <p className={styles.summary}>
        <Highlight text={entry.summary} terms={terms} />
      </p>

      {entry.body.map((paragraph) => (
        <p key={paragraph} className={styles.body}>
          <Highlight text={paragraph} terms={terms} />
        </p>
      ))}

      {entry.facts && <PairGrid label="Values" pairs={entry.facts} terms={terms} tone="facts" />}
      {entry.impact && <PairGrid label="Impact" pairs={entry.impact} terms={terms} tone="impact" />}

      {entry.tip && (
        <p className={styles.tip}>
          <span className={styles.tipLabel}>Tip</span>
          <span>
            <Highlight text={entry.tip} terms={terms} />
          </span>
        </p>
      )}

      {related.length > 0 && (
        <nav className={styles.related} aria-label={`Related to ${entry.title}`}>
          <span className={styles.relatedLabel}>See also</span>
          <ul role="list">
            {related.map((item) => (
              <li key={item.id}>
                {/* Leaves the search, so the target is shown even if it didn't match. */}
                <Link to={{ pathname: '/docs', hash: item.id }} className={styles.relatedLink}>
                  {item.title} <Icon name="arrowRight" size={14} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}
