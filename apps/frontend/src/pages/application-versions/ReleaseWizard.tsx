import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { applicationVersionsApi } from '../../api/application-versions-api';
import { applicationsApi } from '../../api/applications-api';
import { Button } from 'antd';
import {
  ApplicationVersionStatus,
  suggestNextApplicationVersionString,
  type ApplicationEntity,
} from '@stellode/models';
import { useUnit } from '../../context/UnitContext';
import { getErrorMessage } from '../../utils/axios-error';
import { ToastVariant, useToast } from '../../hooks/useToast';
import { ReleaseWizardForm } from './ReleaseWizardForm';

const resolveApplicationName = (
  applications: ReadonlyArray<ApplicationEntity>,
  applicationId: string,
): string | null => {
  const match = applications.find((application) => application.id === applicationId);
  const name = match?.name?.trim() ?? '';
  return name.length > 0 ? name : null;
};

export function ReleaseWizard() {
  const { id: applicationElementId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { unit } = useUnit();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [firstRelease, setFirstRelease] = useState(false);
  const [suggestedApplicationVersion, setSuggestedApplicationVersion] = useState('1');
  const [applicationName, setApplicationName] = useState<string | null>(null);
  const unitId = unit?.id;

  useEffect(() => {
    if (!applicationElementId) {
      setLoading(false);
      return;
    }
    const loadApplicationName = async (): Promise<string | null> => {
      if (!unitId) return null;
      try {
        const applications = await applicationsApi.list(unitId);
        return resolveApplicationName(applications, applicationElementId);
      } catch {
        return null;
      }
    };
    const load = async () => {
      setLoading(true);
      try {
        const [rows, resolvedName] = await Promise.all([
          applicationVersionsApi.list(applicationElementId),
          loadApplicationName(),
        ]);
        const current = rows.find((row) => row.status === ApplicationVersionStatus.Current);
        setCurrentVersionId(current?.id ?? null);
        const isFirst = rows.length === 0;
        setFirstRelease(isFirst);
        setSuggestedApplicationVersion(
          suggestNextApplicationVersionString(
            isFirst ? null : Number(current?.versionNumber ?? NaN),
          ),
        );
        setApplicationName(resolvedName);
        if (!isFirst && !current) {
          showToast(
            'Нет версии приложения со статусом current. Создайте или назначьте current.',
            ToastVariant.Error,
          );
        }
      } catch (err: unknown) {
        showToast(getErrorMessage(err), ToastVariant.Error);
        setCurrentVersionId(null);
        setFirstRelease(false);
        setApplicationName(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [applicationElementId, showToast, unitId]);

  const backToVersions = () => {
    if (applicationElementId) {
      navigate(`/applications/${applicationElementId}`);
    } else {
      navigate('/applications');
    }
  };

  const showWizard =
    !loading && applicationElementId && (firstRelease || currentVersionId !== null);

  const wizardKey = firstRelease
    ? `${applicationElementId}-first-release`
    : `${applicationElementId}-${currentVersionId}`;

  if (!applicationElementId) {
    return <section className="table-container">Не указано приложение.</section>;
  }

  return (
    <section className="table-container">
      <header className="table-header">
        <h1>{applicationName ? `Новый релиз: ${applicationName}` : 'Новый релиз'}</h1>
        <Button htmlType="button" onClick={backToVersions}>
          К версиям приложения
        </Button>
      </header>
      {loading ? <p>Загрузка…</p> : null}
      {showWizard ? (
        <ReleaseWizardForm
          key={wizardKey}
          enabled
          applicationId={applicationElementId}
          sourceApplicationVersionId={firstRelease ? null : currentVersionId}
          suggestedApplicationVersion={suggestedApplicationVersion}
          onReleased={backToVersions}
          onCancel={backToVersions}
        />
      ) : null}
    </section>
  );
}
