import { describe, expect, test } from 'vitest';

import { archiveFileName, gifBaseName, gifFileName, uniqueGifName } from './fileNaming';

test('gifFileName swaps the extension for .gif', () => {
  expect(gifFileName('my-video.mp4')).toBe('my-video.gif');
  expect(gifFileName('trip.day-1.MP4')).toBe('trip.day-1.gif');
});

describe('uniqueGifName', () => {
  test('swaps the extension for .gif', () => {
    expect(uniqueGifName('my-video.mp4', [])).toBe('my-video.gif');
  });

  test('adds -2, -3 when the name is taken', () => {
    expect(uniqueGifName('my-video.mp4', ['my-video.gif'])).toBe('my-video-2.gif');
    expect(uniqueGifName('my-video.mp4', ['my-video.gif', 'my-video-2.gif'])).toBe(
      'my-video-3.gif',
    );
  });

  test('reuses a freed slot', () => {
    expect(uniqueGifName('my-video.mp4', ['my-video-2.gif'])).toBe('my-video.gif');
  });

  test('ignores case when checking for duplicates', () => {
    expect(uniqueGifName('Clip.MP4', ['clip.gif'])).toBe('Clip-2.gif');
  });
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

test('archiveFileName stamps the local date and time', () => {
  expect(archiveFileName(new Date(2026, 9, 2, 9, 5))).toBe('gifs-20261002-0905.zip');
});
