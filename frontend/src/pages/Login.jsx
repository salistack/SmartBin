import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, saveAuth } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      saveAuth(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
            <span className="text-2xl">🚛</span>
          </div>
          <h1 className="text-2xl font-bold text-emerald-900">EcoWaste Management</h1>
          <p className="text-sm text-emerald-700/70">Smart waste collection for a cleaner environment</p>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Login to Your Account</h2>
          <p className="text-sm text-gray-500 mb-4">Welcome back</p>
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          No account? <Link to="/register" className="text-emerald-700 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
