import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CopyMermaidDiagramButton } from './CopyMermaidDiagramButton';
import type { DiagramCanvasProps } from './diagram-canvas-props';
import { DiagramLayoutOrientationButtons } from './DiagramLayoutOrientationButtons';
import CustomNode from './CustomNode';
import { DependsOnEdge } from './DependsOnEdge';
import GroupNode from './GroupNode';
import { resolveDiagramCanvasOptions } from './resolve-diagram-canvas-options';

const nodeTypes: NodeTypes = { custom: CustomNode, group: GroupNode };
const edgeTypes: EdgeTypes = { dependsOn: DependsOnEdge };

export const DiagramCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onLayout,
  mermaidNodes,
  mermaidEdges,
  getMermaidDirection,
  showMiniMap,
  fitView,
  nodesConnectable,
  toolbarExtra,
  onInit,
  onConnect,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onEdgeClick,
}: DiagramCanvasProps) => {
  const chrome = resolveDiagramCanvasOptions({ showMiniMap, fitView, nodesConnectable });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesConnectable={chrome.nodesConnectable}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneContextMenu={onPaneContextMenu}
      onNodeContextMenu={onNodeContextMenu}
      onEdgeContextMenu={onEdgeContextMenu}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onEdgeClick={onEdgeClick}
      onInit={onInit}
      fitView={chrome.fitView}
    >
      <Panel position="top-right">
        <div className="diagram-toolbar">
          <DiagramLayoutOrientationButtons onLayout={onLayout} />
          {toolbarExtra}
        </div>
      </Panel>
      <Background />
      <Panel position="bottom-left" className="diagram-mermaid-panel">
        <CopyMermaidDiagramButton
          nodes={mermaidNodes}
          edges={mermaidEdges}
          getDirection={getMermaidDirection}
        />
      </Panel>
      <Controls />
      {chrome.showMiniMap ? <MiniMap /> : null}
    </ReactFlow>
  );
};
