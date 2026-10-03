import { useId, type Ref } from 'react';

import { Icon } from '@/shared/icons';

import styles from './SearchField.module.scss';

interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Key that focuses the field, shown as a hint, e.g. "/". The page handles the key itself. */
  shortcut?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Large search input with a clear button. Escape clears it. */
export function SearchField({
  label,
  value,
  onChange,
  placeholder,
  shortcut,
  ref,
}: SearchFieldProps) {
  const id = useId();

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        <Icon name="search" size={24} className={styles.icon} />
        <input
          ref={ref}
          id={id}
          type="search"
          className={styles.input}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value !== '') {
              event.preventDefault();
              onChange('');
            }
          }}
        />
        {value !== '' ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onClick={() => onChange('')}
          >
            <Icon name="close" size={18} />
          </button>
        ) : (
          shortcut && (
            <kbd className={styles.shortcut} aria-hidden="true">
              {shortcut}
            </kbd>
          )
        )}
      </div>
    </div>
  );
}
