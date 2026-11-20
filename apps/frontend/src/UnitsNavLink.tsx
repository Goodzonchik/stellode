import { Tag } from 'antd';
import { NavLink } from 'react-router-dom';
import { resolveUnitsNavUnitName } from './resolve-units-nav-unit-name';

type UnitsNavLinkProps = {
  readonly label: string;
  readonly unitName: string | null | undefined;
};

export const UnitsNavLink = (props: UnitsNavLinkProps) => {
  const name = resolveUnitsNavUnitName(props.unitName);
  return (
    <NavLink to="/units" className="app-header__units-link">
      <span>{props.label}</span>
      {name !== null ? (
        <Tag className="app-header__unit-tag" color="blue">
          {name}
        </Tag>
      ) : null}
    </NavLink>
  );
};
