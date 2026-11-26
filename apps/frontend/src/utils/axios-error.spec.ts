import axios from 'axios';
import { getErrorMessage } from './axios-error';

const createAxiosError = (
  message: string,
  response?: { status: number; data: unknown },
): axios.AxiosError => {
  const error = new axios.AxiosError(message);
  if (!response) return error;
  error.response = {
    status: response.status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as never,
    data: response.data,
  };
  return error;
};

describe('getErrorMessage', () => {
  it('returns server unavailable when axios has no response', () => {
    expect(getErrorMessage(createAxiosError('Network Error'))).toBe(
      'Не удаётся связаться с сервером. Проверьте, что API запущен и база данных доступна.',
    );
  });

  it('returns message from response body', () => {
    const error = createAxiosError('Request failed', {
      status: 400,
      data: { message: 'Validation failed' },
    });
    expect(getErrorMessage(error)).toBe('Validation failed');
  });

  it('returns database unavailable for 503 without body message', () => {
    const error = createAxiosError('Service Unavailable', {
      status: 503,
      data: {},
    });
    expect(getErrorMessage(error)).toBe(
      'База данных временно недоступна. Попробуйте позже.',
    );
  });

  it('returns axios message when response has no body message', () => {
    const error = createAxiosError('Not Found', {
      status: 404,
      data: {},
    });
    expect(getErrorMessage(error)).toBe('Not Found');
  });

  it('returns Error.message for non-axios Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns default fallback for unknown value', () => {
    expect(getErrorMessage(null)).toBe('Unknown error');
  });

  it('returns custom fallback when message cannot be resolved', () => {
    expect(getErrorMessage('raw', 'Не удалось сохранить')).toBe(
      'Не удалось сохранить',
    );
  });

  it('prefers response body message over custom fallback', () => {
    const error = createAxiosError('Request failed', {
      status: 400,
      data: { message: 'Already exists' },
    });
    expect(getErrorMessage(error, 'Не удалось сохранить')).toBe('Already exists');
  });
});
