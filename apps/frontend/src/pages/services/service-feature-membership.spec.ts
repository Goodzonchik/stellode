import {
  featuresInService,
  featuresOutsideService,
  type FeatureWithServiceRefs,
} from './service-feature-membership';

const sample: FeatureWithServiceRefs[] = [
  { id: 'f1', name: 'A', services: [{ id: 's1', name: 'S1' }] },
  { id: 'f2', name: 'B', services: [{ id: 's2', name: 'S2' }] },
  { id: 'f3', name: 'C' },
  { id: 'f4', name: 'D', services: [{ id: 's1', name: 'S1' }, { id: 's2', name: 'S2' }] },
];

describe('featuresInService', () => {
  it('returns features linked to the service', () => {
    expect(featuresInService(sample, 's1').map((f) => f.id)).toEqual(['f1', 'f4']);
  });

  it('returns empty when no matches', () => {
    expect(featuresInService(sample, 'unknown')).toEqual([]);
  });
});

describe('featuresOutsideService', () => {
  it('returns features not linked to the service', () => {
    expect(featuresOutsideService(sample, 's1').map((f) => f.id)).toEqual(['f2', 'f3']);
  });

  it('treats missing services array as outside', () => {
    const onlyBare: FeatureWithServiceRefs[] = [{ id: 'x', name: 'X' }];
    expect(featuresOutsideService(onlyBare, 's1')).toEqual(onlyBare);
  });
});
