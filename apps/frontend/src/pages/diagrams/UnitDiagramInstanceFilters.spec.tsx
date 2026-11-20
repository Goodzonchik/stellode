/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { emptyUnitDiagramInstanceFilter } from './empty-unit-diagram-instance-filter';
import { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';
import type {
  UnitDiagramFilterCatalog,
  UnitDiagramInstanceFilter,
} from './unit-diagram-instance-filter-types';
import { UnitDiagramInstanceFilters } from './UnitDiagramInstanceFilters';

const catalog: UnitDiagramFilterCatalog = {
  [UnitDiagramFilterKind.Team]: [
    { id: 't1', label: 'Alpha Team' },
    { id: 't2', label: 'Beta Team' },
  ],
  [UnitDiagramFilterKind.Component]: [],
  [UnitDiagramFilterKind.Service]: [],
  [UnitDiagramFilterKind.Feature]: [],
  [UnitDiagramFilterKind.App]: [],
};

describe('UnitDiagramInstanceFilters', () => {
  it('toggles a single instance after expanding the section', () => {
    const onFilterChange = jest.fn();
    const filter = emptyUnitDiagramInstanceFilter();

    render(
      <UnitDiagramInstanceFilters
        catalog={catalog}
        filter={filter}
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Команды/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha Team' }));

    expect(onFilterChange).toHaveBeenCalled();
    const next = onFilterChange.mock.calls[0][0] as UnitDiagramInstanceFilter;
    expect(next.hiddenIds[UnitDiagramFilterKind.Team].has('t1')).toBe(true);
  });

  it('master checkbox hides all items in the section', () => {
    const onFilterChange = jest.fn();
    const filter = emptyUnitDiagramInstanceFilter();

    render(
      <UnitDiagramInstanceFilters
        catalog={catalog}
        filter={filter}
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Команды' }));

    expect(onFilterChange).toHaveBeenCalled();
    const next = onFilterChange.mock.calls[0][0] as UnitDiagramInstanceFilter;
    expect(next.hiddenIds[UnitDiagramFilterKind.Team].has('t1')).toBe(true);
    expect(next.hiddenIds[UnitDiagramFilterKind.Team].has('t2')).toBe(true);
  });
});
