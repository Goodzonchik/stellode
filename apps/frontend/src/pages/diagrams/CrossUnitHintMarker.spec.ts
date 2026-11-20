import type { CrossUnitHint } from '@stellode/models';
import { formatCrossUnitHintTitle } from './CrossUnitHintMarker';

describe('formatCrossUnitHintTitle', () => {
  it('formats scalar and array fields', () => {
    const hint: CrossUnitHint = {
      unitName: ['U1', 'U2'],
      teamName: 'Team',
      applicationName: ['AppA', 'AppB'],
      componentName: ['CompA', 'CompB'],
      featureName: '—',
      serviceName: 'Svc',
    };
    expect(formatCrossUnitHintTitle(hint)).toBe(
      [
        'Юнит: U1, U2',
        'Команда: Team',
        'Приложение: AppA, AppB',
        'Компонент: CompA, CompB',
        'Фича: —',
        'Сервис: Svc',
      ].join('\n'),
    );
  });
});
