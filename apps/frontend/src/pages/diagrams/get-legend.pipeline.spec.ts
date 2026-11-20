import type { ArchitectureGraph } from '@stellode/models';
import { architectureGraphToDiagram } from '../../common/architecture-graph-to-diagram';
import { clearFeatureDraftVersionFields } from './clear-feature-draft-version-fields';
import { getLegend } from './get-legend';
import { mergeTeamDiagramNodes } from './merge-team-diagram-nodes';
import { projectComponentVersionsToComponents } from './project-component-versions-to-components';

describe('getLegend team pipeline', () => {
  it('includes services after team diagram projection', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        {
          id: 'tm1',
          labels: ['Team'],
          type: 'team',
          name: 'BackTeam',
        },
        {
          id: 'c1',
          labels: ['Component'],
          type: 'component',
          name: 'BackComponent',
        },
        {
          id: 'cv1',
          labels: ['ComponentVersion'],
          type: 'componentVersion',
          name: 'BackComponent',
          version: '1.0.0',
          versionNumber: 1,
          status: 'active',
        },
        {
          id: 'f1',
          labels: ['Feature'],
          type: 'feature',
          name: 'CRUD',
        },
        {
          id: 'fv1',
          labels: ['FeatureVersion'],
          type: 'featureVersion',
          name: 'CRUD',
          version: '1.0.0',
          versionNumber: 1,
          status: 'active',
        },
        {
          id: 's1',
          labels: ['Service'],
          type: 'service',
          name: 'CRUD',
          status: 'active',
        },
        {
          id: 'a1',
          labels: ['Application'],
          type: 'app',
          name: 'BackApp',
        },
        {
          id: 'av1',
          labels: ['ApplicationVersion'],
          type: 'applicationVersion',
          name: 'BackApp',
          version: '1.0.0',
          versionNumber: 1,
          status: 'current',
          applicationId: 'a1',
        },
      ],
      relationships: [
        { id: 'm1', type: 'MAINTAINS', from: 'tm1', to: 'c1' },
        { id: 'hv1', type: 'HAS_VERSION', from: 'c1', to: 'cv1' },
        { id: 'uses1', type: 'USES_COMPONENT_VERSION', from: 'fv1', to: 'cv1', properties: { applicationId: 'a1' } },
        { id: 'hvf1', type: 'HAS_VERSION', from: 'f1', to: 'fv1' },
        { id: 'agg1', type: 'AGGREGATES', from: 's1', to: 'f1' },
        { id: 'hc1', type: 'HAS_COMPONENT', from: 'av1', to: 'cv1', properties: { status: 'active' } },
        { id: 'hava1', type: 'HAS_VERSION', from: 'a1', to: 'av1' },
      ],
    };
    const diagram = architectureGraphToDiagram(graph);
    const projected = projectComponentVersionsToComponents(diagram.nodes, diagram.edges);
    const merged = mergeTeamDiagramNodes(projected.nodes, projected.edges);
    const nodes = clearFeatureDraftVersionFields(merged.nodes);
    const legend = getLegend(nodes, undefined);
    expect(legend.services.map((item) => item.name)).toEqual(['CRUD']);
    expect(legend.features.map((item) => item.name)).toEqual(['CRUD']);
    expect(legend.application.map((item) => item.name)).toEqual(['BackApp']);
  });
});
