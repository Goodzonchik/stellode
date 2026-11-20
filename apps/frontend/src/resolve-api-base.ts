const DEFAULT_API_BASE = 'http://localhost:3000/api';

export const resolveApiBase = (envValue: string | undefined): string =>
  envValue && envValue.length > 0 ? envValue : DEFAULT_API_BASE;
