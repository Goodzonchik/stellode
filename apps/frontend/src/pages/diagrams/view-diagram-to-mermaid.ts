import type { ViewEdge, ViewNode } from '@stellode/models';
import { captionWithOptionalVersion } from './caption-with-optional-version';
import { escapeMermaidLabel } from './escape-mermaid-label';
import { groupNodeCaption } from './group-node-caption';
import type { LayoutDirection } from './layout-direction';
import { sanitizeMermaidId } from './sanitize-mermaid-id';

const isVisible = (item: { hidden?: boolean }): boolean => item.hidden !== true;

const isGroupNode = (node: ViewNode): boolean => node.type === 'group';

const nodeCaption = (node: ViewNode): string =>
  isGroupNode(node) ? groupNodeCaption(node.data) : captionWithOptionalVersion(node.data);

const quotedLabel = (text: string): string => `["${escapeMermaidLabel(text)}"]`;

const nodeLine = (node: ViewNode, indent: string): string =>
  `${indent}${sanitizeMermaidId(node.id)}${quotedLabel(nodeCaption(node))}`;

const edgeLabel = (edge: ViewEdge): string => edge.relationshipType || edge.label || '';

const edgeLine = (edge: ViewEdge): string => {
  const label = edgeLabel(edge);
  const arrow = label.length > 0 ? `-->|${escapeMermaidLabel(label)}|` : '-->';
  return `  ${sanitizeMermaidId(edge.source)} ${arrow} ${sanitizeMermaidId(edge.target)}`;
};

type NodeForest = {
  readonly roots: readonly ViewNode[];
  readonly childrenByParent: ReadonlyMap<string, readonly ViewNode[]>;
};

const buildForest = (nodes: readonly ViewNode[]): NodeForest => {
  const idSet = new Set(nodes.map((node) => node.id));
  const childrenByParent = new Map<string, ViewNode[]>();
  const roots: ViewNode[] = [];
  for (const node of nodes) {
    const parentId = node.parentId;
    if (parentId !== undefined && idSet.has(parentId)) {
      const list = childrenByParent.get(parentId) ?? [];
      list.push(node);
      childrenByParent.set(parentId, list);
      continue;
    }
    roots.push(node);
  }
  return { roots, childrenByParent };
};

const renderNodeTree = (
  node: ViewNode,
  childrenByParent: ReadonlyMap<string, readonly ViewNode[]>,
  depth: number,
): readonly string[] => {
  const indent = '  '.repeat(depth);
  const children = childrenByParent.get(node.id) ?? [];
  if (!isGroupNode(node)) return [nodeLine(node, indent)];
  const inner = children.flatMap((child) => renderNodeTree(child, childrenByParent, depth + 1));
  return [
    `${indent}subgraph ${sanitizeMermaidId(node.id)}${quotedLabel(nodeCaption(node))}`,
    ...inner,
    `${indent}end`,
  ];
};

export const viewDiagramToMermaid = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  direction: LayoutDirection,
): string => {
  const visibleNodes = nodes.filter(isVisible);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter(
    (edge) => isVisible(edge) && visibleIds.has(edge.source) && visibleIds.has(edge.target),
  );
  if (visibleNodes.length === 0) return `flowchart ${direction}`;
  const { roots, childrenByParent } = buildForest(visibleNodes);
  const body = roots.flatMap((node) => renderNodeTree(node, childrenByParent, 1));
  const edgeLines = visibleEdges.map(edgeLine);
  return [`flowchart ${direction}`, ...body, ...edgeLines].join('\n');
};
