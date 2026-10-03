import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { useTheme } from './useTheme';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test('toggles the theme, applies it to the page and remembers it', () => {
  const { result } = renderHook(() => useTheme());
  const initial = result.current.theme;

  act(() => result.current.toggleTheme());

  const next = initial === 'dark' ? 'light' : 'dark';
  expect(result.current.theme).toBe(next);
  expect(document.documentElement.dataset.theme).toBe(next);
  expect(localStorage.getItem('mp4-to-gif:theme')).toBe(next);
});

test('starts from a stored choice', () => {
  localStorage.setItem('mp4-to-gif:theme', 'dark');
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});
