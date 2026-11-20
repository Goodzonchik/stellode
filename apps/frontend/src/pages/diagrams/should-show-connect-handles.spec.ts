import { shouldShowConnectHandles } from './should-show-connect-handles';

describe('shouldShowConnectHandles', () => {
  it('shows both handles when connectable', () => {
    expect(shouldShowConnectHandles(true, false, false)).toEqual([true, true]);
  });

  it('falls back to edge presence when not connectable', () => {
    expect(shouldShowConnectHandles(false, true, false)).toEqual([true, false]);
    expect(shouldShowConnectHandles(undefined, false, true)).toEqual([false, true]);
  });
});
