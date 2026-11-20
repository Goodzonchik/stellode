import type { ArchitectureGraph } from '@stellode/models';
import { buildNodeContextMenuItems } from './node-context-menu-items';

const unitGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 't1',
      name: 'Acme',
      type: 'Unit',
      labels: ['Unit'],
      status: 'active',
    },
  ],
  relationships: [],
};

describe('buildNodeContextMenuItems', () => {
  it('does not add impact item on unit diagram even when target resolves', () => {
    const items = buildNodeContextMenuItems({
      graph: unitGraph,
      entity: 'unit',
      diagramAnchorId: 't1',
      nodeId: 't1',
      currentUnitId: 't1',
    });
    expect(items.some((i) => i.action === 'showImpact')).toBe(false);
  });

  it('adds openInList first when Unit matches header unit', () => {
    const items = buildNodeContextMenuItems({
      graph: unitGraph,
      entity: 'unit',
      diagramAnchorId: 't1',
      nodeId: 't1',
      currentUnitId: 't1',
    });
    expect(items[0]).toEqual({
      id: 'open-in-list',
      label: 'Открыть в списке',
      action: 'openInList',
    });
  });

  it('omits openInList when header unit differs', () => {
    const items = buildNodeContextMenuItems({
      graph: unitGraph,
      entity: 'cross-unit',
      diagramAnchorId: undefined,
      nodeId: 't1',
      currentUnitId: 'other',
    });
    expect(items.some((i) => i.action === 'openInList')).toBe(false);
  });

  it('adds impact item for team diagram when target resolves', () => {
    const items = buildNodeContextMenuItems({
      graph: unitGraph,
      entity: 'team',
      diagramAnchorId: 'team-1',
      nodeId: 't1',
    });
    expect(items.some((i) => i.action === 'showImpact')).toBe(true);
  });

  it('includes crossUnitDependsOn for ComponentVersion under draft FeatureVersion', () => {
    const draftFvGraph: ArchitectureGraph = {
      nodes: [
        {
          id: 'fv1',
          name: 'Fv',
          type: 'featureVersion',
          labels: ['FeatureVersion'],
          status: 'draft',
          versionNumber: 1,
        },
        {
          id: 'cv1',
          name: 'Cv',
          type: 'componentVersion',
          labels: ['ComponentVersion'],
          status: 'draft',
          versionNumber: 1,
        },
      ],
      relationships: [],
    };
    const items = buildNodeContextMenuItems({
      graph: draftFvGraph,
      entity: 'feature-version',
      diagramAnchorId: 'fv1',
      nodeId: 'cv1',
    });
    expect(items.map((i) => i.action)).toEqual([
      'showImpact',
      'fvAddDependsOn',
      'crossUnitDependsOn',
      'fvRemoveUses',
    ]);
    expect(items.find((i) => i.action === 'fvAddDependsOn')?.label).toBe('Добавить связь');
    expect(items.some((i) => i.action === 'fvReplaceUses')).toBe(false);
    expect(items.some((i) => i.action === 'fvAddSecondUses')).toBe(false);
  });

  it('includes Поднять версию for non-draft ComponentVersion under draft FeatureVersion', () => {
    const draftFvGraph: ArchitectureGraph = {
      nodes: [
        {
          id: 'fv1',
          name: 'Fv',
          type: 'featureVersion',
          labels: ['FeatureVersion'],
          status: 'draft',
          versionNumber: 1,
        },
        {
          id: 'cv1',
          name: 'Cv',
          type: 'componentVersion',
          labels: ['ComponentVersion'],
          status: 'active',
          versionNumber: 1,
        },
      ],
      relationships: [],
    };
    const items = buildNodeContextMenuItems({
      graph: draftFvGraph,
      entity: 'feature-version',
      diagramAnchorId: 'fv1',
      nodeId: 'cv1',
    });
    expect(items.map((i) => i.action)).toEqual([
      'showImpact',
      'fvAddDependsOn',
      'crossUnitDependsOn',
      'fvReplaceUses',
      'fvRemoveUses',
    ]);
    expect(items.find((i) => i.action === 'fvReplaceUses')?.label).toBe('Поднять версию');
  });

  it('omits crossUnitDependsOn for flat component without Application container', () => {
    const draftFvGraph: ArchitectureGraph = {
      nodes: [
        {
          id: 'fv1',
          name: 'Fv',
          type: 'featureVersion',
          labels: ['FeatureVersion'],
          status: 'draft',
          versionNumber: 1,
        },
        {
          id: 'cv1',
          name: 'Cv',
          type: 'componentVersion',
          labels: ['ComponentVersion'],
          status: 'draft',
          versionNumber: 1,
        },
      ],
      relationships: [],
    };
    const items = buildNodeContextMenuItems({
      graph: draftFvGraph,
      entity: 'feature-version',
      diagramAnchorId: 'fv1',
      nodeId: 'cv1',
      isFlatComponent: true,
    });
    expect(items.some((i) => i.action === 'crossUnitDependsOn')).toBe(false);
    expect(items.some((i) => i.action === 'fvAddDependsOn')).toBe(false);
    expect(items.some((i) => i.action === 'fvRemoveUses')).toBe(false);
  });

  it('omits draft composition actions for published FeatureVersion', () => {
    const activeFvGraph: ArchitectureGraph = {
      nodes: [
        {
          id: 'fv1',
          name: 'Fv',
          type: 'featureVersion',
          labels: ['FeatureVersion'],
          status: 'active',
          versionNumber: 1,
        },
        {
          id: 'cv1',
          name: 'Cv',
          type: 'componentVersion',
          labels: ['ComponentVersion'],
          status: 'active',
          versionNumber: 1,
        },
      ],
      relationships: [],
    };
    const items = buildNodeContextMenuItems({
      graph: activeFvGraph,
      entity: 'feature-version',
      diagramAnchorId: 'fv1',
      nodeId: 'cv1',
    });
    expect(items.some((i) => i.action === 'fvAddDependsOn')).toBe(false);
    expect(items.some((i) => i.action === 'fvRemoveUses')).toBe(false);
    expect(items.some((i) => i.action === 'crossUnitDependsOn')).toBe(false);
  });
});
