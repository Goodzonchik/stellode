import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

describe('normalizeDiagramNodeTypeKey', () => {
  it('returns default for empty', () => {
    expect(normalizeDiagramNodeTypeKey('')).toBe('default');
    expect(normalizeDiagramNodeTypeKey('  ')).toBe('default');
  });

  it('preserves camelCase for version entity types', () => {
    expect(normalizeDiagramNodeTypeKey('componentVersion')).toBe('componentVersion');
    expect(normalizeDiagramNodeTypeKey('COMPONENTVERSION')).toBe('componentVersion');
  });

  it('lowercases simple types', () => {
    expect(normalizeDiagramNodeTypeKey('Service')).toBe('service');
    expect(normalizeDiagramNodeTypeKey('unit')).toBe('unit');
  });
});
