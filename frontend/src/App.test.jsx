import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/Layout', () => ({
  default: ({ children }) => (
    <div>
      <div>Layout Shell</div>
      {children}
    </div>
  ),
}));

vi.mock('./components/PrivateRoute', async () => {
  const actual = await vi.importActual('./components/PrivateRoute');
  return { default: actual.default };
});

vi.mock('./pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('./pages/Register', () => ({ default: () => <div>Register Page</div> }));
vi.mock('./pages/AdminDashboard', () => ({ default: () => <div>Admin Dashboard Page</div> }));
vi.mock('./pages/UserDashboard', () => ({ default: () => <div>User Dashboard Page</div> }));
vi.mock('./pages/CollectorDashboard', () => ({ default: () => <div>Collector Dashboard Page</div> }));
vi.mock('./pages/CollectorOptimize', () => ({ default: () => <div>Collector Optimize Page</div> }));

vi.mock('./api/client', () => ({
  getAuth: vi.fn(),
}));

const { getAuth } = await import('./api/client');

describe('App routing', () => {
  let authState;

  beforeEach(() => {
    authState = { token: null, user: null };
    vi.mocked(getAuth).mockImplementation(() => authState);
  });

  it('redirects anonymous users to login when accessing protected routes', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('routes admin users to admin dashboard', async () => {
    authState = { token: 'abc', user: { role: 'admin' } };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard Page')).toBeInTheDocument();
    });
  });

  it('prevents collectors from accessing admin route directly', async () => {
    authState = { token: 'abc', user: { role: 'collector' } };

    render(
      <MemoryRouter initialEntries={['/dashboard/admin']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Collector Dashboard Page')).toBeInTheDocument();
    });
  });
});
