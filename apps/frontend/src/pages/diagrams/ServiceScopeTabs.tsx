import { Segmented } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { serviceDiagramPath, serviceIntegrationsPathWithFrom } from './service-scope-tabs';
import './Diagrams.css';

export type ServiceScopeTabsProps =
  | { readonly active: 'service'; readonly serviceId: string }
  | { readonly active: 'integrations'; readonly serviceId: string };

type ServiceScopeValue = 'service' | 'integrations';
type ProjectionValue = 'prod' | 'draft';

export const ServiceScopeTabs = (props: ServiceScopeTabsProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { serviceId } = props;

  const handleScopeChange = (value: ServiceScopeValue): void => {
    if (value === 'integrations') {
      navigate(serviceIntegrationsPathWithFrom(serviceId, searchParams));
      return;
    }
    navigate(serviceDiagramPath(serviceId, searchParams));
  };

  return (
    <Segmented
      block
      size="small"
      value={props.active}
      options={[
        { label: 'Состав', value: 'service' },
        { label: 'Связи', value: 'integrations' },
      ]}
      onChange={(value) => handleScopeChange(value as ServiceScopeValue)}
      aria-label="Область диаграммы услуги"
    />
  );
};

export const ServiceProjectionToggle = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const draftMode = searchParams.get('projection') === 'draft';

  const handleProjectionChange = (value: ProjectionValue): void => {
    const next = new URLSearchParams(searchParams);
    if (value === 'draft') {
      next.set('projection', 'draft');
    } else {
      next.delete('projection');
    }
    setSearchParams(next);
  };

  return (
    <Segmented
      block
      size="small"
      value={draftMode ? 'draft' : 'prod'}
      options={[
        { label: 'Прод', value: 'prod' },
        { label: 'Черновик', value: 'draft' },
      ]}
      onChange={(value) => handleProjectionChange(value as ProjectionValue)}
      aria-label="Проекция состава услуги"
    />
  );
};
