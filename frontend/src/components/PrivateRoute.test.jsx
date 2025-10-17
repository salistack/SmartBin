import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PrivateRoute from './PrivateRoute';

vi.mock('../api/client', () => ({
  getAuth: vi.fn(),
}));

const { getAuth } = await import('../api/client');

describe('PrivateRoute', () => {
  it('redirects unauthenticated users to login', () => {
    vi.mocked(getAuth).mockReturnValue({ token: null });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={(
              <PrivateRoute>
                <div>Secret</div>
              </PrivateRoute>
            )}
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders child content when token present', () => {
    vi.mocked(getAuth).mockReturnValue({ token: 'abc' });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={(
              <PrivateRoute>
                <div>Secret</div>
              </PrivateRoute>
            )}
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
