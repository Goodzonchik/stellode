import { useCallback, useState } from 'react';
import { getErrorMessage } from '../utils/axios-error';
import { ToastVariant, useToast } from './useToast';

export type CrudListLoadOptions<T> = {
  load: () => Promise<T>;
  onSuccess: (data: T) => void;
  setRowsLoaded?: (loaded: boolean) => void;
  logLabel?: string;
};

export type UseCrudPageFeedbackResult = {
  error: string | null;
  setError: (value: string | null) => void;
  clearError: () => void;
  reportFormError: (err: unknown, fallback?: string) => string;
  toastError: (err: unknown, fallback?: string) => string;
  runListLoad: <T>(options: CrudListLoadOptions<T>) => Promise<void>;
};

export const useCrudPageFeedback = (): UseCrudPageFeedbackResult => {
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const toastError = useCallback(
    (err: unknown, fallback?: string): string => {
      const message = getErrorMessage(err, fallback);
      showToast(message, ToastVariant.Error);
      return message;
    },
    [showToast],
  );

  const reportFormError = useCallback(
    (err: unknown, fallback?: string): string => {
      const message = toastError(err, fallback);
      setError(message);
      return message;
    },
    [toastError],
  );

  const runListLoad = useCallback(
    async <T,>(options: CrudListLoadOptions<T>): Promise<void> => {
      options.setRowsLoaded?.(false);
      try {
        options.onSuccess(await options.load());
      } catch (err) {
        if (options.logLabel) {
          console.error(`Error loading ${options.logLabel}:`, err);
        }
        toastError(err);
      } finally {
        options.setRowsLoaded?.(true);
      }
    },
    [toastError],
  );

  return { error, setError, clearError, reportFormError, toastError, runListLoad };
};
