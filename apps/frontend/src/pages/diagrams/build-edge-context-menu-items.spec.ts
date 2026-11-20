import { buildEdgeContextMenuItems } from './build-edge-context-menu-items';

describe('buildEdgeContextMenuItems', () => {
  it('returns delete action for DEPENDS_ON on editable feature-version', () => {
    expect(
      buildEdgeContextMenuItems({
        entity: 'feature-version',
        relationshipType: 'DEPENDS_ON',
        isReadOnly: false,
      }),
    ).toEqual([
      {
        id: 'fv-delete-depends-on',
        label: 'Удалить связь',
        action: 'fvDeleteDependsOn',
      },
    ]);
  });

  it('returns empty when read-only', () => {
    expect(
      buildEdgeContextMenuItems({
        entity: 'feature-version',
        relationshipType: 'DEPENDS_ON',
        isReadOnly: true,
      }),
    ).toEqual([]);
  });

  it('returns empty for non-DEPENDS_ON', () => {
    expect(
      buildEdgeContextMenuItems({
        entity: 'feature-version',
        relationshipType: 'USES_COMPONENT_VERSION',
        isReadOnly: false,
      }),
    ).toEqual([]);
  });

  it('returns empty for other entities', () => {
    expect(
      buildEdgeContextMenuItems({
        entity: 'team',
        relationshipType: 'DEPENDS_ON',
        isReadOnly: false,
      }),
    ).toEqual([]);
  });
});
