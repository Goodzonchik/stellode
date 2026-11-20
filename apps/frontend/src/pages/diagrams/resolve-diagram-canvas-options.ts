export type DiagramCanvasOptionsInput = {
  readonly showMiniMap?: boolean;
  readonly fitView?: boolean;
  readonly nodesConnectable?: boolean;
};

export type DiagramCanvasOptions = {
  readonly showMiniMap: boolean;
  readonly fitView: boolean;
  readonly nodesConnectable: boolean;
};

export const resolveDiagramCanvasOptions = (
  input: DiagramCanvasOptionsInput,
): DiagramCanvasOptions => ({
  showMiniMap: input.showMiniMap ?? true,
  fitView: input.fitView ?? false,
  nodesConnectable: input.nodesConnectable ?? true,
});
