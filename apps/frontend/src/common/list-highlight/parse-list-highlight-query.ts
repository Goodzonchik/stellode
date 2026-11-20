export type ParsedListHighlightQuery = {
  readonly highlightId: string | null;
  readonly ctx: Readonly<Record<string, string>>;
};

const CTX_PREFIX = 'ctx.';

export const parseListHighlightQuery = (
  searchParams: URLSearchParams,
): ParsedListHighlightQuery => {
  const rawHighlight = (searchParams.get('highlight') ?? '').trim();
  const highlightId = rawHighlight === '' ? null : rawHighlight;
  const ctxEntries: Array<readonly [string, string]> = [];
  searchParams.forEach((value, key) => {
    if (!key.startsWith(CTX_PREFIX)) return;
    const ctxKey = key.slice(CTX_PREFIX.length).trim();
    const ctxValue = value.trim();
    if (ctxKey === '' || ctxValue === '') return;
    ctxEntries.push([ctxKey, ctxValue]);
  });
  return { highlightId, ctx: Object.fromEntries(ctxEntries) };
};
