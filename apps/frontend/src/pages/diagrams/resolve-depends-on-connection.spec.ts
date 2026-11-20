import { resolveDependsOnConnection } from './resolve-depends-on-connection';

describe('resolveDependsOnConnection', () => {
  it('resolves two projected component nodes as DEPENDS_ON endpoints', () => {
    expect(
      resolveDependsOnConnection('cv1', 'cv2', [
        { id: 'cv1', data: { type: 'component' } },
        { id: 'cv2', data: { type: 'component' } },
      ]),
    ).toEqual({
      providerComponentVersionId: 'cv2',
      consumerComponentVersionId: 'cv1',
    });
  });

  it('resolves dependency type as endpoint', () => {
    expect(
      resolveDependsOnConnection('cv1', 'dep1', [
        { id: 'cv1', data: { type: 'component' } },
        { id: 'dep1', data: { type: 'dependency' } },
      ]),
    ).toEqual({
      providerComponentVersionId: 'dep1',
      consumerComponentVersionId: 'cv1',
    });
  });

  it('keeps legacy componentVersion type', () => {
    expect(
      resolveDependsOnConnection('a', 'b', [
        { id: 'a', data: { type: 'componentVersion' } },
        { id: 'b', data: { type: 'componentVersion' } },
      ]),
    ).toEqual({
      providerComponentVersionId: 'b',
      consumerComponentVersionId: 'a',
    });
  });

  it('sets contextHint when target is non-endpoint', () => {
    expect(
      resolveDependsOnConnection('cv1', 'feat1', [
        { id: 'cv1', data: { type: 'component' } },
        { id: 'feat1', data: { type: 'feature' } },
      ]),
    ).toEqual({
      providerComponentVersionId: 'cv1',
      consumerComponentVersionId: null,
      contextHint: { id: 'feat1', nodeType: 'feature' },
    });
  });

  it('sets contextHint when source is non-endpoint', () => {
    expect(
      resolveDependsOnConnection('svc1', 'cv2', [
        { id: 'svc1', data: { type: 'service' } },
        { id: 'cv2', data: { type: 'component' } },
      ]),
    ).toEqual({
      providerComponentVersionId: 'cv2',
      consumerComponentVersionId: null,
      contextHint: { id: 'svc1', nodeType: 'service' },
    });
  });
});
