import { render } from '@testing-library/react';
import { expect, test } from 'vitest';

import { Highlight } from './Highlight';

test('renders plain text when there are no terms', () => {
  const { container } = render(<Highlight text="Frame rate" terms={[]} />);
  expect(container).toHaveTextContent('Frame rate');
  expect(container.querySelector('mark')).toBeNull();
});

test('marks every match, ignoring case', () => {
  const { container } = render(<Highlight text="Loop or loop again" terms={['LOOP']} />);
  const marks = [...container.querySelectorAll('mark')].map((mark) => mark.textContent);
  expect(marks).toEqual(['Loop', 'loop']);
  expect(container).toHaveTextContent('Loop or loop again');
});

test('treats terms as plain text, not patterns', () => {
  const { container } = render(<Highlight text="Up to (30) FPS" terms={['(30)']} />);
  expect(container.querySelector('mark')).toHaveTextContent('(30)');
});
