import { useEffect, useMemo, useRef } from 'react';

export default function RequestsMap({ origin, points, height = 360, focusId }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markerByIdRef = useRef({});

  const data = useMemo(() => {
    const list = [];
    if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
      list.push({ id: 'collector', lat: origin.lat, lng: origin.lng, kind: 'collector' });
    }
    for (const p of points || []) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
        list.push({ id: p.id, lat: p.lat, lng: p.lng, kind: 'request', title: p.title });
      }
    }
    return list;
  }, [origin, points]);

  useEffect(() => {
    let L;
    let map;
    async function init() {
      L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Fix marker assets with bundlers
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
      });

      if (!containerRef.current) return;
      map = L.map(containerRef.current).setView([origin?.lat || 0, origin?.lng || 0], origin ? 13 : 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layer;
      // draw first time
      drawMarkers(L, layer, data, markerByIdRef);
      fitBounds(L, map, data);
    }

    init();

    return () => {
      try {
        mapRef.current && mapRef.current.remove();
      } catch {
        // ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function update() {
      const L = await import('leaflet');
      if (layerRef.current && mapRef.current) {
        layerRef.current.clearLayers();
        markerByIdRef.current = {};
        drawMarkers(L, layerRef.current, data, markerByIdRef);
        fitBounds(L, mapRef.current, data);
      }
    }
    update();
  }, [data]);

  useEffect(() => {
    // Center on a specific marker when focusId changes
    if (!focusId || !mapRef.current) return;
    const marker = markerByIdRef.current[focusId];
    if (marker) {
      mapRef.current.panTo(marker.getLatLng());
      marker.openPopup();
    }
  }, [focusId]);

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', height }} className="overflow-hidden rounded-md border" />
      <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
        <span>
          <span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ backgroundColor: '#22c55e' }} />
          Collector
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ backgroundColor: '#ef4444' }} />
          Request
        </span>
      </div>
    </div>
  );
}

function drawMarkers(L, layer, list, markerByIdRef) {
  for (const p of list) {
    if (p.kind === 'collector') {
      const m = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.9 }).addTo(layer)
        .bindPopup('Collector');
      markerByIdRef.current['collector'] = m;
    } else {
      const m = L.circleMarker([p.lat, p.lng], { radius: 7, color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.9 }).addTo(layer)
        .bindPopup(p.title || 'Request');
      if (p.id) markerByIdRef.current[p.id] = m;
    }
  }
}

function fitBounds(L, map, list) {
  if (!list.length) return;
  const bounds = L.latLngBounds(list.map(p => [p.lat, p.lng]));
  try {
    map.fitBounds(bounds, { padding: [20, 20] });
  } catch {
    // ignore fit errors
  }
}
