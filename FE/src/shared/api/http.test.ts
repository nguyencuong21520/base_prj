import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tokenStore } from '../../modules/auth/store/token.store';
import { stubWindowLocation } from '../../test/stub-window-location';
import { http } from './http';

/**
 * Drives the real interceptors by swapping in a fake adapter, so no network
 * request is made but request/response handling is exercised end to end.
 */
let lastConfig: InternalAxiosRequestConfig | undefined;
const originalAdapter = http.defaults.adapter;

const respondWith = (status: number) => {
  http.defaults.adapter = async (config) => {
    lastConfig = config as InternalAxiosRequestConfig;
    const response = {
      data: { ok: status < 400 },
      status,
      statusText: String(status),
      headers: {},
      config,
    } as AxiosResponse;

    if (status >= 400) {
      throw new AxiosError(`Request failed with status ${status}`, 'ERR_BAD_REQUEST', config, {}, response);
    }

    return response;
  };
};

beforeEach(() => {
  lastConfig = undefined;
  respondWith(200);
});

afterEach(() => {
  http.defaults.adapter = originalAdapter;
});

describe('http instance', () => {
  it('uses the configured API base URL and timeout', () => {
    expect(http.defaults.baseURL).toBe('http://test.local/api');
    expect(http.defaults.timeout).toBe(15000);
  });
});

describe('request interceptor', () => {
  it('attaches the stored token as a Bearer header', async () => {
    tokenStore.set('jwt-value');
    await http.get('/auth/me');
    expect(lastConfig?.headers.Authorization).toBe('Bearer jwt-value');
  });

  it('sends no Authorization header when no token is stored', async () => {
    await http.get('/auth/me');
    expect(lastConfig?.headers.Authorization).toBeUndefined();
  });

  it('re-reads the token on every request', async () => {
    await http.get('/auth/me');
    tokenStore.set('late-token');
    await http.get('/auth/me');
    expect(lastConfig?.headers.Authorization).toBe('Bearer late-token');
  });
});

describe('response interceptor', () => {
  it('passes successful responses through untouched', async () => {
    tokenStore.set('jwt-value');
    const response = await http.get('/auth/me');
    expect(response.data).toEqual({ ok: true });
    expect(tokenStore.get()).toBe('jwt-value');
  });

  it('clears the token and redirects to /logout on 401', async () => {
    const location = stubWindowLocation('/profile');
    tokenStore.set('jwt-value');
    respondWith(401);

    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

    expect(tokenStore.get()).toBeNull();
    expect(location.href).toBe('/logout');
  });

  it('does not redirect again when already on /logout', async () => {
    const location = stubWindowLocation('/logout');
    tokenStore.set('jwt-value');
    respondWith(401);

    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

    expect(tokenStore.get()).toBeNull();
    expect(location.href).toBe('');
  });

  it.each([400, 403, 404, 409, 500])('keeps the token for status %i', async (status) => {
    const location = stubWindowLocation('/profile');
    tokenStore.set('jwt-value');
    respondWith(status);

    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

    expect(tokenStore.get()).toBe('jwt-value');
    expect(location.href).toBe('');
  });

  it('keeps the token when the request fails without a response', async () => {
    const location = stubWindowLocation('/profile');
    tokenStore.set('jwt-value');
    http.defaults.adapter = async () => {
      throw new AxiosError('Network Error', 'ERR_NETWORK');
    };

    await expect(http.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

    expect(tokenStore.get()).toBe('jwt-value');
    expect(location.href).toBe('');
  });
});
