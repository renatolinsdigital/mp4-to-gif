import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100, 'Keep your name under 100 characters.'),
  email: z.string().trim().min(1, 'Enter your email address.').pipe(z.email('Enter a valid email address.')),
  message: z
    .string()
    .trim()
    .min(10, 'Write at least 10 characters so we can help.')
    .max(2000, 'Keep your message under 2000 characters.'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

const contactEnvSchema = z.object({
  VITE_CONTACT_ENDPOINT: z.union([z.url(), z.literal('')]).optional(),
});

export class ContactNotConfiguredError extends Error {
  constructor() {
    super('The contact form is not configured on this deployment.');
    this.name = 'ContactNotConfiguredError';
  }
}

export function getContactEndpoint(env: Record<string, unknown> = import.meta.env): string | null {
  const parsed = contactEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid VITE_CONTACT_ENDPOINT: ${parsed.error.issues[0]?.message ?? ''}`);
  }
  return parsed.data.VITE_CONTACT_ENDPOINT || null;
}

/** Sends the message as JSON. This is the only network request the app makes. */
export async function submitContactForm(
  values: ContactFormValues,
  endpoint: string | null = getContactEndpoint(),
): Promise<void> {
  if (!endpoint) throw new ContactNotConfiguredError();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(contactFormSchema.parse(values)),
  });
  if (!response.ok) {
    throw new Error(`Contact endpoint responded with ${response.status}.`);
  }
}
