import { collectUnitDiagramFilterItems } from './collect-unit-diagram-filter-items';
import { emptyUnitDiagramInstanceFilter } from './empty-unit-diagram-instance-filter';
import { setUnitDiagramKindHidden } from './set-unit-diagram-kind-hidden';
import { toggleUnitDiagramHiddenId } from './toggle-unit-diagram-hidden-id';
import { unitDiagramMasterCheckboxState } from './unit-diagram-master-checkbox-state';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';
import type { ViewNode } from '@stellode/models';

const node = (id: string, type: string, label: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label, type },
});

describe('unit diagram instance filter helpers', () => {
  it('collects sorted items by kind', () => {
    const catalog = collectUnitDiagramFilterItems([
      node('t2', 'team', 'Beta'),
      node('t1', 'team', 'Alpha'),
      node('c1', 'component', 'Comp'),
    ]);
    expect(catalog.team.map((item) => item.id)).toEqual(['t1', 't2']);
    expect(catalog.component).toEqual([{ id: 'c1', label: 'Comp' }]);
    expect(catalog.service).toEqual([]);
  });

  it('master checkbox states', () => {
    const ids = ['a', 'b', 'c'];
    expect(unitDiagramMasterCheckboxState(ids, new Set())).toBe('checked');
    expect(unitDiagramMasterCheckboxState(ids, new Set(ids))).toBe('unchecked');
    expect(unitDiagramMasterCheckboxState(ids, new Set(['a']))).toBe('indeterminate');
  });

  it('toggles and sets kind hidden', () => {
    let filter = emptyUnitDiagramInstanceFilter();
    filter = toggleUnitDiagramHiddenId(filter, UnitDiagramFilterKind.Team, 't1');
    expect(filter.hiddenIds.team.has('t1')).toBe(true);
    filter = toggleUnitDiagramHiddenId(filter, UnitDiagramFilterKind.Team, 't1');
    expect(filter.hiddenIds.team.has('t1')).toBe(false);
    filter = setUnitDiagramKindHidden(filter, UnitDiagramFilterKind.Team, ['t1', 't2'], true);
    expect([...filter.hiddenIds.team].sort()).toEqual(['t1', 't2']);
    filter = setUnitDiagramKindHidden(filter, UnitDiagramFilterKind.Team, ['t1', 't2'], false);
    expect(filter.hiddenIds.team.size).toBe(0);
  });
});
