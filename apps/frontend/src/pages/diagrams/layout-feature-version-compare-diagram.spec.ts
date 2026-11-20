import type { ArchitectureGraph, ViewNode } from '@stellode/models';
import { ViewNodeType } from '@stellode/models';
import { diffFeatureVersionCompareSets } from './diff-feature-version-compare-sets';
import { extractFeatureVersionCompareSets } from './extract-feature-version-compare-sets';
import { groupNodesByApplication } from './group-nodes-by-application';
import { applyFeatureVersionCompareDiffStatus } from './apply-feature-version-compare-diff-status';
import { mergeArchitectureGraphs } from './merge-architecture-graphs';
import { projectFeatureVersionFlatDiagram } from './project-feature-version-flat-diagram';

const node = (
  id: string,
  labels: ArchitectureGraph['nodes'][number]['labels'],
  type: string,
  name: string,
  extra: Partial<ArchitectureGraph['nodes'][number]> = {},
): ArchitectureGraph['nodes'][number] => ({
  id,
  labels,
  type,
  name,
  ...extra,
});

describe('feature version compare pipeline (project → group → mark)', () => {
  it('marks added and removed composition component copies with diffStatus', () => {
    const current: ArchitectureGraph = {
      nodes: [
        node('fv-cur', ['FeatureVersion'], 'featureVersion', 'FV', {
          status: 'draft',
          version: '2',
        }),
        node('app-1', ['Application'], 'app', 'App1'),
        node('c-1', ['Component'], 'component', 'Cmp'),
        node('cv-new', ['ComponentVersion'], 'componentVersion', 'Cmp', {
          version: '2',
          status: 'draft',
        }),
        node('cv-keep', ['ComponentVersion'], 'componentVersion', 'CmpKeep', {
          version: '1',
          status: 'active',
        }),
        node('c-keep', ['Component'], 'component', 'CmpKeep'),
      ],
      relationships: [
        {
          id: 'uses-new',
          type: 'USES_COMPONENT_VERSION',
          from: 'fv-cur',
          to: 'cv-new',
          properties: { applicationId: 'app-1' },
        },
        {
          id: 'uses-keep',
          type: 'USES_COMPONENT_VERSION',
          from: 'fv-cur',
          to: 'cv-keep',
          properties: { applicationId: 'app-1' },
        },
        {
          id: 'hv-new',
          type: 'HAS_VERSION',
          from: 'c-1',
          to: 'cv-new',
        },
        {
          id: 'hv-keep',
          type: 'HAS_VERSION',
          from: 'c-keep',
          to: 'cv-keep',
        },
        {
          id: 'dep-new',
          type: 'DEPENDS_ON',
          from: 'cv-new',
          to: 'cv-keep',
        },
      ],
    };
    const previous: ArchitectureGraph = {
      nodes: [
        node('fv-prev', ['FeatureVersion'], 'featureVersion', 'FV', {
          status: 'active',
          version: '1',
        }),
        node('app-1', ['Application'], 'app', 'App1'),
        node('c-old', ['Component'], 'component', 'Old'),
        node('cv-old', ['ComponentVersion'], 'componentVersion', 'Old', {
          version: '1',
          status: 'active',
        }),
        node('c-keep', ['Component'], 'component', 'CmpKeep'),
        node('cv-keep', ['ComponentVersion'], 'componentVersion', 'CmpKeep', {
          version: '1',
          status: 'active',
        }),
      ],
      relationships: [
        {
          id: 'uses-old',
          type: 'USES_COMPONENT_VERSION',
          from: 'fv-prev',
          to: 'cv-old',
          properties: { applicationId: 'app-1' },
        },
        {
          id: 'uses-keep-prev',
          type: 'USES_COMPONENT_VERSION',
          from: 'fv-prev',
          to: 'cv-keep',
          properties: { applicationId: 'app-1' },
        },
        {
          id: 'hv-old',
          type: 'HAS_VERSION',
          from: 'c-old',
          to: 'cv-old',
        },
        {
          id: 'hv-keep-prev',
          type: 'HAS_VERSION',
          from: 'c-keep',
          to: 'cv-keep',
        },
      ],
    };

    const diff = diffFeatureVersionCompareSets(
      extractFeatureVersionCompareSets(current),
      extractFeatureVersionCompareSets(previous),
    );
    expect([...diff.added.composition]).toEqual(['cv-new::app-1']);
    expect([...diff.removed.composition]).toEqual(['cv-old::app-1']);
    expect([...diff.added.dependsOn]).toEqual(['cv-new::cv-keep']);

    const merged = mergeArchitectureGraphs(current, previous);
    const flat = projectFeatureVersionFlatDiagram(merged, 'fv-cur');
    const grouped = groupNodesByApplication(flat.nodes, flat.edges);
    const marked = applyFeatureVersionCompareDiffStatus(
      grouped.nodes,
      grouped.edges,
      diff,
    );

    const byDiff = (status: 'added' | 'removed'): ViewNode[] =>
      marked.nodes.filter((n) => n.data.diffStatus === status);

    const addedComponents = byDiff('added').filter(
      (n) => n.type === ViewNodeType.Custom || n.type === 'custom',
    );
    const removedComponents = byDiff('removed').filter(
      (n) => n.type === ViewNodeType.Custom || n.type === 'custom',
    );

    expect(addedComponents.map((n) => n.id)).toContain('app-1::cv-new');
    expect(removedComponents.map((n) => n.id)).toContain('app-1::cv-old');
    expect(addedComponents.map((n) => n.data.sourceId ?? n.id)).toContain('cv-new');
    expect(removedComponents.map((n) => n.data.sourceId ?? n.id)).toContain('cv-old');
    expect(marked.edges.find((e) => e.relationshipType === 'DEPENDS_ON')?.diffStatus).toBe(
      'added',
    );
  });
});
