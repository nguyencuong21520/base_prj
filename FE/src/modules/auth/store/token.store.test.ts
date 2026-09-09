import { describe, expect, it } from 'vitest';
import { tokenStore } from './token.store';

const STORAGE_KEY = 'access_token';

describe('tokenStore', () => {
  it('returns null when nothing is stored', () => {
    expect(tokenStore.get()).toBeNull();
  });

  it('persists the token under the shared storage key', () => {
    tokenStore.set('jwt-value');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('jwt-value');
    expect(tokenStore.get()).toBe('jwt-value');
  });

  it('overwrites a previous token', () => {
    tokenStore.set('first');
    tokenStore.set('second');
    expect(tokenStore.get()).toBe('second');
  });

  it('removes the token on clear and stays clearable when already empty', () => {
    tokenStore.set('jwt-value');
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
    expect(() => tokenStore.clear()).not.toThrow();
  });

  it('does not touch unrelated storage entries', () => {
    window.localStorage.setItem('theme', 'dark');
    tokenStore.set('jwt-value');
    tokenStore.clear();
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });
});
