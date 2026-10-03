import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { LocalProcessingNotice } from './LocalProcessingNotice';

test('tells the user nothing is uploaded', () => {
  render(<LocalProcessingNotice />);
  expect(screen.getByText(/Nothing is uploaded/)).toBeInTheDocument();
});
