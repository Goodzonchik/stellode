import { useCallback, useRef, useState } from 'react';
import type { CheckFeatureVersionReadyResult } from '@stellode/models';
import { featureVersionsApi } from '../api/feature-versions-api';
import { getErrorMessage } from '../utils/axios-error';
import { selectFeatureReadinessToast } from '../pages/feature-versions/select-feature-readiness-toast';
import { shouldOpenFeatureReadinessModal } from '../pages/feature-versions/should-open-feature-readiness-modal';
import { ToastVariant, useToast } from './useToast';

export const useFeatureVersionReadinessCheck = (onChecked?: () => void) => {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState<CheckFeatureVersionReadyResult | null>(null);
  const onCheckedRef = useRef(onChecked);
  onCheckedRef.current = onChecked;

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const checkReady = useCallback(
    async (featureVersionId: string) => {
      try {
        const data = await featureVersionsApi.checkReady({ featureVersionId });
        setResult(data);
        if (shouldOpenFeatureReadinessModal(data)) {
          setModalOpen(true);
        } else {
          const toast = selectFeatureReadinessToast(data);
          if (toast !== null) {
            showToast(toast.message, toast.variant);
          }
        }
        onCheckedRef.current?.();
      } catch (err: unknown) {
        showToast(
          getErrorMessage(err, 'Проверка не выполнена'),
          ToastVariant.Error,
        );
      }
    },
    [showToast],
  );

  return {
    checkReady,
    modalOpen,
    result,
    closeModal,
  };
};
