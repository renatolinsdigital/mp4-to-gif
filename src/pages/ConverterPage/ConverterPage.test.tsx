import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import {
  ConverterContext,
  type ConverterContextValue,
} from '@/domain/components/ConverterProvider/converterContext';
import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import { ToastProvider } from '@/shared/components/Toast';
import { makeGifResult, makeJob } from '@/tests/fixtures';

import { ConverterPage } from './ConverterPage';

function renderPage(overrides: Partial<ConverterContextValue> = {}) {
  const value: ConverterContextValue = {
    job: null,
    settings: DEFAULT_SETTINGS,
    selectFiles: vi.fn(),
    clearFile: vi.fn(),
    setSettings: vi.fn(),
    convert: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
  render(
    <ToastProvider>
      <ConverterContext.Provider value={value}>
        <ConverterPage />
      </ConverterContext.Provider>
    </ToastProvider>,
  );
  return value;
}

test('starts with the upload area and the local processing notice', () => {
  renderPage();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Converter');
  expect(screen.getByText('Drop an MP4 file here')).toBeInTheDocument();
  expect(screen.getByText(/Nothing is uploaded/)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Settings' })).not.toBeInTheDocument();
});

test('shows the video with the settings below it once a file is chosen', () => {
  renderPage({ job: makeJob() });
  const video = screen.getByRole('region', { name: 'Video' });
  const settings = screen.getByRole('region', { name: 'Settings' });
  expect(screen.queryByText('Drop an MP4 file here')).not.toBeInTheDocument();
  expect(video.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('Convert to GIF starts the conversion', () => {
  const value = renderPage({ job: makeJob() });
  fireEvent.click(screen.getByRole('button', { name: 'Convert to GIF' }));
  expect(value.convert).toHaveBeenCalledTimes(1);
});

test('shows the GIF once converted', () => {
  renderPage({
    job: makeJob({ status: 'completed', result: makeGifResult({ fileName: 'done.gif' }) }),
  });
  expect(screen.getByRole('region', { name: 'GIF' })).toHaveTextContent('done.gif');
  expect(screen.getByRole('button', { name: 'Convert again' })).toBeEnabled();
});

test('Remove clears the file', () => {
  const value = renderPage({ job: makeJob() });
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(value.clearFile).toHaveBeenCalledTimes(1);
});
