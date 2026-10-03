import { useContactForm } from '@/domain/hooks/useContactForm';
import type { ContactFormValues } from '@/domain/services/contact.service';
import { Button } from '@/shared/components/Button';
import { TextField } from '@/shared/components/TextField';

import styles from './ContactForm.module.scss';

interface ContactFormProps {
  /** Injected in tests; defaults to the real contact service. */
  submit?: (values: ContactFormValues) => Promise<void>;
}

export function ContactForm({ submit }: ContactFormProps) {
  const { values, errors, isSubmitting, setField, handleSubmit } = useContactForm(submit);

  return (
    <form
      className={styles.form}
      noValidate
      aria-label="Contact form"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div className={styles.row}>
        <TextField
          label="Name"
          value={values.name}
          error={errors.name}
          autoComplete="name"
          required
          onChange={(value) => setField('name', value)}
        />
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          value={values.email}
          error={errors.email}
          autoComplete="email"
          required
          onChange={(value) => setField('email', value)}
        />
      </div>
      <TextField
        label="Message"
        multiline
        value={values.message}
        error={errors.message}
        required
        onChange={(value) => setField('message', value)}
      />
      <div className={styles.actions}>
        <Button type="submit" label={isSubmitting ? 'Sending…' : 'Send message'} loading={isSubmitting} />
      </div>
    </form>
  );
}
