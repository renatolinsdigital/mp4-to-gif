import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { Panel } from './Panel';

test('renders a region labelled by its title, with actions and content', () => {
  render(
    <Panel title="Files" actions={<button type="button">Clear all</button>}>
      <p>Queue content</p>
    </Panel>,
  );

  const region = screen.getByRole('region', { name: 'Files' });
  expect(region).toHaveTextContent('Queue content');
  expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
});
