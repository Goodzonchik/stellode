import { isComponentLikeType } from './is-component-like-type';

export const isDependsOnEndpointType = (type: string | undefined): boolean =>
  type === 'componentVersion' || isComponentLikeType(type);
