import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'antd';
import type { ArchitectureGraph } from '@stellode/models';
import { FeatureReadinessModal } from '../../components/FeatureReadinessModal';
import { useUnit } from '../../context/UnitContext';
import { useToast } from '../../hooks/useToast';
import { ComponentCreateDialog } from '../components/ComponentCreateDialog';
import { AddComponentDialog } from './AddComponentDialog';
import { AddFeatureDependsOnDialog } from './AddFeatureDependsOnDialog';
import { AddFeatureToServiceDialog } from './AddFeatureToServiceDialog';
import { componentDiagramLegendToggleOrder } from './component-diagram-type-visibility';
import { CreateDependsOnDialog } from './CreateDependsOnDialog';
import { CrossUnitDependsOnDialog } from './CrossUnitDependsOnDialog';
import { DeleteFeatureDependsOnDialog } from './DeleteFeatureDependsOnDialog';
import { DiagramCanvas } from './DiagramCanvas';
import { DiagramContextMenu } from './DiagramContextMenu';
import { DiagramLegendShell } from './DiagramLegendShell';
import { DiagramScopeTabs } from './DiagramScopeTabs';
import { ExcludeComponentFromFeatureDialog } from './ExcludeComponentFromFeatureDialog';
import { FeatureVersionCompositionTable } from './FeatureVersionCompositionTable';
import { FeatureVersionDiagramLegend } from './FeatureVersionDiagramLegend';
import Legend from './Legend';
import { RaiseComponentVersionDialog } from './RaiseComponentVersionDialog';
import { RemoveFeatureFromServiceDialog } from './RemoveFeatureFromServiceDialog';
import { resolveSpaDiagramRoute } from './resolve-spa-diagram-route';
import { isServiceDiagramEntity } from './service-diagram-entity';
import { ServiceProjectionToggle, ServiceScopeTabs } from './ServiceScopeTabs';
import { TeamDiagramLegend } from './TeamDiagramLegend';
import { UnitDiagramInstanceFilters } from './UnitDiagramInstanceFilters';
import { useDiagramFilters } from './useDiagramFilters';
import { useDiagramLoad } from './useDiagramLoad';
import { useDiagramModals } from './useDiagramModals';
import './Diagrams.css';

