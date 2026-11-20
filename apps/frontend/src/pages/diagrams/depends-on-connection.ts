export type DependsOnContextHint = { readonly id: string; readonly nodeType: string };

export interface DependsOnConnection {
  readonly providerComponentVersionId: string | null;
  readonly consumerComponentVersionId: string | null;
  readonly contextHint?: DependsOnContextHint;
  readonly consumerFeatureVersionIdHint?: string;
}
