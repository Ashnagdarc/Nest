import type { LiveLocationMarker, LiveLocationRow } from '@/types/live-location';

export const STALE_MS_DEFAULT = 60_000;

export type LatLng = { lat: number; lng: number };

export const toMarker = (row: LiveLocationRow): LiveLocationMarker => ({
  userId: row.user_id,
  lat: row.lat,
  lng: row.lng,
  accuracyM: row.accuracy_m,
  updatedAt: row.updated_at,
});

export const isFresh = (updatedAt: string, nowMs = Date.now(), staleMs = STALE_MS_DEFAULT) =>
  nowMs - new Date(updatedAt).getTime() <= staleMs;

export const pruneStaleMarkers = (
  markers: Record<string, LiveLocationMarker>,
  nowMs = Date.now(),
  staleMs = STALE_MS_DEFAULT
) => {
  const nextEntries = Object.entries(markers).filter(([, marker]) => isFresh(marker.updatedAt, nowMs, staleMs));
  return Object.fromEntries(nextEntries);
};

export const metersBetween = (a: LatLng, b: LatLng) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

export const shouldEmitLocation = (params: {
  nowMs: number;
  lastSentAtMs: number;
  lastCoords: LatLng | null;
  nextCoords: LatLng;
  minIntervalMs: number;
  minMoveMeters: number;
}) => {
  const elapsed = params.nowMs - params.lastSentAtMs;
  const moved = params.lastCoords ? metersBetween(params.lastCoords, params.nextCoords) : Number.POSITIVE_INFINITY;
  return elapsed >= params.minIntervalMs || moved >= params.minMoveMeters;
};

type RealtimePayload =
  | { eventType: 'DELETE'; old: LiveLocationRow | null; new: null }
  | { eventType: 'INSERT' | 'UPDATE'; old: LiveLocationRow | null; new: LiveLocationRow | null };

export const mergeRealtimePayload = (
  markers: Record<string, LiveLocationMarker>,
  payload: RealtimePayload,
  nowMs = Date.now(),
  staleMs = STALE_MS_DEFAULT
) => {
  const next = { ...markers };

  if (payload.eventType === 'DELETE') {
    const userId = payload.old?.user_id;
    if (userId) delete next[userId];
    return next;
  }

  const row = payload.new;
  if (!row?.user_id) return next;
  if (!row.is_sharing || !isFresh(row.updated_at, nowMs, staleMs)) {
    delete next[row.user_id];
    return next;
  }

  next[row.user_id] = toMarker(row);
  return next;
};

