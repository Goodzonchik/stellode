export const deprecatedWarningTooltip = 'Устаревшая версия (deprecated)';

export const unactiveWarningTooltip = 'Версия снята с прода (unactive)';

export const applicationStatusWarningTooltip =
  'Есть компоненты с предупреждением (deprecated / unactive)';

export const statusWarningTooltipForKind = (kind: 'deprecated' | 'unactive'): string =>
  kind === 'unactive' ? unactiveWarningTooltip : deprecatedWarningTooltip;
