export type IdNameRow = {
  readonly id: string;
  readonly name: string;
};

export const mergeIdNameRows = (rows: readonly IdNameRow[]): IdNameRow[] => {
  const byId = new Map<string, IdNameRow>();
  for (const row of rows) {
    if (row.id.length === 0) continue;
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
};
