/**
 * WorkoutMap — real-time GPS route map built on Leaflet + CartoDB dark tiles.
 * Renders a polyline of the running route and a pulsing dot at the current position.
 *
 * Props:
 *   gpsPointsRef   — mutable ref shared with LiveWorkout (never causes re-renders itself)
 *   distanceTrigger — changes whenever a GPS point is added (distanceM state from parent)
 *   className      — extra Tailwind classes for the wrapper div
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GpsPoint {
    lat: number;
    lng: number;
    timestamp: number;
}

interface Props {
    gpsPointsRef: React.MutableRefObject<GpsPoint[]>;
    distanceTrigger: number;
    className?: string;
}

export function WorkoutMap({ gpsPointsRef, distanceTrigger, className = '' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const polylineRef = useRef<L.Polyline | null>(null);
    const dotRef = useRef<L.CircleMarker | null>(null);
    const initializedRef = useRef(false);

    // ── Initialize map once ──────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || initializedRef.current) return;
        initializedRef.current = true;

        const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            keyboard: false,
            touchZoom: false,
            boxZoom: false,
        });

        // CartoDB Dark Matter — free, no API key needed
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(map);

        // Route polyline
        polylineRef.current = L.polyline([], {
            color: '#5ab2ff',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
        }).addTo(map);

        // Default view (Paris) — will be updated on first GPS fix
        map.setView([48.8566, 2.3522], 15);

        mapRef.current = map;

        return () => {
            initializedRef.current = false;
            map.remove();
            mapRef.current = null;
            polylineRef.current = null;
            dotRef.current = null;
        };
    }, []);

    // ── Update polyline + position dot on each GPS point ────────────────
    useEffect(() => {
        const map = mapRef.current;
        const polyline = polylineRef.current;
        if (!map || !polyline) return;

        const points = gpsPointsRef.current;
        if (points.length === 0) return;

        // Draw route
        const latLngs = points.map(p => [p.lat, p.lng] as L.LatLngTuple);
        polyline.setLatLngs(latLngs);

        // Position dot (current location)
        const last = points[points.length - 1];
        const pos = L.latLng(last.lat, last.lng);

        if (!dotRef.current) {
            // Create the position dot on first fix
            dotRef.current = L.circleMarker(pos, {
                radius: 8,
                fillColor: '#ffffff',
                fillOpacity: 1,
                color: '#5ab2ff',
                weight: 3,
                className: 'workout-position-dot',
            }).addTo(map);

            // Zoom in and center on first fix
            map.setView(pos, 17, { animate: true });
        } else {
            dotRef.current.setLatLng(pos);
            // Smooth pan to keep user centered
            map.panTo(pos, { animate: true, duration: 1.5, easeLinearity: 0.25 });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [distanceTrigger]);

    const hasPoints = gpsPointsRef.current.length > 0;

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Leaflet container */}
            <div ref={containerRef} className="w-full h-full" />

            {/* GPS acquiring overlay */}
            {!hasPoints && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none"
                    style={{ background: 'rgba(7,17,31,0.72)', backdropFilter: 'blur(4px)' }}>
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-5 h-5 rounded-full bg-primary/40 animate-ping" />
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                    <p className="text-[11px] font-bold text-text-muted tracking-wide">Acquisition GPS…</p>
                </div>
            )}

            {/* Gradient fade at the bottom edge to blend with the metrics panel */}
            <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(7,17,31,0.9))' }} />
        </div>
    );
}
