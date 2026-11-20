import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { featureVersionsApi } from '../../api/feature-versions-api';
import { getErrorMessage } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import type { FeatureVersionLegendRow } from './feature-version-legend-row';
import { resolveDefaultFeatureVersionId } from './resolve-default-feature-version-id';
import { featureVersionDiagramPath } from './spa-diagram-paths';

export const FeatureDiagramRedirect = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const [targetVersionId, setTargetVersionId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setTargetVersionId(null);
      return;
    }
    let cancelled = false;
    void featureVersionsApi
      .list<FeatureVersionLegendRow>(id)
      .then((data) => {
        if (cancelled) return;
        const versionId = resolveDefaultFeatureVersionId(data ?? []);
        if (!versionId) {
          showToast('Нет версий для отображения диаграммы', ToastVariant.Error);
        }
        setTargetVersionId(versionId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        showToast(getErrorMessage(err), ToastVariant.Error);
        setTargetVersionId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, showToast]);

  if (targetVersionId === undefined) {
    return <div className="diagram-page">Загрузка диаграммы фичи…</div>;
  }
  if (targetVersionId) {
    return (
      <Navigate to={featureVersionDiagramPath(targetVersionId)} replace />
    );
  }
  return (
    <div className="diagram-page">
      <h1>Фича</h1>
    </div>
  );
};
