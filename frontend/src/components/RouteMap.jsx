import { useEffect, useRef } from 'react';

// Lazy-load leaflet and routing libs to avoid SSR issues
export default function RouteMap({ origin, destination, height = 280, onSummary }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let map;

    async function init() {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
  await import('leaflet-routing-machine');
      await import('leaflet-routing-machine/dist/leaflet-routing-machine.css');

      // Fix default icon paths for Leaflet with bundlers
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
      });

      // Initialize map
      if (!containerRef.current) return;
      map = L.map(containerRef.current).setView([destination.lat, destination.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add routing
      const control = L.Routing.control({
        waypoints: [
          L.latLng(origin.lat, origin.lng),
          L.latLng(destination.lat, destination.lng),
        ],
        routeWhileDragging: false,
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
      }).addTo(map);
      if (onSummary) {
        control.on('routesfound', function(e) {
          const route = e.routes?.[0];
          const summary = route?.summary;
          if (summary) {
            onSummary({
              distanceMeters: summary.totalDistance,
              timeSeconds: summary.totalTime,
            });
          }
        });
      }
      mapRef.current = map;
    }

    init();

    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, [origin, destination, onSummary]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height }}
      className="rounded-md overflow-hidden border"
    />
  );
}
