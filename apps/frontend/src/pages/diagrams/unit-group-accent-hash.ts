export const unitGroupAccentHash = (unitId: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < unitId.length; index += 1) {
    hash ^= unitId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
