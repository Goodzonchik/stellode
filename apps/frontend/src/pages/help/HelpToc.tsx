import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { buildHelpTocItems } from './build-help-toc-items';
import type { HelpPage } from './help-manifest.types';

type HelpTocProps = {
  readonly pages: readonly HelpPage[];
  readonly selectedSlug: string | undefined;
  readonly onSelectSlug: (slug: string) => void;
};

export const HelpToc = ({ pages, selectedSlug, onSelectSlug }: HelpTocProps) => {
  const items = buildHelpTocItems(pages);
  const onClick: MenuProps['onClick'] = ({ key }) => {
    onSelectSlug(String(key));
  };
  return (
    <nav className="help-page__toc" aria-label="Оглавление справки">
      <Menu
        mode="inline"
        selectedKeys={selectedSlug ? [selectedSlug] : []}
        items={items}
        onClick={onClick}
      />
    </nav>
  );
};
