import { formatBlockingRelationLine } from './format-blocking-relation-line';

describe('formatBlockingRelationLine', () => {
  it('formats outgoing relation', () => {
    expect(
      formatBlockingRelationLine({
        relationType: 'PINNED_TO_APPLICATION_VERSION',
        direction: 'outgoing',
        targetId: 'av-1',
        targetKind: 'ApplicationVersion',
        targetName: '1.0',
      }),
    ).toBe('PINNED_TO_APPLICATION_VERSION (исходящая) → ApplicationVersion: 1.0');
  });

  it('formats incoming relation', () => {
    expect(
      formatBlockingRelationLine({
        relationType: 'SOME_LINK',
        direction: 'incoming',
        targetId: 'x',
        targetKind: 'Node',
        targetName: '',
      }),
    ).toBe('SOME_LINK (входящая) → Node: x');
  });
});
