import type { GraphNode } from '../../neo4j/neo4j.service';
import {
  diagramRowsToGraphRecords,
  graphQueryResultToArchitectureGraph,
  type DiagramEdgeRow,
} from './graph-to-architecture-graph';

const unitNode = (uuid: string): GraphNode => ({
  id: uuid,
  label: 'Unit',
  properties: { id: uuid, name: 'T', type: 'unit' },
});

const appNode = (uuid: string): GraphNode => ({
  id: uuid,
  label: 'Application',
  properties: { id: uuid, name: 'App', type: 'app', unitId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
});

describe('graphQueryResultToArchitectureGraph', () => {
  it('строит связи из нормализованных мап рёбер с бизнес-id концов', () => {
    const unitUuid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const appUuid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const owns: DiagramEdgeRow = {
      id: null,
      label: 'OWNS',
      from: unitUuid,
      to: appUuid,
      properties: {},
    };
    const rows: { node: GraphNode | null; relationship: DiagramEdgeRow | null }[] = [
      { node: unitNode(unitUuid), relationship: null },
      { node: appNode(appUuid), relationship: null },
      { node: null, relationship: owns },
    ];
    const graph = graphQueryResultToArchitectureGraph(diagramRowsToGraphRecords(rows));
    expect(
      graph.relationships.some((r) => r.type === 'OWNS' && r.from === unitUuid && r.to === appUuid),
    ).toBe(true);
  });

  it('использует свойство id ребра как стабильный идентификатор связи', () => {
    const from = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const to = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const aggregates: DiagramEdgeRow = {
      id: 'edge-biz-id',
      label: 'AGGREGATES',
      from,
      to,
      properties: { id: 'edge-biz-id', deleted: false },
    };
    const graph = graphQueryResultToArchitectureGraph(
      diagramRowsToGraphRecords([{ node: null, relationship: aggregates }]),
    );
    expect(graph.relationships).toEqual([
      {
        id: 'edge-biz-id',
        from,
        to,
        type: 'AGGREGATES',
        properties: { id: 'edge-biz-id', deleted: false },
      },
    ]);
  });

  it('прокидывает unitId в узел графа при наличии в свойствах ноды', () => {
    const featureUuid = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const unitUuid = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const feature: GraphNode = {
      id: featureUuid,
      label: 'Feature',
      properties: {
        id: featureUuid,
        name: 'My feat',
        type: 'feature',
        unitId: unitUuid,
      },
    };
    const graph = graphQueryResultToArchitectureGraph(
      diagramRowsToGraphRecords([{ node: feature, relationship: null }]),
    );
    const n = graph.nodes.find((x) => x.id === featureUuid);
    expect(n?.unitId).toBe(unitUuid);
  });

  it('обогащает Application актуальной версией по HAS_VERSION', () => {
    const applicationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const versionId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const application: GraphNode = {
      id: applicationId,
      label: 'Application',
      properties: { id: applicationId, name: 'FrontApp', type: 'app' },
    };
    const version: GraphNode = {
      id: versionId,
      label: 'ApplicationVersion',
      properties: {
        id: versionId,
        name: 'FrontApp',
        type: 'applicationVersion',
        version: '1.0.0',
        versionNumber: 0,
        applicationId,
      },
    };
    const rows: { node: GraphNode | null; relationship: DiagramEdgeRow | null }[] = [
      { node: application, relationship: null },
      { node: version, relationship: null },
      {
        node: null,
        relationship: { label: 'HAS_VERSION', from: applicationId, to: versionId, properties: {} },
      },
    ];
    const graph = graphQueryResultToArchitectureGraph(diagramRowsToGraphRecords(rows));
    const applicationOut = graph.nodes.find((x) => x.id === applicationId);
    expect(applicationOut?.actualVersion).toBe('1.0.0');
    expect(applicationOut?.actualVersionNumber).toBe(0);
  });

  it('обогащает Component актуальной и черновой версией по HAS_VERSION/HAS_DRAFT', () => {
    const componentId = '11111111-1111-1111-1111-111111111111';
    const versionId = '22222222-2222-2222-2222-222222222222';
    const draftId = '33333333-3333-3333-3333-333333333333';
    const component: GraphNode = {
      id: componentId,
      label: 'Component',
      properties: { id: componentId, name: 'C', type: 'component' },
    };
    const version: GraphNode = {
      id: versionId,
      label: 'ComponentVersion',
      properties: { id: versionId, name: 'v1', type: 'cv', version: '1.0', versionNumber: 1 },
    };
    const draft: GraphNode = {
      id: draftId,
      label: 'ComponentVersion',
      properties: { id: draftId, name: 'v2', type: 'cv', version: '2.0', versionNumber: 2 },
    };
    const rows: { node: GraphNode | null; relationship: DiagramEdgeRow | null }[] = [
      { node: component, relationship: null },
      { node: version, relationship: null },
      { node: draft, relationship: null },
      {
        node: null,
        relationship: { label: 'HAS_VERSION', from: componentId, to: versionId, properties: {} },
      },
      {
        node: null,
        relationship: { label: 'HAS_DRAFT', from: componentId, to: draftId, properties: {} },
      },
    ];
    const graph = graphQueryResultToArchitectureGraph(diagramRowsToGraphRecords(rows));
    const componentOut = graph.nodes.find((x) => x.id === componentId);
    expect(componentOut?.actualVersion).toBe('1.0');
    expect(componentOut?.actualVersionNumber).toBe(1);
    expect(componentOut?.draftVersion).toBe('2.0');
    expect(componentOut?.draftVersionNumber).toBe(2);
  });
});
