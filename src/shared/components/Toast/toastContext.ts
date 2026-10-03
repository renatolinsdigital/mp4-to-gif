import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  message: string;
}

export interface ToastApi {
  show: (variant: ToastVariant, message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
