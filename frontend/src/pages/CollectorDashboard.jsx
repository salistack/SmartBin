import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearAuth, getAuth } from '../api/client';
import RouteMap from '../components/RouteMap';

// Collector dashboard wires to backend collector flows:
// - List Pending Requests: GET /api/collections/pending
// - Update Request Status: PATCH /api/collections/:requestId/status { status: 'COLLECTED' }
export default function CollectorDashboard() {
  const { token } = getAuth();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const navigate = useNavigate();

  const [pending, setPending] = useState([]);
  const [collected, setCollected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [expandedRouteId, setExpandedRouteId] = useState(null);
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

  function renderRouteDetails(request, id) {
    const destination = getDestinationFromRequest(request);
    if (!destination) {
      return (
        <div className="text-xs text-gray-600">
          No coordinates available for this request. The resident did not provide latitude/longitude.
        </div>
      );
    }
    const onSummary = ({ distanceMeters, timeSeconds }) => {
      setSummaryById((prev) => ({
        ...prev,
        [id]: { distanceMeters, timeSeconds },
      }));
    };
    return (
      <div>
        <RouteMap origin={origin} destination={destination} onSummary={onSummary} />
        {summaryById[id] && (
          <div className="mt-2 text-xs text-gray-700">
            <span>
              Distance: {Math.round(summaryById[id].distanceMeters / 100) / 10} km
            </span>
            <span className="ml-3">
              ETA: {Math.round(summaryById[id].timeSeconds / 60)} min
            </span>
          </div>
        )}
      </div>
    );
  }

  const loadPending = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api.get('/api/collections/pending', authHeader);
      setPending(data?.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const loadCollected = useCallback(async () => {
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const data = await api.get('/api/collections/collected', authHeader);
      setCollected(data?.requests || []);
    } catch (err) {
      setHistoryError(err.message || 'Failed to load collected requests');
    } finally {
      setHistoryLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Auto-detect collector's current location on mount
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

  async function markCollected(id) {
    try {
      await api.patch(`/api/collections/${id}/status`, { status: 'COLLECTED' }, authHeader);
      setExpandedRouteId(null);
      setSummaryById((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadPending();
      if (active === 'collected') {
        await loadCollected();
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  }

  const [active, setActive] = useState('pending'); // 'pending' | 'collected'

  const handleLogout = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[80vh]">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <div className="text-emerald-700 font-bold mb-3">Collector</div>
        <nav className="space-y-1">
          <button
            onClick={() => {
              if (active !== 'pending') setActive('pending');
              setExpandedRouteId(null);
              setSummaryById({});
              loadPending();
            }}
            className={`w-full text-left px-3 py-2 rounded-md ${active==='pending' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}
          >
            Pending Requests
          </button>
          <button
            onClick={() => navigate('/dashboard/collector/optimize')}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
          >
            Open Route Optimizer
          </button>
          <button
            onClick={() => {
              if (active !== 'collected') setActive('collected');
              setExpandedRouteId(null);
              setSummaryById({});
              loadCollected();
            }}
            className={`w-full text-left px-3 py-2 rounded-md ${active==='collected' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'}`}
          >
            Collected History
          </button>
        </nav>
      </aside>

      <div className="flex-1 space-y-6 p-5">
        <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-emerald-800">Collector Panel</h1>
            <p className="text-sm text-gray-600">Track pending pickups and review completed collections</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 sm:mt-0 inline-flex items-center justify-center border border-red-500 text-red-600 px-4 py-2 text-sm font-medium rounded-md hover:bg-red-50"
          >
            Log Out
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-5 space-y-5">
          {active === 'pending' && (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-semibold">Pending Requests</h2>
                  <p className="text-xs text-gray-500">Plan your route and mark bins once collected.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                  <button
                    onClick={() => navigate('/dashboard/collector/optimize')}
                    className="text-sm border border-emerald-500 text-emerald-600 px-3 py-1 rounded-md hover:bg-emerald-50"
                  >
                    Open Route Optimizer
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : pending.length === 0 ? (
                <div className="text-sm text-gray-600">No pending requests</div>
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
                      {pending.map((r) => {
                        const id = r._id || r.id;
                        const addressLine = [r.address?.street, r.address?.city].filter(Boolean).join(', ') || '—';
                        return (
                          <Fragment key={id}>
                            <tr className="align-top">
                              <td className="px-4 py-3 font-medium text-gray-800">{r.binType || '—'}</td>
                              <td className="px-4 py-3 text-gray-700">{addressLine}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs rounded-full bg-yellow-100 text-yellow-700 px-2 py-1">{r.status}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setExpandedRouteId(expandedRouteId === id ? null : id)}
                                    className="text-xs border px-3 py-1 rounded-md hover:bg-gray-50"
                                  >
                                    {expandedRouteId === id ? 'Hide Route' : 'Show Route'}
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
                            {expandedRouteId === id && (
                              <tr className="bg-gray-50">
                                <td colSpan={4} className="px-4 py-3">
                                  {renderRouteDetails(r, id)}
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
            </>
          )}

          {active === 'collected' && (
            <>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-semibold">Collected History</h2>
                  <p className="text-xs text-gray-500">Recently completed pickups.</p>
                </div>
                <button onClick={loadCollected} className="self-start text-sm border px-3 py-1 rounded-md hover:bg-gray-50">Refresh</button>
              </div>

              {historyLoading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : historyError ? (
                <div className="text-sm text-red-600">{historyError}</div>
              ) : collected.length === 0 ? (
                <div className="text-sm text-gray-600">No collected requests yet.</div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Bin Type</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">Collected On</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collected.map((r) => {
                        const id = r._id || r.id;
                        const addressLine = [r.address?.street, r.address?.city].filter(Boolean).join(', ') || '—';
                        return (
                          <Fragment key={id}>
                            <tr className="align-top">
                              <td className="px-4 py-3 font-medium text-gray-800">{r.binType || '—'}</td>
                              <td className="px-4 py-3 text-gray-700">{addressLine}</td>
                              <td className="px-4 py-3 text-gray-600">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => setExpandedRouteId(expandedRouteId === id ? null : id)}
                                    className="text-xs border px-3 py-1 rounded-md hover:bg-gray-50"
                                  >
                                    {expandedRouteId === id ? 'Hide Route' : 'Show Route'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedRouteId === id && (
                              <tr className="bg-gray-50">
                                <td colSpan={4} className="px-4 py-3">
                                  {renderRouteDetails(r, id)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
