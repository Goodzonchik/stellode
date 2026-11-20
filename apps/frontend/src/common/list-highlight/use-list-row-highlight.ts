import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LIST_HIGHLIGHT_ROW_CLASS } from './list-highlight-row-class';
import { parseListHighlightQuery } from './parse-list-highlight-query';
import './list-highlight-row.css';

export type ListRowHighlightMismatch = {
  readonly highlightId: string;
  readonly ctx: Readonly<Record<string, string>>;
};

export type UseListRowHighlightArgs = {
  readonly rowsLoaded: boolean;
  readonly rowIds: ReadonlySet<string>;
  readonly onMismatch: (payload: ListRowHighlightMismatch) => void;
};

export type UseListRowHighlightResult = {
  readonly highlightId: string | null;
  readonly ctx: Readonly<Record<string, string>>;
  readonly isHighlighted: (id: string) => boolean;
  readonly rowClassName: (id: string) => string;
};

export const useListRowHighlight = ({
  rowsLoaded,
  rowIds,
  onMismatch,
}: UseListRowHighlightArgs): UseListRowHighlightResult => {
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const { highlightId, ctx } = parseListHighlightQuery(searchParams);
  const handledKeyRef = useRef<string | null>(null);
  const rowIdsKey = Array.from(rowIds).slice().sort().join('|');

  useEffect(() => {
    if (!rowsLoaded || highlightId === null) return;
    if (rowIds.has(highlightId)) {
      const row = document.querySelector(`tr[data-row-key="${CSS.escape(highlightId)}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const handledKey = `${highlightId}::${searchKey}`;
    if (handledKeyRef.current === handledKey) return;
    handledKeyRef.current = handledKey;
    onMismatch({ highlightId, ctx });
  }, [rowsLoaded, highlightId, rowIds, rowIdsKey, ctx, onMismatch, searchKey]);

  const isHighlighted = (id: string): boolean => highlightId !== null && highlightId === id;

  const rowClassName = (id: string): string =>
    isHighlighted(id) ? LIST_HIGHLIGHT_ROW_CLASS : '';

  return { highlightId, ctx, isHighlighted, rowClassName };
};
