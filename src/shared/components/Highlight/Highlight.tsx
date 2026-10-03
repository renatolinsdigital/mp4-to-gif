import styles from './Highlight.module.scss';

interface HighlightProps {
  text: string;
  /** Words to mark, matched case-insensitively. */
  terms: readonly string[];
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Renders text with every occurrence of the search terms wrapped in `<mark>`. */
export function Highlight({ text, terms }: HighlightProps) {
  const words = terms.filter(Boolean);
  if (words.length === 0) return text;

  // Longest first, so "frame rate" wins over "frame" where both match.
  const pattern = new RegExp(
    `(${[...words]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|')})`,
    'gi',
  );
  // With a capturing group, split() puts the matches at the odd indexes.
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className={styles.mark}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
