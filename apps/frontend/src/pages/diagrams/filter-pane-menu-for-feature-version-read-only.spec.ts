import { getDiagramContextMenuItems } from './diagram-context-menu.config';
import { filterPaneMenuItemsForFeatureVersionReadOnly } from './filter-pane-menu-for-feature-version-read-only';

describe('filterPaneMenuItemsForFeatureVersionReadOnly', () => {
  it('removes createComponent and addComponent when readOnly', () => {
    const items = getDiagramContextMenuItems('feature-version');
    const filtered = filterPaneMenuItemsForFeatureVersionReadOnly(items, true);
    expect(filtered.some((i) => i.action === 'createComponent')).toBe(false);
    expect(filtered.some((i) => i.action === 'addComponent')).toBe(false);
  });

  it('leaves create and add component when not readOnly', () => {
    const items = getDiagramContextMenuItems('feature-version');
    const filtered = filterPaneMenuItemsForFeatureVersionReadOnly(items, false);
    expect(filtered.map((item) => item.action)).toEqual(['createComponent', 'addComponent']);
  });
});

