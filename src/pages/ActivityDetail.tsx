import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, MapPin, Gauge, Loader2, Trash2, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { formatDuration, formatDistance, calculatePace } from '../utils/format';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Mini route map (route-only, no GPS tracking) ──────────────���───────
function RouteMap({ route }: { route: Array<{ lat: number; lng: number }> }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current || route.length < 2) return;

        const map = L.map(containerRef.current, {
            zoomControl: false, attributionControl: false,
            dragging: false, scrollWheelZoom: false,
            doubleClickZoom: false, keyboard: false,
            touchZoom: false, boxZoom: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19, subdomains: 'abcd',
        }).addTo(map);

        const latLngs = route.map(p => [p.lat, p.lng] as L.LatLngTuple);

        L.polyline(latLngs, {
            color: '#5ab2ff', weight: 4, opacity: 0.95,
            lineCap: 'round', lineJoin: 'round',
        }).addTo(map);

        // Start dot
        L.circleMarker(latLngs[0], {
            radius: 6, fillColor: '#22c55e', fillOpacity: 1,
            color: 'white', weight: 2,
        }).addTo(map);

        // End dot
        L.circleMarker(latLngs[latLngs.length - 1], {
            radius: 6, fillColor: '#ef4444', fillOpacity: 1,
            color: 'white', weight: 2,
        }).addTo(map);

        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [20, 20] });
        mapRef.current = map;

        return () => { map.remove(); mapRef.current = null; };
    }, [route]);

    if (route.length < 2) return null;

    return (
        <div ref={containerRef} className="w-full h-full" />
    );
}

// ────────────��─────────────────────────────────��──────────────────────
export function ActivityDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        api.get(`/activities/${id}`)
            .then(res => setActivity(res.data?.activity ?? res.data))
            .catch(() => navigate('/activities'))
            .finally(() => setLoading(false));
    }, [id, navigate]);

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            await api.delete(`/activities/${id}`);
            navigate('/activities');
        } catch {
            setDeleteError('Impossible de supprimer cette activité pour le moment.');
            setDeleting(false);
        }
    };

    const safeDate = (dateStr: string) => {
        try { return format(parseISO(dateStr), "EEEE d MMMM yyyy", { locale: fr }); }
        catch { return 'Date inconnue'; }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }
    if (!activity) return null;

    const route: Array<{ lat: number; lng: number }> = activity.route ?? [];
    const hasRoute = route.length >= 2;
    const avgPace = calculatePace(activity.distanceMeters, activity.durationSeconds);

    return (
        <div className="min-h-screen pb-28">

            {/* ── Delete modal ───────────��────────────────────────── */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                        <motion.div
                            initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                            className="relative w-full max-w-md glass-card rounded-t-[36px] p-6 pb-10"
                        >
                            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="w-14 h-14 rounded-2xl bg-red-500/12 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-red-400" />
                            </div>
                            <h3 className="text-lg font-black text-center mb-2">Supprimer l'activité ?</h3>
                            <p className="text-text-muted text-sm text-center leading-relaxed mb-6">
                                Cette action est irréversible. L'activité sera définitivement supprimée.
                            </p>
                            {deleteError && (
                                <p className="text-red-400 text-xs text-center font-semibold mb-4">{deleteError}</p>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-3.5 rounded-full text-sm font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                                    Annuler
                                </button>
                                <button onClick={handleDelete} disabled={deleting}
                                    className="flex-1 py-3.5 rounded-full bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                    {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Supprimer'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Header ────────────────────���─────────────────────── */}
            <div className="px-5 pt-7 pb-0 flex items-center justify-between mb-6">
                <button onClick={() => navigate(-1)}
                    className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <p className="text-xs font-bold text-text-muted capitalize">{safeDate(activity.startedAt)}</p>
                </div>
                <button onClick={() => setShowDeleteModal(true)}
                    className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 active:scale-95 transition-all">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="px-5 space-y-4">

                {/* ── Title card ──────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[28px] p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <Activity size={18} className="text-primary" />
                        </div>
                        <span className="rf-tag capitalize">{activity.activityType === 'run' ? 'Course' : activity.activityType}</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                        {activity.name || 'Course à pied'}
                    </h1>
                    <p className="text-text-muted text-sm mt-1 capitalize">{safeDate(activity.startedAt)}</p>
                </motion.div>

                {/* ── Stats grid ──────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="grid grid-cols-2 gap-3">

                    <div className="glass-card rounded-[22px] p-4 text-center">
                        <MapPin size={16} className="text-primary mx-auto mb-2" />
                        <div className="text-2xl font-black text-white">{formatDistance(activity.distanceMeters)}</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Kilomètres</div>
                    </div>

                    <div className="glass-card rounded-[22px] p-4 text-center">
                        <Clock size={16} className="text-primary mx-auto mb-2" />
                        <div className="text-2xl font-black text-white">{formatDuration(activity.durationSeconds)}</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Temps</div>
                    </div>

                    <div className="glass-card rounded-[22px] p-4 text-center">
                        <Gauge size={16} className="text-primary mx-auto mb-2" />
                        <div className="text-2xl font-black text-white">{avgPace}</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Allure moy.</div>
                    </div>

                    <div className="glass-card rounded-[22px] p-4 text-center opacity-50">
                        <div className="w-4 h-4 mx-auto mb-2 rounded-full border-2 border-text-muted/30" />
                        <div className="text-2xl font-black text-text-muted">--</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">FC moy.</div>
                    </div>
                </motion.div>

                {/* ── Route map ───────────────────────────────────── */}
                {hasRoute && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="glass-card rounded-[22px] overflow-hidden"
                        style={{ height: 220 }}>
                        <RouteMap route={route} />
                    </motion.div>
                )}

                {/* ── Splits ──────────────────────────────────────── */}
                {activity.splits && activity.splits.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: hasRoute ? 0.15 : 0.1 }}
                        className="glass-card rounded-[22px] p-4">
                        <h3 className="text-sm font-bold text-text-muted mb-3">Kilomètres</h3>
                        <div className="space-y-2">
                            {activity.splits.map((split: any, i: number) => {
                                const pace = split.avgPaceSecPerKm
                                    ? `${Math.floor(split.avgPaceSecPerKm / 60)}:${String(Math.round(split.avgPaceSecPerKm % 60)).padStart(2, '0')}`
                                    : '--:--';
                                return (
                                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-xl bg-primary/15 flex items-center justify-center text-[10px] font-black text-primary">
                                                {split.kmNumber}
                                            </div>
                                            <span className="text-sm font-bold text-text-muted">km {split.kmNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm font-black text-white">
                                            <span>{formatDuration(split.splitTimeSec)}</span>
                                            <span className="text-primary">{pace}<span className="text-text-muted font-bold text-xs">/km</span></span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
