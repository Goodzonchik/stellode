import type { ComponentType } from 'react';
import { memo } from 'react';
import {
  ApiOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BlockOutlined,
  BranchesOutlined,
  ExperimentOutlined,
  FlagOutlined,
  ImportOutlined,
  LinkOutlined,
  QuestionCircleOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { normalizeDiagramNodeTypeKey } from './diagram-node-type-key';

type IconComponent = ComponentType<{ className?: string }>;

const typeToIcon: Record<string, IconComponent> = {
  unit: ApartmentOutlined,
  team: TeamOutlined,
  service: ApiOutlined,
  app: AppstoreOutlined,
  feature: FlagOutlined,
  component: BlockOutlined,
  applicationVersion: TagsOutlined,
  componentVersion: BranchesOutlined,
  featureVersion: ExperimentOutlined,
  dependency: LinkOutlined,
  consumer: ImportOutlined,
};

function DiagramNodeTypeIcon({ diagramType }: { diagramType: string }) {
  const key = normalizeDiagramNodeTypeKey(diagramType);
  const Icon = typeToIcon[key] ?? QuestionCircleOutlined;
  return <Icon aria-hidden className="custom-node__type-icon" />;
}

export default memo(DiagramNodeTypeIcon);
