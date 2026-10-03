import type { DocsEntry, DocsSection } from '@/domain/types/docs';

/** Lowercase, no accents, and "1920x1080" matches "1920×1080". */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/×/g, 'x')
    .replace(/[‘’]/g, "'")
    .toLowerCase();
}

export function searchTerms(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean);
}

// A hit in the title says far more about relevance than one deep in the body.
const FIELD_WEIGHTS = { title: 10, keywords: 6, summary: 3, rest: 1 } as const;

function entryFields(entry: DocsEntry): Record<keyof typeof FIELD_WEIGHTS, string> {
  const pairs = [...(entry.facts ?? []), ...(entry.impact ?? [])];
  return {
    title: normalizeForSearch(entry.title),
    keywords: normalizeForSearch((entry.keywords ?? []).join(' ')),
    summary: normalizeForSearch(entry.summary),
    rest: normalizeForSearch(
      [
        ...entry.body,
        entry.tip ?? '',
        ...pairs.map((pair) => `${pair.aspect} ${pair.effect}`),
      ].join(' '),
    ),
  };
}

/** 0 when any term is missing from the entry; otherwise higher means more relevant. */
export function scoreEntry(entry: DocsEntry, terms: readonly string[]): number {
  const fields = entryFields(entry);
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of Object.keys(FIELD_WEIGHTS) as Array<keyof typeof FIELD_WEIGHTS>) {
      if (fields[field].includes(term)) best = Math.max(best, FIELD_WEIGHTS[field]);
    }
    if (best === 0) return 0;
    score += best;
  }
  return score;
}

export interface DocsSearchResult {
  sections: DocsSection[];
  matchCount: number;
}

/**
 * Keeps the entries that contain every term. Within a section the best matches come first,
 * and sections are ordered by their best match, so the top result is always on top.
 */
export function searchDocs(sections: readonly DocsSection[], query: string): DocsSearchResult {
  const terms = searchTerms(query);
  if (terms.length === 0) {
    return {
      sections: [...sections],
      matchCount: sections.reduce((total, section) => total + section.entries.length, 0),
    };
  }

  const ranked = sections
    .map((section) => {
      const scored = section.entries
        .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
      return {
        section: { ...section, entries: scored.map((item) => item.entry) },
        best: scored[0]?.score ?? 0,
      };
    })
    .filter((item) => item.best > 0)
    .sort((a, b) => b.best - a.best);

  return {
    sections: ranked.map((item) => item.section),
    matchCount: ranked.reduce((total, item) => total + item.section.entries.length, 0),
  };
}
