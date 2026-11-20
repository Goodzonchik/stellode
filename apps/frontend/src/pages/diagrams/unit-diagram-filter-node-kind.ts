import type { ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';
import type { UnitDiagramFilterKind } from './unit-diagram-instance-filter-types';
import { UnitDiagramFilterKind as Kind } from './unit-diagram-instance-filter-types';

export const unitDiagramFilterNodeKind = (node: ViewNode): UnitDiagramFilterKind | null => {
  const key = normalizeDiagramNodeTypeKey(node.data.type);
  if (isComponentLikeType(key)) return Kind.Component;
  if (key === 'application' || key === 'app') return Kind.App;
  if (key === 'team') return Kind.Team;
  if (key === 'service') return Kind.Service;
  if (key === 'feature') return Kind.Feature;
  return null;
};
