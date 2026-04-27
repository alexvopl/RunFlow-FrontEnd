/**
 * WorkoutMap — real-time GPS tracking map, Strava-style.
 *
 * Features:
 *  - Smooth auto-follow with fast pan (0.3 s)
 *  - Directional arrow + pulsing ring at current position
 *  - Bearing calculated from last 2 GPS points
 *  - User can drag the map → re-center FAB appears
 *  - GPS accuracy overlay while acquiring signal
 *  - Route polyline with gradient fade at edges
 */

import { useEffect, useRef, useState } from 'react';
import { Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Types ────────────────────────────────────────────────────────────────────
interface GpsPoint {
    lat: number;
    lng: number;
    timestamp: number;
}

interface Props {
    gpsPointsRef: React.MutableRefObject<GpsPoint[]>;
    distanceTrigger: number;      // changes on every GPS point → triggers map update
    className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Bearing in degrees [0-360) from point A to point B */
function calcBearing(a: GpsPoint, b: GpsPoint): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Inject pulse + accuracy keyframes once into <head> */
function injectMapCSS() {
    if (document.getElementById('workout-map-style')) return;
    const style = document.createElement('style');
    style.id = 'workout-map-style';
    style.textContent = `
        @keyframes gps-pulse {
            0%   { transform: scale(1);   opacity: 0.75; }
            100% { transform: scale(3.5); opacity: 0; }
        }
        .gps-pulse-ring { animation: gps-pulse 2s ease-out infinite; }
    `;
    document.head.appendChild(style);
}

/** Build the position DivIcon (white dot + directional arrow + pulse ring) */
function buildPositionIcon(bearing?: number): L.DivIcon {
    const arrow = bearing !== undefined
        ? `<div style="
              position:absolute;
              width:52px; height:52px;
              display:flex; align-items:flex-start; justify-content:center;
              transform:rotate(${bearing}deg);
              pointer-events:none;
           ">
              <div style="
                  width:0; height:0;
                  border-left:7px solid transparent;
                  border-right:7px solid transparent;
                  border-bottom:16px solid #5ab2ff;
                  margin-top:1px;
                  filter: drop-shadow(0 0 4px rgba(90,178,255,0.8));
              "></div>
           </div>`
        : '';

    return L.divIcon({
        className: '',
        iconSize:   [52, 52],
        iconAnchor: [26, 26],
        html: `
          <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
            <!-- Pulse ring -->
            <div class="gps-pulse-ring" style="
                position:absolute;
                width:22px; height:22px;
                border-radius:50%;
                background:rgba(90,178,255,0.4);
            "></div>
            <!-- Directional arrow -->
            ${arrow}
            <!-- Position dot -->
            <div style="
                position:relative;
                width:18px; height:18px;
                border-radius:50%;
                background:white;
                border:3.5px solid #5ab2ff;
                box-shadow:0 2px 12px rgba(0,0,0,0.55);
                z-index:1;
            "></div>
          </div>
        `,
    });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WorkoutMap({ gpsPointsRef, distanceTrigger, className = '' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<L.Map | null>(null);
    const polylineRef  = useRef<L.Polyline | null>(null);
    const markerRef    = useRef<L.Marker | null>(null);
    const initializedRef = useRef(false);

    // Whether the map is auto-following the runner
    const isFollowingRef = useRef(true);
    const [isFollowing, setIsFollowing] = useState(true);

    // ── Init map once ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || initializedRef.current) return;
        initializedRef.current = true;
        injectMapCSS();

        const map = L.map(containerRef.current, {
            zoomControl:       false,
            attributionControl: false,
            // Allow dragging so user can inspect the route
            dragging:          true,
            scrollWheelZoom:   false,
            doubleClickZoom:   true,
            keyboard:          false,
            touchZoom:         true,
            boxZoom:           false,
        });

        // CartoDB Dark Matter — free, no API key
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(map);

        // Route polyline
        polylineRef.current = L.polyline([], {
            color:      '#5ab2ff',
            weight:     5,
            opacity:    0.9,
            lineCap:    'round',
            lineJoin:   'round',
        }).addTo(map);

        // Default view — will snap to first GPS fix
        map.setView([48.8566, 2.3522], 16);

        // When user drags, stop auto-follow
        map.on('dragstart', () => {
            isFollowingRef.current = false;
            setIsFollowing(false);
        });

        mapRef.current = map;

        return () => {
            initializedRef.current = false;
            map.remove();
            mapRef.current    = null;
            polylineRef.current = null;
            markerRef.current   = null;
        };
    }, []);

    // ── Update on every GPS point ────────────────────────────────────────────
    useEffect(() => {
        const map      = mapRef.current;
        const polyline = polylineRef.current;
        if (!map || !polyline) return;

        const points = gpsPointsRef.current;
        if (points.length === 0) return;

        // Draw full route
        const latLngs = points.map(p => [p.lat, p.lng] as L.LatLngTuple);
        polyline.setLatLngs(latLngs);

        const last = points[points.length - 1];
        const pos  = L.latLng(last.lat, last.lng);

        // Bearing from second-to-last → last (for directional arrow)
        const bearing = points.length >= 2
            ? calcBearing(points[points.length - 2], last)
            : undefined;

        if (!markerRef.current) {
            // First GPS fix — create marker, zoom in, center
            markerRef.current = L.marker(pos, {
                icon: buildPositionIcon(bearing),
                zIndexOffset: 1000,
            }).addTo(map);

            map.setView(pos, 17, { animate: true });
        } else {
            // Update marker icon (bearing changed) and position
            markerRef.current.setIcon(buildPositionIcon(bearing));
            markerRef.current.setLatLng(pos);

            // Auto-pan only when following
            if (isFollowingRef.current) {
                map.panTo(pos, {
                    animate:      true,
                    duration:     0.35,
                    easeLinearity: 0.5,
                    noMoveStart:  true,
                });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [distanceTrigger]);

    // Re-center handler
    const handleReCenter = () => {
        const map    = mapRef.current;
        const points = gpsPointsRef.current;
        if (!map || points.length === 0) return;
        const last = points[points.length - 1];
        map.flyTo([last.lat, last.lng], Math.max(map.getZoom(), 17), {
            animate:  true,
            duration: 0.5,
        });
        isFollowingRef.current = true;
        setIsFollowing(true);
    };

    const hasPoints = distanceTrigger > 0 || gpsPointsRef.current.length > 0;

    return (
        <div className={`relative overflow-hidden ${className}`}>

            {/* Leaflet tile container */}
            <div ref={containerRef} className="w-full h-full" />

            {/* GPS acquiring overlay */}
            {!hasPoints && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-20"
                    style={{ background: 'rgba(7,17,31,0.78)', backdropFilter: 'blur(6px)' }}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-6 h-6 rounded-full bg-primary/40 animate-ping" />
                        <div className="w-3 h-3 rounded-full bg-primary" />
                    </div>
                    <p className="text-xs font-black text-text-muted tracking-widest uppercase">
                        Acquisition GPS…
                    </p>
                </div>
            )}

            {/* Re-center FAB — appears when user has panned away */}
            {hasPoints && !isFollowing && (
                <button
                    onClick={handleReCenter}
                    className="absolute bottom-14 right-3 z-20 w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                        background: 'rgba(90,178,255,0.92)',
                        boxShadow:  '0 4px 16px rgba(90,178,255,0.5)',
                    }}
                >
                    <Navigation size={18} className="text-white" fill="white" />
                </button>
            )}

            {/* Gradient fade — top */}
            <div
                className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-10"
                style={{ background: 'linear-gradient(to bottom, rgba(7,17,31,0.55), transparent)' }}
            />

            {/* Gradient fade — bottom (blends into metrics panel) */}
            <div
                className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(7,17,31,0.92))' }}
            />
        </div>
    );
}
