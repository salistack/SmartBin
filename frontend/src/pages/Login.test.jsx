import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
  },
  saveAuth: vi.fn(),
}));

const { api, saveAuth } = await import('../api/client');

describe('Login page', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    saveAuth.mockReset();
    navigateMock.mockReset();
  });

  it('submits credentials and navigates to dashboard on success', async () => {
    vi.mocked(api.post).mockResolvedValue({ token: 'jwt', user: { id: 1 } });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'user@example.com',
        password: 'password123',
      });
      expect(saveAuth).toHaveBeenCalledWith({ token: 'jwt', user: { id: 1 } });
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows an error message when the API call fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Invalid credentials'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'badpass');

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('falls back to default error message if error has no message', async () => {
    vi.mocked(api.post).mockRejectedValue({});

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'badpass');

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Login failed')).toBeInTheDocument();
  });
});
