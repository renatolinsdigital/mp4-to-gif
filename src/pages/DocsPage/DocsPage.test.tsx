import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';

import { DocsPage } from './DocsPage';

function renderPage(path = '/docs') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DocsPage />
    </MemoryRouter>,
  );
}

test('lists every section and the terms shown on the Home page', () => {
  renderPage();
  expect(screen.getByRole('heading', { level: 1, name: 'Know your GIF' })).toBeInTheDocument();
  for (const title of ['The basics', 'Presets', 'Output settings', 'Fine-tune quality']) {
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
  }
  for (const term of ['Dithering', 'Skip unchanged pixels', 'Output summary', 'Full HD preset']) {
    expect(screen.getByRole('article', { name: term })).toBeInTheDocument();
  }
});

test('filters the docs as you type and reports the count', () => {
  renderPage();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search the docs' }), {
    target: { value: 'bayer' },
  });
  expect(screen.getByRole('status')).toHaveTextContent('result for “bayer”');
  expect(screen.getByRole('article', { name: 'Dithering' })).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'Loop' })).not.toBeInTheDocument();
});

test('reads the search from the URL and offers a way back when nothing matches', () => {
  renderPage('/docs?q=zzzz');
  expect(screen.getByRole('heading', { name: 'Nothing matches “zzzz”' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show all topics' }));
  expect(screen.getByRole('article', { name: 'Loop' })).toBeInTheDocument();
});
