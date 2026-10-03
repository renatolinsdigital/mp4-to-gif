import { afterEach, expect, test, vi } from 'vitest';

import { ContactNotConfiguredError, getContactEndpoint, submitContactForm } from './contact.service';

const values = { name: 'Ada', email: 'ada@example.com', message: 'Hello there, nice tool.' };

afterEach(() => {
  vi.unstubAllGlobals();
});

test('reads and validates the endpoint from the environment', () => {
  expect(getContactEndpoint({ VITE_CONTACT_ENDPOINT: 'https://forms.example.com/x' })).toBe(
    'https://forms.example.com/x',
  );
  expect(getContactEndpoint({ VITE_CONTACT_ENDPOINT: '' })).toBeNull();
  expect(getContactEndpoint({})).toBeNull();
  expect(() => getContactEndpoint({ VITE_CONTACT_ENDPOINT: 'not a url' })).toThrow(/VITE_CONTACT_ENDPOINT/);
});

test('refuses to send when no endpoint is configured', async () => {
  await expect(submitContactForm(values, null)).rejects.toBeInstanceOf(ContactNotConfiguredError);
});

test('posts the validated values as JSON', async () => {
  const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);

  await submitContactForm({ ...values, name: '  Ada  ' }, 'https://forms.example.com/x');

  expect(fetchMock).toHaveBeenCalledWith(
    'https://forms.example.com/x',
    expect.objectContaining({ method: 'POST', body: JSON.stringify(values) }),
  );
});

test('surfaces non-2xx responses as errors', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
  await expect(submitContactForm(values, 'https://forms.example.com/x')).rejects.toThrow(/500/);
});
