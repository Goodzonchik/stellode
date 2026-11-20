/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { CrossUnitBridgeLegend } from './CrossUnitBridgeLegend';

describe('CrossUnitBridgeLegend', () => {
  it('toggles teams and code-only checkboxes', () => {
    const onTeamsVisibleChange = jest.fn();
    const onCodeOnlyChange = jest.fn();

    render(
      <CrossUnitBridgeLegend
        teamsVisible={true}
        onTeamsVisibleChange={onTeamsVisibleChange}
        codeOnly={false}
        onCodeOnlyChange={onCodeOnlyChange}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Команды' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Только код' }));

    expect(onTeamsVisibleChange).toHaveBeenCalledWith(false);
    expect(onCodeOnlyChange).toHaveBeenCalledWith(true);
  });
});
