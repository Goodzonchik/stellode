import type { ComponentWithTeam } from '@stellode/models';

export type ComponentNode = Pick<
  ComponentWithTeam,
  'id' | 'name' | 'description' | 'isDependency' | 'isPublic' | 'team'
>;
