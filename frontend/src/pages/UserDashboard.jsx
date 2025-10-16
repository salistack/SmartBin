import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getAuth } from '../api/client';

// Minimal user dashboard wiring core flows available in backend:
// - Create Bin: POST /api/bins
// - List My Bins: GET /api/bins (returns { bins: [...] })
// - Update Filth (simulate fill): PATCH /api/bins/:binId/filth { addedFilth }
// - Request Collection: POST /api/collections/request { binId } (bin must be full)
export default function UserDashboard() {
  const { token, user } = getAuth();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [creating, setCreating] = useState(false);
  const [type, setType] = useState('Plastic');
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const address = user?.address || {};
  const lat = typeof address?.lat === 'number' ? address.lat : undefined;
  const lng = typeof address?.lng === 'number' ? address.lng : undefined;

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

  const loadBins = useCallback(async () => {
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
      alert('Collection requested');
    } catch (err) {
      alert(err.message || 'Failed to request collection');
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5">
        <h1 className="text-xl font-bold text-emerald-800">Welcome, {user?.name || user?.email}</h1>
        <p className="text-sm text-gray-600">Manage your bins and request collections</p>
      </div>

      {/* Address card */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold mb-3">My Address</h2>
        {address && (address.street || address.city || address.postalCode || (lat && lng)) ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500">Street</div>
              <div className="font-medium">{address.street || '—'}</div>
              <div className="mt-2 text-sm text-gray-500">City</div>
              <div className="font-medium">{address.city || '—'}</div>
              <div className="mt-2 text-sm text-gray-500">Postal Code</div>
              <div className="font-medium">{address.postalCode || '—'}</div>
              {(lat !== undefined || lng !== undefined) && (
                <div className="mt-2 text-sm text-gray-500">Coordinates</div>
              )}
              {(lat !== undefined || lng !== undefined) && (
                <div className="font-medium">{lat ?? '—'}, {lng ?? '—'}</div>
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
                <div className="text-sm text-gray-600">No coordinates available. Add latitude/longitude at registration to preview a map.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No address on file. Register as a resident with an address to see it here.</div>
        )}
      </div>

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
    </div>
  );
}
