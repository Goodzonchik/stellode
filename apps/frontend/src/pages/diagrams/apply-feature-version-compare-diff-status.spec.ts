import type { ViewEdge, ViewNode } from '@stellode/models';
import { ViewNodeType } from '@stellode/models';
import { applyFeatureVersionCompareDiffStatus } from './apply-feature-version-compare-diff-status';
import type { FeatureVersionCompareDiff } from './diff-feature-version-compare-sets';

const node = (
  id: string,
  type: string,
  data: Partial<ViewNode['data']> = {},
): ViewNode => ({
  id,
  type: ViewNodeType.Custom,
  draggable: false,
  position: { x: 0, y: 0 },
  data: { label: id, type, ...data },
});

const edge = (
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

describe('applyFeatureVersionCompareDiffStatus', () => {
  const diff: FeatureVersionCompareDiff = {
    added: {
      composition: new Set(['cv-new::app-1']),
      dependsOn: new Set(['cv-new::cv-old']),
      applications: new Set(['app-new']),
      units: new Set(['unit-new']),
    },
    removed: {
      composition: new Set(['cv-old::app-1']),
      dependsOn: new Set(['cv-gone::cv-old']),
      applications: new Set(['app-gone']),
      units: new Set(),
    },
  };

  it('marks composition copies, apps, units and DEPENDS_ON; skips Team and MAINTAINS', () => {
    const nodes: ViewNode[] = [
      node('app-1::cv-new', 'component', {
        sourceId: 'cv-new',
        applicationId: 'app-1',
      }),
      node('app-1::cv-old', 'component', {
        sourceId: 'cv-old',
        applicationId: 'app-1',
      }),
      node('app-1', 'app'),
      node('app-new', 'app'),
      node('app-gone', 'app'),
      node('unit-new', 'unit'),
      node('team-1', 'team'),
    ];
    const edges: ViewEdge[] = [
      edge('dep-add', 'app-1::cv-new', 'app-1::cv-old', 'DEPENDS_ON'),
      edge('dep-rem', 'cv-gone', 'cv-old', 'DEPENDS_ON'),
      edge('maintains', 'team-1', 'app-1::cv-old', 'MAINTAINS'),
    ];
    const out = applyFeatureVersionCompareDiffStatus(nodes, edges, diff);
    expect(out.nodes.find((n) => n.id === 'app-1::cv-new')?.data.diffStatus).toBe('added');
    expect(out.nodes.find((n) => n.id === 'app-1::cv-old')?.data.diffStatus).toBe('removed');
    expect(out.nodes.find((n) => n.id === 'app-1')?.data.diffStatus).toBeUndefined();
    expect(out.nodes.find((n) => n.id === 'app-new')?.data.diffStatus).toBe('added');
    expect(out.nodes.find((n) => n.id === 'app-gone')?.data.diffStatus).toBe('removed');
    expect(out.nodes.find((n) => n.id === 'unit-new')?.data.diffStatus).toBe('added');
    expect(out.nodes.find((n) => n.id === 'team-1')?.data.diffStatus).toBeUndefined();
    expect(out.edges.find((e) => e.id === 'dep-add')?.diffStatus).toBe('added');
    expect(out.edges.find((e) => e.id === 'dep-rem')?.diffStatus).toBe('removed');
    expect(out.edges.find((e) => e.id === 'maintains')?.diffStatus).toBeUndefined();
  });

  it('marks componentVersion copies using parentId when applicationId is absent', () => {
    const nodes: ViewNode[] = [
      {
        ...node('app-1::cv-new', 'componentVersion', { sourceId: 'cv-new' }),
        parentId: 'app-1',
      },
    ];
    const out = applyFeatureVersionCompareDiffStatus(nodes, [], diff);
    expect(out.nodes[0]?.data.diffStatus).toBe('added');
  });

  it('does not mark unchanged composition neighbors of a DEPENDS_ON diff', () => {
    const onlyEdgeDiff: FeatureVersionCompareDiff = {
      added: {
        composition: new Set(),
        dependsOn: new Set(['cv-a::cv-b']),
        applications: new Set(),
        units: new Set(),
      },
      removed: {
        composition: new Set(),
        dependsOn: new Set(),
        applications: new Set(),
        units: new Set(),
      },
    };
    const nodes: ViewNode[] = [
      node('app-1::cv-a', 'component', { sourceId: 'cv-a', applicationId: 'app-1' }),
      node('app-1::cv-b', 'component', { sourceId: 'cv-b', applicationId: 'app-1' }),
    ];
    const out = applyFeatureVersionCompareDiffStatus(
      nodes,
      [edge('dep', 'app-1::cv-a', 'app-1::cv-b', 'DEPENDS_ON')],
      onlyEdgeDiff,
    );
    expect(out.nodes.find((n) => n.id === 'app-1::cv-a')?.data.diffStatus).toBeUndefined();
    expect(out.nodes.find((n) => n.id === 'app-1::cv-b')?.data.diffStatus).toBeUndefined();
    expect(out.edges[0]?.diffStatus).toBe('added');
  });
});
