import { resolveDiagramCanvasOptions } from './resolve-diagram-canvas-options';

describe('resolveDiagramCanvasOptions', () => {
  it('applies defaults for main hub canvas', () => {
    expect(resolveDiagramCanvasOptions({})).toEqual({
      showMiniMap: true,
      fitView: false,
      nodesConnectable: true,
    });
  });

  it('keeps cross-unit overview fitView and bridge without MiniMap', () => {
    expect(
      resolveDiagramCanvasOptions({ fitView: true, showMiniMap: false, nodesConnectable: false }),
    ).toEqual({
      showMiniMap: false,
      fitView: true,
      nodesConnectable: false,
    });
  });
});
