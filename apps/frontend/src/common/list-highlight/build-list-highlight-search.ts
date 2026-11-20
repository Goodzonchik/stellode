export type ListHighlightSearchInput = {
  readonly highlight: string;
  readonly ctx?: Readonly<Record<string, string>>;
};

export const buildListHighlightSearch = (input: ListHighlightSearchInput): string => {
  const params = new URLSearchParams();
  params.set('highlight', input.highlight);
  const ctx = input.ctx ?? {};
  for (const key of Object.keys(ctx)) {
    const value = ctx[key]?.trim() ?? '';
    if (value === '') continue;
    params.set(`ctx.${key}`, value);
  }
  return params.toString();
};
