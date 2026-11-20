import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

export const isGroupNodeUnitType = (type: string): boolean =>
  normalizeDiagramNodeTypeKey(type) === 'unit';
