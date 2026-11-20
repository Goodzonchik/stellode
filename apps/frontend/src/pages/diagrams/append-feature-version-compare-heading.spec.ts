import { appendFeatureVersionCompareHeading } from './append-feature-version-compare-heading';

describe('appendFeatureVersionCompareHeading', () => {
  it('formats feature label with selected and previous versions', () => {
    expect(
      appendFeatureVersionCompareHeading(
        'Фича Checkout',
        { version: '1.2.0', status: 'active' },
        { version: '1.1.0', status: 'active' },
      ),
    ).toBe('Фича Checkout · сравнение 1.2.0 (Активна) с 1.1.0 (Активна)');
  });

  it('localizes draft statuses for both versions', () => {
    expect(
      appendFeatureVersionCompareHeading(
        'Фича X',
        { version: '2', status: 'draft' },
        { version: '1', status: 'draft' },
      ),
    ).toBe('Фича X · сравнение 2 (Черновик) с 1 (Черновик)');
  });
});
