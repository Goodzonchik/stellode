import { Button, Input, Space, Typography } from 'antd';
import { VersionStatus } from '@stellode/models';
import { buildReleaseWizardConfirmation } from './buildReleaseWizardConfirmation';
import { ReleaseCompositionTable } from './ReleaseCompositionTable';
import type { ReleaseComponentRow } from './releaseWizardTypes';
import styles from './ReleaseWizardForm.module.css';

const toConfirmationRow = (row: ReleaseComponentRow) => ({
  component: row.component,
  team: row.team,
  componentVersion: {
    id: row.componentVersion.id,
    version: row.componentVersion.version,
    status: row.componentVersion.status,
    applicationStatus: row.applicationStatus,
  },
});

export type ReleaseConfirmationStepProps = {
  applicationVersion: string;
  onApplicationVersionChange: (value: string) => void;
  initialReleaseRows: ReleaseComponentRow[];
  rowsOrderedForDisplay: ReleaseComponentRow[];
  onBack: () => void;
  onCancel: () => void;
  onRelease: () => void;
};

const formatConfirmRow = (
  row: ReturnType<typeof toConfirmationRow>,
) =>
  `${row.component.name} v${row.componentVersion.version} (${row.componentVersion.status}, в приложении: ${row.componentVersion.applicationStatus})${
    row.team?.name ? ` — ${row.team.name}` : ''
  }`;

export function ReleaseConfirmationStep(props: ReleaseConfirmationStepProps) {
  const confirmation = buildReleaseWizardConfirmation(
    props.initialReleaseRows.map(toConfirmationRow),
    props.rowsOrderedForDisplay.map(toConfirmationRow),
  );

  const draftPublicationLines = props.rowsOrderedForDisplay
    .filter((row) => row.componentVersion.status === VersionStatus.Draft)
    .map((row) => ({
      id: row.componentVersion.id,
      label: `${row.component.name} v${row.componentVersion.version}`,
    }));

  return (
    <>
      <p className={styles.stepDescription}>
        Шаг 3: подтверждение состава, прикладных статусов и версии релиза приложения.
      </p>

      <section className={styles.confirmSection} aria-label="Версия релиза приложения">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Версия релиза приложения
        </Typography.Title>
        <Input
          value={props.applicationVersion}
          onChange={(event) => props.onApplicationVersionChange(event.target.value)}
          aria-label="Версия ApplicationVersion"
        />
      </section>

      <section className={styles.confirmSection} aria-label="Прикладные статусы">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Состав и статусы в приложении
        </Typography.Title>
        <div className="app-table-wrap">
          <ReleaseCompositionTable
            rows={props.rowsOrderedForDisplay}
            onRemove={() => undefined}
            onApplicationStatusChange={() => undefined}
            showActions={false}
          />
        </div>
      </section>

      <section className={styles.confirmSection} aria-label="Исключены из состава">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Исключены из состава
        </Typography.Title>
        {confirmation.excludedFromRelease.length === 0 ? (
          <p className={styles.confirmEmpty}>Нет</p>
        ) : (
          <ul className={styles.confirmList}>
            {confirmation.excludedFromRelease.map((row) => (
              <li key={row.componentVersion.id}>{formatConfirmRow(row)}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.confirmSection} aria-label="Новые в составе">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Новые в составе
        </Typography.Title>
        {confirmation.newInRelease.length === 0 ? (
          <p className={styles.confirmEmpty}>Нет</p>
        ) : (
          <ul className={styles.confirmList}>
            {confirmation.newInRelease.map((row) => (
              <li key={row.componentVersion.id}>{formatConfirmRow(row)}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.confirmSection} aria-label="Смена версии">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Смена версии (состав версий компонента)
        </Typography.Title>
        {confirmation.versionChanges.length === 0 ? (
          <p className={styles.confirmEmpty}>Нет</p>
        ) : (
          <ul className={styles.confirmList}>
            {confirmation.versionChanges.map((change) => (
              <li key={change.componentId}>
                <strong>{change.componentName}</strong>:{' '}
                {change.before
                  .map((item) => `v${item.version} (${item.status})`)
                  .join(', ') || '—'}{' '}
                →{' '}
                {change.after.map((item) => `v${item.version} (${item.status})`).join(', ') || '—'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.confirmSection} aria-label="Без смены версии">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Без смены версии
        </Typography.Title>
        {confirmation.unchanged.length === 0 ? (
          <p className={styles.confirmEmpty}>Нет</p>
        ) : (
          <ul className={styles.confirmList}>
            {confirmation.unchanged.map((row) => (
              <li key={row.componentVersion.id}>{formatConfirmRow(row)}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.confirmSection} aria-label="Черновики">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Публикация черновиков при Release (draft→active)
        </Typography.Title>
        {draftPublicationLines.length === 0 ? (
          <p className={styles.confirmEmpty}>Нет</p>
        ) : (
          <ul className={styles.confirmList}>
            {draftPublicationLines.map((line) => (
              <li key={line.id}>
                <strong>{line.label}</strong>: draft→active
              </li>
            ))}
          </ul>
        )}
      </section>

      <Space className="entity-modal-form__actions">
        <Button htmlType="button" onClick={props.onBack}>
          Назад
        </Button>
        <Button htmlType="button" onClick={props.onCancel}>
          Отмена
        </Button>
        <Button htmlType="button" type="primary" onClick={props.onRelease}>
          Выпустить
        </Button>
      </Space>
    </>
  );
}
