import type { ViewNode } from '@stellode/models';
import { UnitDiagramNodeKind, viewNodeUnitKind } from './unit-diagram-type-visibility';

export const clearFeatureDraftVersionFields = (nodes: ViewNode[]): ViewNode[] =>
  nodes.map((node) => {
    if (viewNodeUnitKind(node) !== UnitDiagramNodeKind.Feature) return node;
    const { draftVersion, draftVersionNumber, ...restData } = node.data;
    void draftVersion;
    void draftVersionNumber;
    return { ...node, data: restData };
  });
