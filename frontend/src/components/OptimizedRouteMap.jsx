import { useEffect, useMemo, useRef } from 'react';

// Compute a heuristic visiting order using Nearest Neighbor from origin
function computeOrder(origin, points) {
  if (!origin || !Array.isArray(points) || points.length === 0) return [];
  const remaining = points.map((p) => ({ ...p }));
  const order = [];
  let current = { lat: origin.lat, lng: origin.lng };
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      const d = haversine(current.lat, current.lng, p.lat, p.lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    order.push(next);
    current = next;
  }
  return order;
}

// Haversine distance in meters
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function OptimizedRouteMap({ origin, requests, height = 320, onSummary, returnToOrigin = false, onOrder }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const controlRef = useRef(null);
  const onSummaryRef = useRef(onSummary);
  const onOrderRef = useRef(onOrder);

  useEffect(() => {
    onSummaryRef.current = onSummary;
  }, [onSummary]);

  useEffect(() => {
    onOrderRef.current = onOrder;
  }, [onOrder]);

  const waypoints = useMemo(() => {
    const valid = (requests || [])
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const order = computeOrder(origin, valid);
    return order.map((p) => ({ lat: p.lat, lng: p.lng, title: p.title, id: p.id }));
  }, [origin, requests]);

  // Emit order to parent when it changes
  useEffect(() => {
    if (typeof onOrderRef.current === 'function') {
      onOrderRef.current(waypoints);
    }
  }, [waypoints]);

  useEffect(() => {
    let map;

    async function init() {
      if (!containerRef.current) return;
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      await import('leaflet-routing-machine');
      await import('leaflet-routing-machine/dist/leaflet-routing-machine.css');

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString()
      });

      const start = [origin.lat, origin.lng];
      map = L.map(containerRef.current).setView(start, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Build waypoints list: origin + ordered requests
      const lrmWaypoints = [L.latLng(origin.lat, origin.lng), ...waypoints.map((w) => L.latLng(w.lat, w.lng)), ...(returnToOrigin ? [L.latLng(origin.lat, origin.lng)] : [])];

      const control = L.Routing.control({
        waypoints: lrmWaypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        fitSelectedRoutes: true
      }).addTo(map);

      control.on('routesfound', (e) => {
        const route = e.routes?.[0];
        const summary = route?.summary;
        if (summary && typeof onSummaryRef.current === 'function') {
          onSummaryRef.current({
            distanceMeters: summary.totalDistance,
            timeSeconds: summary.totalTime,
            stops: waypoints.length
          });
        }
      });

      mapRef.current = map;
      controlRef.current = control;
    }

    init();

    return () => {
      try {
        if (controlRef.current) controlRef.current.remove();
        if (mapRef.current) mapRef.current.remove();
      } catch {
        // ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update route when origin/waypoints change
  useEffect(() => {
    async function update() {
      if (!mapRef.current) return;
      const L = await import('leaflet');
      // remove old control
      if (controlRef.current) {
        try { controlRef.current.remove(); } catch { /* ignore */ }
      }
      const lrmWaypoints = [L.latLng(origin.lat, origin.lng), ...waypoints.map((w) => L.latLng(w.lat, w.lng)), ...(returnToOrigin ? [L.latLng(origin.lat, origin.lng)] : [])];
      const control = L.Routing.control({
        waypoints: lrmWaypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        fitSelectedRoutes: true
      }).addTo(mapRef.current);
      control.on('routesfound', (e) => {
        const route = e.routes?.[0];
        const summary = route?.summary;
        if (summary && typeof onSummaryRef.current === 'function') {
          onSummaryRef.current({
            distanceMeters: summary.totalDistance,
            timeSeconds: summary.totalTime,
            stops: waypoints.length
          });
        }
      });
      controlRef.current = control;
    }
    update();
  }, [origin.lat, origin.lng, waypoints, returnToOrigin]);

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', height }} className="rounded-md overflow-hidden border" />
      <div className="mt-2 text-xs text-gray-600">Showing near-shortest path through all pending requests.</div>
    </div>
  );
}
