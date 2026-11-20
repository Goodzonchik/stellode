import type { ReactElement } from 'react';
import { isValidElement } from 'react';
import { UnitsNavLink } from '../UnitsNavLink';
import { appNavPages } from './app-nav-pages';
import { buildHeaderMenuItems } from './build-header-menu-items';

type MenuItemWithLabel = {
  readonly key?: string | number;
  readonly label?: unknown;
  readonly children?: ReadonlyArray<MenuItemWithLabel>;
};

const asMenuItem = (item: unknown): MenuItemWithLabel | undefined =>
  item !== null && typeof item === 'object' ? (item as MenuItemWithLabel) : undefined;

const readNavLinkTo = (label: unknown): string | undefined => {
  if (!isValidElement(label)) return undefined;
  const element = label as ReactElement<{ to?: string }>;
  return element.props.to;
};

describe('buildHeaderMenuItems', () => {
  const items = buildHeaderMenuItems({ pages: appNavPages, unitName: 'CoolUnit' });

  it('builds one top-level item per nav page', () => {
    expect(items).toHaveLength(appNavPages.length);
  });

  it('uses UnitsNavLink for units', () => {
    const unitsItem = asMenuItem(items.find((item) => asMenuItem(item)?.key === 'units'));
    expect(unitsItem).toBeDefined();
    expect(isValidElement(unitsItem?.label)).toBe(true);
    const label = unitsItem?.label as ReactElement<{ label: string; unitName: string }>;
    expect(label.type).toBe(UnitsNavLink);
    expect(label.props.label).toBe('Юниты');
    expect(label.props.unitName).toBe('CoolUnit');
  });

  it('maps Mermaid child to /tools/mermaid', () => {
    const toolsItem = asMenuItem(items.find((item) => asMenuItem(item)?.key === 'tools'));
    expect(toolsItem).toBeDefined();
    expect(toolsItem?.children).toHaveLength(1);
    const mermaid = toolsItem?.children?.[0];
    expect(mermaid?.key).toBe('tools-mermaid');
    expect(readNavLinkTo(mermaid?.label)).toBe('/tools/mermaid');
  });
});
