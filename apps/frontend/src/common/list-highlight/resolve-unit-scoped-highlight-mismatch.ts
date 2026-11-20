import { ToastVariant } from '../../hooks/useToast';
import { buildListHighlightSearch } from './build-list-highlight-search';

export type UnitScopedHighlightMismatchPayload = {
  readonly highlightId: string;
  readonly ctx: Readonly<Record<string, string>>;
};

export type UnitScopedHighlightMismatchDeps = {
  readonly currentUnitId: string | null | undefined;
  readonly navigate: (to: string) => void;
  readonly showToast: (message: string, variant: ToastVariant) => void;
  readonly missingInUnitMessage: string;
  readonly otherUnitMessage: string;
};

export const resolveUnitScopedHighlightMismatch = (
  payload: UnitScopedHighlightMismatchPayload,
  deps: UnitScopedHighlightMismatchDeps,
): void => {
  const targetUnitId = (payload.ctx.unitId ?? '').trim();
  const currentUnitId = (deps.currentUnitId ?? '').trim();
  if (targetUnitId !== '' && targetUnitId !== currentUnitId) {
    deps.showToast(deps.otherUnitMessage, ToastVariant.Warning);
    const search = buildListHighlightSearch({ highlight: targetUnitId });
    deps.navigate(`/units?${search}`);
    return;
  }
  deps.showToast(deps.missingInUnitMessage, ToastVariant.Warning);
};
