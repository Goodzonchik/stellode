export const isComponentLikeType = (type: string | undefined): boolean =>
  type === 'component' || type === 'dependency';
