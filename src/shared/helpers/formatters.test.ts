import { expect, test } from 'vitest';

import { formatBytes, formatDuration, formatSeconds, formatSpeed, pluralize } from './formatters';

test('formatBytes picks a readable unit', () => {
  expect(formatBytes(0)).toBe('0 B');
  expect(formatBytes(512)).toBe('512 B');
  expect(formatBytes(24 * 1024 ** 2)).toBe('24.0 MB');
  expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.50 GB');
});

test('formatDuration uses m:ss or h:mm:ss', () => {
  expect(formatDuration(75.4)).toBe('1:15');
  expect(formatDuration(3725)).toBe('1:02:05');
});

test('formatSeconds shows one decimal', () => {
  expect(formatSeconds(12.34)).toBe('12.3 s');
});

test('pluralize', () => {
  expect(pluralize(1, 'file')).toBe('1 file');
  expect(pluralize(3, 'file')).toBe('3 files');
});

test('formatSpeed shows the multiplier', () => {
  expect(formatSpeed(2)).toBe('2×');
  expect(formatSpeed(0.25)).toBe('0.25×');
});
