import { useState } from 'react';

import {
  ContactNotConfiguredError,
  contactFormSchema,
  submitContactForm,
  type ContactFormValues,
} from '@/domain/services/contact.service';
import { useToast } from '@/shared/hooks/useToast';

type FieldErrors = Partial<Record<keyof ContactFormValues, string>>;

const EMPTY_VALUES: ContactFormValues = { name: '', email: '', message: '' };

function collectErrors(values: ContactFormValues): FieldErrors {
  const parsed = contactFormSchema.safeParse(values);
  if (parsed.success) return {};
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ContactFormValues;
    errors[field] ??= issue.message;
  }
  return errors;
}

export function useContactForm(submit = submitContactForm) {
  const toast = useToast();
  const [values, setValues] = useState<ContactFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: keyof ContactFormValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // Validate live only after the first submit attempt, so users aren't scolded mid-typing.
    if (touched) setErrors(collectErrors(next));
  };

  const handleSubmit = async () => {
    setTouched(true);
    const fieldErrors = collectErrors(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await submit(values);
      toast.show('success', "Thanks! Your message was sent. We'll get back to you by email.");
      setValues(EMPTY_VALUES);
      setTouched(false);
    } catch (error) {
      if (error instanceof ContactNotConfiguredError) {
        toast.show('warning', 'Messages are turned off on this deployment. No message was sent.');
      } else {
        console.error('Contact form submission failed', error);
        toast.show('error', "Your message couldn't be sent. Please try again in a moment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return { values, errors, isSubmitting, setField, handleSubmit };
}
