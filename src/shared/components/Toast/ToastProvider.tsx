import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { Toast } from './Toast';
import styles from './Toast.module.scss';
import { ToastContext, type ToastMessage, type ToastVariant } from './toastContext';

const MAX_VISIBLE_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  // Stable so each Toast's dismiss timer isn't restarted when another toast appears.
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((variant: ToastVariant, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, variant, message }].slice(-MAX_VISIBLE_TOASTS));
  }, []);

  // Memoized so context consumers don't re-render whenever the toast list changes.
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} aria-label="Notifications" role="region">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            variant={toast.variant}
            message={toast.message}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
