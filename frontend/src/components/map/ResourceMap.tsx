'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { GoogleMap, InfoWindow, Marker, useLoadScript } from '@react-google-maps/api';

import { ngosApi, tasksApi, volunteersApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useSosStore } from '@/features/sos/store/sosStore';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

type LatLng = { lat: number; lng: number };

interface MapProps {
  showVolunteers?: boolean;
  showHeatmap?: boolean;
  onTaskClick?: (task: Record<string, unknown>) => void;
  height?: string;
}

function haversineKm(a: LatLng, b: LatLng) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function circleIcon(color: string) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 7,
  } as google.maps.Symbol;
}

export default function ResourceMap({
  showVolunteers = true,
  showHeatmap = true, // reserved (future)
  onTaskClick,
  height = '100%',
}: MapProps) {
  const { on } = useSocket();
  const user = useAuthStore((s) => s.user);
  const sosAlert = useSosStore((s) => s.activeAlert);

  // React 19 + @react-google-maps/api typing mismatch workaround (runtime is fine)
  const GoogleMapAny = GoogleMap as any;
  const MarkerAny = Marker as any;
  const InfoWindowAny = InfoWindow as any;

  const [tasks, setTasks] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [selected, setSelected] = useState<
    | { type: 'task'; item: any }
    | { type: 'volunteer'; item: any }
    | { type: 'ngo'; item: any }
    | null
  >(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [didAutoFocus, setDidAutoFocus] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const mapCenter = useMemo<LatLng>(() => ({ lat: 20.5937, lng: 78.9629 }), []);
  // ─── Load data ─────────────────────────
  const loadMapData = useCallback(async () => {
    try {
      const [tasksRes, volRes, ngoRes] = await Promise.allSettled([
        tasksApi.getMap(),
        showVolunteers
          ? volunteersApi.getMap()
          : Promise.resolve({ data: { data: { volunteers: [] } } }),
        ngosApi.getMap(),
      ]);

      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value.data.data.tasks || []);
      }

      if (volRes.status === 'fulfilled') {
        setVolunteers(
          (volRes.value as any).data.data.volunteers || []
        );
      }

      if (ngoRes.status === 'fulfilled') {
        setNgos((ngoRes.value as any).data.data.ngos || []);
      }
    } catch {
      console.error('Error loading map data');
    }
  }, [showVolunteers]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => null,
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8_000 }
    );
  }, []);

  useEffect(() => {
    if (!map || !userPos || didAutoFocus) return;
    map.panTo(userPos);
    map.setZoom(13);
    setDidAutoFocus(true);
  }, [map, userPos, didAutoFocus]);

  // ─── Real-time updates ─────────────────
  useEffect(() => {
    const cleanup = on('task:new', loadMapData);
    return cleanup;
  }, [on, loadMapData]);

  useEffect(() => {
    const cleanup = on(
      'volunteer:moved',
      (data: any) => {
        setVolunteers((prev) =>
          prev.map((v: any) =>
            v.id === data.userId
              ? { ...v, lat: data.lat, lng: data.lng }
              : v
          )
        );
      }
    );
    return cleanup;
  }, [on]);

  if (loadError) {
    return (
      <div style={{ width: '100%', height }} className="rounded-xl overflow-hidden bg-white flex items-center justify-center text-sm text-red-600 border border-gray-200">
        Google Maps failed to load. Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ width: '100%', height }} className="rounded-xl overflow-hidden bg-white dark:bg-white/5 flex items-center justify-center text-sm text-gray-500 dark:text-white/65 border border-gray-200 dark:border-white/10">
        Loading map…
      </div>
    );
  }

  return (
    <div
      style={{ width: '100%', height }}
      className="rounded-xl overflow-hidden"
    >
      <GoogleMapAny
        center={mapCenter}
        zoom={5}
        mapContainerStyle={{ height: '100%', width: '100%' }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        }}
        onClick={() => setSelected(null)}
        onLoad={(loadedMap: google.maps.Map) => setMap(loadedMap)}
      >
        {/* SOS highlight */}
        {sosAlert && (
          <MarkerAny
            position={{ lat: sosAlert.lat, lng: sosAlert.lng }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#ef4444',
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 12,
            }}
            onClick={() => {
              setSelected({ type: 'task', item: { title: 'SOS Alert', ...sosAlert } } as any);
            }}
          />
        )}

        {/* My location marker */}
        {userPos && (
          <MarkerAny
            position={userPos}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 8,
            }}
            title="Your location"
          />
        )}

        {/* Needs/Tasks (red) */}
        {tasks.map((task: any) => {
          if (task.lat == null || task.lng == null) return null;
          return (
            <MarkerAny
              key={task.id}
              position={{ lat: task.lat, lng: task.lng }}
              icon={circleIcon('#ef4444')}
              onClick={() => {
                setSelected({ type: 'task', item: task });
                onTaskClick?.(task);
              }}
            />
          );
        })}

        {/* Volunteers (blue) */}
        {showVolunteers && volunteers.map((vol: any) => {
          if (vol.lat == null || vol.lng == null) return null;
          const color = vol.availability === 'available' ? '#3b82f6' : '#94a3b8';
          return (
            <MarkerAny
              key={vol.id}
              position={{ lat: vol.lat, lng: vol.lng }}
              icon={circleIcon(color)}
              onClick={() => setSelected({ type: 'volunteer', item: vol })}
            />
          );
        })}

        {/* NGOs (green) */}
        {ngos.map((ngo: any) => {
          if (ngo.lat == null || ngo.lng == null) return null;
          return (
            <MarkerAny
              key={ngo.id}
              position={{ lat: ngo.lat, lng: ngo.lng }}
              icon={circleIcon('#22c55e')}
              onClick={() => setSelected({ type: 'ngo', item: ngo })}
            />
          );
        })}

        {selected?.type === 'task' && (
          <InfoWindowAny
            position={{ lat: selected.item.lat, lng: selected.item.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{selected.item.title}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {selected.item.address || selected.item.category}
              </div>
              {userPos && (
                <div style={{ fontSize: 11, color: '#111827', marginTop: 6 }}>
                  Distance: {haversineKm(userPos, { lat: selected.item.lat, lng: selected.item.lng }).toFixed(1)} km
                </div>
              )}
              {Array.isArray(selected.item.required_skills) && selected.item.required_skills.length > 0 && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                  Skills: {selected.item.required_skills.join(', ')}
                </div>
              )}
              {user?.role === 'volunteer' && selected.item.id && (
                <button
                  style={{ marginTop: 8, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none' }}
                  onClick={async () => {
                    const msg = window.prompt('Optional message to admin (why you can help):') || '';
                    try {
                      await tasksApi.requestJoin(String(selected.item.id), msg);
                      toast.success('Join request sent to admin.');
                    } catch (e: any) {
                      toast.error(e?.response?.data?.message || 'Failed to send request');
                    }
                  }}
                >
                  Request to join
                </button>
              )}
            </div>
          </InfoWindowAny>
        )}

        {selected?.type === 'volunteer' && (
          <InfoWindowAny
            position={{ lat: selected.item.lat, lng: selected.item.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{selected.item.full_name}</div>
              <div style={{ fontSize: 11, color: selected.item.availability === 'available' ? '#1d4ed8' : '#6b7280', marginTop: 2 }}>
                {selected.item.availability}
              </div>
              {userPos && (
                <div style={{ fontSize: 11, color: '#111827', marginTop: 6 }}>
                  Distance: {haversineKm(userPos, { lat: selected.item.lat, lng: selected.item.lng }).toFixed(1)} km
                </div>
              )}
              {Array.isArray(selected.item.skills) && selected.item.skills.length > 0 && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                  Skills: {selected.item.skills.join(', ')}
                </div>
              )}
            </div>
          </InfoWindowAny>
        )}

        {selected?.type === 'ngo' && (
          <InfoWindowAny
            position={{ lat: selected.item.lat, lng: selected.item.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{selected.item.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {selected.item.address || selected.item.city || 'NGO'}
              </div>
              {userPos && (
                <div style={{ fontSize: 11, color: '#111827', marginTop: 6 }}>
                  Distance: {haversineKm(userPos, { lat: selected.item.lat, lng: selected.item.lng }).toFixed(1)} km
                </div>
              )}
            </div>
          </InfoWindowAny>
        )}
      </GoogleMapAny>
    </div>
  );
}