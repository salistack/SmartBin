import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, clearAuth, getAuth, saveAuth } from '../api/client';

// Minimal user dashboard wiring core flows available in backend:
// - Create Bin: POST /api/bins
// - List My Bins: GET /api/bins (returns { bins: [...] })
// - Update Filth (simulate fill): PATCH /api/bins/:binId/filth { addedFilth }
// - Request Collection: POST /api/collections/request { binId } (bin must be full)
export default function UserDashboard() {
  const auth = getAuth();
  const { token } = auth;
  const [currentUser, setCurrentUser] = useState(auth.user);
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [type, setType] = useState('Plastic');
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: auth.user?.name || '',
    street: auth.user?.address?.street || '',
    city: auth.user?.address?.city || '',
    postalCode: auth.user?.address?.postalCode || '',
    lat: auth.user?.address?.lat != null ? String(auth.user.address.lat) : '',
    lng: auth.user?.address?.lng != null ? String(auth.user.address.lng) : ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const address = currentUser?.address || {};
  const lat = typeof address?.lat === 'number' ? address.lat : undefined;
  const lng = typeof address?.lng === 'number' ? address.lng : undefined;

  useEffect(() => {
    setProfileForm({
      name: currentUser?.name || '',
      street: currentUser?.address?.street || '',
      city: currentUser?.address?.city || '',
      postalCode: currentUser?.address?.postalCode || '',
      lat: currentUser?.address?.lat != null ? String(currentUser.address.lat) : '',
      lng: currentUser?.address?.lng != null ? String(currentUser.address.lng) : ''
    });
  }, [currentUser]);

  function buildOsmEmbed(lat, lng) {
    // Build a small bbox around the location (~0.01 degrees ≈ ~1km)
    const d = 0.01;
    const left = lng - d;
    const bottom = lat - d;
    const right = lng + d;
    const top = lat + d;
    const bbox = `${left},${bottom},${right},${top}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
  }

  const loadBins = useCallback(async() => {
    setError('');
    try {
      const data = await api.get('/api/bins', authHeader);
      setBins(data?.bins || []);
    } catch (err) {
      setError(err.message || 'Failed to load bins');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    loadBins();
  }, [loadBins]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async(event) => {
    event.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const trimmedName = profileForm.name.trim();
    if (!trimmedName) {
      setProfileError('Name is required');
      return;
    }

    const payload = {
      name: trimmedName,
      address: {
        street: profileForm.street.trim(),
        city: profileForm.city.trim(),
        postalCode: profileForm.postalCode.trim()
      }
    };

    const latVal = profileForm.lat.trim();
    if (latVal) {
      const latNum = Number(latVal);
      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        setProfileError('Latitude must be between -90 and 90');
        return;
      }
      payload.address.lat = latNum;
    } else {
      payload.address.lat = null;
    }

    const lngVal = profileForm.lng.trim();
    if (lngVal) {
      const lngNum = Number(lngVal);
      if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
        setProfileError('Longitude must be between -180 and 180');
        return;
      }
      payload.address.lng = lngNum;
    } else {
      payload.address.lng = null;
    }

    setProfileSaving(true);
    try {
      const response = await api.patch('/api/users/me', payload, authHeader);
      const updatedUser = response?.user;
      if (updatedUser) {
        setCurrentUser(updatedUser);
        saveAuth({ user: updatedUser, token });
        setProfileSuccess('Details updated successfully');
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to update details');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setProfileError('Geolocation is not supported by this browser.');
      return;
    }
    setProfileError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setProfileForm((prev) => ({
          ...prev,
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6)
        }));
        setProfileSuccess('Coordinates captured from your device. Save to apply.');
      },
      () => {
        setProfileError('Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadMyRequests = useCallback(async() => {
    setReqError('');
    setReqLoading(true);
    try {
      const data = await api.get('/api/collections/mine', authHeader);
      setMyRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (err) {
      setReqError(err.message || 'Failed to load requests');
    } finally {
      setReqLoading(false);
    }
  }, [authHeader]);

  async function createBin() {
    setCreating(true);
    setError('');
    try {
      await api.post('/api/bins', { type }, authHeader);
      await loadBins();
      setType('Plastic');
    } catch (err) {
      setError(err.message || 'Failed to create bin');
    } finally {
      setCreating(false);
    }
  }

  async function addFilth(binId, amount) {
    try {
      await api.patch(`/api/bins/${binId}/filth`, { addedFilth: amount }, authHeader);
      await loadBins();
    } catch (err) {
      alert(err.message || 'Failed to update filth');
    }
  }

  async function requestCollection(binId) {
    try {
      await api.post('/api/collections/request', { binId }, authHeader);
      await loadBins();
      // proactively refresh requests list if user is on Requests tab
      if (active === 'requests') {
        await loadMyRequests();
      }
      alert('Collection requested');
    } catch (err) {
      alert(err.message || 'Failed to request collection');
    }
  }

  const [active, setActive] = useState('address'); // address | create | bins | requests

  const handleLogout = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[80vh]">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <div className="text-emerald-700 font-bold mb-3">Resident</div>
        <nav className="space-y-1">
          <button onClick={() => setActive('address')} className={`w-full text-left px-3 py-2 rounded-md ${active === 'address' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}>My Address</button>
          <button onClick={() => setActive('create')} className={`w-full text-left px-3 py-2 rounded-md ${active === 'create' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}>Create Bin</button>
          <button onClick={() => setActive('bins')} className={`w-full text-left px-3 py-2 rounded-md ${active === 'bins' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}>My Bins</button>
          <button onClick={() => { setActive('requests'); loadMyRequests(); }} className={`w-full text-left px-3 py-2 rounded-md ${active === 'requests' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}>Requests</button>
        </nav>
      </aside>

      <div className="flex-1 space-y-6 p-5">
        <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-emerald-800">Welcome, {currentUser?.name || currentUser?.email}</h1>
            <p className="text-sm text-gray-600">Manage your bins and request collections</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 sm:mt-0 inline-flex items-center justify-center border border-red-500 text-red-600 px-4 py-2 text-sm font-medium rounded-md hover:bg-red-50"
          >
            Log Out
          </button>
        </div>
        {active === 'address' && (
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold mb-3">My Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                {address && (address.street || address.city || address.postalCode || (lat && lng)) ? (
                  <>
                    <div className="text-sm text-gray-500">Street</div>
                    <div className="font-medium">{address.street || '—'}</div>
                    <div className="mt-2 text-sm text-gray-500">City</div>
                    <div className="font-medium">{address.city || '—'}</div>
                    <div className="mt-2 text-sm text-gray-500">Postal Code</div>
                    <div className="font-medium">{address.postalCode || '—'}</div>
                    {(lat !== undefined || lng !== undefined) && (
                      <>
                        <div className="mt-2 text-sm text-gray-500">Coordinates</div>
                        <div className="font-medium">{lat ?? '—'}, {lng ?? '—'}</div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-600">No address on file yet. Use the form below to add or update your address.</div>
                )}
              </div>
              <div>
                {lat !== undefined && lng !== undefined ? (
                  <div className="overflow-hidden rounded-md border">
                    <iframe
                      title="Location Map"
                      src={buildOsmEmbed(lat, lng)}
                      className="w-full h-56"
                      loading="lazy"
                      style={{ border: 0 }}
                    />
                    <div className="p-2 text-right text-xs">
                      <a
                        className="text-emerald-700 hover:underline"
                        href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in OpenStreetMap
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No coordinates available. Provide latitude and longitude below to preview your home on the map.</div>
                )}
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold mb-3">Update Details</h3>
              <form onSubmit={handleProfileSubmit} className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600">Name</label>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Street</label>
                  <input
                    name="street"
                    value={profileForm.street}
                    onChange={handleProfileChange}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">City</label>
                  <input
                    name="city"
                    value={profileForm.city}
                    onChange={handleProfileChange}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Postal Code</label>
                  <input
                    name="postalCode"
                    value={profileForm.postalCode}
                    onChange={handleProfileChange}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    placeholder="Postal Code"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Latitude</label>
                  <input
                    name="lat"
                    value={profileForm.lat}
                    onChange={handleProfileChange}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    placeholder="e.g. 6.9271"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Longitude</label>
                  <input
                    name="lng"
                    value={profileForm.lng}
                    onChange={handleProfileChange}
                    className="mt-1 w-full border rounded-md px-3 py-2"
                    placeholder="e.g. 79.8612"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {profileSaving ? 'Saving…' : 'Save Details'}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    className="text-sm border px-3 py-2 rounded-md hover:bg-gray-50"
                  >
                    Use My Location
                  </button>
                  {profileError && <span className="text-sm text-red-600">{profileError}</span>}
                  {profileSuccess && !profileError && <span className="text-sm text-emerald-600">{profileSuccess}</span>}
                </div>
              </form>
            </div>
          </div>
        )}

        {active === 'create' && (
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold mb-3">Create a New Bin</h2>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-sm text-gray-700">Bin Type</label>
                <select className="mt-1 border rounded-md px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
                  <option>Plastic</option>
                  <option>Organic</option>
                  <option>Paper</option>
                  <option>Glass</option>
                  <option>Metal</option>
                </select>
              </div>
              <button disabled={creating} onClick={createBin} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-60">
                {creating ? 'Creating…' : 'Create Bin'}
              </button>
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </div>
        )}

        {active === 'bins' && (
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold mb-3">My Bins</h2>
            {loading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : bins.length === 0 ? (
              <div className="text-sm text-gray-600">No bins yet. Create one above.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bins.map((b) => (
                  <div key={b.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Type</div>
                        <div className="font-semibold">{b.type}</div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${b.isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {b.isFull ? 'FULL' : 'OK'}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{b.filthLevel}/{b.maxLevel}</span>
                        <span>{b.percent}%</span>
                      </div>
                      <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-2 ${b.isFull ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${b.percent}%` }} />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => addFilth(b.id, 10)} className="text-xs border px-2 py-1 rounded-md hover:bg-gray-50">+10</button>
                      <button onClick={() => addFilth(b.id, 25)} className="text-xs border px-2 py-1 rounded-md hover:bg-gray-50">+25</button>
                      <button onClick={() => addFilth(b.id, 50)} className="text-xs border px-2 py-1 rounded-md hover:bg-gray-50">+50</button>
                      <div className="ml-auto">
                        <button onClick={() => requestCollection(b.id)} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700">Request Collection</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {active === 'requests' && (
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">My Collection Requests</h2>
              <button onClick={loadMyRequests} className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50">Refresh</button>
            </div>
            {reqLoading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : reqError ? (
              <div className="text-sm text-red-600">{reqError}</div>
            ) : myRequests.length === 0 ? (
              <div className="text-sm text-gray-600">No collection requests yet.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRequests.map((r) => (
                  <div key={r._id || r.id} className="border rounded-lg p-4">
                    <div className="text-sm text-gray-500">Bin Type</div>
                    <div className="font-semibold">{r.binType || r.bin?.type || '—'}</div>
                    <div className="mt-2 text-sm text-gray-500">Address</div>
                    <div className="text-sm">{r.address?.street || '—'}, {r.address?.city || ''}</div>
                    <div className="mt-3">
                      <span className={`text-xs rounded-full px-2 py-1 ${r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Created: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
