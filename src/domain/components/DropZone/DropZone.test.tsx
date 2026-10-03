import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DropZone } from './DropZone';

const mp4 = (name: string) => new File(['data'], name, { type: 'video/mp4' });

test('renders the drop prompt and the Choose File button', () => {
  render(<DropZone onFiles={() => {}} />);
  expect(screen.getByText('Drop an MP4 file here')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Choose File' })).toBeInTheDocument();
});

test('passes dropped files to onFiles', () => {
  const onFiles = vi.fn();
  render(<DropZone onFiles={onFiles} />);
  const files = [mp4('a.mp4')];

  fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files, types: ['Files'] } });

  expect(onFiles).toHaveBeenCalledWith(files);
});

test('passes the file picked with the file input', () => {
  const onFiles = vi.fn();
  render(<DropZone onFiles={onFiles} />);
  const file = mp4('clip.mp4');

  fireEvent.change(screen.getByLabelText('Choose an MP4 file'), { target: { files: [file] } });

  expect(onFiles).toHaveBeenCalledWith([file]);
});

test('the file picker accepts a single file', () => {
  render(<DropZone onFiles={() => {}} />);
  expect(screen.getByLabelText('Choose an MP4 file')).not.toHaveAttribute('multiple');
});

test('shows drag feedback while a file hovers over the zone', () => {
  render(<DropZone onFiles={() => {}} />);
  fireEvent.dragEnter(screen.getByTestId('drop-zone'), { dataTransfer: { types: ['Files'] } });
  expect(screen.getByText('Release to open it')).toBeInTheDocument();
});
