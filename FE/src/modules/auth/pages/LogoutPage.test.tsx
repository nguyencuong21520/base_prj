import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../store/token.store';
import { LogoutPage } from './LogoutPage';

describe('LogoutPage', () => {
  it('clears the token and redirects to the login page', () => {
    tokenStore.set('jwt-value');

    render(
      <MemoryRouter initialEntries={['/logout']}>
        <Routes>
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(tokenStore.get()).toBeNull();
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
});
