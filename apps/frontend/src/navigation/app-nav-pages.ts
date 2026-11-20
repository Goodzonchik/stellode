export type AppNavPageChild = {
  readonly id: string;
  readonly label: string;
  readonly path: string;
};

export type AppNavLeafPage = {
  readonly id: string;
  readonly label: string;
  readonly path: string;
};

export type AppNavGroupPage = {
  readonly id: string;
  readonly label: string;
  readonly children: readonly AppNavPageChild[];
};

export type AppNavPage = AppNavLeafPage | AppNavGroupPage;

export const isAppGroupPage = (page: AppNavPage): page is AppNavGroupPage => 'children' in page;

export const isAppLeafPage = (page: AppNavPage): page is AppNavLeafPage => !isAppGroupPage(page);

export const appNavPages: readonly AppNavPage[] = [
  { id: 'units', label: 'Юниты', path: '/units' },
  { id: 'applications', label: 'Приложения', path: '/applications' },
  { id: 'services', label: 'Услуги', path: '/services' },
  { id: 'features', label: 'Фичи', path: '/features' },
  { id: 'teams', label: 'Команды', path: '/teams' },
  { id: 'components', label: 'Компоненты', path: '/components' },
  {
    id: 'tools',
    label: 'Инструменты',
    children: [
      {
        id: 'tools-mermaid',
        label: 'Mermaid',
        path: '/tools/mermaid',
      },
    ],
  },
  { id: 'help', label: 'Справка', path: '/help' },
];
