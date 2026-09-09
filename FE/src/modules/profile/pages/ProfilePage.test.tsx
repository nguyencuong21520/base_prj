import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { ProfilePage } from './ProfilePage';

const getMe = vi.fn();

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => getMe() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const profile = {
  _id: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  bio: 'Hello',
  phone: '0123456789',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/logout" element={<div>logout route</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  getMe.mockReset().mockResolvedValue({ data: profile });
});

describe('ProfilePage', () => {
  it('shows a loading placeholder before the request resolves', () => {
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('fetches the current user once and renders it', async () => {
    renderPage();

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(getMe).toHaveBeenCalledOnce();
  });

  it('clears the token and redirects to /logout when the request fails', async () => {
    tokenStore.set('jwt-value');
    getMe.mockRejectedValue(new Error('401'));

    renderPage();

    expect(await screen.findByText('logout route')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('does not render the edit form until the user is loaded', async () => {
    renderPage();
    expect(screen.queryByLabelText('Display Name')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Display Name')).toBeInTheDocument());
  });
});
