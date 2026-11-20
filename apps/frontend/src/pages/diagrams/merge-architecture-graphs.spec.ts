import type { ArchitectureGraph } from '@stellode/models';
import { mergeArchitectureGraphs } from './merge-architecture-graphs';

describe('mergeArchitectureGraphs', () => {
  it('unions nodes and relationships preferring primary on id conflict', () => {
    const primary: ArchitectureGraph = {
      nodes: [
        { id: 'a', labels: ['Application'], type: 'application', name: 'Primary' },
        { id: 'b', labels: ['Unit'], type: 'unit', name: 'OnlyPrimary' },
      ],
      relationships: [
        { id: 'r1', type: 'DEPENDS_ON', from: 'x', to: 'y' },
      ],
    };
    const secondary: ArchitectureGraph = {
      nodes: [
        { id: 'a', labels: ['Application'], type: 'application', name: 'Secondary' },
        { id: 'c', labels: ['Unit'], type: 'unit', name: 'OnlySecondary' },
      ],
      relationships: [
        { id: 'r1', type: 'DEPENDS_ON', from: 'x', to: 'z' },
        { id: 'r2', type: 'USES_COMPONENT_VERSION', from: 'fv', to: 'cv' },
      ],
    };
    const merged = mergeArchitectureGraphs(primary, secondary);
    expect(merged.nodes.find((n) => n.id === 'a')?.name).toBe('Primary');
    expect(merged.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
    expect(merged.relationships.find((r) => r.id === 'r1')?.to).toBe('y');
    expect(merged.relationships.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });
});
