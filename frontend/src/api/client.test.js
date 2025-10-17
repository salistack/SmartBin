import { describe, expect, it, beforeEach, vi } from 'vitest';
import { api, saveAuth, getAuth, clearAuth } from './client';

describe('api/client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals?.();
  });

  it('performs a successful GET request and parses JSON', async () => {
    const payload = { ok: true };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.get('/status');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/status', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    expect(result).toEqual(payload);
  });

  it('sends a POST request with body and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ user: 'alice' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const body = { email: 'a@example.com', password: 'secret' };
    const headers = { Authorization: 'Bearer token' };
    const result = await api.post('/login', body, headers);

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
    });
    expect(result).toEqual({ user: 'alice' });
  });

  it('returns empty object for empty successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    }));

    const result = await api.get('/no-content');
    expect(result).toEqual({});
  });

  it('throws a friendly error when server returns JSON error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Bad request' }),
    }));

    await expect(api.get('/broken')).rejects.toThrow('Bad request');
  });

  it('falls back to status code when error message missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => '',
    }));

    await expect(api.get('/oops')).rejects.toThrow('Request failed with 503');
  });

  it('saves, reads, and clears auth payload', () => {
    const payload = { token: 'abc', user: { id: 1, role: 'admin' } };
    saveAuth(payload);
    expect(localStorage.getItem('sb_token')).toBe('abc');
    expect(JSON.parse(localStorage.getItem('sb_user'))).toEqual(payload.user);

    expect(getAuth()).toEqual(payload);

    clearAuth();
    expect(getAuth()).toEqual({ token: null, user: null });
  });

  it('handles invalid user JSON gracefully', () => {
    localStorage.setItem('sb_token', 'abc');
    localStorage.setItem('sb_user', '{not json');

    expect(getAuth()).toEqual({ token: 'abc', user: null });
  });
});
