import { useRef } from 'react';

import { DocsEntryCard } from '@/domain/components/DocsEntryCard';
import { DOCS_SECTIONS } from '@/domain/helpers/docsContent';
import { useDocsSearch } from '@/domain/hooks/useDocsSearch';
import { Highlight } from '@/shared/components/Highlight';
import { SearchField } from '@/shared/components/SearchField';
import { pluralize } from '@/shared/helpers/formatters';
import { useFocusShortcut } from '@/shared/hooks/useFocusShortcut';
import { useScrollToHash } from '@/shared/hooks/useScrollToHash';

import styles from './DocsPage.module.scss';

const ENTRY_TITLES = new Map(
  DOCS_SECTIONS.flatMap((section) => section.entries.map((entry) => [entry.id, entry.title])),
);
const SECTION_NUMBERS = new Map(
  DOCS_SECTIONS.map((section, index) => [section.id, String(index + 1).padStart(2, '0')]),
);

function relatedEntries(ids: readonly string[] = []) {
  return ids.flatMap((id) => {
    const title = ENTRY_TITLES.get(id);
    return title ? [{ id, title }] : [];
  });
}

export function DocsPage() {
  const { query, setQuery, terms, sections, matchCount } = useDocsSearch();
  const searchRef = useRef<HTMLInputElement>(null);
  useFocusShortcut('/', searchRef);
  useScrollToHash();

  const isSearching = terms.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.title}>Know your GIF</h1>
        <p className={styles.lead}>
          Every preset, setting and number in the converter, explained in plain words: what it does,
          what it costs in file size, and when to change it.
        </p>

        <div className={styles.search} role="search">
          <SearchField
            ref={searchRef}
            label="Search the docs"
            placeholder="Try “banding” or “file size”"
            shortcut="/"
            value={query}
            onChange={setQuery}
          />
          <p className={styles.status} role="status">
            {isSearching
              ? `${pluralize(matchCount, 'result')} for “${query.trim()}”`
              : `${pluralize(matchCount, 'topic')}`}
          </p>
        </div>
      </header>

      {sections.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Nothing matches “{query.trim()}”</h2>
          <p>
            Try a shorter word, or one of the settings’ names, like “palette”, “lossy” or
            “resolution”.
          </p>
          <button type="button" className={styles.clearButton} onClick={() => setQuery('')}>
            Show all topics
          </button>
        </div>
      ) : (
        <div className={styles.layout}>
          <nav className={styles.toc} aria-label="Docs contents">
            {sections.map((section) => (
              <div key={section.id} className={styles.tocGroup}>
                <a href={`#${section.id}`} className={styles.tocSection}>
                  <span aria-hidden="true">{SECTION_NUMBERS.get(section.id)}</span>
                  {section.title}
                </a>
                <ul role="list">
                  {section.entries.map((entry) => (
                    <li key={entry.id}>
                      <a href={`#${entry.id}`} className={styles.tocLink}>
                        <Highlight text={entry.title} terms={terms} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className={styles.content}>
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className={styles.section}
                aria-labelledby={`${section.id}-title`}
              >
                <div className={styles.sectionHead}>
                  <span className={styles.sectionNumber} aria-hidden="true">
                    {SECTION_NUMBERS.get(section.id)}
                  </span>
                  <div>
                    <h2 id={`${section.id}-title`} className={styles.sectionTitle}>
                      {section.title}
                    </h2>
                    <p className={styles.sectionIntro}>{section.intro}</p>
                  </div>
                </div>
                {section.entries.map((entry) => (
                  <DocsEntryCard
                    key={entry.id}
                    entry={entry}
                    terms={terms}
                    related={relatedEntries(entry.related)}
                  />
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
