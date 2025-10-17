import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Register from './Register';

const navigateMock = vi.fn();
const originalGeolocation = navigator.geolocation;
const originalAlert = window.alert;

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

describe('Register page', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    saveAuth.mockReset();
    navigateMock.mockReset();
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
    window.alert = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
    window.alert = originalAlert;
  });

  function renderForm() {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
  }

  it('prevents submission when passwords do not match', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText('Full Name'), 'New User');
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'pass1234');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'different');

    await userEvent.click(screen.getByRole('button', { name: /Sign Up/ }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('requires address fields for resident accounts', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText('Full Name'), 'Resident User');
    await userEvent.type(screen.getByLabelText('Email'), 'resident@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'pass1234');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'pass1234');

    await userEvent.click(screen.getByRole('button', { name: /Sign Up/ }));

    expect(await screen.findByText('Please provide your address (street, city, and postal code).')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('registers a resident and normalises coordinate input', async () => {
    vi.mocked(api.post).mockResolvedValue({ token: 't', user: { id: 10 } });

    renderForm();

    await userEvent.type(screen.getByLabelText('Full Name'), 'Resident User');
    await userEvent.type(screen.getByLabelText('Email'), 'resident@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'pass1234');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'pass1234');
    await userEvent.type(screen.getByLabelText('Street'), '123 Main');
    await userEvent.type(screen.getByLabelText('City'), 'Colombo');
    await userEvent.type(screen.getByLabelText('Postal Code'), '20000');
    await userEvent.type(screen.getByLabelText('Latitude (optional)'), '6.9000');
    await userEvent.type(screen.getByLabelText('Longitude (optional)'), '79.8500');

    await userEvent.click(screen.getByRole('button', { name: /Sign Up/ }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
        name: 'Resident User',
        email: 'resident@example.com',
        password: 'pass1234',
        role: 'resident',
        address: {
          street: '123 Main',
          city: 'Colombo',
          postalCode: '20000',
          lat: 6.9,
          lng: 79.85,
        },
      });
      expect(saveAuth).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('allows collectors to register without address', async () => {
    vi.mocked(api.post).mockResolvedValue({ token: 'c', user: { id: 33 } });

    renderForm();

    await userEvent.click(screen.getByRole('tab', { name: 'Collector' }));
    await userEvent.type(screen.getByLabelText('Full Name'), 'Collector User');
    await userEvent.type(screen.getByLabelText('Email'), 'collector@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'pass1234');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'pass1234');

    await userEvent.click(screen.getByRole('button', { name: /Sign Up/ }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
        name: 'Collector User',
        email: 'collector@example.com',
        password: 'pass1234',
        role: 'collector',
      });
      expect(saveAuth).toHaveBeenCalledWith({ token: 'c', user: { id: 33 } });
    });
  });

  it('alerts when geolocation is unavailable', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Use GPS' }));

    expect(window.alert).toHaveBeenCalledWith('Geolocation is not supported by your browser');
  });

  it('fills coordinates when geolocation succeeds', async () => {
    const geolocationMock = {
      getCurrentPosition: vi.fn((success) => {
        success({ coords: { latitude: 7.1, longitude: 80.1 } });
      }),
    };
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: geolocationMock,
    });

    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Use GPS' }));

    expect(geolocationMock.getCurrentPosition).toHaveBeenCalled();
    expect(screen.getByLabelText('Latitude (optional)').value).toBe('7.1');
    expect(screen.getByLabelText('Longitude (optional)').value).toBe('80.1');
  });
});
