export interface CypherSetPart {
  readonly assignment: string;
  readonly params: Readonly<Record<string, unknown>>;
}

type MergedSetParts = { setClause: string; params: Record<string, unknown> };

export const mergeCypherSetParts = (
  parts: readonly CypherSetPart[],
  nodeAlias = 'n',
): MergedSetParts => {
  if (parts.length === 0) {
    return { setClause: '', params: {} };
  }

  const params: Record<string, unknown> = {};
  const assignments: string[] = [];

  parts.forEach((part, index) => {
    const paramPrefix = `p${index}`;
    Object.entries(part.params).forEach(([key, value]) => {
      params[`${paramPrefix}_${key}`] = value;
    });

    let assignment = part.assignment.replace(/\bn\./g, `${nodeAlias}.`);
    Object.keys(part.params).forEach((key) => {
      assignment = assignment.replace(new RegExp(`\\$${key}\\b`, 'g'), `$${paramPrefix}_${key}`);
    });

    assignments.push(assignment);
  });

  return {
    setClause: `SET ${assignments.join(', ')}`,
    params,
  };
};

const optionalPropertySet = (
  value: string | null | undefined,
  propertyName: string,
  paramName = propertyName,
): CypherSetPart | null => {
  if (value === undefined) {
    return null;
  }
  return {
    assignment: `n.${propertyName} = $${paramName}`,
    params: { [paramName]: value ?? null },
  };
};

export const optionalDescriptionSet = (
  description: string | null | undefined,
  paramName = 'description',
): CypherSetPart | null => optionalPropertySet(description, 'description', paramName);
