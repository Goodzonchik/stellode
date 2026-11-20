import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type {
  Connection,
  Edge,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from '@xyflow/react';
import type { ViewEdge, ViewNode } from '@stellode/models';
import type { LayoutDirection } from './layout-direction';

export type DiagramCanvasProps = {
  readonly nodes: ViewNode[];
  readonly edges: ViewEdge[];
  readonly onNodesChange: OnNodesChange<ViewNode>;
  readonly onEdgesChange: OnEdgesChange<ViewEdge>;
  readonly onLayout: (direction: LayoutDirection) => void;
  readonly mermaidNodes: readonly ViewNode[];
  readonly mermaidEdges: readonly ViewEdge[];
  readonly getMermaidDirection: () => LayoutDirection;
  readonly showMiniMap?: boolean;
  readonly fitView?: boolean;
  readonly nodesConnectable?: boolean;
  readonly toolbarExtra?: ReactNode;
  readonly onInit?: (instance: ReactFlowInstance<ViewNode, ViewEdge>) => void;
  readonly onConnect?: (connection: Connection) => void;
  readonly onPaneContextMenu?: (event: ReactMouseEvent | MouseEvent) => void;
  readonly onNodeContextMenu?: (event: ReactMouseEvent, node: ViewNode) => void;
  readonly onEdgeContextMenu?: (event: ReactMouseEvent, edge: ViewEdge) => void;
  readonly onNodeMouseEnter?: (event: ReactMouseEvent, node: ViewNode) => void;
  readonly onNodeMouseLeave?: (event: ReactMouseEvent, node: ViewNode) => void;
  readonly onEdgeClick?: (event: ReactMouseEvent, edge: Edge) => void;
};
