import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { api, saveAuth } from '../api/client';

// Roles must match backend allowedRoles: ['resident','collector','admin']
const roles = [
  { id: 'resident', label: 'Resident' },
  { id: 'collector', label: 'Collector' },
  { id: 'admin', label: 'Admin' }
];

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('resident');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    // If resident, require address fields
    if (role === 'resident') {
      if (!street.trim() || !city.trim() || !postalCode.trim()) {
        setError('Please provide your address (street, city, and postal code).');
        return;
      }
    }

    setLoading(true);
    try {
      // Backend requires: name, email, password, role; address for residents
      const payload = role === 'resident'
        ? { name, email, password, role, address: {
          street,
          city,
          postalCode,
          // Only include lat/lng if user provided or GPS filled; cast to number
          ...(lat !== '' ? { lat: parseFloat(lat) } : {}),
          ...(lng !== '' ? { lng: parseFloat(lng) } : {})
        } }
        : { name, email, password, role };
      const data = await api.post('/api/auth/register', payload);
      saveAuth(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* Header like the provided design */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
            <span className="text-2xl">🚛</span>
          </div>
          <h1 className="text-2xl font-bold text-emerald-900">EcoWaste Management</h1>
          <p className="text-sm text-emerald-700/70">Smart waste collection for a cleaner environment</p>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create Your Account</h2>
          <p className="text-sm text-gray-500 mb-4">Choose your account type and sign up</p>

          {/* Role segmented control */}
          <div className="flex p-1 bg-gray-100 rounded-xl text-sm mb-5" role="tablist" aria-label="Select role">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={role === r.id}
                onClick={() => setRole(r.id)}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                  role === r.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jane Doe"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Address for residents */}
            {role === 'resident' && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">Address</div>
                <div>
                  <label htmlFor="street" className="block text-xs font-medium text-gray-600">Street</label>
                  <input
                    id="street"
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 Main St"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-xs font-medium text-gray-600">City</label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Colombo"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="postal" className="block text-xs font-medium text-gray-600">Postal Code</label>
                    <input
                      id="postal"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="00000"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="lat" className="block text-xs font-medium text-gray-600">Latitude (optional)</label>
                    <input
                      id="lat"
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="6.9271"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="lng" className="block text-xs font-medium text-gray-600">Longitude (optional)</label>
                    <input
                      id="lng"
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="79.8612"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          alert('Geolocation is not supported by your browser');
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const { latitude, longitude } = pos.coords;
                            setLat(String(latitude));
                            setLng(String(longitude));
                          },
                          () => alert('Unable to retrieve your location')
                        );
                      }}
                      className="w-full text-sm border px-3 py-2 rounded-md hover:bg-gray-50"
                    >
                      Use GPS
                    </button>
                  </div>
                </div>
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
                  Your address helps collectors reach you when bins are full.
                </div>
              </div>
            )}

            {/* Role-specific hint */}
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
              {role === 'resident' && (
                <p>
                  Resident accounts can create household bins, track fill levels, and request collections.
                </p>
              )}
              {role === 'collector' && (
                <p>
                  Collector accounts manage pending collection requests and update collection status.
                </p>
              )}
              {role === 'admin' && (
                <p>
                  Admin accounts can oversee users, bins, and collection operations.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Creating…' : `Sign Up as ${roles.find(r => r.id === role)?.label ?? 'User'}`}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-700 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
