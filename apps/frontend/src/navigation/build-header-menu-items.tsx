import type { ReactNode } from 'react';
import type { MenuProps } from 'antd';
import { NavLink } from 'react-router-dom';
import { UnitsNavLink } from '../UnitsNavLink';
import { isAppGroupPage, type AppNavPage } from './app-nav-pages';

type BuildHeaderMenuItemsParams = {
  readonly pages: readonly AppNavPage[];
  readonly unitName: string | null | undefined;
};

const buildLeafLabel = (
  page: { readonly id: string; readonly label: string; readonly path: string },
  unitName: string | null | undefined,
): ReactNode => {
  if (page.id === 'units') {
    return <UnitsNavLink label={page.label} unitName={unitName} />;
  }
  return <NavLink to={page.path}>{page.label}</NavLink>;
};

export const buildHeaderMenuItems = (
  params: BuildHeaderMenuItemsParams,
): NonNullable<MenuProps['items']> =>
  params.pages.map((page) => {
    if (isAppGroupPage(page)) {
      return {
        key: page.id,
        label: page.label,
        children: page.children.map((child) => ({
          key: child.id,
          label: <NavLink to={child.path}>{child.label}</NavLink>,
        })),
      };
    }
    return {
      key: page.id,
      label: buildLeafLabel(page, params.unitName),
    };
  });
