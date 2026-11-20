import {
  FeatureBindingReadinessReason,
  type FeatureBindingReadinessReason as FeatureBindingReadinessReasonType,
} from '@stellode/models';

const labels: Readonly<Record<FeatureBindingReadinessReasonType, string>> = {
  [FeatureBindingReadinessReason.Ready]: 'Готово',
  [FeatureBindingReadinessReason.ApplicationHasNoCurrentRelease]:
    'У приложения нет текущего релиза',
  [FeatureBindingReadinessReason.ComponentNotInCurrentRelease]:
    'Компонент не входит в текущий релиз',
  [FeatureBindingReadinessReason.ComponentNotActiveInRelease]:
    'Версия не active/deprecated в релизе',
};

export const featureBindingReadinessReasonLabel = (
  reason: FeatureBindingReadinessReasonType,
): string => labels[reason];
