export type FeatureVersionBlockingRelation = {
  readonly relationType: string;
  readonly direction: 'incoming' | 'outgoing';
  readonly targetId: string;
  readonly targetKind: string;
  readonly targetName: string;
};
