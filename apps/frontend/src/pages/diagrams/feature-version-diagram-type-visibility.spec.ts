import type { ViewEdge, ViewNode } from '@stellode/models';
import { applyFeatureVersionDiagramVisibility } from './feature-version-diagram-type-visibility';

const node = (id: string, dataType: string, unitId?: string, parentId?: string): ViewNode => ({
  id,
  type: 'custom',
  draggable: true,
  position: { x: 0, y: 0 },
  ...(parentId !== undefined ? { parentId } : {}),
  data: { label: id, type: dataType, ...(unitId !== undefined ? { unitId } : {}) },
});

const edge = (
  id: string,
  source: string,
  target: string,
  relationshipType = 'USES_COMPONENT_VERSION',
): ViewEdge => ({
  id,
  source,
  target,
  type: 'default',
  relationshipType,
});

describe('applyFeatureVersionDiagramVisibility', () => {
  const nodes: ViewNode[] = [
    node('fv', 'featureVersion'),
    node('f', 'feature'),
    node('c', 'component', 'u1'),
    node('cv', 'componentVersion', 'u1'),
    node('t', 'team', 'u1'),
    node('s', 'service'),
    node('a', 'app', 'u1'),
    node('av', 'applicationVersion'),
    node('u1', 'unit'),
    node('u2', 'unit'),
  ];
  const edges: ViewEdge[] = [
    edge('e-f-fv', 'f', 'fv'),
    edge('e-fv-c', 'fv', 'c'),
    edge('e-fv-cv', 'fv', 'cv'),
    edge('e-t-c', 't', 'c', 'MAINTAINS'),
    edge('e-s-f', 's', 'f'),
    edge('e-a-av', 'a', 'av'),
    edge('e-av-cv', 'av', 'cv'),
  ];

  const hiddenIds = (items: readonly { id: string; hidden?: boolean }[]): string[] =>
    items.filter((item) => item.hidden).map((item) => item.id);

  it('always hides feature, feature version, service and all units', () => {
    const { nodes: outNodes } = applyFeatureVersionDiagramVisibility(nodes, edges);
    expect(hiddenIds(outNodes).sort()).toEqual(['f', 'fv', 's', 'u1', 'u2']);
  });

  it('keeps component, team and application visible when teamsVisible is true', () => {
    const { nodes: outNodes } = applyFeatureVersionDiagramVisibility(nodes, edges, true);
    const visible = outNodes.filter((n) => !n.hidden).map((n) => n.id).sort();
    expect(visible).toEqual(['a', 'av', 'c', 'cv', 't']);
  });

  it('hides team and MAINTAINS when teamsVisible is false', () => {
    const withDep = [...edges, edge('dep', 'c', 'cv2', 'DEPENDS_ON')];
    const withNodes = [...nodes, node('cv2', 'componentVersion', 'u1')];
    const { nodes: outNodes, edges: outEdges } = applyFeatureVersionDiagramVisibility(
      withNodes,
      withDep,
      false,
    );
    expect(outNodes.find((n) => n.id === 't')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'e-t-c')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'c')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a')?.hidden).toBe(false);
    expect(outEdges.find((e) => e.id === 'dep')?.hidden).toBe(false);
  });

  it('hides remote app/cv and cross-unit DEPENDS_ON when crossUnitLinksVisible is false', () => {
    const withPeer = [
      ...nodes,
      node('c2', 'component', 'u2', 'a2'),
      node('a2', 'app', 'u2'),
      node('t2', 'team', 'u2'),
    ];
    const withDep = [
      ...edges,
      edge('dep', 'c', 'c2', 'DEPENDS_ON'),
      edge('m2', 't2', 'c2', 'MAINTAINS'),
    ];
    const { nodes: outNodes, edges: outEdges } = applyFeatureVersionDiagramVisibility(
      withPeer,
      withDep,
      { teamsVisible: true, crossUnitLinksVisible: false },
    );
    expect(outNodes.find((n) => n.id === 'c2')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'a2')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 't2')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'u1')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'u2')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'dep')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'c')?.hidden).toBe(false);
  });

  it('keeps local composition visible when USES is oriented CV→FV and filter is off', () => {
    const localCopy: ViewNode = {
      id: 'a1::cv-local',
      type: 'custom',
      draggable: true,
      position: { x: 0, y: 0 },
      parentId: 'a1',
      data: { label: 'Local', type: 'component', unitId: 'u1', sourceId: 'cv-local' },
    };
    const remoteCopy: ViewNode = {
      id: 'a2::cv-remote',
      type: 'custom',
      draggable: true,
      position: { x: 0, y: 0 },
      parentId: 'a2',
      data: { label: 'Remote', type: 'component', unitId: 'u2', sourceId: 'cv-remote' },
    };
    const graphNodes: ViewNode[] = [
      node('fv', 'featureVersion'),
      node('a1', 'app', 'u1'),
      node('a2', 'app', 'u2'),
      localCopy,
      remoteCopy,
    ];
    const graphEdges: ViewEdge[] = [
      edge('uses', 'a1::cv-local', 'fv', 'USES_COMPONENT_VERSION'),
      edge('dep', 'a1::cv-local', 'a2::cv-remote', 'DEPENDS_ON'),
    ];
    const { nodes: outNodes } = applyFeatureVersionDiagramVisibility(graphNodes, graphEdges, {
      teamsVisible: true,
      crossUnitLinksVisible: false,
      featureVersionIds: ['fv'],
    });
    expect(outNodes.find((n) => n.id === 'a1::cv-local')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a1')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a2::cv-remote')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'a2')?.hidden).toBe(true);
  });

  it('hides remote CV/App when filter is off even if foreign USES marks remote as composition', () => {
    const localCopy: ViewNode = {
      id: 'a1::cv-local',
      type: 'custom',
      draggable: true,
      position: { x: 0, y: 0 },
      parentId: 'a1',
      data: { label: 'Local', type: 'component', unitId: 'u1', sourceId: 'cv-local' },
    };
    const remoteCopy: ViewNode = {
      id: 'a2::cv-remote',
      type: 'custom',
      draggable: true,
      position: { x: 0, y: 0 },
      parentId: 'a2',
      data: { label: 'Remote', type: 'component', unitId: 'u2', sourceId: 'cv-remote' },
    };
    const graphNodes: ViewNode[] = [
      node('fv', 'featureVersion'),
      node('other-fv', 'featureVersion'),
      node('a1', 'app', 'u1'),
      node('a2', 'app', 'u2'),
      localCopy,
      remoteCopy,
    ];
    const graphEdges: ViewEdge[] = [
      edge('uses-local', 'a1::cv-local', 'fv', 'USES_COMPONENT_VERSION'),
      edge('uses-remote', 'a2::cv-remote', 'other-fv', 'USES_COMPONENT_VERSION'),
      edge('dep', 'a1::cv-local', 'a2::cv-remote', 'DEPENDS_ON'),
    ];
    const { nodes: outNodes, edges: outEdges } = applyFeatureVersionDiagramVisibility(
      graphNodes,
      graphEdges,
      { teamsVisible: true, crossUnitLinksVisible: false, featureVersionIds: ['fv'] },
    );
    expect(outNodes.find((n) => n.id === 'a1::cv-local')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a1')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a2::cv-remote')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'a2')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'dep')?.hidden).toBe(true);
  });

  it('keeps local USES composition visible when filter is off even if peers have unitIds', () => {
    const localCopy: ViewNode = {
      id: 'a1::cv-local',
      type: 'custom',
      draggable: true,
      position: { x: 0, y: 0 },
      parentId: 'a1',
      data: { label: 'Local', type: 'component', unitId: 'u1', sourceId: 'cv-local' },
    };
    const remoteCopy: ViewNode = {
      id: 'a2::cv-remote',
      type: 'custom',
      draggable: true,
      position: { x: 0, y: 0 },
      parentId: 'a2',
      data: { label: 'Remote', type: 'component', unitId: 'u2', sourceId: 'cv-remote' },
    };
    const graphNodes: ViewNode[] = [
      node('fv', 'featureVersion'),
      node('a1', 'app', 'u1'),
      node('a2', 'app', 'u2'),
      localCopy,
      remoteCopy,
      node('u1', 'unit'),
      node('u2', 'unit'),
    ];
    const graphEdges: ViewEdge[] = [
      edge('uses', 'fv', 'a1::cv-local', 'USES_COMPONENT_VERSION'),
      edge('dep', 'a1::cv-local', 'a2::cv-remote', 'DEPENDS_ON'),
    ];
    const { nodes: outNodes, edges: outEdges } = applyFeatureVersionDiagramVisibility(
      graphNodes,
      graphEdges,
      { teamsVisible: true, crossUnitLinksVisible: false, featureVersionIds: ['fv'] },
    );
    expect(outNodes.find((n) => n.id === 'a1::cv-local')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a1')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a2::cv-remote')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'a2')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'dep')?.hidden).toBe(true);
  });

  it('shows remote app/cv when crossUnitLinksVisible is true but keeps units and remote teams hidden', () => {
    const withPeer = [
      ...nodes,
      node('c2', 'component', 'u2', 'a2'),
      node('a2', 'app', 'u2'),
      node('t2', 'team', 'u2'),
    ];
    const withDep = [
      ...edges,
      edge('dep', 'c', 'c2', 'DEPENDS_ON'),
      edge('m2', 't2', 'c2', 'MAINTAINS'),
    ];
    const { nodes: outNodes, edges: outEdges } = applyFeatureVersionDiagramVisibility(
      withPeer,
      withDep,
      { teamsVisible: true, crossUnitLinksVisible: true },
    );
    expect(outNodes.find((n) => n.id === 'c2')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 'a2')?.hidden).toBe(false);
    expect(outNodes.find((n) => n.id === 't2')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'u1')?.hidden).toBe(true);
    expect(outNodes.find((n) => n.id === 'u2')?.hidden).toBe(true);
    expect(outEdges.find((e) => e.id === 'dep')?.hidden).toBe(false);
  });

  it('does not mutate inputs', () => {
    const snapshot = JSON.stringify(nodes);
    applyFeatureVersionDiagramVisibility(nodes, edges, false);
    expect(JSON.stringify(nodes)).toBe(snapshot);
  });
});
