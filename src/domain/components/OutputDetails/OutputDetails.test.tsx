import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';

import { OutputDetails } from './OutputDetails';

test('describes the planned GIF for the given settings', () => {
  render(
    <OutputDetails
      settings={{
        ...DEFAULT_SETTINGS,
        width: 480,
        frameRate: 10,
        section: { mode: 'range', start: 1, end: 3 },
      }}
      metadata={{ duration: 10, width: 1920, height: 1080 }}
    />,
  );
  expect(screen.getByText('480×270')).toBeInTheDocument();
  expect(screen.getByText('1.0 s to 3.0 s')).toBeInTheDocument();
  expect(screen.getByText('20')).toBeInTheDocument();
});

test('explains when the requested width was capped', () => {
  render(
    <OutputDetails
      settings={{ ...DEFAULT_SETTINGS, width: 720 }}
      metadata={{ duration: 2, width: 640, height: 360 }}
    />,
  );
  expect(screen.getByText('640×360 (capped at source width)')).toBeInTheDocument();
});
