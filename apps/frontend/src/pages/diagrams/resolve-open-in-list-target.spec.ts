import type { ArchitectureGraph } from '@stellode/models';
import { resolveOpenInListTarget } from './resolve-open-in-list-target';

const unitGraph = (overrides?: Partial<ArchitectureGraph>): ArchitectureGraph => ({
  nodes: [
    {
      id: 'unit-1',
      name: 'CRM',
      type: 'Unit',
      labels: ['Unit'],
      status: 'active',
    },
    {
      id: 'team-1',
      name: 'Team A',
      type: 'Team',
      labels: ['Team'],
      status: 'active',
      unitId: 'unit-1',
    },
    {
      id: 'app-1',
      name: 'App',
      type: 'Application',
      labels: ['Application'],
      status: 'active',
      unitId: 'unit-1',
    },
    {
      id: 'c-auth',
      name: 'Auth',
      type: 'Component',
      labels: ['Component'],
      status: 'active',
      unitId: 'unit-1',
    },
    {
      id: 'cv-12',
      name: 'Auth 1.2',
      type: 'componentVersion',
      labels: ['ComponentVersion'],
      status: 'active',
      versionNumber: 1,
    },
    {
      id: 'foreign-team',
      name: 'Other',
      type: 'Team',
      labels: ['Team'],
      status: 'active',
      unitId: 'unit-other',
    },
    {
      id: 'no-unit-team',
      name: 'Orphan',
      type: 'Team',
      labels: ['Team'],
      status: 'active',
    },
  ],
  relationships: [
    { id: 'hv1', type: 'HAS_VERSION', from: 'c-auth', to: 'cv-12' },
  ],
  ...overrides,
});

describe('resolveOpenInListTarget', () => {
  it('maps Unit to /units with highlight and ctx.unitId = node.id', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'unit-1', 'unit-1')).toBe(
      '/units?highlight=unit-1&ctx.unitId=unit-1',
    );
  });

  it('returns null for Unit when header unit differs', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'unit-1', 'unit-other')).toBeNull();
  });

  it('maps Team in current unit to /teams', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'team-1', 'unit-1')).toBe(
      '/teams?highlight=team-1&ctx.unitId=unit-1',
    );
  });

  it('returns null for entity of another unit', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'foreign-team', 'unit-1')).toBeNull();
  });

  it('returns null when entity has no unitId', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'no-unit-team', 'unit-1')).toBeNull();
  });

  it('maps ComponentVersion to parent componentId', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'cv-12', 'unit-1')).toBe(
      '/components?highlight=c-auth&ctx.unitId=unit-1',
    );
  });

  it('maps Application in current unit', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'app-1', 'unit-1')).toBe(
      '/applications?highlight=app-1&ctx.unitId=unit-1',
    );
  });

  it('returns null when currentUnitId is empty', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'team-1', '')).toBeNull();
  });

  it('returns null for unknown node', () => {
    expect(resolveOpenInListTarget(unitGraph(), 'missing', 'unit-1')).toBeNull();
  });
});
