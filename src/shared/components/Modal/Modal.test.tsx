import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { Modal } from './Modal';

test('renders nothing while closed', () => {
  render(
    <Modal open={false} title="Preview" onClose={() => {}}>
      Body
    </Modal>,
  );
  expect(screen.queryByText('Body')).not.toBeInTheDocument();
});

test('renders a dialog labelled by its title', () => {
  render(
    <Modal open title="Preview clip.mp4" onClose={() => {}}>
      Body
    </Modal>,
  );
  expect(screen.getByRole('dialog', { name: 'Preview clip.mp4' })).toHaveTextContent('Body');
});

test('calls onClose from the close button', () => {
  const onClose = vi.fn();
  render(
    <Modal open title="Preview" onClose={onClose}>
      Body
    </Modal>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
