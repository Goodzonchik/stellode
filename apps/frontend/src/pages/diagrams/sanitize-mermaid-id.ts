export const sanitizeMermaidId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_');
  if (cleaned.length === 0) return 'n_empty';
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `n_${cleaned}`;
};
