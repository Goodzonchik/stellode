import axios, { type AxiosError } from 'axios';

const serverUnavailableRu =
  'Не удаётся связаться с сервером. Проверьте, что API запущен и база данных доступна.';

const databaseUnavailableRu = 'База данных временно недоступна. Попробуйте позже.';

const messageFromResponseData = (data: object): string | undefined => {
  if (!('message' in data)) return undefined;
  const message = (data as { message: unknown }).message;
  if (typeof message === 'string' && message.length > 0) return message;
  return undefined;
};

const messageFromAxiosError = (error: AxiosError): string | undefined => {
  if (!error.response) return serverUnavailableRu;
  const { status, data } = error.response;
  if (data && typeof data === 'object') {
    const fromBody = messageFromResponseData(data);
    if (fromBody) return fromBody;
  }
  if (status === 503) return databaseUnavailableRu;
  if (error.message.length > 0) return error.message;
  return undefined;
};

export const getErrorMessage = (
  error: unknown,
  fallback = 'Unknown error',
): string => {
  if (axios.isAxiosError(error)) {
    return messageFromAxiosError(error) ?? fallback;
  }
  if (error instanceof Error && error.message.length > 0) return error.message;
  return fallback;
};
