import { useCallback, useRef } from 'react';
import { App } from 'antd';

export const ToastVariant = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export type ToastVariant = (typeof ToastVariant)[keyof typeof ToastVariant];

export const useToast = (): {
  showToast: (
    message: string,
    variant?: ToastVariant,
    description?: string,
  ) => void;
} => {
  const { notification } = App.useApp();
  const notificationRef = useRef(notification);
  notificationRef.current = notification;

  const showToast = useCallback(
    (
      message: string,
      variant: ToastVariant = ToastVariant.Success,
      description?: string,
    ) => {
      const api = notificationRef.current;
      if (variant === ToastVariant.Success) {
        api.success({ title: message, description, placement: 'topRight', duration: 4.5 });
        return;
      }
      if (variant === ToastVariant.Warning) {
        api.warning({ title: message, description, placement: 'topRight', duration: 4.5 });
        return;
      }
      api.error({ title: message, description, placement: 'topRight', duration: 4.5 });
    },
    [],
  );

  return { showToast };
};
