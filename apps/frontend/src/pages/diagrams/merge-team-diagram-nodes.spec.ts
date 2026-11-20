import type { ViewEdge, ViewNode } from '@stellode/models';
import { mergeTeamDiagramNodes } from './merge-team-diagram-nodes';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';

const viewNode = (id: string, type: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  data: { label: id, type },
});

const viewEdge = (
  id: string,
  source: string,
  target: string,
  relationshipType: string,
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('mergeTeamDiagramNodes', () => {
  it('merges FeatureVersion but keeps ComponentVersion for later CV projection', () => {
    const nodes: ViewNode[] = [
      viewNode('feature-1', 'feature'),
      viewNode('feature-version-1', 'FeatureVersion'),
      viewNode('component-1', 'component'),
      viewNode('component-version-1', 'ComponentVersion'),
    ];
    const edges: ViewEdge[] = [
      viewEdge('e1', 'feature-1', 'feature-version-1', 'HAS_VERSION'),
      viewEdge('e2', 'component-1', 'component-version-1', 'HAS_VERSION'),
      viewEdge('e3', 'feature-version-1', 'component-version-1', 'USES_COMPONENT_VERSION'),
    ];

    const merged = mergeTeamDiagramNodes(nodes, edges);

    expect(merged.nodes.map((node) => node.id).sort()).toEqual([
      'component-1',
      'component-version-1',
      'feature-1',
    ]);
    expect(merged.edges).toEqual([
      expect.objectContaining({
        source: 'component-1',
        target: 'component-version-1',
        relationshipType: 'HAS_VERSION',
      }),
      expect.objectContaining({
        source: 'feature-1',
        target: 'component-version-1',
        relationshipType: 'USES_COMPONENT_VERSION',
      }),
    ]);
  });

  it('after CV projection remaps USES to projected Component·version id', () => {
    const nodes: ViewNode[] = [
      viewNode('feature-1', 'feature'),
      viewNode('feature-version-1', 'FeatureVersion'),
      viewNode('component-1', 'component'),
      viewNode('component-version-1', 'ComponentVersion'),
    ];
    const edges: ViewEdge[] = [
      viewEdge('e1', 'feature-1', 'feature-version-1', 'HAS_VERSION'),
      viewEdge('e2', 'component-1', 'component-version-1', 'HAS_VERSION'),
      viewEdge('e3', 'feature-version-1', 'component-version-1', 'USES_COMPONENT_VERSION'),
    ];
    const projected = projectComponentVersionsToComponents(nodes, edges);
    const merged = mergeTeamDiagramNodes(projected.nodes, projected.edges);

    expect(merged.nodes.map((node) => node.id).sort()).toEqual([
      'component-version-1',
      'feature-1',
    ]);
    expect(merged.edges).toEqual([
      expect.objectContaining({
        source: 'feature-1',
        target: 'component-version-1',
        relationshipType: 'USES_COMPONENT_VERSION',
      }),
    ]);
  });

  it('keeps application node and remaps HAS_COMPONENT onto ComponentVersion id', () => {
    const nodes: ViewNode[] = [
      viewNode('application-1', 'app'),
      viewNode('application-version-1', 'applicationVersion'),
      viewNode('component-1', 'component'),
      viewNode('component-version-1', 'componentVersion'),
    ];
    const edges: ViewEdge[] = [
      viewEdge('e1', 'application-1', 'application-version-1', 'HAS_VERSION'),
      viewEdge('e2', 'component-1', 'component-version-1', 'HAS_VERSION'),
      viewEdge('e3', 'application-version-1', 'component-version-1', 'HAS_COMPONENT'),
    ];

    const merged = mergeTeamDiagramNodes(nodes, edges);

    expect(merged.nodes.map((node) => node.id).sort()).toEqual([
      'application-1',
      'component-1',
      'component-version-1',
    ]);
    expect(merged.edges).toEqual([
      expect.objectContaining({
        source: 'component-1',
        target: 'component-version-1',
        relationshipType: 'HAS_VERSION',
      }),
      expect.objectContaining({
        source: 'application-1',
        target: 'component-version-1',
        relationshipType: 'HAS_COMPONENT',
      }),
    ]);
  });
});
