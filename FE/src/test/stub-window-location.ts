import { afterEach } from 'vitest';

/**
 * jsdom refuses real navigation, so tests that assert redirects replace
 * `window.location` with a writable plain object and read `href` afterwards.
 * Returns the stub; the original object is restored after each test.
 */
export interface LocationStub {
  pathname: string;
  href: string;
}

const originalLocation = window.location;

export const stubWindowLocation = (pathname = '/'): LocationStub => {
  const stub: LocationStub = { pathname, href: '' };
  Object.defineProperty(window, 'location', { value: stub, writable: true, configurable: true });
  return stub;
};

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});
