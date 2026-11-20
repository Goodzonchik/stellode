export const DATABASE_UNAVAILABLE_MESSAGE_RU =
  'База данных временно недоступна. Попробуйте позже.';

const hasStringCode = (e: unknown): e is { code: string } =>
  Boolean(e && typeof e === 'object' && 'code' in e && typeof (e as { code?: unknown }).code === 'string');

const codeImpliesConnectivityFailure = (code: string): boolean =>
  code.includes('ServiceUnavailable') ||
  code.includes('DatabaseUnavailable') ||
  code.includes('SessionExpired') ||
  code.includes('ECONNREFUSED') ||
  code.includes('ETIMEDOUT');

const isDriverConnectivityError = (e: unknown): boolean =>
  hasStringCode(e) && codeImpliesConnectivityFailure(e.code);

const isNodeNetworkErrno = (e: unknown): boolean => {
  if (!e || typeof e !== 'object') return false;
  const code = (e as NodeJS.ErrnoException).code;
  return code === 'ECONNREFUSED' || code === 'ETIMEDOUT';
};

export const isDatabaseConnectivityError = (e: unknown): boolean =>
  isDriverConnectivityError(e) || isNodeNetworkErrno(e);
