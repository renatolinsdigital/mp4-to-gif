import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { SPEED_STEPS } from '@/domain/helpers/settingsSchema';

import { SpeedField } from './SpeedField';

test('starts at the video’s own speed', () => {
  render(<SpeedField value={1} onChange={() => {}} />);
  const slider = screen.getByRole('slider', { name: 'Speed' });
  expect(slider).toHaveAttribute('aria-valuetext', '1×');
  expect(slider).toHaveAccessibleDescription('Plays at the video’s own speed.');
});

test('maps slider positions to speeds', () => {
  const onChange = vi.fn();
  render(<SpeedField value={1} onChange={onChange} />);
  fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), {
    target: { value: String(SPEED_STEPS.indexOf(2)) },
  });
  expect(onChange).toHaveBeenCalledWith(2);
});

test('says how long the section will play at the chosen speed', () => {
  const { rerender } = render(<SpeedField value={2} sectionLength={60} onChange={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Speed' })).toHaveAccessibleDescription(
    '60.0 s of video becomes a 30.0 s GIF.',
  );

  rerender(<SpeedField value={0.5} sectionLength={10} onChange={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Speed' })).toHaveAccessibleDescription(
    '10.0 s of video becomes a 20.0 s GIF.',
  );
});

test('gives an example when the section length is unknown', () => {
  render(<SpeedField value={4} onChange={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Speed' })).toHaveAccessibleDescription(
    'A 60 s clip becomes a 15.0 s GIF.',
  );
});
