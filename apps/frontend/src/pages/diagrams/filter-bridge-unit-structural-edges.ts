import type { ViewEdge } from '@stellode/models';
import { BRIDGE_UNIT_STRUCTURAL_EDGE_TYPES } from './bridge-unit-structural-edge-types';

export const filterBridgeUnitStructuralEdges = (edges: readonly ViewEdge[]): ViewEdge[] =>
  edges.filter((edge) => !BRIDGE_UNIT_STRUCTURAL_EDGE_TYPES.has(edge.relationshipType));
