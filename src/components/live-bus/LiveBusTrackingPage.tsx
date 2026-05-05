"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import { AlertCircle, Bell, Briefcase, BusFront, Compass, Home, Loader2, LocateFixed, LocateOff, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LiveLocationMarker, LiveLocationRow, UserBusStopKey, UserBusStopRow } from '@/types/live-location';
import {
  isFresh,
  mergeRealtimePayload,
  pruneStaleMarkers,
  shouldEmitLocation,
  toMarker,
} from '@/components/live-bus/liveBusTracking.logic';

const LiveBusMap = dynamic(() => import('@/components/live-bus/LiveBusMap'), {
  ssr: false,
  loading: () => <div className="h-[480px] w-full rounded-xl bg-muted animate-pulse" />,
});

const STALE_MS = 60_000;
const EMIT_INTERVAL_MS = 2_500;
const MIN_MOVE_METERS = 10;
const DEFAULT_CENTER: [number, number] = [6.5244, 3.3792]; // Lagos
const SHARING_INTENT_KEY = 'nest-live-bus-sharing-intent';
const LAST_MARKER_KEY = 'nest-live-bus-last-marker';
const DEFAULT_SPEED_KMH = 24;
const PROGRESS_DISTANCE_M = 5_000;
const STOP_KEYS: UserBusStopKey[] = ['home', 'work'];

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earthRadiusM = 6_371_000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusM * c;
}

function estimateEtaMinutes(distanceM: number, speedKmh = DEFAULT_SPEED_KMH) {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return 0;
  const metersPerMinute = (speedKmh * 1000) / 60;
  return Math.max(1, Math.round(distanceM / metersPerMinute));
}

type LiveBusTrackingPageProps = {
  audience: 'user' | 'admin';
};

