import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getAuth } from '../api/client';
import RouteMap from '../components/RouteMap';

// Collector dashboard wires to backend collector flows:
// - List Pending Requests: GET /api/collections/pending
// - Update Request Status: PATCH /api/collections/:requestId/status { status: 'COLLECTED' }
export default function CollectorDashboard() {
  const { token } = getAuth();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRouteFor, setShowRouteFor] = useState(null); // request id
  // For simplicity, default origin is Colombo; user can override with GPS
  const [origin, setOrigin] = useState({ lat: 6.9271, lng: 79.8612 });
  const [summaryById, setSummaryById] = useState({});

  function getDestinationFromRequest(r) {
    let lat = r?.bin?.owner?.address?.lat ?? r?.address?.lat;
    let lng = r?.bin?.owner?.address?.lng ?? r?.address?.lng;
    if (typeof lat === 'string') lat = parseFloat(lat);
    if (typeof lng === 'string') lng = parseFloat(lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  }

  const loadPending = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/api/collections/pending', authHeader);
      setPending(data?.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { loadPending(); }, [loadPending]);

  async function markCollected(id) {
    try {
      await api.patch(`/api/collections/${id}/status`, { status: 'COLLECTED' }, authHeader);
      await loadPending();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5">
        <h1 className="text-xl font-bold text-emerald-800">Collector Panel</h1>
        <p className="text-sm text-gray-600">Pending collection requests</p>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Pending Requests</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!navigator.geolocation) {
                  alert('Geolocation is not supported by your browser');
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setOrigin({ lat: latitude, lng: longitude });
                  },
                  () => alert('Unable to retrieve your location')
                );
              }}
              className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50"
            >
              Use My Location
            </button>
            <button onClick={loadPending} className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50">Refresh</button>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : pending.length === 0 ? (
          <div className="text-sm text-gray-600">No pending requests</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((r) => (
              <div key={r._id || r.id} className="border rounded-lg p-4">
                <div className="text-sm text-gray-500">Bin Type</div>
                <div className="font-semibold">{r.binType}</div>
                <div className="mt-2 text-sm text-gray-500">Address</div>
                <div className="text-sm">{r.address?.street || '—'}, {r.address?.city || ''}</div>
                <div className="mt-3 flex gap-2 items-center">
                  <span className="text-xs rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5">{r.status}</span>
                  <button
                    onClick={() => setShowRouteFor(showRouteFor === (r._id || r.id) ? null : (r._id || r.id))}
                    className="ml-auto text-xs border px-3 py-1 rounded-md hover:bg-gray-50"
                  >
                    {showRouteFor === (r._id || r.id) ? 'Hide Route' : 'Show Route'}
                  </button>
                  <button onClick={() => markCollected(r._id || r.id)} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700">Mark Collected</button>
                </div>
                {showRouteFor === (r._id || r.id) && (
                  (() => {
                    const dest = getDestinationFromRequest(r);
                    if (dest) {
                      return (
                        <div className="mt-3">
                          <RouteMap
                            origin={origin}
                            destination={dest}
                            onSummary={({ distanceMeters, timeSeconds }) => {
                              setSummaryById((prev) => ({
                                ...prev,
                                [r._id || r.id]: { distanceMeters, timeSeconds },
                              }));
                            }}
                          />
                          {summaryById[r._id || r.id] && (
                            <div className="mt-2 text-xs text-gray-700">
                              <span>
                                Distance: {Math.round(summaryById[r._id || r.id].distanceMeters / 100) / 10} km
                              </span>
                              <span className="ml-3">
                                ETA: {Math.round(summaryById[r._id || r.id].timeSeconds / 60)} min
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="mt-3 text-xs text-gray-600">
                        No coordinates available for this request. The resident did not provide latitude/longitude.
                      </div>
                    );
                  })()
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
