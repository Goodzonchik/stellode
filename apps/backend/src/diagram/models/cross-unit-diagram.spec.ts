import { mergeStarCrossUnitBridges } from './cross-unit-diagram';

describe('mergeStarCrossUnitBridges', () => {
  const emptyGraph = { nodes: [], relationships: [] };

  it('adds one synthetic edge per unique peer from center', () => {
    const center = 'unit-center';
    const graph = {
      nodes: [
        { id: center, labels: ['Unit'], name: 'C', properties: {} },
        { id: 'peer-a', labels: ['Unit'], name: 'A', properties: {} },
        { id: 'peer-b', labels: ['Unit'], name: 'B', properties: {} },
      ],
      relationships: [],
    };
    const merged = mergeStarCrossUnitBridges(graph, center, ['peer-a', 'peer-b']);
    expect(merged.relationships).toHaveLength(2);
    expect(merged.relationships.map((r) => r.id).sort()).toEqual(
      [`CROSS_UNIT_LINK:${center}:peer-a`, `CROSS_UNIT_LINK:${center}:peer-b`].sort(),
    );
  });

  it('dedupes duplicate peer ids', () => {
    const center = 'c';
    const merged = mergeStarCrossUnitBridges(emptyGraph, center, ['p', 'p']);
    expect(merged.relationships).toHaveLength(1);
    expect(merged.relationships[0]?.id).toBe('CROSS_UNIT_LINK:c:p');
  });

  it('skips peer equal to center', () => {
    const center = 'same';
    const merged = mergeStarCrossUnitBridges(emptyGraph, center, ['same', 'other']);
    expect(merged.relationships).toHaveLength(1);
    expect(merged.relationships[0]?.to).toBe('other');
  });

  it('returns no bridges when peer list empty', () => {
    const merged = mergeStarCrossUnitBridges(emptyGraph, 'center', []);
    expect(merged.relationships).toHaveLength(0);
  });
});
