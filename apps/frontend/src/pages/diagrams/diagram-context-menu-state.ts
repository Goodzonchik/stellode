export type NodeContextMenuState = {
  x: number;
  y: number;
  nodeId: string;
  applicationId?: string;
  isFlatComponent?: boolean;
};

export type EdgeContextMenuState = {
  x: number;
  y: number;
  edgeId: string;
  relationshipType: string;
  sourceComponentVersionId: string;
  targetComponentVersionId: string;
  consumerApplicationId?: string;
  providerApplicationId?: string;
  edgeLabel: string;
};
