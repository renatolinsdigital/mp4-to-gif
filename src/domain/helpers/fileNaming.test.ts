import { describe, expect, test } from 'vitest';

import { gifBaseName, gifFileName } from './fileNaming';

test('gifFileName swaps the extension for .gif', () => {
  expect(gifFileName('my-video.mp4')).toBe('my-video.gif');
  expect(gifFileName('trip.day-1.MP4')).toBe('trip.day-1.gif');
});

describe('gifBaseName', () => {
  test('keeps inner dots and strips unsafe characters', () => {
    expect(gifBaseName('trip.day-1.mp4')).toBe('trip.day-1');
    expect(gifBaseName('a:b?.mp4')).toBe('a-b-');
  });

  test('falls back to "video" for an empty name', () => {
    expect(gifBaseName('.mp4')).toBe('video');
  });
});
