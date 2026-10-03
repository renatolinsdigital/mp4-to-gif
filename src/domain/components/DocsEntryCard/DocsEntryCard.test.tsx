import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';

import type { DocsEntry } from '@/domain/types/docs';

import { DocsEntryCard } from './DocsEntryCard';

const ENTRY: DocsEntry = {
  id: 'dithering',
  title: 'Dithering',
  summary: 'Hides banding with a fine pattern.',
  body: ['Ordered uses a Bayer pattern.'],
  facts: [{ aspect: 'Ordered', effect: 'about +15%' }],
  impact: [{ aspect: 'File size', effect: 'Bigger' }],
  tip: 'Turn it up before adding colors.',
  related: ['colors'],
};

function renderCard(terms: string[] = []) {
  return render(
    <MemoryRouter>
      <DocsEntryCard entry={ENTRY} terms={terms} related={[{ id: 'colors', title: 'Colors' }]} />
    </MemoryRouter>,
  );
}

test('renders the entry as an anchored article with all its parts', () => {
  renderCard();
  const article = screen.getByRole('article', { name: 'Dithering' });
  expect(article).toHaveAttribute('id', 'dithering');
  expect(screen.getByText('Hides banding with a fine pattern.')).toBeInTheDocument();
  expect(screen.getByText('about +15%')).toBeInTheDocument();
  expect(screen.getByText('Bigger')).toBeInTheDocument();
  expect(screen.getByText('Turn it up before adding colors.')).toBeInTheDocument();
});

test('links related entries outside the current search', () => {
  renderCard();
  expect(screen.getByRole('link', { name: /Colors/ })).toHaveAttribute('href', '/docs#colors');
  expect(screen.getByRole('link', { name: 'Link to Dithering' })).toHaveAttribute(
    'href',
    '#dithering',
  );
});

test('highlights search terms', () => {
  const { container } = renderCard(['bayer']);
  expect(container.querySelector('mark')).toHaveTextContent('Bayer');
});
