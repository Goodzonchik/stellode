import { Typography } from 'antd';
import type {
  ReleasePreviewGlobalStatusChange,
  ReleasePreviewLeavingVersion,
} from '@stellode/models';
import styles from './ReleaseWizardForm.module.css';

export type ReleasePreviewContentProps = {
  inThisApplication: ReleasePreviewLeavingVersion[];
  global: ReleasePreviewLeavingVersion[];
  globalStatusChanges: ReleasePreviewGlobalStatusChange[];
};

const renderLeavingBlock = (
  title: string,
  items: ReleasePreviewLeavingVersion[],
  emptyLabel: string,
) => (
  <section className={styles.confirmSection} aria-label={title}>
    <Typography.Title level={5} className={styles.confirmHeading}>
      {title}
    </Typography.Title>
    {items.length === 0 ? (
      <p className={styles.confirmEmpty}>{emptyLabel}</p>
    ) : (
      <ul className={styles.confirmList}>
        {items.map((item) => (
          <li key={item.componentVersionId}>
            <strong>
              {item.componentName} v{item.version}
            </strong>
            {item.features.length > 0 ? (
              <span>
                {' '}
                — фичи:{' '}
                {item.features.map((feature) => feature.name).join(', ')}
              </span>
            ) : null}
            {item.dependsOnEdges.length > 0 ? (
              <span> — DEPENDS_ON: {item.dependsOnEdges.length}</span>
            ) : null}
            {item.services.length > 0 ? (
              <span> — услуги: {item.services.map((service) => service.name).join(', ')}</span>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </section>
);

export function ReleasePreviewContent(props: ReleasePreviewContentProps) {
  return (
    <>
      {renderLeavingBlock(
        'В этом приложении',
        props.inThisApplication,
        'Нет версий, уходящих из состава приложения',
      )}
      {renderLeavingBlock(
        'Глобально (станут unactive)',
        props.global,
        'Нет версий, исчезающих со всех prod-составов',
      )}
      <section className={styles.confirmSection} aria-label="Изменения глобальных статусов">
        <Typography.Title level={5} className={styles.confirmHeading}>
          Изменения глобальных статусов
        </Typography.Title>
        {props.globalStatusChanges.length === 0 ? (
          <p className={styles.confirmEmpty}>Нет</p>
        ) : (
          <ul className={styles.confirmList}>
            {props.globalStatusChanges.map((change) => (
              <li key={change.componentVersionId}>
                <strong>
                  {change.componentName} v{change.version}
                </strong>
                : {change.fromStatus} → {change.toStatus}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
