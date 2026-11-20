import type { ImpactAnalysisResult, ImpactIdName } from '@stellode/models';
import { Button, Modal } from 'antd';
import './ImpactConfirmDialog.css';

const listBlock = (title: string, rows: ImpactIdName[]) =>
  rows.length === 0 ? null : (
    <div className="impact-confirm-dialog__block">
      <div className="impact-confirm-dialog__block-title">{title}</div>
      <ul className="impact-confirm-dialog__list">
        {rows.map((r) => (
          <li key={`${title}-${r.id}`}>
            {r.name} <span className="impact-confirm-dialog__id">({r.id})</span>
          </li>
        ))}
      </ul>
    </div>
  );

export type ImpactConfirmDialogProps = {
  readonly isOpen: boolean;
  readonly title: string;
  readonly intro: string;
  readonly impact: ImpactAnalysisResult | null;
  readonly loading?: boolean;
  readonly confirmLabel?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

export const ImpactConfirmDialog = ({
  isOpen,
  title,
  intro,
  impact,
  loading,
  confirmLabel = 'Подтверждаю',
  onConfirm,
  onCancel,
}: ImpactConfirmDialogProps) => (
  <Modal
    open={isOpen}
    onCancel={onCancel}
    title={title}
    footer={[
      <Button key="cancel" onClick={onCancel}>
        Отмена
      </Button>,
      <Button key="confirm" type="primary" danger onClick={onConfirm} disabled={Boolean(loading)}>
        {confirmLabel}
      </Button>,
    ]}
  >
    <p className="impact-confirm-dialog__intro">{intro}</p>
    {loading ? (
      <p>Загрузка влияния…</p>
    ) : (
      impact && (
        <div className="impact-confirm-dialog__body">
          {listBlock('Юниты', impact.units)}
          {listBlock('Команды', impact.teams)}
          {listBlock('Услуги', impact.services)}
          {listBlock('Фичи', impact.features)}
          {listBlock('Приложения', impact.applications)}
          {listBlock('Компоненты', impact.components)}
          {listBlock('Потребители (DEPENDS_ON)', impact.consumers)}
          {listBlock('Поставщики', impact.providers)}
        </div>
      )
    )}
  </Modal>
);
