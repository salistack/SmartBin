const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Unexpected response' };
  }

  if (!res.ok) {
    const message = data?.message || `Request failed with ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  post: (path, body, headers) => request(path, { method: 'POST', body, headers }),
  get: (path, headers) => request(path, { method: 'GET', headers }),
  patch: (path, body, headers) => request(path, { method: 'PATCH', body, headers })
};

export function saveAuth({ user, token }) {
  localStorage.setItem('sb_token', token);
  localStorage.setItem('sb_user', JSON.stringify(user));
}

export function getAuth() {
  const token = localStorage.getItem('sb_token');
  const userStr = localStorage.getItem('sb_user');
  let user = null;
  try { user = userStr ? JSON.parse(userStr) : null; } catch { /* ignore parse error */ }
  return { token, user };
}

export function clearAuth() {
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_user');
}