export function Diagrams() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const spaRoute = resolveSpaDiagramRoute(location.pathname);
  const entity = spaRoute?.entity;
  const diagramAnchorId = spaRoute?.id;
  const { unit } = useUnit();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [archGraph, setArchGraph] = useState<ArchitectureGraph | null>(null);
  const filters = useDiagramFilters({ entity, diagramAnchorId, archGraph });
  const load = useDiagramLoad({
    entity,
    diagramAnchorId,
    pathname: location.pathname,
    searchParams,
    unitId: unit?.id,
    showToast,
    archGraph,
    setArchGraph,
    filters,
  });
  const modals = useDiagramModals({
    entity,
    diagramAnchorId,
    unitId: unit?.id,
    archGraph,
    navigate,
    showToast,
    filters,
    load,
  });
  const showFeatureVersionTable =
    entity === 'feature-version' && filters.featureVersionTableView;
  const showResetImpact =
    entity !== 'unit' &&
    !filters.featureVersionCompareEnabled &&
    load.impactHighlightIds !== null &&
    load.impactHighlightIds.size > 0;

  return (
    <div className="diagram-page">
      <div className="diagram-page__header">
        <h1>{filters.pageHeading}</h1>
      </div>

      <div className="content-diagram">
        <DiagramLegendShell>
          {entity === 'unit' && diagramAnchorId ? (
            <>
              <DiagramScopeTabs active="unit" unitId={diagramAnchorId} />

              <UnitDiagramInstanceFilters
                catalog={filters.unitFilterCatalog}
                filter={filters.unitInstanceFilter}
                onFilterChange={filters.handleUnitInstanceFilterChange}
              />
            </>
          ) : null}
          {entity === 'component' && diagramAnchorId ? (
            <Legend
              unitTypeVisibility={filters.componentNodeVisibility}
              onUnitTypeVisibilityChange={filters.handleComponentTypeVisibilityChange}
              unitTypeToggleKinds={componentDiagramLegendToggleOrder}
            />
          ) : null}
          {entity === 'feature-version' && diagramAnchorId ? (
            <FeatureVersionDiagramLegend
              rows={filters.sortedFeatureLegendRows}
              anchorFeatureVersionId={diagramAnchorId}
              tableView={filters.featureVersionTableView}
              onTableViewChange={filters.handleFeatureVersionTableViewChange}
              teamsVisible={filters.featureVersionTeamsVisible}
              onTeamsVisibleChange={filters.handleFeatureVersionTeamsVisibleChange}
              crossUnitLinksVisible={filters.featureVersionCrossUnitLinksVisible}
              onCrossUnitLinksVisibleChange={filters.handleFeatureVersionCrossUnitLinksVisibleChange}
              compareEnabled={filters.featureVersionCompareEnabled}
              compareAvailable={filters.featureVersionCompareAvailable}
              teamsLocked={filters.featureVersionTableView}
              onCompareEnabledChange={(enabled) => {
                void filters.handleFeatureVersionCompareEnabledChange(enabled, load.applyCompare);
              }}
            />
          ) : null}
          {entity === 'team' && diagramAnchorId && load.meta ? (
            <TeamDiagramLegend
              data={load.meta}
              codeOnly={filters.teamCodeOnly}
              onCodeOnlyChange={filters.handleTeamCodeOnlyChange}
            />
          ) : null}
          {isServiceDiagramEntity(entity) && diagramAnchorId ? (
            <>
              <ServiceScopeTabs
                active={entity === 'service-integrations' ? 'integrations' : 'service'}
                serviceId={diagramAnchorId}
              />

              <ServiceProjectionToggle />
              {load.meta ? <Legend data={load.meta} /> : null}
            </>
          ) : null}
          {entity !== 'unit' &&
          entity !== 'team' &&
          !isServiceDiagramEntity(entity) &&
          entity !== 'feature-version' &&
          entity !== 'component' &&
          load.meta ? (
            <Legend data={load.meta} />
          ) : null}
        </DiagramLegendShell>
        <div
          className={`diagram-container${showFeatureVersionTable ? ' diagram-container--table' : ''}`}
        >
          {showFeatureVersionTable && load.featureVersionTable ? (
            <FeatureVersionCompositionTable
              model={load.featureVersionTable}
              paneActions={modals.featureVersionTablePaneActions}
              onPaneAction={modals.handlePaneMenuAction}
              showCheckReady={modals.showFeatureVersionCheckReady}
              onCheckReady={modals.handleCheckFeatureVersionReady}
              actionsForRow={modals.featureVersionTableActionsForRow}
              onRowAction={modals.handleFeatureVersionTableRowAction}
            />
          ) : (
            <DiagramCanvas
              nodes={load.flowNodes}
              edges={load.flowEdges}
              nodesConnectable={!filters.isFeatureVersionDiagramReadOnly}
              onNodesChange={load.onNodesChange}
              onEdgesChange={load.onEdgesChange}
              onConnect={modals.onConnect}
              onPaneContextMenu={modals.onPaneContextMenu}
              onNodeContextMenu={modals.onNodeContextMenu}
              onEdgeContextMenu={modals.onEdgeContextMenu}
              onNodeMouseEnter={entity === 'unit' ? load.onUnitNodeMouseEnter : undefined}
              onNodeMouseLeave={entity === 'unit' ? load.onUnitNodeMouseLeave : undefined}
              onInit={load.handleFlowInit}
              onLayout={(direction) => void load.onLayout(direction)}
              mermaidNodes={load.nodes}
              mermaidEdges={load.edges}
              getMermaidDirection={load.getCanvasLayoutDirection}
              toolbarExtra={
                <>
                  {modals.showFeatureVersionCheckReady ? (
                    <Button htmlType="button" onClick={modals.handleCheckFeatureVersionReady}>
                      Проверить готовность
                    </Button>
                  ) : null}
                  {showResetImpact ? (
                    <Button htmlType="button" onClick={() => load.setImpactHighlightIds(null)}>
                      Сбросить влияние
                    </Button>
                  ) : null}
                </>
              }
            />
          )}
          <DiagramContextMenu
            open={!!modals.contextMenu}
            position={modals.contextMenu}
            items={modals.menuItems}
            onDismiss={modals.closeContextMenu}
            onAction={modals.handlePaneMenuAction}
          />

          <DiagramContextMenu
            open={!!modals.nodeContextMenu}
            position={modals.nodeContextMenu}
            items={modals.nodeMenuItems}
            onDismiss={modals.closeNodeContextMenu}
            onAction={(action) => {
              void modals.handleNodeMenuAction(action);
            }}
          />

          <DiagramContextMenu
            open={!!modals.edgeContextMenu && modals.edgeMenuItems.length > 0}
            position={modals.edgeContextMenu}
            items={modals.edgeMenuItems}
            onDismiss={modals.closeEdgeContextMenu}
            onAction={modals.handleEdgeMenuAction}
          />
        </div>
      </div>

      <CrossUnitDependsOnDialog
        isOpen={modals.crossUnitDependsTarget !== null}
        onClose={modals.closeCrossUnitDepends}
        excludeUnitIds={modals.crossUnitExcludeHomeUnitIds}
        sourceComponentVersionId={modals.crossUnitDependsTarget?.componentVersionId ?? null}
        consumerApplicationId={modals.crossUnitDependsTarget?.applicationId ?? null}
        consumerFeatureVersionId={diagramAnchorId ?? null}
        onCompleted={load.loadDiagrams}
      />

      <ComponentCreateDialog
        isOpen={modals.createDialogOpen}
        onClose={modals.closeCreateDialog}
        unitId={load.propertyDialogsUnitId}
        requireApplicationBinding={modals.propertyDialogsRequireApplicationBinding}
        onSuccess={modals.handleComponentCreated}
      />

      <AddComponentDialog
        isOpen={modals.addComponentOpen}
        onClose={modals.closeAddComponent}
        unitId={load.propertyDialogsUnitId}
        requireApplicationBinding={modals.propertyDialogsRequireApplicationBinding}
        onSelect={(version) => {
          void modals.handleComponentVersionSelected(version);
        }}
      />

      <CreateDependsOnDialog
        isOpen={modals.dependsOnConnection !== null}
        onClose={modals.closeDependsOnConnection}
        connection={modals.dependsOnConnection}
        unitId={load.propertyDialogsUnitId}
        onSuccess={load.loadDiagrams}
      />

      <AddFeatureDependsOnDialog
        isOpen={modals.featureDependsOn !== null}
        onClose={modals.closeFeatureDependsOn}
        featureVersionId={diagramAnchorId}
        consumerCvId={modals.featureDependsOn?.consumerCvId}
        consumerApplicationId={modals.featureDependsOn?.consumerApplicationId}
        consumerLabel={modals.featureDependsOn?.consumerLabel ?? ''}
        providerOptions={modals.featureDependsOn?.providerOptions ?? []}
        {...(modals.featureDependsOn?.fixedProviderCvId !== undefined
          ? {
              fixedProviderCvId: modals.featureDependsOn.fixedProviderCvId,
              fixedProviderApplicationId: modals.featureDependsOn.fixedProviderApplicationId,
              fixedProviderLabel: modals.featureDependsOn.fixedProviderLabel,
            }
          : {})}
        onSuccess={load.loadDiagrams}
      />

      <ExcludeComponentFromFeatureDialog
        isOpen={modals.excludeFromFeatureTarget !== null}
        onClose={modals.closeExcludeFromFeature}
        featureVersionId={diagramAnchorId}
        componentVersionId={modals.excludeFromFeatureTarget?.componentVersionId}
        applicationId={modals.excludeFromFeatureTarget?.applicationId}
        componentLabel={modals.excludeFromFeatureTarget?.label ?? ''}
        onSuccess={modals.handleExcludeFromFeatureSuccess}
      />

      <DeleteFeatureDependsOnDialog
        isOpen={modals.deleteDependsOnTarget !== null}
        onClose={modals.closeDeleteDependsOn}
        featureVersionId={diagramAnchorId}
        sourceComponentVersionId={modals.deleteDependsOnTarget?.sourceComponentVersionId}
        targetComponentVersionId={modals.deleteDependsOnTarget?.targetComponentVersionId}
        consumerApplicationId={modals.deleteDependsOnTarget?.consumerApplicationId}
        providerApplicationId={modals.deleteDependsOnTarget?.providerApplicationId}
        edgeLabel={modals.deleteDependsOnTarget?.edgeLabel ?? ''}
        onSuccess={modals.handleDeleteDependsOnSuccess}
      />

      <RaiseComponentVersionDialog
        isOpen={modals.raiseComponentTarget !== null}
        onClose={modals.closeRaiseComponent}
        featureVersionId={diagramAnchorId}
        fromComponentVersionId={modals.raiseComponentTarget?.componentVersionId}
        applicationId={modals.raiseComponentTarget?.applicationId}
        componentLabel={modals.raiseComponentTarget?.label ?? ''}
        candidates={modals.raiseComponentTarget?.candidates ?? []}
        onSuccess={modals.handleRaiseComponentSuccess}
      />

      <AddFeatureToServiceDialog
        isOpen={modals.addFeatureToServiceOpen}
        onClose={modals.closeAddFeatureToService}
        unitId={load.propertyDialogsUnitId}
        serviceId={diagramAnchorId}
        onSuccess={modals.handleAddFeatureToServiceSuccess}
      />

      <RemoveFeatureFromServiceDialog
        isOpen={modals.removeFeatureTarget !== null}
        onClose={modals.closeRemoveFeature}
        serviceId={diagramAnchorId}
        featureId={modals.removeFeatureTarget?.id}
        featureName={modals.removeFeatureTarget?.name ?? ''}
        onSuccess={modals.handleRemoveFeatureSuccess}
      />

      <FeatureReadinessModal
        isOpen={modals.readinessModalOpen}
        result={modals.readinessResult}
        onClose={modals.closeReadinessModal}
      />
    </div>
  );
}
