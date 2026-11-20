import { architectureGraphToDiagram } from './architecture-graph-to-diagram';

describe('architectureGraphToDiagram depends-on context', () => {
  it('copies provider service and feature ids onto the view edge', () => {
    const diagram = architectureGraphToDiagram({
      nodes: [],
      relationships: [
        {
          id: 'd1',
          type: 'DEPENDS_ON',
          from: 'cv-a',
          to: 'cv-b',
          properties: {
            providerApplicationId: 'app-b',
            providerServiceId: 'svc-b',
            providerFeatureId: 'feat-b',
          },
        },
      ],
    });

    expect(diagram.edges[0]).toMatchObject({
      providerApplicationId: 'app-b',
      providerServiceId: 'svc-b',
      providerFeatureId: 'feat-b',
    });
  });
});
