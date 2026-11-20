import { featureVersionTableRowActions } from './feature-version-table-row-actions';

describe('featureVersionTableRowActions', () => {
  const sample = [
    { id: 'open', label: 'Открыть в списке', action: 'openInList' as const },
    { id: 'impact', label: 'Показать влияние', action: 'showImpact' as const },
    { id: 'add', label: 'Добавить связь', action: 'fvAddDependsOn' as const },
    { id: 'cross', label: 'Связь с другим юнитом', action: 'crossUnitDependsOn' as const },
    { id: 'raise', label: 'Поднять версию', action: 'fvReplaceUses' as const },
    { id: 'exclude', label: 'Исключить из фичи', action: 'fvRemoveUses' as const },
  ];

  it('keeps node menu actions and drops impact', () => {
    expect(featureVersionTableRowActions(sample).map((item) => item.action)).toEqual([
      'openInList',
      'fvAddDependsOn',
      'crossUnitDependsOn',
      'fvReplaceUses',
      'fvRemoveUses',
    ]);
  });

  it('keeps only openInList for foreign rows', () => {
    expect(featureVersionTableRowActions(sample, false).map((item) => item.action)).toEqual([
      'openInList',
    ]);
  });
});
