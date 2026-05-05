"use client";

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import type { LiveLocationMarker, UserBusStopKey } from '@/types/live-location';

type LiveBusMapProps = {
  markers: LiveLocationMarker[];
  currentUserId: string | null;
  center: [number, number];
  userStops?: Array<{ key: UserBusStopKey; lat: number; lng: number; radiusM?: number; label?: string }>;
  activeStopKey?: UserBusStopKey;
  zoom?: number;
  onMapReady?: (map: L.Map) => void;
  onMapTap?: (lat: number, lng: number) => void;
};

const MAP_MODE_KEY = 'nest-live-bus-map-mode';

const busMarkerIcon = L.icon({
  iconUrl: '/icons/bus-3d.svg',
  iconSize: [58, 34],
  iconAnchor: [29, 28],
  popupAnchor: [0, -26],
});

const getUserLabel = (userId: string, currentUserId: string | null) => {
  if (userId === currentUserId) return 'You';
  return `User ${userId.slice(0, 8)}`;
};

export default function LiveBusMap({
  markers,
  currentUserId,
  center,
  userStops = [],
  activeStopKey,
  zoom = 14,
  onMapReady,
  onMapTap,
}: LiveBusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const activeBaseLayerRef = useRef<L.TileLayer | null>(null);
  const fittedOnceRef = useRef(false);

  const sortedMarkers = useMemo(
    () => [...markers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [markers]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    });

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and GIS User Community',
      }
    );

    const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
        '<a href="https://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
    });

    const baseLayers: Record<string, L.TileLayer> = {
      Street: streetLayer,
      Satellite: satelliteLayer,
      Terrain: terrainLayer,
    };

    let initialMode: keyof typeof baseLayers = 'Street';
    if (typeof window !== 'undefined') {
      const storedMode = window.localStorage.getItem(MAP_MODE_KEY);
      if (storedMode === 'Satellite' || storedMode === 'Terrain' || storedMode === 'Street') {
        initialMode = storedMode;
      }
    }

    const initialLayer = baseLayers[initialMode];
    initialLayer.addTo(map);
    activeBaseLayerRef.current = initialLayer;

    L.control.layers(baseLayers, undefined, { position: 'topright', collapsed: true }).addTo(map);

    map.on('baselayerchange', (event: L.LayersControlEvent) => {
      activeBaseLayerRef.current = event.layer as L.TileLayer;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MAP_MODE_KEY, event.name);
      }
    });

    const layers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layers;
    onMapReady?.(map);

    if (onMapTap) {
      map.on('click', (event: L.LeafletMouseEvent) => {
        onMapTap(event.latlng.lat, event.latlng.lng);
      });
    }

    return () => {
      layers.clearLayers();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, [center, zoom, onMapReady, onMapTap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView(center, map.getZoom(), { animate: false });
  }, [center]);

  useEffect(() => {
    const layers = layerGroupRef.current;
    const map = mapRef.current;
    if (!layers) return;

    layers.clearLayers();

    userStops.forEach((stop) => {
      const radiusM = stop.radiusM ?? 120;
      const label = stop.label?.trim() || 'Your stop';
      const isActive = activeStopKey === stop.key;
      const stroke = isActive ? '#2563eb' : '#64748b';
      const fill = isActive ? '#3b82f6' : '#94a3b8';

      L.circle([stop.lat, stop.lng], {
        radius: radiusM,
        color: stroke,
        weight: isActive ? 2 : 1,
        fillOpacity: isActive ? 0.1 : 0.05,
      }).addTo(layers);

      L.circleMarker([stop.lat, stop.lng], {
        radius: isActive ? 6 : 5,
        color: stroke,
        fillColor: fill,
        fillOpacity: 1,
        weight: 2,
      })
        .bindPopup(
          `<div><p style="margin:0;font-weight:600;">${label}</p><p style="margin:4px 0 0;font-size:12px;color:#666;">${stop.key.toUpperCase()} stop</p></div>`
        )
        .addTo(layers);
    });

    sortedMarkers.forEach((marker) => {
      const userLabel = getUserLabel(marker.userId, currentUserId);
      const markerLayer = L.marker([marker.lat, marker.lng], { icon: busMarkerIcon });
      const isCurrentUser = marker.userId === currentUserId;

      const details = [
        `<p style="margin:0;font-weight:600;">${userLabel}${isCurrentUser ? ' • You' : ''}</p>`,
        `<p style="margin:4px 0 0;font-size:12px;color:#666;">Last update: ${new Date(marker.updatedAt).toLocaleTimeString()}</p>`,
      ];

      if (marker.accuracyM != null) {
        details.push(
          `<p style="margin:4px 0 0;font-size:12px;color:#666;">Accuracy: ±${Math.round(marker.accuracyM)}m</p>`
        );
      }

      markerLayer.bindPopup(`<div>${details.join('')}</div>`);
      markerLayer.addTo(layers);

      if (marker.accuracyM != null && marker.accuracyM > 0 && marker.accuracyM < 200) {
        L.circle([marker.lat, marker.lng], {
          radius: marker.accuracyM,
          color: isCurrentUser ? '#f97316' : '#f59e0b',
          weight: isCurrentUser ? 2 : 1,
          fillOpacity: isCurrentUser ? 0.14 : 0.08,
        }).addTo(layers);
      }
    });

    if (!map || sortedMarkers.length === 0) return;
    if (sortedMarkers.length === 1) {
      const m = sortedMarkers[0];
      if (!fittedOnceRef.current) {
        map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
        fittedOnceRef.current = true;
      }
      return;
    }

    if (!fittedOnceRef.current) {
      const bounds = L.latLngBounds(sortedMarkers.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16, animate: true });
      fittedOnceRef.current = true;
    }
  }, [activeStopKey, currentUserId, sortedMarkers, userStops]);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[52vh] min-h-[320px] max-h-[620px] w-full rounded-xl" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
        {onMapTap ? 'Live map • tap to set stop' : 'Live map'}
      </div>
    </div>
  );
}
