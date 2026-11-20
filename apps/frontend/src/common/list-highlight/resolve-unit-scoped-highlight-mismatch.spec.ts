import { ToastVariant } from '../../hooks/useToast';
import { resolveUnitScopedHighlightMismatch } from './resolve-unit-scoped-highlight-mismatch';

describe('resolveUnitScopedHighlightMismatch', () => {
  it('navigates to units highlight when ctx.unitId differs from current unit', () => {
    const navigate = jest.fn();
    const showToast = jest.fn();
    resolveUnitScopedHighlightMismatch(
      { highlightId: 'app-1', ctx: { unitId: 'other-unit' } },
      {
        currentUnitId: 'current-unit',
        navigate,
        showToast,
        missingInUnitMessage: 'Приложение не найдено в текущем юните',
        otherUnitMessage: 'Приложение относится к другому юниту',
      },
    );
    expect(showToast).toHaveBeenCalledWith(
      'Приложение относится к другому юниту',
      ToastVariant.Warning,
    );
    expect(navigate).toHaveBeenCalledWith('/units?highlight=other-unit');
  });

  it('toasts missing message when unit matches', () => {
    const navigate = jest.fn();
    const showToast = jest.fn();
    resolveUnitScopedHighlightMismatch(
      { highlightId: 'app-1', ctx: { unitId: 'u1' } },
      {
        currentUnitId: 'u1',
        navigate,
        showToast,
        missingInUnitMessage: 'Приложение не найдено в текущем юните',
        otherUnitMessage: 'Приложение относится к другому юниту',
      },
    );
    expect(showToast).toHaveBeenCalledWith(
      'Приложение не найдено в текущем юните',
      ToastVariant.Warning,
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('toasts missing message when ctx.unitId is absent', () => {
    const navigate = jest.fn();
    const showToast = jest.fn();
    resolveUnitScopedHighlightMismatch(
      { highlightId: 'app-1', ctx: {} },
      {
        currentUnitId: 'u1',
        navigate,
        showToast,
        missingInUnitMessage: 'Приложение не найдено в текущем юните',
        otherUnitMessage: 'Приложение относится к другому юниту',
      },
    );
    expect(showToast).toHaveBeenCalledWith(
      'Приложение не найдено в текущем юните',
      ToastVariant.Warning,
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
