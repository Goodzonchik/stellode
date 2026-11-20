import { getDiagramContextMenuItems } from './diagram-context-menu.config';

describe('getDiagramContextMenuItems', () => {
  it('offers create and add component on feature-version diagram', () => {
    const actions = getDiagramContextMenuItems('feature-version').map((item) => item.action);
    expect(actions).toEqual(['createComponent', 'addComponent']);
  });
});
