import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../store/token.store';
import { ProtectedRoute } from './ProtectedRoute';

const renderAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div>protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  it('renders the children when a token is stored', () => {
    tokenStore.set('jwt-value');
    renderAt('/profile');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to /login when no token is stored', () => {
    renderAt('/profile');
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('treats an empty-string token as unauthenticated', () => {
    window.localStorage.setItem('access_token', '');
    renderAt('/profile');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
});
