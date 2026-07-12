'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in production
const fixLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface MapProps {
  vehicles: any[];
  activeRoute: any | null;
  tolls: any[];
  checkpoints: any[];
  onSelectVehicle: (vehicle: any) => void;
}

export default function Map({ vehicles, activeRoute, tolls, checkpoints, onSelectVehicle }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const routeGeofenceLayerRef = useRef<L.Polyline | null>(null);
  const routeLineLayerRef = useRef<L.Polyline | null>(null);
  const staticMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Status color codes
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Green': return '#16a34a'; // Emerald-600
      case 'Yellow': return '#d97706'; // Amber-600
      case 'Orange': return '#ea580c'; // Orange-600
      case 'Red': return '#dc2626'; // Red-600
      default: return '#64748b'; // Slate-500
    }
  };

  // Create custom rotating vehicle arrow icon
  const createVehicleIcon = (status: string, heading: number, regNo: string) => {
    const color = getStatusColor(status);
    return L.divIcon({
      className: 'vehicle-marker-div',
      html: `
        <div class="relative flex flex-col items-center select-none">
          <!-- Text label (registration number) -->
          <div class="absolute -top-6 bg-white text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-250 shadow-sm whitespace-nowrap">
            ${regNo}
          </div>
          <!-- Rotating arrow -->
          <div style="transform: rotate(${heading}deg); transition: transform 0.5s ease-out;" class="flex items-center justify-center w-8 h-8">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L22 22L12 17L2 22L12 2Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    fixLeafletIcons();

    // Setup map centered on India, bounding movement inside India borders
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      maxBounds: [[5.0, 65.0], [38.0, 98.0]], // Indian geography box bounds
      maxBoundsViscosity: 1.0 // Clamps scroll/drag
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Google Maps Styled Road Tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      minZoom: 4,
      attribution: '&copy; Google Maps'
    }).addTo(map);

    // Layer groups for active routes and static points (plazas, checkpoints)
    staticMarkersLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Render static route elements (corridor, checkpoints, tolls)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous route layers
    if (routeGeofenceLayerRef.current) map.removeLayer(routeGeofenceLayerRef.current);
    if (routeLineLayerRef.current) map.removeLayer(routeLineLayerRef.current);
    staticMarkersLayerRef.current?.clearLayers();

    if (!activeRoute) return;

    // Format coordinates
    const routeCoords = checkpoints
      .sort((a, b) => a.sequence - b.sequence)
      .map(cp => [cp.lat, cp.lng] as [number, number]);

    if (routeCoords.length >= 2) {
      // Draw Geofence corridor buffer
      routeGeofenceLayerRef.current = L.polyline(routeCoords, {
        color: '#0284c7',
        weight: 24,
        opacity: 0.12,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Draw main route corridor line
      routeLineLayerRef.current = L.polyline(routeCoords, {
        color: '#0ea5e9',
        weight: 3.5,
        opacity: 0.8,
        dashArray: '5, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map bounds to show the entire route
      map.fitBounds(routeLineLayerRef.current.getBounds(), { padding: [50, 50] });
    }

    // Render Checkpoints (blue dots)
    checkpoints.forEach(cp => {
      const icon = L.divIcon({
        className: 'checkpoint-marker',
        html: `<div class="w-3 h-3 bg-sky-500 rounded-full border-2 border-white shadow-md"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      L.marker([cp.lat, cp.lng], { icon })
        .bindPopup(`<div class="text-xs font-bold text-slate-800">Checkpoint: ${cp.name}</div>`)
        .addTo(staticMarkersLayerRef.current!);
    });

    // Render Toll Plazas (orange flags / hex icons)
    tolls.forEach(t => {
      const icon = L.divIcon({
        className: 'toll-marker',
        html: `
          <div class="flex items-center justify-center w-6 h-6 bg-white border-2 border-amber-500 rounded shadow-sm text-amber-500 font-bold text-[9px] uppercase">
            🎫
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([t.lat, t.lng], { icon })
        .bindPopup(`
          <div class="p-1 text-slate-900">
            <h4 class="text-xs font-bold">${t.name}</h4>
            <p class="text-[10px] text-slate-500">ID: ${t.fastag_plaza_id} | Seq: ${t.sequence}</p>
          </div>
        `)
        .addTo(staticMarkersLayerRef.current!);
    });

  }, [activeRoute, checkpoints, tolls]);

  // 3. Update Vehicle markers dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set<string>();

    vehicles.forEach(vehicle => {
      if (vehicle.lat === null || vehicle.lng === null) return;
      const vId = String(vehicle.id);
      activeIds.add(vId);

      const latlng: [number, number] = [vehicle.lat, vehicle.lng];
      const statusColorCode = vehicle.active_trip_id ? (vehicle.statusColor || vehicle.status) : 'Available';

      if (markersRef.current[vId]) {
        const marker = markersRef.current[vId];
        marker.setLatLng(latlng);
        marker.setIcon(createVehicleIcon(statusColorCode, vehicle.heading || 0, vehicle.registration_number));
      } else {
        const marker = L.marker(latlng, {
          icon: createVehicleIcon(statusColorCode, vehicle.heading || 0, vehicle.registration_number)
        })
          .addTo(map)
          .on('click', () => {
            onSelectVehicle(vehicle);
          });
        
        markersRef.current[vId] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

  }, [vehicles, onSelectVehicle]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 z-10 text-[10px] text-slate-650 font-medium space-y-1.5 shadow-md">
        <div className="font-bold text-slate-800 text-[11px] border-b border-slate-150 pb-1 mb-1.5">Map Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>Green — Normal Route Tracking</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Yellow — Approved Geofence Stop</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          <span>Orange — Idle Duration Triggered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-650 font-semibold" style={{ backgroundColor: '#dc2626' }}></span>
          <span>Red — Confirmed Deviation / Incident</span>
        </div>
      </div>
    </div>
  );
}
