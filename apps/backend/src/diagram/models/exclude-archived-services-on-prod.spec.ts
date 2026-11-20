import { GraphLabel } from '@stellode/models';
import { excludeArchivedServicesOnProd } from './exclude-archived-services-on-prod';

describe('excludeArchivedServicesOnProd', () => {
  it('removes archived Service nodes and touching relationships', () => {
    const graph = {
      nodes: [
        {
          id: 's-active',
          labels: [GraphLabel.Service],
          type: 'service',
          name: 'Active',
          status: 'active',
        },
        {
          id: 's-arch',
          labels: [GraphLabel.Service],
          type: 'service',
          name: 'Archived',
          status: 'archive',
        },
        {
          id: 'f1',
          labels: [GraphLabel.Feature],
          type: 'feature',
          name: 'F',
        },
      ],
      relationships: [
        { id: 'r1', type: 'AGGREGATES', from: 's-active', to: 'f1' },
        { id: 'r2', type: 'AGGREGATES', from: 's-arch', to: 'f1' },
      ],
    };
    const out = excludeArchivedServicesOnProd(graph);
    expect(out.nodes.map((n) => n.id)).toEqual(['s-active', 'f1']);
    expect(out.relationships.map((r) => r.id)).toEqual(['r1']);
  });

  it('retains archived service when id is listed', () => {
    const graph = {
      nodes: [
        {
          id: 's-arch',
          labels: [GraphLabel.Service],
          type: 'service',
          name: 'Archived',
          status: 'archive',
        },
      ],
      relationships: [],
    };
    const out = excludeArchivedServicesOnProd(graph, { retainServiceIds: ['s-arch'] });
    expect(out.nodes).toHaveLength(1);
  });
});
