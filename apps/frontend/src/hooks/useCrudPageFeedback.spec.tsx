/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { ToastVariant } from './useToast';
import { useCrudPageFeedback } from './useCrudPageFeedback';

const showToast = jest.fn();

jest.mock('./useToast', () => ({
  ToastVariant: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  useToast: () => ({ showToast }),
}));

describe('useCrudPageFeedback', () => {
  beforeEach(() => {
    showToast.mockReset();
  });

  it('toasts list load failures and marks rows loaded', async () => {
    const setRowsLoaded = jest.fn();
    const onSuccess = jest.fn();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useCrudPageFeedback());

    await act(async () => {
      await result.current.runListLoad({
        load: async () => {
          throw new Error('boom');
        },
        onSuccess,
        setRowsLoaded,
        logLabel: 'units',
      });
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(setRowsLoaded).toHaveBeenCalledWith(false);
    expect(setRowsLoaded).toHaveBeenCalledWith(true);
    expect(showToast).toHaveBeenCalledWith('boom', ToastVariant.Error);
    consoleError.mockRestore();
  });

  it('sets form error and toasts on reportFormError', () => {
    const { result } = renderHook(() => useCrudPageFeedback());

    act(() => {
      result.current.reportFormError(new Error('save failed'), 'fallback');
    });

    expect(result.current.error).toBe('save failed');
    expect(showToast).toHaveBeenCalledWith('save failed', ToastVariant.Error);
  });
});
