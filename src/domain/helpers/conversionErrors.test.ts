import { expect, test } from 'vitest';

import { CONVERSION_ERROR_MESSAGES, ConversionError, toConversionError } from './conversionErrors';

test('keeps ConversionErrors as they are', () => {
  const error = new ConversionError('corrupted');
  expect(toConversionError(error)).toBe(error);
  expect(error.message).toBe(CONVERSION_ERROR_MESSAGES.corrupted);
});

test('maps memory exhaustion to insufficient-memory', () => {
  expect(toConversionError(new RangeError('Array buffer allocation failed')).code).toBe(
    'insufficient-memory',
  );
  expect(toConversionError(new Error('Out of memory')).code).toBe('insufficient-memory');
});

test('maps aborts to cancelled', () => {
  expect(toConversionError(new DOMException('stop', 'AbortError')).code).toBe('cancelled');
});

test('maps anything else to conversion-failed', () => {
  expect(toConversionError(new Error('boom')).code).toBe('conversion-failed');
  expect(toConversionError('weird').code).toBe('conversion-failed');
});
