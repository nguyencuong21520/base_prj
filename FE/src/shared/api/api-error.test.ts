import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorBody, getApiErrorMessage } from './api-error';

const axiosErrorWith = (data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, {}, {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: {} },
  } as never);

describe('getApiErrorBody', () => {
  it('reads the backend body out of an Axios error', () => {
    const error = axiosErrorWith({ message: 'Email already exists' });
    expect(getApiErrorBody(error)).toEqual({ message: 'Email already exists' });
  });

  it('keeps the validation error list and the login OTP hints', () => {
    const body = getApiErrorBody(
      axiosErrorWith({
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Invalid email' }],
        requiresOtp: true,
        email: 'user@example.com',
      }),
    );

    expect(body?.errors?.[0].field).toBe('email');
    expect(body?.requiresOtp).toBe(true);
    expect(body?.email).toBe('user@example.com');
  });

  it('returns undefined for failures that never reached the server', () => {
    expect(getApiErrorBody(new AxiosError('Network Error', 'ERR_NETWORK'))).toBeUndefined();
    expect(getApiErrorBody(new Error('boom'))).toBeUndefined();
  });

  it.each([null, undefined, 'string error', 42, {}, { response: {} }])(
    'returns undefined for %j',
    (value) => {
      expect(getApiErrorBody(value)).toBeUndefined();
    },
  );

  it('returns undefined when the body is not an object', () => {
    expect(getApiErrorBody(axiosErrorWith('Internal Server Error'))).toBeUndefined();
  });
});

describe('getApiErrorMessage', () => {
  it('prefers the backend message', () => {
    const error = axiosErrorWith({ message: 'Invalid or expired OTP' });
    expect(getApiErrorMessage(error, 'fallback')).toBe('Invalid or expired OTP');
  });

  it('falls back when the body carries no message', () => {
    expect(getApiErrorMessage(axiosErrorWith({ errors: [] }), 'fallback')).toBe('fallback');
  });

  it('falls back for network errors and non-Axios throws', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
