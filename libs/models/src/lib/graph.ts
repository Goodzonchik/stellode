export const GraphLabel = {
  Unit: 'Unit',
  Application: 'Application',
  ApplicationVersion: 'ApplicationVersion',
  Feature: 'Feature',
  Team: 'Team',
  Component: 'Component',
  Service: 'Service',
  FeatureVersion: 'FeatureVersion',
  ComponentVersion: 'ComponentVersion',
} as const;

export type Label = (typeof GraphLabel)[keyof typeof GraphLabel];

export const ViewNodeType = {
  Default: 'default',
  Input: 'input',
  Group: 'group',
  Parent: 'parent',
  Custom: 'custom',
} as const;

export type ViewNodeType = (typeof ViewNodeType)[keyof typeof ViewNodeType];

export type CrossUnitHintValue = string | readonly string[];

export type CrossUnitHint = {
  readonly unitName: CrossUnitHintValue;
  readonly teamName: CrossUnitHintValue;
  readonly applicationName: CrossUnitHintValue;
  readonly componentName: CrossUnitHintValue;
  readonly featureName: CrossUnitHintValue;
  readonly serviceName: CrossUnitHintValue;
};

export interface Node {
  id: string;
  labels: Label[];
  type: string;
  name: string;
  unitId?: string;
  applicationId?: string;
  isDependency?: boolean;
  version?: string;
  versionNumber?: number;
  status?: string;
  actualVersion?: string;
  actualVersionNumber?: number;
  draftVersion?: string;
  draftVersionNumber?: number;
}

export interface ArchitectureRelationship {
  type: string;
  from: string;
  to: string;
  id: string;
  properties?: Record<string, unknown>;
}

export interface ArchitectureGraph {
  nodes: Node[];
  relationships: ArchitectureRelationship[];
}

export interface ViewNode {
  id: string;
  type: ViewNodeType;
  draggable: boolean;
  position: { x: number; y: number };
  hidden?: boolean;
  data: {
    label: string;
    type: string;
    isDependency?: boolean;
    actualVersion?: string;
    actualVersionNumber?: number;
    draftVersion?: string;
    draftVersionNumber?: number;
    status?: string;
    unitId?: string;
    readyToProduction?: boolean;
    sourceId?: string;
    applicationId?: string;
    applicationStatus?: string;
    duplicate?: boolean;
    impactHighlighted?: boolean;
    hoverHighlighted?: boolean;
    containsDependency?: boolean;
    diffStatus?: 'added' | 'removed';
    crossUnitHint?: CrossUnitHint;
  };
  parentId?: string;
  extent?: 'parent';
  style?: { width?: number; height?: number };
}

export interface ViewEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  relationshipType: string;
  hidden?: boolean;
  animated?: boolean;
  label?: string;
  diagramAnomaly?: boolean;
  diffStatus?: 'added' | 'removed';
  applicationId?: string;
  consumerApplicationId?: string;
  providerApplicationId?: string;
  providerServiceId?: string;
  providerFeatureId?: string;
  status?: string;
  style?: { stroke?: string; strokeWidth?: number };
  markerEnd?: { readonly type: 'arrowclosed' };
  pathOffset?: number;
  data?: { readonly pathOffset?: number };
}

export interface Diagram {
  nodes: ViewNode[];
  edges: ViewEdge[];
}
