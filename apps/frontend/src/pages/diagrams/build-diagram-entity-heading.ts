import type { ArchitectureGraph, Label, Node } from '@stellode/models';
import { GraphLabel } from '@stellode/models';
import { versionStatusLabelFromRaw } from '../../utils/status-label';
import { isServiceDiagramEntity } from './service-diagram-entity';

type BuildDiagramPageHeadingParams =
  | {
      readonly kind: 'entityRoute';
      readonly entity: string | undefined;
      readonly diagramAnchorId: string | undefined;
      readonly archGraph: ArchitectureGraph | null;
      readonly fallbackTitle: string;
    }
  | {
      readonly kind: 'applicationVersion';
      readonly archGraph: ArchitectureGraph | null;
      readonly versionParam: string;
    };

const findNode = (
  graph: ArchitectureGraph | null,
  id: string | undefined,
  label: Label,
): Node | undefined => {
  if (!graph || !id) return undefined;
  return graph.nodes.find((n) => n.id === id && n.labels.includes(label));
};

const versionLabelFromNode = (node: Node): string => {
  const trimmedName = node.name.trim();
  if (trimmedName.length > 0) return trimmedName;
  const ver = node.version;
  if (ver !== undefined && String(ver).trim().length > 0) return String(ver);
  const num = node.versionNumber;
  if (num !== undefined) return String(num);
  return '—';
};

const parentFeatureIdForVersion = (graph: ArchitectureGraph, featureVersionId: string): string | undefined => {
  const rel = graph.relationships.find(
    (r) =>
      (r.type === 'HAS_VERSION' || r.type === 'HAS_DRAFT') && r.to === featureVersionId,
  );
  return rel?.from;
};

const headingEntityRoute = (
  entity: string | undefined,
  diagramAnchorId: string | undefined,
  archGraph: ArchitectureGraph | null,
  fallbackTitle: string,
): string => {
  if (!diagramAnchorId) return fallbackTitle;
  if (entity === 'unit') {
    const hub = findNode(archGraph, diagramAnchorId, GraphLabel.Unit);
    return hub ? `Юнит ${hub.name}` : 'Юнит';
  }
  if (entity === 'team') {
    const hub = findNode(archGraph, diagramAnchorId, GraphLabel.Team);
    return hub ? `Команда ${hub.name}` : 'Команда';
  }
  if (isServiceDiagramEntity(entity)) {
    const svc = findNode(archGraph, diagramAnchorId, GraphLabel.Service);
    const base = svc ? `Услуга ${svc.name}` : 'Услуга';
    return entity === 'service-integrations' ? `${base} · интеграции` : base;
  }
  if (entity === 'component') {
    const n = findNode(archGraph, diagramAnchorId, GraphLabel.Component);
    return n ? `Компонент ${n.name}` : 'Компонент';
  }
  if (entity === 'application') {
    const n = findNode(archGraph, diagramAnchorId, GraphLabel.Application);
    return n ? `Приложение ${n.name}` : 'Приложение';
  }
  if (entity === 'feature-version') {
    if (!archGraph) return 'Фича';
    const fv = findNode(archGraph, diagramAnchorId, GraphLabel.FeatureVersion);
    const featureId = fv ? parentFeatureIdForVersion(archGraph, fv.id) : undefined;
    const feature = findNode(archGraph, featureId, GraphLabel.Feature);
    const verPart = fv ? versionLabelFromNode(fv) : '—';
    const statusPart = versionStatusLabelFromRaw(fv?.status);
    const head = feature?.name ? `Фича ${feature.name}` : 'Фича';
    return `${head} ${verPart} (${statusPart})`;
  }
  return fallbackTitle;
};

const headingApplicationVersion = (archGraph: ArchitectureGraph | null, versionParam: string): string => {
  if (!archGraph) return 'Приложение';
  const app = archGraph.nodes.find((n) => n.labels.includes(GraphLabel.Application));
  const avNodes = archGraph.nodes.filter((n) => n.labels.includes(GraphLabel.ApplicationVersion));
  const av =
    versionParam === 'latest'
      ? avNodes.find((n) => n.status === 'current') ?? avNodes[0]
      : avNodes.find(
          (n) => n.version === versionParam || String(n.versionNumber ?? '') === versionParam,
        );
  const verPart = av ? versionLabelFromNode(av) : versionParam;
  const head = app?.name ? `Приложение ${app.name}` : 'Приложение';
  return `${head}, версия ${verPart}`;
};

export const buildDiagramPageHeading = (params: BuildDiagramPageHeadingParams): string => {
  if (params.kind === 'applicationVersion') {
    return headingApplicationVersion(params.archGraph, params.versionParam);
  }
  return headingEntityRoute(
    params.entity,
    params.diagramAnchorId,
    params.archGraph,
    params.fallbackTitle,
  );
};
