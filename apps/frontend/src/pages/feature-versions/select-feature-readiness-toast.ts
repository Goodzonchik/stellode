import {
  FeatureVersionReadinessReason,
  VersionStatus,
  type CheckFeatureVersionReadyResult,
} from '@stellode/models';
import { ToastVariant } from '../../hooks/useToast';

export type FeatureReadinessToast = {
  readonly message: string;
  readonly variant: ToastVariant;
};

const isNoComponentBindings = (result: CheckFeatureVersionReadyResult): boolean =>
  result.reason === FeatureVersionReadinessReason.NoComponentBindings ||
  result.bindings.length === 0;

export const selectFeatureReadinessToast = (
  result: CheckFeatureVersionReadyResult,
): FeatureReadinessToast | null => {
  if (result.featureVersion.status === VersionStatus.Active) {
    return {
      message: 'Версия автоматически опубликована',
      variant: ToastVariant.Success,
    };
  }
  if (result.readyToProduction) {
    return {
      message: 'Версия фичи готова к публикации',
      variant: ToastVariant.Success,
    };
  }
  if (isNoComponentBindings(result)) {
    return {
      message: 'Нет связанных компонентов',
      variant: ToastVariant.Warning,
    };
  }
  return null;
};
