import { describe, expect, test } from 'vitest';

import { DOCS_SECTIONS } from '@/domain/helpers/docsContent';
import { normalizeForSearch, scoreEntry, searchDocs } from '@/domain/helpers/docsSearch';
import type { DocsSection } from '@/domain/types/docs';

const SECTIONS: DocsSection[] = [
  {
    id: 'a',
    title: 'A',
    intro: '',
    entries: [
      { id: 'loop', title: 'Loop', summary: 'Repeats forever or plays once.', body: [] },
      {
        id: 'frame-rate',
        title: 'Frame rate',
        keywords: ['fps'],
        summary: 'Frames per second.',
        body: ['Higher is smoother, and the loop length stays the same.'],
      },
    ],
  },
  {
    id: 'b',
    title: 'B',
    intro: '',
    entries: [
      {
        id: 'dithering',
        title: 'Dithering',
        summary: 'Hides banding.',
        body: ['Floyd–Steinberg.'],
      },
    ],
  },
];

/** Looks up a fixture entry by id; throws so a typo fails the test loudly. */
function entry(id: string) {
  const found = SECTIONS.flatMap((section) => section.entries).find((item) => item.id === id);
  if (!found) throw new Error(`No fixture entry "${id}"`);
  return found;
}

const resultIds = (result: ReturnType<typeof searchDocs>) =>
  result.sections.flatMap((section) => section.entries.map((item) => item.id));

describe('normalizeForSearch', () => {
  test('ignores case and accents, and treats × as x', () => {
    expect(normalizeForSearch('Café 1920×1080')).toBe('cafe 1920x1080');
  });
});

describe('scoreEntry', () => {
  test('ranks a title hit above a body hit', () => {
    expect(scoreEntry(entry('loop'), ['loop'])).toBeGreaterThan(
      scoreEntry(entry('frame-rate'), ['loop']),
    );
  });

  test('is zero when any term is missing', () => {
    expect(scoreEntry(entry('frame-rate'), ['fps', 'banding'])).toBe(0);
  });
});

describe('searchDocs', () => {
  test('returns everything for an empty query', () => {
    const result = searchDocs(SECTIONS, '   ');
    expect(result.matchCount).toBe(3);
    expect(result.sections).toHaveLength(2);
  });

  test('keeps only entries that contain every term, and drops empty sections', () => {
    const result = searchDocs(SECTIONS, 'FPS second');
    expect(result.matchCount).toBe(1);
    expect(result.sections.map((section) => section.id)).toEqual(['a']);
    expect(resultIds(result)).toEqual(['frame-rate']);
  });

  test('matches keywords that never appear in the visible text', () => {
    expect(resultIds(searchDocs(SECTIONS, 'fps'))).toEqual(['frame-rate']);
  });

  test('orders entries and sections by relevance', () => {
    const result = searchDocs(SECTIONS, 'loop');
    expect(resultIds(result)).toEqual(['loop', 'frame-rate']);
  });

  test('finds real docs by the words people use', () => {
    const ids = (query: string) => resultIds(searchDocs(DOCS_SECTIONS, query));
    expect(ids('bayer')[0]).toBe('dithering');
    expect(ids('hevc')).toContain('unsupported-encoding');
    expect(ids('1920x1080')).toContain('best-export');
    expect(ids('trim')[0]).toBe('section');
  });
});

describe('DOCS_SECTIONS', () => {
  test('ids are unique and every related id points at an entry', () => {
    const entries = DOCS_SECTIONS.flatMap((section) => section.entries);
    const ids = new Set(entries.map((item) => item.id));
    expect(ids.size).toBe(entries.length);
    for (const item of entries) {
      for (const related of item.related ?? []) expect(ids).toContain(related);
    }
  });

  test('has no em dashes, per the writing guide', () => {
    expect(JSON.stringify(DOCS_SECTIONS)).not.toContain('—');
  });
});
