import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { useFocusShortcut } from './useFocusShortcut';

afterEach(() => {
  document.body.innerHTML = '';
});

function setup() {
  const target = document.createElement('input');
  const other = document.createElement('textarea');
  document.body.append(target, other);
  renderHook(() => useFocusShortcut('/', { current: target }));
  return { target, other };
}

test('focuses the target when the key is pressed on the page', () => {
  const { target } = setup();
  fireEvent.keyDown(document.body, { key: '/' });
  expect(target).toHaveFocus();
});

test('leaves the key alone while typing in another field', () => {
  const { target, other } = setup();
  other.focus();
  fireEvent.keyDown(other, { key: '/' });
  expect(target).not.toHaveFocus();
});
