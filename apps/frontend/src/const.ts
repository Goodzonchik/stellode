import { resolveApiBase } from './resolve-api-base';

export const API_BASE = resolveApiBase(import.meta.env.VITE_API_BASE);
