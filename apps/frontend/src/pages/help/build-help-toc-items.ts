import type { MenuProps } from 'antd';
import type { HelpPage } from './help-manifest.types';

export const buildHelpTocItems = (pages: readonly HelpPage[]): MenuProps['items'] =>
  pages.map((page) => ({
    key: page.slug,
    label: page.title,
  }));
