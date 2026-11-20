import { filterNodeMenuForFeatureVersionCompare } from './filter-node-menu-for-feature-version-compare';
import type { DiagramMenuItem } from './diagram-context-menu.config';

const sampleItems: DiagramMenuItem[] = [
  { id: 'open-in-list', label: 'Открыть в списке', action: 'openInList' },
  { id: 'impact', label: 'Показать влияние', action: 'showImpact' },
  { id: 'fv-add', label: 'Добавить связь', action: 'fvAddDependsOn' },
  { id: 'fv-raise', label: 'Поднять версию', action: 'fvReplaceUses' },
];

describe('filterNodeMenuForFeatureVersionCompare', () => {
  it('keeps all items when compare is off', () => {
    expect(filterNodeMenuForFeatureVersionCompare(sampleItems, false)).toEqual(sampleItems);
  });

  it('hides openInList, impact and mutations when compare is on', () => {
    expect(filterNodeMenuForFeatureVersionCompare(sampleItems, true).map((i) => i.action)).toEqual(
      [],
    );
  });
});
