import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const componentLike = new Set(['component', 'dependency', 'componentversion']);

export const isBridgeComponentLikeType = (type: string): boolean =>
  componentLike.has(normalizeDiagramNodeTypeKey(type));
