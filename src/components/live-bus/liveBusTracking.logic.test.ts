import {
  isFresh,
  mergeRealtimePayload,
  pruneStaleMarkers,
  shouldEmitLocation,
  toMarker,
} from './liveBusTracking.logic';
import type { LiveLocationRow } from '@/types/live-location';

const makeRow = (overrides: Partial<LiveLocationRow> = {}): LiveLocationRow => ({
  user_id: 'user-1',
  lat: 6.5244,
  lng: 3.3792,
  accuracy_m: 8,
  is_sharing: true,
  updated_at: new Date('2026-04-07T12:00:00.000Z').toISOString(),
  ...overrides,
});

describe('live bus tracking logic', () => {
  describe('isFresh / pruneStaleMarkers', () => {
    it('marks a recent marker as fresh', () => {
      const now = new Date('2026-04-07T12:00:30.000Z').getTime();
      expect(isFresh('2026-04-07T12:00:00.000Z', now, 60_000)).toBe(true);
    });

    it('marks an old marker as stale and prunes it', () => {
      const now = new Date('2026-04-07T12:01:10.000Z').getTime();
      const markers = {
        old: toMarker(makeRow({ user_id: 'old', updated_at: '2026-04-07T12:00:00.000Z' })),
        fresh: toMarker(makeRow({ user_id: 'fresh', updated_at: '2026-04-07T12:00:45.000Z' })),
      };

      const next = pruneStaleMarkers(markers, now, 60_000);
      expect(Object.keys(next)).toEqual(['fresh']);
    });
  });

  describe('shouldEmitLocation', () => {
    it('does not emit when interval and movement are both below thresholds', () => {
      const shouldEmit = shouldEmitLocation({
        nowMs: 10_000,
        lastSentAtMs: 9_000,
        lastCoords: { lat: 6.5244, lng: 3.3792 },
        nextCoords: { lat: 6.52441, lng: 3.37921 },
        minIntervalMs: 2_500,
        minMoveMeters: 10,
      });

      expect(shouldEmit).toBe(false);
    });

    it('emits when enough time has elapsed', () => {
      const shouldEmit = shouldEmitLocation({
        nowMs: 12_000,
        lastSentAtMs: 9_000,
        lastCoords: { lat: 6.5244, lng: 3.3792 },
        nextCoords: { lat: 6.52441, lng: 3.37921 },
        minIntervalMs: 2_500,
        minMoveMeters: 10,
      });

      expect(shouldEmit).toBe(true);
    });

    it('emits when movement threshold is reached even if interval is short', () => {
      const shouldEmit = shouldEmitLocation({
        nowMs: 10_000,
        lastSentAtMs: 9_500,
        lastCoords: { lat: 6.5244, lng: 3.3792 },
        nextCoords: { lat: 6.5260, lng: 3.3810 },
        minIntervalMs: 2_500,
        minMoveMeters: 10,
      });

      expect(shouldEmit).toBe(true);
    });
  });

  describe('mergeRealtimePayload', () => {
    const now = new Date('2026-04-07T12:00:30.000Z').getTime();

    it('adds a marker on INSERT when sharing and fresh', () => {
      const row = makeRow({ user_id: 'u1', updated_at: '2026-04-07T12:00:20.000Z' });

      const next = mergeRealtimePayload(
        {},
        { eventType: 'INSERT', old: null, new: row },
        now,
        60_000
      );

      expect(next.u1).toBeDefined();
      expect(next.u1.lat).toBe(row.lat);
    });

    it('removes marker on DELETE', () => {
      const prev = {
        u1: toMarker(makeRow({ user_id: 'u1' })),
      };

      const next = mergeRealtimePayload(
        prev,
        { eventType: 'DELETE', old: makeRow({ user_id: 'u1' }), new: null },
        now,
        60_000
      );

      expect(next.u1).toBeUndefined();
    });

    it('removes marker on UPDATE when sharing is false', () => {
      const prev = {
        u1: toMarker(makeRow({ user_id: 'u1' })),
      };
      const row = makeRow({ user_id: 'u1', is_sharing: false });

      const next = mergeRealtimePayload(
        prev,
        { eventType: 'UPDATE', old: makeRow({ user_id: 'u1' }), new: row },
        now,
        60_000
      );

      expect(next.u1).toBeUndefined();
    });

    it('removes marker on stale UPDATE', () => {
      const prev = {
        u1: toMarker(makeRow({ user_id: 'u1' })),
      };
      const stale = makeRow({ user_id: 'u1', updated_at: '2026-04-07T11:58:00.000Z' });

      const next = mergeRealtimePayload(
        prev,
        { eventType: 'UPDATE', old: makeRow({ user_id: 'u1' }), new: stale },
        now,
        60_000
      );

      expect(next.u1).toBeUndefined();
    });
  });
});

