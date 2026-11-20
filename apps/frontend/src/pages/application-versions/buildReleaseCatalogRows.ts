import {
  defaultVersionId,
  eligibleVersionsForComponent,
  type CatalogVersionCandidate,
} from './releaseCatalogEligibility';
import type { UnitComponentCatalog } from './releaseWizardCatalog';
import type { ReleaseComponentRow } from './releaseWizardTypes';

export type ReleaseCatalogRow = {
  component: { id: string; name: string };
  team: ReleaseComponentRow['team'];
  eligible: Array<CatalogVersionCandidate & { version: string; usageCount: number }>;
  defaultComponentVersionId: string;
};

const toCandidate = (
  version: UnitComponentCatalog['versions'][number],
): CatalogVersionCandidate & { version: string; usageCount: number } => ({
  id: version.id,
  versionNumber: Number(version.versionNumber ?? 0),
  status: version.status,
  version: version.version,
  usageCount: version.usage?.length ?? 0,
});

export const buildReleaseCatalogRows = (
  unitComponents: readonly UnitComponentCatalog[],
  compositionRows: readonly ReleaseComponentRow[],
): ReleaseCatalogRow[] => {
  const result: ReleaseCatalogRow[] = [];
  for (const catalogRow of unitComponents) {
    const compositionForComponent = compositionRows
      .filter((row) => row.component.id === catalogRow.component.id)
      .map((row) => ({
        componentVersionId: row.componentVersion.id,
        versionNumber: row.componentVersion.versionNumber,
      }));
    const enriched = catalogRow.versions.map(toCandidate);
    const eligibleIds = new Set(
      eligibleVersionsForComponent(enriched, compositionForComponent).map((item) => item.id),
    );
    const eligible = enriched.filter((item) => eligibleIds.has(item.id));
    if (eligible.length === 0) continue;
    result.push({
      component: catalogRow.component,
      team: catalogRow.team,
      eligible,
      defaultComponentVersionId: defaultVersionId(eligible),
    });
  }
  return result;
};