export default function LiveBusTrackingPage({ audience }: LiveBusTrackingPageProps) {
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [markers, setMarkers] = useState<Record<string, LiveLocationMarker>>({});
  const [isSharing, setIsSharing] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [savedStops, setSavedStops] = useState<Record<UserBusStopKey, {
    lat: number;
    lng: number;
    radiusM: number;
    stopName: string | null;
    updatedAt: string;
  } | null>>({
    home: null,
    work: null,
  });
  const [activeStopKey, setActiveStopKey] = useState<UserBusStopKey>('home');
  const [stopNameDrafts, setStopNameDrafts] = useState<Record<UserBusStopKey, string>>({
    home: '',
    work: '',
  });
  const [isSavingStop, setIsSavingStop] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [trackedBusId, setTrackedBusId] = useState<string | null>(null);
  const [minDistanceSeenM, setMinDistanceSeenM] = useState<number | null>(null);
  const hasInitialCenterRef = useRef(false);

  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lastSentAtRef = useRef(0);
  const lastSentCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const commuteAlertRef = useRef<Record<string, { fiveMin: boolean; arriving: boolean; passed: boolean }>>({});

  const activeMarkers = useMemo(
    () => Object.values(markers).filter((marker) => isFresh(marker.updatedAt)),
    [markers]
  );
  const sortedActiveMarkers = useMemo(
    () => [...activeMarkers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [activeMarkers]
  );

  const myMarker = currentUserId ? markers[currentUserId] : undefined;
  const myMarkerDistanceMRef = useRef<Record<string, number>>({});
  const canManageStops = Boolean(currentUserId);

  const upsertLocalMarker = useCallback((marker: LiveLocationMarker) => {
    setMarkers((prev) => ({ ...prev, [marker.userId]: marker }));
  }, []);

  const removeLocalMarker = useCallback((userId: string) => {
    setMarkers((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const loadSavedStops = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_bus_stops')
      .select('user_id, stop_key, stop_name, lat, lng, radius_m, updated_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to load saved stops:', error);
      return;
    }

    const nextStops: Record<UserBusStopKey, {
      lat: number;
      lng: number;
      radiusM: number;
      stopName: string | null;
      updatedAt: string;
    } | null> = { home: null, work: null };
    const nextDrafts: Record<UserBusStopKey, string> = { home: '', work: '' };

    (data as UserBusStopRow[]).forEach((row) => {
      if (row.stop_key !== 'home' && row.stop_key !== 'work') return;
      nextStops[row.stop_key] = {
        lat: row.lat,
        lng: row.lng,
        radiusM: row.radius_m ?? 120,
        stopName: row.stop_name,
        updatedAt: row.updated_at,
      };
      nextDrafts[row.stop_key] = row.stop_name ?? '';
    });

    setSavedStops(nextStops);
    setStopNameDrafts(nextDrafts);
  }, [supabase]);

  const saveStop = useCallback(async (
    stopKey: UserBusStopKey,
    lat: number,
    lng: number,
    source: 'my-location' | 'map-center' | 'map-tap'
  ) => {
    if (!currentUserId) return;
    setIsSavingStop(true);

    const cleanName = stopNameDrafts[stopKey].trim();
    const payload: UserBusStopRow = {
      user_id: currentUserId,
      stop_key: stopKey,
      stop_name: cleanName.length > 0 ? cleanName : null,
      lat,
      lng,
      radius_m: 120,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('user_bus_stops').upsert(payload, { onConflict: 'user_id,stop_key' });
    setIsSavingStop(false);

    if (error) {
      console.error('Failed to save stop:', error);
      toast({
        title: 'Could not save stop',
        description: 'Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setSavedStops((prev) => ({
      ...prev,
      [stopKey]: {
        lat: payload.lat,
        lng: payload.lng,
        radiusM: payload.radius_m,
        stopName: payload.stop_name,
        updatedAt: payload.updated_at,
      },
    }));

    const sourceText =
      source === 'my-location'
        ? 'current location'
        : source === 'map-center'
          ? 'map center'
          : 'map tap';

    toast({
      title: `${stopKey === 'home' ? 'Home' : 'Work'} stop saved`,
      description: `Using ${sourceText} as your ${stopKey} stop.`,
    });
  }, [currentUserId, stopNameDrafts, supabase, toast]);

  const clearSavedStop = useCallback(async (stopKey: UserBusStopKey) => {
    if (!currentUserId) return;
    setIsSavingStop(true);
    const { error } = await supabase
      .from('user_bus_stops')
      .delete()
      .eq('user_id', currentUserId)
      .eq('stop_key', stopKey);
    setIsSavingStop(false);
    if (error) {
      console.error('Failed to clear saved stop:', error);
      toast({ title: 'Could not clear stop', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    setSavedStops((prev) => ({ ...prev, [stopKey]: null }));
    setStopNameDrafts((prev) => ({ ...prev, [stopKey]: '' }));
    toast({
      title: `${stopKey === 'home' ? 'Home' : 'Work'} stop cleared`,
      description: 'Commute widget now falls back to your current location for this destination.',
    });
  }, [currentUserId, supabase, toast]);

  const loadActiveRows = useCallback(async () => {
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { data, error } = await supabase
      .from('live_locations')
      .select('user_id, lat, lng, accuracy_m, is_sharing, updated_at')
      .eq('is_sharing', true)
      .gte('updated_at', cutoff);

    if (error) {
      console.error('Failed to load live locations:', error);
      return;
    }

    const next: Record<string, LiveLocationMarker> = {};
    (data as LiveLocationRow[]).forEach((row) => {
      if (!isFresh(row.updated_at)) return;
      next[row.user_id] = toMarker(row);
    });

    setMarkers(next);
  }, [supabase]);

  const deleteOwnRow = useCallback(async (userId: string) => {
    const { error } = await supabase.from('live_locations').delete().eq('user_id', userId);
    if (error) {
      console.error('Failed to delete own live location:', error);
    }
  }, [supabase]);

  const emitLocation = useCallback(async (userId: string, lat: number, lng: number, accuracyM: number | null) => {
    const now = Date.now();
    if (
      !shouldEmitLocation({
        nowMs: now,
        lastSentAtMs: lastSentAtRef.current,
        lastCoords: lastSentCoordsRef.current,
        nextCoords: { lat, lng },
        minIntervalMs: EMIT_INTERVAL_MS,
        minMoveMeters: MIN_MOVE_METERS,
      })
    ) {
      return;
    }

    lastSentAtRef.current = now;
    lastSentCoordsRef.current = { lat, lng };

    const payload: LiveLocationRow = {
      user_id: userId,
      lat,
      lng,
      accuracy_m: accuracyM,
      is_sharing: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('live_locations')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to upsert live location:', error);
      return;
    }

    const marker = toMarker(payload);
    upsertLocalMarker(marker);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_MARKER_KEY, JSON.stringify(marker));
    }
  }, [supabase, upsertLocalMarker]);

  const stopSharing = useCallback(async (silent = false) => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsSharing(false);
    setIsLocating(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SHARING_INTENT_KEY, 'false');
      window.localStorage.removeItem(LAST_MARKER_KEY);
    }
    lastSentAtRef.current = 0;
    lastSentCoordsRef.current = null;

    if (currentUserId) {
      removeLocalMarker(currentUserId);
      await deleteOwnRow(currentUserId);
    }

    if (!silent) {
      toast({ title: 'Location sharing stopped', description: 'You are no longer broadcasting your live location.' });
    }
  }, [currentUserId, deleteOwnRow, removeLocalMarker, toast]);

  const startSharing = useCallback(async () => {
    if (!currentUserId) return;

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.');
      toast({ title: 'Geolocation unavailable', description: 'Your browser does not support live location.', variant: 'destructive' });
      return;
    }

    setLocationError(null);
    setIsLocating(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SHARING_INTENT_KEY, 'true');
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setIsLocating(false);
        setIsSharing(true);
        setMyCoords({ lat: latitude, lng: longitude });
        if (!hasInitialCenterRef.current) {
          setMapCenter([latitude, longitude]);
          hasInitialCenterRef.current = true;
        }

        await emitLocation(currentUserId, latitude, longitude, Number.isFinite(accuracy) ? accuracy : null);
      },
      async (error) => {
        console.error('watchPosition error:', error);
        setIsLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please allow location access to start sharing.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Try again in an open area.');
        } else {
          setLocationError('Failed to read your location. Please try again.');
        }

        await stopSharing(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      }
    );
  }, [currentUserId, emitLocation, stopSharing, toast]);

  const toggleSharing = useCallback(async () => {
    if (isSharing || watchIdRef.current != null) {
      await stopSharing();
      return;
    }
    await startSharing();
  }, [isSharing, startSharing, stopSharing]);

  const centerOnMe = useCallback(() => {
    if (!myCoords) return;
    const nextCenter: [number, number] = [myCoords.lat, myCoords.lng];
    setMapCenter(nextCenter);
    hasInitialCenterRef.current = true;
    mapRef.current?.flyTo(nextCenter, 16, { animate: true, duration: 0.75 });
  }, [myCoords]);

  const saveStopFromMyLocation = useCallback(async () => {
    if (!myCoords) return;
    await saveStop(activeStopKey, myCoords.lat, myCoords.lng, 'my-location');
  }, [activeStopKey, myCoords, saveStop]);

  const saveStopFromMapCenter = useCallback(async () => {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    await saveStop(activeStopKey, center.lat, center.lng, 'map-center');
  }, [activeStopKey, saveStop]);

  const saveStopFromMapTap = useCallback(async (lat: number, lng: number) => {
    await saveStop(activeStopKey, lat, lng, 'map-tap');
  }, [activeStopKey, saveStop]);

  const commuteTarget = useMemo(() => {
    const selectedStop = savedStops[activeStopKey];
    if (selectedStop) {
      return {
        lat: selectedStop.lat,
        lng: selectedStop.lng,
        label: selectedStop.stopName?.trim() || `${activeStopKey === 'home' ? 'Home' : 'Work'} stop`,
        radiusM: selectedStop.radiusM,
        stopKey: activeStopKey,
      };
    }
    if (myCoords) {
      return {
        lat: myCoords.lat,
        lng: myCoords.lng,
        label: 'Your current location',
        radiusM: 120,
        stopKey: activeStopKey,
      };
    }
    return null;
  }, [activeStopKey, myCoords, savedStops]);

  const nearestBus = useMemo(() => {
    if (!commuteTarget || activeMarkers.length === 0) return null;

    let best: LiveLocationMarker | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    activeMarkers.forEach((marker) => {
      if (marker.userId === currentUserId) return;
      const distance = haversineMeters(commuteTarget.lat, commuteTarget.lng, marker.lat, marker.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = marker;
      }
    });

    if (!best || !Number.isFinite(bestDistance)) return null;
    return { marker: best, distanceM: bestDistance };
  }, [activeMarkers, commuteTarget, currentUserId]);

  const trackedBus = useMemo(() => {
    if (!commuteTarget || activeMarkers.length === 0) return null;
    if (trackedBusId) {
      const marker = activeMarkers.find((m) => m.userId === trackedBusId);
      if (marker) {
        const distanceM = haversineMeters(commuteTarget.lat, commuteTarget.lng, marker.lat, marker.lng);
        return { marker, distanceM };
      }
    }
    return nearestBus;
  }, [activeMarkers, commuteTarget, nearestBus, trackedBusId]);

  const commuteWidget = useMemo(() => {
    if (!trackedBus || !commuteTarget) return null;
    const distanceM = trackedBus.distanceM;
    const etaMin = estimateEtaMinutes(distanceM);
    const progress = Math.min(1, Math.max(0, 1 - distanceM / PROGRESS_DISTANCE_M));
    const radius = commuteTarget.radiusM ?? 120;

    const lastDistance = myMarkerDistanceMRef.current[trackedBus.marker.userId];
    const previousBest = minDistanceSeenM ?? distanceM;
    const nextBest = Math.min(previousBest, distanceM);
    const isMovingAway = typeof lastDistance === 'number' && distanceM - lastDistance > 40;
    const likelyPassed = nextBest < radius && isMovingAway && distanceM > nextBest + 40;
    const isArriving = distanceM <= radius;

    let status: 'approaching' | 'arriving' | 'passed' = 'approaching';
    if (likelyPassed) status = 'passed';
    else if (isArriving) status = 'arriving';

    const subtitle =
      status === 'passed'
        ? 'Bus has likely passed your stop'
        : status === 'arriving'
          ? 'Bus is at your stop'
          : 'Bus is approaching your stop';

    return {
      userId: trackedBus.marker.userId,
      etaMin,
      distanceM,
      progress,
      status,
      subtitle,
      nextBest,
      currentDistance: distanceM,
    };
  }, [commuteTarget, minDistanceSeenM, trackedBus]);

  const commuteWidgetView = useMemo(() => {
    if (commuteWidget) {
      return {
        etaText: `${commuteWidget.etaMin} min until pickup`,
        subtitle: commuteWidget.subtitle,
        badge:
          commuteWidget.status === 'passed'
            ? 'Passed'
            : commuteWidget.status === 'arriving'
              ? 'At stop'
              : 'Approaching',
        distanceKm: (commuteWidget.distanceM / 1000).toFixed(2),
        progressPercent: Math.max(8, Math.round(commuteWidget.progress * 100)),
        busLabel: `Bus ${commuteWidget.userId.slice(0, 8)}`,
      };
    }

    return {
      etaText: 'Waiting for active bus',
      subtitle: 'No bus is sharing location right now.',
      badge: 'Idle',
      distanceKm: '—',
      progressPercent: 8,
      busLabel: 'Bus —',
    };
  }, [commuteWidget]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;

      if (!isMounted) return;
      setCurrentUserId(uid);
      if (uid) {
        await loadSavedStops(uid);
      } else {
        setSavedStops({ home: null, work: null });
        setStopNameDrafts({ home: '', work: '' });
      }

      if (uid && typeof window !== 'undefined') {
        const shouldResume = window.localStorage.getItem(SHARING_INTENT_KEY) === 'true';
        const cachedMarkerRaw = window.localStorage.getItem(LAST_MARKER_KEY);
        if (shouldResume && cachedMarkerRaw) {
          try {
            const cachedMarker = JSON.parse(cachedMarkerRaw) as LiveLocationMarker;
            if (cachedMarker.userId === uid && isFresh(cachedMarker.updatedAt)) {
              upsertLocalMarker(cachedMarker);
              setIsSharing(true);
              setMyCoords({ lat: cachedMarker.lat, lng: cachedMarker.lng });
              setMapCenter([cachedMarker.lat, cachedMarker.lng]);
              hasInitialCenterRef.current = true;
            }
          } catch (err) {
            console.error('Failed to parse cached live marker:', err);
            window.localStorage.removeItem(LAST_MARKER_KEY);
          }
        }
      }

      await loadActiveRows();
      if (isMounted) setIsBooting(false);
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [loadActiveRows, loadSavedStops, supabase, upsertLocalMarker]);

  useEffect(() => {
    if (!currentUserId || isSharing || watchIdRef.current != null) return;
    if (typeof window === 'undefined') return;

    const shouldResume = window.localStorage.getItem(SHARING_INTENT_KEY) === 'true';
    if (!shouldResume) return;

    void startSharing();
  }, [currentUserId, isSharing, startSharing]);

  useEffect(() => {
    const channel = supabase
      .channel(`live-locations-changes-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, (payload) => {
        const eventType = payload.eventType;
        if (eventType !== 'DELETE' && eventType !== 'INSERT' && eventType !== 'UPDATE') return;

        setMarkers((prev) => {
          if (eventType === 'DELETE') {
            return mergeRealtimePayload(
              prev,
              {
                eventType: 'DELETE',
                old: (payload.old as LiveLocationRow | null) ?? null,
                new: null,
              },
              Date.now(),
              STALE_MS
            );
          }

          return mergeRealtimePayload(
            prev,
            {
              eventType,
              old: (payload.old as LiveLocationRow | null) ?? null,
              new: (payload.new as LiveLocationRow | null) ?? null,
            },
            Date.now(),
            STALE_MS
          );
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarkers((prev) => {
        const next = pruneStaleMarkers(prev, Date.now(), STALE_MS);
        if (Object.keys(next).length === Object.keys(prev).length) return prev;
        return next;
      });
    }, 10_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!commuteWidget) {
      setTrackedBusId(null);
      setMinDistanceSeenM(null);
      return;
    }

    myMarkerDistanceMRef.current[commuteWidget.userId] = commuteWidget.currentDistance;
    setTrackedBusId(commuteWidget.userId);
    setMinDistanceSeenM(commuteWidget.nextBest);
  }, [commuteWidget]);

  useEffect(() => {
    setTrackedBusId(null);
    setMinDistanceSeenM(null);
    myMarkerDistanceMRef.current = {};
  }, [activeStopKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(window.Notification.permission);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({ title: 'Notifications unsupported', description: 'Your browser does not support notifications.' });
      return;
    }
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast({ title: 'Notifications enabled', description: 'You will get bus-stop alerts.' });
      return;
    }
    toast({ title: 'Notifications not enabled', description: 'You can still see in-app alerts.', variant: 'destructive' });
  }, [toast]);

  const sendCommuteAlert = useCallback((title: string, description: string) => {
    toast({ title, description });
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(title, { body: description });
    }
  }, [toast]);

  useEffect(() => {
    if (audience !== 'user' || !commuteWidget || !commuteTarget) return;

    const key = `${commuteTarget.stopKey}:${commuteWidget.userId}`;
    const current = commuteAlertRef.current[key] ?? {
      fiveMin: false,
      arriving: false,
      passed: false,
    };

    if (!current.fiveMin && commuteWidget.etaMin <= 5 && commuteWidget.status === 'approaching') {
      current.fiveMin = true;
      sendCommuteAlert(
        `${commuteTarget.stopKey === 'home' ? 'Home' : 'Work'} stop: 5 min away`,
        `Bus ${commuteWidget.userId.slice(0, 8)} is about ${commuteWidget.etaMin} min away.`
      );
    }

    if (!current.arriving && commuteWidget.status === 'arriving') {
      current.arriving = true;
      sendCommuteAlert(
        `${commuteTarget.stopKey === 'home' ? 'Home' : 'Work'} stop: Arriving`,
        `Bus ${commuteWidget.userId.slice(0, 8)} is now at your stop.`
      );
    }

    if (!current.passed && commuteWidget.status === 'passed') {
      current.passed = true;
      sendCommuteAlert(
        `${commuteTarget.stopKey === 'home' ? 'Home' : 'Work'} stop: Passed`,
        `Bus ${commuteWidget.userId.slice(0, 8)} has passed your stop.`
      );
    }

    commuteAlertRef.current[key] = current;
  }, [audience, commuteTarget, commuteWidget, sendCommuteAlert]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {canManageStops ? (
        <Card className="overflow-hidden rounded-2xl border-border/60 bg-background/80 backdrop-blur">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Live commute</p>
                <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                  {commuteWidgetView.etaText}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{commuteWidgetView.subtitle}</p>
              </div>
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
                {commuteWidgetView.badge}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${commuteWidgetView.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BusFront className="h-3.5 w-3.5" />
                  {commuteWidgetView.busLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {commuteWidgetView.distanceKm} km
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tracking to: {commuteTarget?.label ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canManageStops ? (
        <Card className="overflow-hidden rounded-2xl border-border/60 bg-background/70 backdrop-blur">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base tracking-tight">My Bus Stop</CardTitle>
            <CardDescription>Select Home/Work, then tap the map or use quick actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={activeStopKey === 'home' ? 'default' : 'outline'}
                className="h-10 rounded-xl"
                onClick={() => setActiveStopKey('home')}
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button
                type="button"
                variant={activeStopKey === 'work' ? 'default' : 'outline'}
                className="h-10 rounded-xl"
                onClick={() => setActiveStopKey('work')}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Work
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="stop-name-input">
                Stop name (optional)
              </label>
              <input
                id="stop-name-input"
                className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. Admiralty Gate"
                value={stopNameDrafts[activeStopKey]}
                onChange={(e) =>
                  setStopNameDrafts((prev) => ({ ...prev, [activeStopKey]: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={saveStopFromMyLocation}
                disabled={!myCoords || isSavingStop}
              >
                Use my location
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={saveStopFromMapCenter}
                disabled={isSavingStop}
              >
                Use map center
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-xl"
                onClick={() => clearSavedStop(activeStopKey)}
                disabled={!savedStops[activeStopKey] || isSavingStop}
              >
                Clear stop
              </Button>
            </div>

            <div className="space-y-1">
              {STOP_KEYS.map((key) => {
                const stop = savedStops[key];
                return (
                  <p key={key} className="text-xs text-muted-foreground">
                    {key === 'home' ? 'Home' : 'Work'}:{' '}
                    {stop
                      ? `${stop.stopName?.trim() || 'Unnamed stop'} • ${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}`
                      : 'Not set'}
                  </p>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                onClick={requestNotificationPermission}
                disabled={notificationPermission === 'granted' || notificationPermission === 'unsupported'}
              >
                <Bell className="mr-2 h-4 w-4" />
                {notificationPermission === 'granted'
                  ? 'Alerts enabled'
                  : notificationPermission === 'unsupported'
                    ? 'Alerts unsupported'
                    : 'Enable stop alerts'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Trigger: 5 min, arriving, passed.
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: with Home/Work selected, tap anywhere on the map to save that stop instantly.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-background/70 backdrop-blur">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-[1.1rem] sm:text-xl tracking-tight">
                <BusFront className="h-5 w-5 text-foreground/80" />
                Live Bus
              </CardTitle>
              <CardDescription className="mt-1">
                {audience === 'admin'
                  ? 'Monitor active live sharers in realtime.'
                  : 'Share your location with signed-in users.'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
              <Users className="mr-1 h-3.5 w-3.5" />
              {activeMarkers.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1 sm:pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={isSharing ? 'default' : 'secondary'}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
            >
              {isSharing ? 'Sharing' : 'Not sharing'}
            </Badge>
            {locationError ? <Badge variant="destructive" className="rounded-full px-2.5 py-1 text-xs">Permission issue</Badge> : null}
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
              Updated {myMarker?.updatedAt ? new Date(myMarker.updatedAt).toLocaleTimeString() : '—'}
            </Badge>
          </div>

          {locationError ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{locationError}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <Button
              onClick={toggleSharing}
              disabled={isBooting || isLocating}
              className="h-11 rounded-xl"
            >
              {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSharing ? <LocateOff className="mr-2 h-4 w-4" /> : <LocateFixed className="mr-2 h-4 w-4" />}
              {isSharing ? 'Stop Sharing' : 'Start Sharing'}
            </Button>

            <Button
              variant="outline"
              onClick={centerOnMe}
              disabled={!myCoords}
              className="h-11 rounded-xl border-border/70"
            >
              <Compass className="mr-2 h-4 w-4" />
              Center on me
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden rounded-2xl border-border/60 bg-background/70 xl:col-span-8">
          <CardContent className="p-2 sm:p-3">
            <LiveBusMap
              markers={activeMarkers}
              currentUserId={currentUserId}
              center={mapCenter}
              userStops={STOP_KEYS.flatMap((key) => {
                const stop = savedStops[key];
                if (!stop) return [];
                return [
                  {
                    key,
                    lat: stop.lat,
                    lng: stop.lng,
                    radiusM: stop.radiusM,
                    label: stop.stopName ?? `${key === 'home' ? 'Home' : 'Work'} stop`,
                  },
                ];
              })}
              activeStopKey={activeStopKey}
              onMapTap={canManageStops ? saveStopFromMapTap : undefined}
              onMapReady={(map) => {
                mapRef.current = map;
              }}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-background/70 xl:col-span-4">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base tracking-tight">Active Buses</CardTitle>
            <CardDescription>Tap a rider to focus map</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedActiveMarkers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sharers right now.</p>
            ) : (
              <div className="max-h-[40vh] space-y-2 overflow-auto pr-1 xl:max-h-[52vh]">
                {sortedActiveMarkers.map((m) => (
                  <button
                    key={m.userId}
                    type="button"
                    className="w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
                    onClick={() => {
                      mapRef.current?.flyTo([m.lat, m.lng], 16, { animate: true, duration: 0.65 });
                    }}
                  >
                    <p className="text-sm font-medium">
                      {m.userId === currentUserId ? 'You' : `User ${m.userId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.updatedAt).toLocaleTimeString()} • {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
