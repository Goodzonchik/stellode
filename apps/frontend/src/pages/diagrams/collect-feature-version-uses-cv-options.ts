import type { ViewNode } from '@stellode/models';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';
import { isComponentLikeType } from './is-component-like-type';
import { resolveSourceNodeId } from './resolve-source-node-id';

export type FeatureVersionUsesCvOption = {
  readonly id: string;
  readonly label: string;
  readonly applicationId: string;
};

export const collectFeatureVersionUsesCvOptions = (
  nodes: readonly ViewNode[],
  excludeCvId: string,
): readonly FeatureVersionUsesCvOption[] =>
  nodes.flatMap((node) => {
    const typeKey = normalizeDiagramNodeTypeKey(node.data.type);
    if (!isComponentLikeType(typeKey) && typeKey !== 'componentVersion') return [];
    if (node.parentId === undefined || node.parentId === '') return [];
    const cvId = resolveSourceNodeId(node);
    if (cvId === excludeCvId) return [];
    const applicationId = node.data.applicationId;
    if (typeof applicationId !== 'string' || applicationId.trim().length === 0) return [];
    return [
      {
        id: cvId,
        applicationId: applicationId.trim(),
        label: node.data.label || cvId,
      },
    ];
  });
