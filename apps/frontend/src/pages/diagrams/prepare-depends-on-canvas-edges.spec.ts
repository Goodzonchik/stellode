import type { ViewEdge } from '@stellode/models';
import { prepareDependsOnCanvasEdges } from './prepare-depends-on-canvas-edges';

const edge = (
  partial: Partial<ViewEdge> & Pick<ViewEdge, 'id' | 'source' | 'target' | 'relationshipType'>,
): ViewEdge => ({
  type: 'default',
  ...partial,
});

describe('prepareDependsOnCanvasEdges', () => {
  it('adds dependsOn type and arrow marker for a single DEPENDS_ON without offset', () => {
    const input = [edge({ id: 'e1', source: 'a', target: 'b', relationshipType: 'DEPENDS_ON' })];
    expect(prepareDependsOnCanvasEdges(input)).toEqual([
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        relationshipType: 'DEPENDS_ON',
        type: 'dependsOn',
        markerEnd: { type: 'arrowclosed' },
        pathOffset: 0,
        data: { pathOffset: 0 },
      },
    ]);
  });

  it('assigns opposite pathOffset for bidirectional DEPENDS_ON pair', () => {
    const input = [
      edge({ id: 'ab', source: 'a', target: 'b', relationshipType: 'DEPENDS_ON' }),
      edge({ id: 'ba', source: 'b', target: 'a', relationshipType: 'DEPENDS_ON' }),
    ];
    const result = prepareDependsOnCanvasEdges(input);
    expect(result).toEqual([
      {
        id: 'ab',
        source: 'a',
        target: 'b',
        relationshipType: 'DEPENDS_ON',
        type: 'dependsOn',
        markerEnd: { type: 'arrowclosed' },
        pathOffset: 24,
        data: { pathOffset: 24 },
      },
      {
        id: 'ba',
        source: 'b',
        target: 'a',
        relationshipType: 'DEPENDS_ON',
        type: 'dependsOn',
        markerEnd: { type: 'arrowclosed' },
        pathOffset: -24,
        data: { pathOffset: -24 },
      },
    ]);
  });

  it('leaves non-DEPENDS_ON edges unchanged', () => {
    const input = [
      edge({ id: 'u1', source: 'fv', target: 'cv', relationshipType: 'USES_COMPONENT_VERSION' }),
    ];
    expect(prepareDependsOnCanvasEdges(input)).toEqual(input);
  });
});
