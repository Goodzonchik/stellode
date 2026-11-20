import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

const nestableTypes = new Set(['team', 'service', 'feature', 'app', 'application']);

export const isBridgeNestableUnderUnit = (type: string): boolean =>
  nestableTypes.has(normalizeDiagramNodeTypeKey(type));
