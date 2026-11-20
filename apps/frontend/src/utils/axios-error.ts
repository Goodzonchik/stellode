import axios from 'axios';

const serverUnavailableRu =
  'Не удаётся связаться с сервером. Проверьте, что API запущен и база данных доступна.';

const databaseUnavailableRu = 'База данных временно недоступна. Попробуйте позже.';

const messageFromResponseData = (data: object): string | undefined => {
  if (!('message' in data)) return undefined;
  const m = (data as { message: unknown }).message;
  if (typeof m === 'string' && m.length > 0) return m;
  return undefined;
};

export const getErrorMessage = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    if (!e.response) return serverUnavailableRu;
    const { status, data } = e.response;
    if (data && typeof data === 'object') {
      const fromBody = messageFromResponseData(data);
      if (fromBody) return fromBody;
    }
    if (status === 503) return databaseUnavailableRu;
    return e.message;
  }
  return e instanceof Error ? e.message : 'Unknown error';
};

export const getErrorMessageFromRequest = (
  error: unknown,
  fallback = 'Произошла ошибка',
): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
};
