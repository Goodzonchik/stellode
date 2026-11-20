import type { ComponentListTypeFilter } from './component-list-type-filter';
import type { ComponentNode } from './component-node';

const matchesName = (name: string, nameFilter: string): boolean => {
  const nameQuery = nameFilter.trim().toLowerCase();
  if (!nameQuery) return true;
  return name.toLowerCase().includes(nameQuery);
};

const matchesTeam = (component: ComponentNode, teamFilter: string): boolean => {
  if (!teamFilter) return true;
  return component.team?.id === teamFilter;
};

const matchesType = (component: ComponentNode, typeFilter: ComponentListTypeFilter): boolean => {
  if (!typeFilter) return true;
  if (typeFilter === 'dependency') return component.isDependency === true;
  return component.isDependency !== true;
};

export const filterComponents = (
  components: readonly ComponentNode[],
  nameFilter: string,
  teamFilter: string,
  typeFilter: ComponentListTypeFilter,
): ComponentNode[] =>
  components.filter(
    (component) =>
      matchesName(component.name, nameFilter) &&
      matchesTeam(component, teamFilter) &&
      matchesType(component, typeFilter),
  );
