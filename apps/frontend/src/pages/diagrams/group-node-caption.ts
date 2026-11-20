import type { ViewNode } from '@stellode/models';
import { captionWithOptionalVersion } from './caption-with-optional-version';
import { isGroupNodeUnitType } from './is-group-node-unit-type';

export const groupNodeCaption = (data: ViewNode['data']): string =>
  isGroupNodeUnitType(data.type) ? data.label : captionWithOptionalVersion(data);
