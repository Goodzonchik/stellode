import { useMemo } from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useUnit } from '../context/UnitContext';
import { findSelectedPageId } from '../find-selected-page-id';
import { appNavPages } from './app-nav-pages';
import { buildHeaderMenuItems } from './build-header-menu-items';

const pageIds = appNavPages.map((page) => page.id);

export const Navigation = () => {
  const { unit } = useUnit();
  const location = useLocation();
  const unitName = unit?.name;
  const selectedKey = useMemo(
    () => findSelectedPageId(location.pathname, pageIds),
    [location.pathname],
  );
  const items = useMemo(
    () => buildHeaderMenuItems({ pages: appNavPages, unitName }),
    [unitName],
  );
  return (
    <header className="app-header">
      <Link to="/units" className="app-header__brand" aria-label="Stellode">
        <img
          className="app-header__logo"
          src="/brand/stellode.svg"
          alt=""
          width={32}
          height={32}
        />
        <span className="app-header__brand-name">Stellode</span>
      </Link>
      <Menu
        className="app-header__menu"
        mode="horizontal"
        theme="light"
        items={items}
        selectedKeys={selectedKey ? [selectedKey] : []}
      />
    </header>
  );
};
