export const getComponentKindLabel = (isDependency: boolean | undefined): string =>
  isDependency ? 'внешняя зависимость' : 'своя разработка';
