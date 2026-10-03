import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { SectionFields } from './SectionFields';

test('hides start and end inputs when converting the entire video', () => {
  render(<SectionFields value={{ mode: 'full' }} onChange={() => {}} />);
  expect(screen.getByRole('radio', { name: 'Entire video' })).toBeChecked();
  expect(screen.queryByLabelText('Start')).not.toBeInTheDocument();
});

test('switching to a section proposes the first 5 seconds, capped to the duration', () => {
  const onChange = vi.fn();
  render(<SectionFields value={{ mode: 'full' }} duration={3.2} onChange={onChange} />);
  fireEvent.click(screen.getByRole('radio', { name: 'A section' }));
  expect(onChange).toHaveBeenCalledWith({ mode: 'range', start: 0, end: 3.2 });
});

test('commits valid edits and reports invalid ones without committing', () => {
  const onChange = vi.fn();
  render(<SectionFields value={{ mode: 'range', start: 1, end: 4 }} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText('End'), { target: { value: '6' } });
  expect(onChange).toHaveBeenLastCalledWith({ mode: 'range', start: 1, end: 6 });

  onChange.mockClear();
  fireEvent.change(screen.getByLabelText('Start'), { target: { value: '9' } });
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('End must be after start.');
});

test('sets the start from the preview playback position', () => {
  const onChange = vi.fn();
  render(
    <SectionFields
      value={{ mode: 'range', start: 0, end: 8 }}
      duration={10}
      currentTime={2.46}
      onChange={onChange}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Set start to current frame' }));
  expect(onChange).toHaveBeenCalledWith({ mode: 'range', start: 2.5, end: 8 });
});
