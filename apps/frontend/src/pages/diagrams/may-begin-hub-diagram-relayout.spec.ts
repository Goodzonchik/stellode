import { mayBeginHubDiagramRelayout } from './may-begin-hub-diagram-relayout';

describe('mayBeginHubDiagramRelayout', () => {
  it('returns false when base was cleared for an in-flight diagram load', () => {
    expect(mayBeginHubDiagramRelayout(null)).toBe(false);
  });

  it('returns true when a cached hub base is present', () => {
    expect(mayBeginHubDiagramRelayout({ nodes: [], edges: [] })).toBe(true);
  });
});
