import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, clearAuth, getAuth } from '../api/client';
import RequestsMap from '../components/RequestsMap';
import OptimizedRouteMap from '../components/OptimizedRouteMap';

// Dedicated screen for route optimization while preserving the original layout and behaviour.
export default function CollectorOptimize() {
  const { token } = getAuth();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const navigate = useNavigate();

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState({ lat: 6.9271, lng: 79.8612 });
  const [focusId, setFocusId] = useState(null);
  const [showAllOptimized, setShowAllOptimized] = useState(false);
  const [loopBack, setLoopBack] = useState(false);
  const [allSummary, setAllSummary] = useState(null);
  const [orderedStops, setOrderedStops] = useState([]);

  const mapPoints = useMemo(() => {
    return pending.map((r) => {
      let lat = r?.bin?.owner?.address?.lat ?? r?.address?.lat;
      let lng = r?.bin?.owner?.address?.lng ?? r?.address?.lng;
      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lng === 'string') lng = parseFloat(lng);
      return {
        id: r._id || r.id,
        lat,
        lng,
        title: `${r.binType || 'Request'} ${r.address?.city ? `• ${r.address.city}` : ''}`
      };
    }).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  }, [pending]);

  const loadPending = useCallback(async() => {
    setError('');
    setLoading(true);
    try {
      const data = await api.get('/api/collections/pending', authHeader);
      const requests = data?.requests || [];
      setPending(requests);
      const firstId = requests.length > 0 ? (requests[0]._id || requests[0].id || null) : null;
      setFocusId((prev) => (prev ? prev : firstId));
    } catch (err) {
      setError(err.message || 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { loadPending(); }, [loadPending]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setOrigin({ lat: latitude, lng: longitude });
      },
      () => { /* ignore denied */ },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleLogout = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/dashboard/collector', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[80vh]">
      <aside className="w-56 border-r bg-gray-50 p-4 hidden lg:block">
        <div className="text-emerald-700 font-bold mb-3">Route Tools</div>
        <nav className="space-y-1">
          <button
            onClick={handleBack}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 text-red-600 border border-red-100"
          >
            Log Out
          </button>
        </nav>
      </aside>

      <div className="flex-1 space-y-6 p-5">
        <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-emerald-800">Route Optimizer</h1>
            <p className="text-sm text-gray-600">Visualize pending pickups, optimise multi-stop routes, and preview turn-by-turn legs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center border border-gray-300 px-4 py-2 text-sm rounded-md hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center border border-red-500 text-red-600 px-4 py-2 text-sm font-medium rounded-md hover:bg-red-50"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
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
                    setFocusId('collector');
                  },
                  () => alert('Unable to retrieve your location')
                );
              }}
              className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50"
            >
              Use My Location
            </button>
            <button onClick={loadPending} className="text-sm border px-3 py-1 rounded-md hover:bg-gray-50">Refresh</button>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showAllOptimized} onChange={(e) => setShowAllOptimized(e.target.checked)} />
              Show shortest route through all
            </label>
            {showAllOptimized && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={loopBack} onChange={(e) => setLoopBack(e.target.checked)} />
                Return to origin
              </label>
            )}
            {showAllOptimized && allSummary && (
              <div className="text-xs text-gray-700">
                Distance: {Math.round(allSummary.distanceMeters / 100) / 10} km
                <span className="ml-3">ETA: {Math.round(allSummary.timeSeconds / 60)} min</span>
                <span className="ml-3">Stops: {allSummary.stops}</span>
              </div>
            )}
            {showAllOptimized && orderedStops.length > 0 && (
              <a
                className="ml-auto text-xs text-emerald-700 underline"
                href={buildGoogleMapsUrl(origin, orderedStops, loopBack)}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            )}
          </div>

          <div className="min-h-[360px]">
            {showAllOptimized ? (
              <OptimizedRouteMap
                origin={origin}
                requests={mapPoints}
                onSummary={(summary) => setAllSummary(summary)}
                returnToOrigin={loopBack}
                onOrder={(stops) => setOrderedStops(stops)}
              />
            ) : (
              <RequestsMap origin={origin} points={mapPoints} focusId={focusId} />
            )}
          </div>

          {loading && (
            <div className="text-sm text-gray-600">Loading pending requests…</div>
          )}
          {!loading && error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          {/*
          {loading ? (
            <div className="text-sm text-gray-600">Loading pending requests…</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : pending.length === 0 ? (
            <div className="text-sm text-gray-600">No pending requests available.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Bin Type</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((request) => {
                    const id = request._id || request.id;
                    const addressLine = [request.address?.street, request.address?.city].filter(Boolean).join(', ') || '—';
                    return (
                      <Fragment key={id}>
                        <tr className="align-top">
                          <td className="px-4 py-3 font-medium text-gray-800">{request.binType || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{addressLine}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs rounded-full bg-yellow-100 text-yellow-700 px-2 py-1">{request.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setFocusId(id)}
                                className="text-xs border px-3 py-1 rounded-md hover:bg-gray-50"
                              >
                                Center on Map
                              </button>
                              <button
                                onClick={() => setShowRouteFor((prev) => (prev === id ? null : id))}
                                className="text-xs border px-3 py-1 rounded-md hover:bg-gray-50"
                              >
                                {showRouteFor === id ? 'Hide Route' : 'Show Route'}
                              </button>
                              <button
                                onClick={() => markCollected(id)}
                                className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700"
                              >
                                Mark Collected
                              </button>
                            </div>
                          </td>
                        </tr>
                        {showRouteFor === id && (
                          <tr className="bg-gray-50">
                            <td colSpan={4} className="px-4 py-3">
                              {renderRouteDetails(request, id)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          */}
        </div>
      </div>
    </div>
  );
}

function buildGoogleMapsUrl(origin, stops, loopBack) {
  const enc = encodeURIComponent;
  const hasOrigin = origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng);
  const o = hasOrigin ? `${origin.lat},${origin.lng}` : 'Current Location';
  const destination = loopBack && stops.length > 0 ? o : `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops.slice(0, loopBack ? stops.length : Math.max(0, stops.length - 1))
    .map((s) => `${s.lat},${s.lng}`).join('|');
  const base = 'https://www.google.com/maps/dir/?api=1';
  const params = [`origin=${enc(o)}`, `destination=${enc(destination)}`];
  if (waypoints) params.push(`waypoints=${enc(waypoints)}`);
  return `${base}&${params.join('&')}`;
}
