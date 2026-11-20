import { Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useUnit } from '../../context/UnitContext';
import { unitCrossUnitDiagramPath, unitDiagramPath } from './spa-diagram-paths';
import './Diagrams.css';

export type DiagramScopeTabsProps =
  | { readonly active: 'unit'; readonly unitId: string }
  | { readonly active: 'cross-unit'; readonly unitId: string };

const unitScopeDisabledTitle =
  'Укажите основной юнит (Юниты → Сделать основным) или откройте пересечение юнитов с диаграммы юнита';

type ScopeValue = 'unit' | 'cross-unit';

export const DiagramScopeTabs = (props: DiagramScopeTabsProps) => {
  const navigate = useNavigate();
  const { unit } = useUnit();
  const mainUnitId = unit?.id ?? '';
  const unitTargetId = props.unitId.trim() || mainUnitId;
  const unitLinkDisabled = props.active !== 'unit' && !unitTargetId;

  const handleScopeChange = (value: ScopeValue): void => {
    if (value === 'cross-unit' && unitTargetId) {
      navigate(unitCrossUnitDiagramPath(unitTargetId));
      return;
    }
    if (value === 'unit' && unitTargetId) {
      navigate(unitDiagramPath(unitTargetId));
    }
  };

  return (
    <div title={unitLinkDisabled ? unitScopeDisabledTitle : undefined}>
      <Segmented
        block
        size="small"
        value={props.active}
        disabled={unitLinkDisabled}
        options={[
          { label: 'Юнит', value: 'unit' },
          { label: 'Пересечение юнитов', value: 'cross-unit' },
        ]}
        onChange={(value) => handleScopeChange(value as ScopeValue)}
        aria-label="Область диаграммы"
      />
    </div>
  );
};
