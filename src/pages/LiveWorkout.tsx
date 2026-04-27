import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, Square, ChevronLeft, MapPin,
    Zap, Heart, Activity, Volume2, VolumeX, Flag,
    ChevronUp, ChevronDown, Minus, Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { WorkoutMap } from '../components/workout/WorkoutMap';

// ─── Types ───────────────────────────────────────────────────────────────
interface WorkoutSegment {
    label: string;
    distanceKm?: number;
    durationSeconds?: number;
    targetPaceMin?: number;
    type: 'warmup' | 'run' | 'interval' | 'cooldown' | 'rest';
}

interface GuidedWorkout {
    title: string;
    description: string;
    distanceKm?: number;
    durationMinutes?: number;
    targetPaceMin?: number;
    segments?: WorkoutSegment[];
    workoutId?: string;
}

interface GpsPoint {
    lat: number;
    lng: number;
    timestamp: number;
}

interface WorkoutLap {
    index: number;
    label: string;
    distanceMeters: number;
    durationSeconds: number;
    avgPaceSecPerKm: number;
}

// ─── Utilities ───────────────────────────────────────────────────────────
function haversineDistance(a: GpsPoint, b: GpsPoint): number {
    const R = 6371e3;
    const φ1 = (a.lat * Math.PI) / 180;
    const φ2 = (b.lat * Math.PI) / 180;
    const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
    const x = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatPace(secPerKm: number): string {
    if (!isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return '--:--';
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function paceStatusColor(currentSecPerKm: number, targetPaceMin?: number): 'fast' | 'good' | 'slow' | null {
    if (!targetPaceMin || !isFinite(currentSecPerKm) || currentSecPerKm <= 0) return null;
    const targetSec = targetPaceMin * 60;
    const diff = currentSecPerKm - targetSec;
    if (diff < -15) return 'fast';
    if (diff > 15) return 'slow';
    return 'good';
}

// ─── Strava helpers ───────────────────────────────────────────────────────

function getTimeOfDay(): string {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return 'du matin';
    if (h >= 12 && h < 18) return "de l'après-midi";
    if (h >= 18 && h < 22) return 'du soir';
    return 'nocturne';
}

function buildStravaDescription(
    workout: GuidedWorkout | null,
    distKm: number,
    durSec: number,
): string {
    const avgPace = durSec > 0 && distKm > 0 ? formatPace(durSec / distKm) : null;
    const PLG = `\nCette séance fait partie de mon programme d'entraînement avec Runflow.\nRejoins la communauté et progresse avec tes amis ! 🏃\nrunflow.app`;

    if (workout) {
        const lines: string[] = [workout.title];
        if (workout.description) lines.push(workout.description);
        lines.push('');
        if (distKm > 0)         lines.push(`📍 Distance : ${distKm.toFixed(2)} km`);
        if (avgPace)             lines.push(`⏱ Allure moyenne : ${avgPace}/km`);
        if (workout.targetPaceMin) lines.push(`🎯 Allure cible : ${formatPace(workout.targetPaceMin * 60)}/km`);
        if (workout.distanceKm)  lines.push(`📐 Distance prévue : ${workout.distanceKm} km`);
        lines.push(PLG);
        return lines.join('\n');
    }

    const lines: string[] = [`Course libre ${getTimeOfDay()}`, ''];
    if (distKm > 0) lines.push(`📍 ${distKm.toFixed(2)} km parcourus`);
    if (avgPace)    lines.push(`⏱ Allure moyenne : ${avgPace}/km`);
    lines.push(`\nEnregistrée avec Runflow — l'app de running communautaire 🏃\nRejoins-nous sur runflow.app !`);
    return lines.join('\n');
}

// ─── Component ───────────────────────────────────────────────────────────
export function LiveWorkout() {
    const navigate = useNavigate();
    const location = useLocation();
    const guidedWorkout: GuidedWorkout | null = location.state?.workout || null;

    // Workout state
    const [phase, setPhase] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [distanceM, setDistanceM] = useState(0);
    const [currentPaceSec, setCurrentPaceSec] = useState(0);
    const [heartRate] = useState<number | null>(null);
    const [cadence, setCadence] = useState<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [segmentIndex, setSegmentIndex] = useState(0);
    const [segmentStartDistance, setSegmentStartDistance] = useState(0);
    const [segmentStartElapsed, setSegmentStartElapsed] = useState(0);
    const [beeped, setBeeped] = useState(false);
    const [lapToast, setLapToast] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'skipped' | 'error'>('idle');
    const [stravaState, setStravaState] = useState<'idle' | 'pushing' | 'pushed' | 'not_connected' | 'error'>('idle');
    const [stravaActivityUrl, setStravaActivityUrl] = useState<string | null>(null);
    // Increments on every GPS point — used as map distanceTrigger so the
    // map reacts even on the very first fix (before distanceM changes)
    const [gpsCount, setGpsCount] = useState(0);

    // Refs
    const gpsPoints = useRef<GpsPoint[]>([]);
    const watchId = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastKmRef = useRef(0);
    const audioCtx = useRef<AudioContext | null>(null);
    const stepCountRef = useRef(0);
    const accelRef = useRef<null | ((e: DeviceMotionEvent) => void)>(null);
    const workoutStartRef = useRef<number | null>(null);
    const completedLapsRef = useRef<WorkoutLap[]>([]);
    const distanceMRef = useRef(0);
    const elapsedRef = useRef(0);

    // Sync state → refs (prevents stale-closure in handleStop)
    useEffect(() => { distanceMRef.current = distanceM; }, [distanceM]);
    useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

    const segments = guidedWorkout?.segments || null;
    const currentSegment = segments ? segments[segmentIndex] : null;
    const targetPaceMin = currentSegment?.targetPaceMin || guidedWorkout?.targetPaceMin;
    const segmentDistanceM = Math.max(0, distanceM - segmentStartDistance);
    const segmentElapsed = Math.max(0, elapsed - segmentStartElapsed);

    // ─── Audio beeps ──────────────────────────────────────────────────────
    const beep = useCallback((freq: number, duration = 0.15, tone = 'sine' as OscillatorType) => {
        if (!soundEnabled) return;
        try {
            if (!audioCtx.current) audioCtx.current = new AudioContext();
            const ctx = audioCtx.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = tone;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch { /* silently fail */ }
    }, [soundEnabled]);

    const beepTriple = useCallback(() => {
        beep(880, 0.1);
        setTimeout(() => beep(880, 0.1), 150);
        setTimeout(() => beep(1100, 0.2), 300);
    }, [beep]);

    // ─── GPS ──────────────────────────────────────────────────────────────
    const startGPS = useCallback(() => {
        if (!navigator.geolocation) return;
        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                // Skip noisy fixes — accuracy worse than 50 m
                if (pos.coords.accuracy > 50) return;

                const point: GpsPoint = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    timestamp: Date.now(),
                };
                gpsPoints.current.push(point);

                // Trigger map update on every point (including the first fix)
                setGpsCount(n => n + 1);

                if (gpsPoints.current.length >= 2) {
                    const prev = gpsPoints.current[gpsPoints.current.length - 2];
                    const d = haversineDistance(prev, point);

                    // Ignore implausible jumps (> 50 m between fixes)
                    if (d > 50) return;

                    setDistanceM(prev => {
                        const newDist = prev + d;
                        const prevKm = Math.floor(lastKmRef.current / 1000);
                        const newKm = Math.floor(newDist / 1000);
                        if (newKm > prevKm) beep(660, 0.3);
                        lastKmRef.current = newDist;
                        return newDist;
                    });

                    // Rolling pace over last 5 points
                    const recent = gpsPoints.current.slice(-5);
                    if (recent.length >= 2) {
                        const first = recent[0];
                        const last = recent[recent.length - 1];
                        const totalDist = recent.slice(1).reduce(
                            (acc, p, i) => acc + haversineDistance(recent[i], p), 0
                        );
                        const totalTime = (last.timestamp - first.timestamp) / 1000;
                        if (totalDist > 5) {
                            setCurrentPaceSec((totalTime / totalDist) * 1000);
                        }
                    }
                }
            },
            (err) => console.warn('GPS error:', err),
            {
                enableHighAccuracy: true,
                maximumAge:         0,       // always fresh — no cached positions
                timeout:            5000,    // faster timeout than default 10 s
            }
        );
    }, [beep]);

    const stopGPS = useCallback(() => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    }, []);

    // ─── Accelerometer (cadence) ──────────────────────────────────────────
    const startAccelerometer = useCallback(() => {
        if (typeof DeviceMotionEvent === 'undefined') return;
        let lastPeak = Date.now();
        const stepBuffer: number[] = [];
        const handler = (e: DeviceMotionEvent) => {
            const acc = e.acceleration;
            if (!acc) return;
            const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
            if (mag > 12) {
                const now = Date.now();
                const interval = now - lastPeak;
                if (interval > 250 && interval < 1500) {
                    stepBuffer.push(60000 / interval);
                    if (stepBuffer.length > 8) stepBuffer.shift();
                    setCadence(Math.round((stepBuffer.reduce((a, b) => a + b, 0) / stepBuffer.length) * 2));
                }
                lastPeak = now;
                stepCountRef.current++;
            }
        };
        accelRef.current = handler;
        window.addEventListener('devicemotion', handler);
    }, []);

    const stopAccelerometer = useCallback(() => {
        if (accelRef.current) {
            window.removeEventListener('devicemotion', accelRef.current);
            accelRef.current = null;
        }
    }, []);

    // ─── Pace guidance beeps ──────────────────────────────────────────────
    useEffect(() => {
        const paceToTrack = currentSegment?.distanceKm
            ? (segmentDistanceM > 25 && segmentElapsed > 0 ? segmentElapsed / (segmentDistanceM / 1000) : 0)
            : currentPaceSec;
        if (phase !== 'running' || !targetPaceMin || paceToTrack <= 0) { setBeeped(false); return; }
        const status = paceStatusColor(paceToTrack, targetPaceMin);
        if ((status === 'slow' || status === 'fast') && !beeped) {
            beep(status === 'slow' ? 330 : 660, 0.3);
            setBeeped(true);
        } else if (status === 'good') {
            setBeeped(false);
        }
    }, [currentPaceSec, currentSegment?.distanceKm, segmentDistanceM, segmentElapsed, targetPaceMin, phase, beeped, beep]);

    // ─── Segment advancement ──────────────────────────────────────────────
    useEffect(() => {
        if (!segments || phase !== 'running') return;
        const seg = segments[segmentIndex];
        if (!seg) return;
        if (seg.distanceKm && segmentDistanceM >= seg.distanceKm * 1000) {
            completedLapsRef.current.push({
                index: completedLapsRef.current.length + 1,
                label: seg.label,
                distanceMeters: Math.round(segmentDistanceM),
                durationSeconds: Math.max(1, segmentElapsed),
                avgPaceSecPerKm: Math.round(Math.max(1, segmentElapsed) / Math.max(segmentDistanceM / 1000, 0.001)),
            });
            setLapToast(`Tour ${completedLapsRef.current.length} terminé`);
            setCurrentPaceSec(0);
            setSegmentStartDistance(distanceM);
            setSegmentStartElapsed(elapsed);
            if (segmentIndex < segments.length - 1) {
                setSegmentIndex(i => i + 1);
                beepTriple();
            }
        }
    }, [distanceM, elapsed, segmentDistanceM, segmentElapsed, segmentIndex, segments, phase, beepTriple]);

    useEffect(() => {
        if (!lapToast) return;
        const t = window.setTimeout(() => setLapToast(null), 2200);
        return () => window.clearTimeout(t);
    }, [lapToast]);

    // ─── Timer ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase === 'running') {
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase]);

    // ─── Actions ──────────────────────────────────────────────────────────
    const handleStart = useCallback(() => {
        workoutStartRef.current = Date.now();
        setSegmentStartDistance(0);
        setSegmentStartElapsed(0);
        completedLapsRef.current = [];
        gpsPoints.current = [];
        lastKmRef.current = 0;
        setLapToast(null);
        setPhase('running');
        startGPS();
        startAccelerometer();
        beepTriple();
    }, [startGPS, startAccelerometer, beepTriple]);

    const handlePause = useCallback(() => {
        setPhase('paused');
        stopGPS();
        beep(440, 0.2);
    }, [stopGPS, beep]);

    const handleResume = useCallback(() => {
        setPhase('running');
        startGPS();
        beep(660, 0.2);
    }, [startGPS, beep]);

    const handleStop = useCallback(async () => {
        stopGPS();
        stopAccelerometer();
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('done');
        beep(880, 0.5);

        const finalDistanceM = distanceMRef.current;
        const finalElapsed = elapsedRef.current;

        if (finalElapsed > 5) {
            setSaveState('saving');
            try {
                const route = gpsPoints.current.map(p => ({ lat: p.lat, lng: p.lng }));
                const splits = completedLapsRef.current.map(lap => ({
                    kmNumber: lap.index,
                    splitTimeSec: lap.durationSeconds,
                    avgPaceSecPerKm: lap.avgPaceSecPerKm,
                }));
                await api.post('/activities', {
                    name: guidedWorkout?.title || 'Course libre',
                    activityType: 'run',
                    startedAt: new Date(workoutStartRef.current ?? Date.now()).toISOString(),
                    distanceMeters: Math.round(finalDistanceM),
                    durationSeconds: finalElapsed,
                    source: 'manual',
                    route: route.length > 1 ? route : undefined,
                    splits: splits.length > 0 ? splits : undefined,
                });
                setSaveState('saved');

                // ── Push to Strava (if connected) ─────────────────────────
                setStravaState('pushing');
                try {
                    const distKm = finalDistanceM / 1000;
                    const startedAt = new Date(workoutStartRef.current ?? Date.now()).toISOString();
                    const description = buildStravaDescription(guidedWorkout, distKm, finalElapsed);
                    const activityName = guidedWorkout?.title
                        || `Course libre ${getTimeOfDay()}`;

                    const res = await api.post('/strava/push-activity', {
                        name:            activityName,
                        description,
                        type:            'Run',
                        startedAt,
                        distanceMeters:  Math.round(finalDistanceM),
                        durationSeconds: finalElapsed,
                    });
                    const id  = res.data?.stravaActivityId ?? res.data?.id;
                    const url = id
                        ? `https://www.strava.com/activities/${id}`
                        : res.data?.url ?? 'https://www.strava.com';
                    setStravaActivityUrl(url);
                    setStravaState('pushed');
                } catch (stravaErr: any) {
                    const status = stravaErr?.response?.status;
                    // 401/403/404 → Strava not connected
                    if (status === 401 || status === 403 || status === 404) {
                        setStravaState('not_connected');
                    } else {
                        setStravaState('error');
                    }
                }
            } catch (e) {
                console.error('Failed to save activity', e);
                setSaveState('error');
            }
        } else {
            setSaveState('skipped');
        }
    }, [stopGPS, stopAccelerometer, guidedWorkout, beep]);

    useEffect(() => {
        return () => { stopGPS(); stopAccelerometer(); };
    }, [stopGPS, stopAccelerometer]);

    // ─── Derived metrics ──────────────────────────────────────────────────
    const distanceKm = distanceM / 1000;
    const speedKmH = elapsed > 0 ? (distanceKm / elapsed) * 3600 : 0;
    const segmentPaceSec = segmentDistanceM > 25 && segmentElapsed > 0
        ? segmentElapsed / (segmentDistanceM / 1000) : 0;
    const displayPaceSec = currentSegment?.distanceKm ? segmentPaceSec : currentPaceSec;
    const paceStatus = paceStatusColor(displayPaceSec, targetPaceMin);
    const completionPct = guidedWorkout?.distanceKm
        ? Math.min(100, (distanceKm / guidedWorkout.distanceKm) * 100) : 0;

    const paceColor = { fast: 'text-blue-400', good: 'text-primary', slow: 'text-red-400', null: 'text-white' }[paceStatus ?? 'null'];
    const paceLabel = { fast: '↑ Trop rapide', good: '✓ Allure parfaite', slow: '↓ Trop lent', null: '' }[paceStatus ?? 'null'];

    // ─── IDLE / Start Screen ─────────────────────────────────────────────
    if (phase === 'idle') {
        return (
            <div className="runna-screen flex flex-col">
                <div className="px-4 pt-4 pb-2 flex items-center gap-3 runna-topbar">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-base font-black uppercase tracking-tight leading-none text-white">
                            {guidedWorkout ? guidedWorkout.title : 'Course Libre'}
                        </h1>
                        {guidedWorkout?.description && (
                            <p className="text-[10px] text-text-muted mt-0.5 font-medium">{guidedWorkout.description}</p>
                        )}
                    </div>
                </div>

                {guidedWorkout && (
                    <div className="px-4 pt-6 pb-4">
                        <div className="runna-hero rounded-[28px] p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Flag size={16} className="text-primary" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Séance Guidée</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {guidedWorkout.distanceKm && (
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-white">{guidedWorkout.distanceKm}</div>
                                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-0.5">km</div>
                                    </div>
                                )}
                                {guidedWorkout.durationMinutes && (
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-white">{guidedWorkout.durationMinutes}</div>
                                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-0.5">min</div>
                                    </div>
                                )}
                                {guidedWorkout.targetPaceMin && (
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-primary">{formatPace(guidedWorkout.targetPaceMin * 60)}</div>
                                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-0.5">/km</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {segments && (
                    <div className="px-4 pb-4">
                        <h3 className="section-label">Segments</h3>
                        <div className="space-y-2">
                            {segments.map((seg, i) => (
                                <div key={i} className="flex items-center gap-3 runna-card rounded-2xl p-3.5">
                                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${
                                        seg.type === 'warmup' ? 'bg-blue-400' :
                                        seg.type === 'interval' ? 'bg-orange-400' :
                                        seg.type === 'cooldown' ? 'bg-purple-400' :
                                        seg.type === 'rest' ? 'bg-white/20' : 'bg-primary'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-black uppercase tracking-tight">{seg.label}</div>
                                        <div className="text-[10px] text-text-muted font-medium">
                                            {seg.distanceKm && `${seg.distanceKm} km`}
                                            {seg.distanceKm && seg.targetPaceMin && ' · '}
                                            {seg.targetPaceMin && `Allure cible : ${formatPace(seg.targetPaceMin * 60)}/km`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-1" />

                <div className="px-6 pb-12 pt-4">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStart}
                        className="w-full h-20 bg-primary text-white font-black text-lg uppercase tracking-widest rounded-3xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/30"
                    >
                        <Play size={28} fill="currentColor" />
                        Démarrer
                    </motion.button>
                    <p className="text-center text-[10px] text-text-muted font-bold uppercase tracking-widest mt-3">Le GPS démarrera automatiquement</p>
                </div>
            </div>
        );
    }

    // ─── DONE Screen ──────────────────────────────────────────────────────
    if (phase === 'done') {
        const avgPace = elapsed > 0 && distanceM > 0 ? elapsed / (distanceM / 1000) : 0;

        const openStrava = () => {
            const url = stravaActivityUrl ?? 'https://www.strava.com';
            // On mobile, strava:// deep link opens the app directly
            const appUrl = stravaActivityUrl
                ? `strava://activities/${stravaActivityUrl.split('/').pop()}`
                : 'strava://';
            // Try app first, fall back to web after 1.2 s
            window.location.href = appUrl;
            setTimeout(() => window.open(url, '_blank'), 1200);
        };

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="runna-screen flex flex-col items-center px-6 pt-10 pb-16 overflow-y-auto text-center"
            >
                {/* Trophy */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                    className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/30 flex-shrink-0"
                >
                    <Flag size={40} className="text-white" fill="currentColor" />
                </motion.div>

                <h1 className="text-3xl font-black uppercase tracking-tight mb-1">Bravo !</h1>
                <p className="text-text-muted text-sm mb-8 font-medium flex items-center justify-center gap-2">
                    {saveState === 'saving' && <><Loader2 size={14} className="animate-spin" /> Enregistrement…</>}
                    {saveState === 'saved'   && '✓ Activité enregistrée'}
                    {saveState === 'error'   && '⚠ Erreur — activité non enregistrée'}
                    {saveState === 'skipped' && 'Séance terminée'}
                    {saveState === 'idle'    && 'Séance terminée'}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-6">
                    {[
                        { label: 'Distance',    value: `${distanceKm.toFixed(2)}`, unit: 'km' },
                        { label: 'Temps',       value: formatTime(elapsed),         unit: '' },
                        { label: 'Allure moy.', value: formatPace(avgPace),         unit: '/km' },
                    ].map(m => (
                        <div key={m.label} className="runna-card rounded-2xl p-4 text-center">
                            <div className="text-lg font-black text-white">{m.value}</div>
                            {m.unit && <div className="text-[9px] text-primary uppercase font-black tracking-widest">{m.unit}</div>}
                            <div className="text-[9px] text-text-muted uppercase tracking-widest mt-1 font-bold">{m.label}</div>
                        </div>
                    ))}
                </div>

                {/* Route recap map */}
                {gpsPoints.current.length > 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="w-full max-w-sm mb-6 rounded-[24px] overflow-hidden flex-shrink-0"
                        style={{ height: 180 }}
                    >
                        <WorkoutMap
                            gpsPointsRef={gpsPoints}
                            distanceTrigger={distanceM}
                            className="w-full h-full"
                        />
                    </motion.div>
                )}

                {/* ── Strava sync card ──────────────────────────────── */}
                <AnimatePresence>
                    {(saveState === 'saved' || saveState === 'error' || stravaState !== 'idle') && (
                        <motion.div
                            key="strava-card"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="w-full max-w-sm mb-6"
                        >
                            <div className={`glass-card rounded-[22px] p-4 border transition-all ${
                                stravaState === 'pushed'
                                    ? 'border-orange-500/30'
                                    : 'border-transparent'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {/* Strava logo */}
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                                        stravaState === 'pushed' ? 'bg-orange-500' : 'bg-orange-500/15'
                                    }`}
                                    style={stravaState === 'pushed' ? { boxShadow: '0 4px 14px rgba(251,146,60,0.35)' } : {}}>
                                        <svg width="20" height="20" viewBox="0 0 24 24"
                                            fill={stravaState === 'pushed' ? 'white' : '#f97316'}>
                                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                        </svg>
                                    </div>

                                    <div className="flex-1 min-w-0 text-left">
                                        {stravaState === 'pushing' && (
                                            <>
                                                <p className="text-sm font-black text-white flex items-center gap-2">
                                                    <Loader2 size={13} className="animate-spin text-orange-400" />
                                                    Envoi vers Strava…
                                                </p>
                                                <p className="text-[10px] text-text-muted mt-0.5">Synchronisation en cours</p>
                                            </>
                                        )}
                                        {stravaState === 'pushed' && (
                                            <>
                                                <p className="text-sm font-black text-white">Envoyée sur Strava ✓</p>
                                                <p className="text-[10px] text-orange-400 font-bold mt-0.5">Activité synchronisée</p>
                                            </>
                                        )}
                                        {stravaState === 'not_connected' && (
                                            <>
                                                <p className="text-sm font-black text-white">Strava non connecté</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">Connecte Strava dans ton Profil</p>
                                            </>
                                        )}
                                        {stravaState === 'error' && (
                                            <>
                                                <p className="text-sm font-black text-white">Erreur Strava</p>
                                                <p className="text-[10px] text-text-muted mt-0.5">Réessaie depuis Profil → Connexions</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Open Strava button */}
                                {stravaState === 'pushed' && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={openStrava}
                                        className="mt-3 w-full py-3 rounded-full bg-orange-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                                        style={{ boxShadow: '0 4px 16px rgba(251,146,60,0.35)' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                        </svg>
                                        Voir sur Strava
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button onClick={() => navigate('/activities')} className="btn-primary w-full max-w-sm">
                    Voir mes activités
                </button>
            </motion.div>
        );
    }

    // ─── ACTIVE WORKOUT HUD (running / paused) ───────────────────────────
    return (
        <div className="runna-screen flex flex-col select-none overflow-hidden h-screen">

            {/* ── Top bar ─────────────────────────────────────────── */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between runna-topbar flex-shrink-0 z-10">
                <button
                    onClick={() => { if (window.confirm('Abandonner la séance ?')) handleStop(); }}
                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 justify-center ${phase === 'paused' ? 'text-amber-400' : 'text-primary'}`}>
                        {phase === 'paused' ? (
                            '⏸ En pause'
                        ) : (
                            <><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" /> En cours</>
                        )}
                    </div>
                    {guidedWorkout && <div className="text-xs font-black text-white mt-0.5">{guidedWorkout.title}</div>}
                </div>
                <button
                    onClick={() => setSoundEnabled(s => !s)}
                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-text-muted"
                >
                    {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
            </div>

            {/* ── MAP ─────────────────────────────────────────────── */}
            <div className="flex-shrink-0 relative" style={{ height: '38vh' }}>
                <WorkoutMap
                    gpsPointsRef={gpsPoints}
                    distanceTrigger={gpsCount}
                    className="w-full h-full"
                />

                {/* Overlay: Timer + Distance on map */}
                <div className="absolute bottom-3 left-3 right-3 z-10">
                    <div className="glass-heavy rounded-[20px] px-5 py-3 flex items-baseline justify-between">
                        <div className="text-center flex-1">
                            <div className="text-4xl font-black tabular-nums tracking-tighter leading-none text-white">
                                {formatTime(elapsed)}
                            </div>
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-0.5">Temps</div>
                        </div>
                        <div className="w-px h-10 bg-white/10 mx-4 flex-shrink-0" />
                        <div className="text-center flex-1">
                            <div className="text-4xl font-black tabular-nums leading-none text-white">
                                {distanceKm.toFixed(2)}
                                <span className="text-lg text-text-muted ml-1">km</span>
                            </div>
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-0.5">Distance</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Segment / lap banners ────────────────────────────── */}
            <AnimatePresence>
                {currentSegment && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`mx-4 mt-2 rounded-2xl px-4 py-2.5 flex items-center justify-between flex-shrink-0 ${
                            currentSegment.type === 'interval' ? 'bg-orange-500/10 border border-orange-400/30' :
                            currentSegment.type === 'rest' ? 'runna-card' : 'bg-primary/10 border border-primary/20'
                        }`}
                    >
                        <div>
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Segment {segmentIndex + 1}/{segments?.length}</div>
                            <div className="text-sm font-black text-white">{currentSegment.label}</div>
                        </div>
                        {currentSegment.targetPaceMin && (
                            <div className="text-right">
                                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Cible</div>
                                <div className="text-base font-black text-primary">{formatPace(currentSegment.targetPaceMin * 60)}<span className="text-xs text-text-muted">/km</span></div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {lapToast && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mx-4 mt-2 rounded-2xl px-4 py-2.5 bg-primary/12 border border-primary/25 flex-shrink-0"
                    >
                        <div className="text-[9px] font-black text-primary uppercase tracking-widest">Fractionné</div>
                        <div className="text-sm font-black text-white">{lapToast}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Metrics grid ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col px-4 pt-3 pb-0 min-h-0">

                {/* Progress bar for guided workouts */}
                {guidedWorkout?.distanceKm && (
                    <div className="mb-3 flex-shrink-0">
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary rounded-full"
                                animate={{ width: `${completionPct}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] text-text-muted font-black uppercase tracking-widest mt-1">
                            <span>0</span>
                            <span>{guidedWorkout.distanceKm} km</span>
                        </div>
                    </div>
                )}

                {/* 4-cell secondary metrics */}
                <div className="grid grid-cols-4 gap-2 flex-shrink-0">
                    {/* Pace */}
                    <div className={`runna-card rounded-2xl p-3 text-center border ${
                        paceStatus === 'good' ? 'border-primary/30' :
                        paceStatus === 'slow' ? 'border-red-400/30' :
                        paceStatus === 'fast' ? 'border-blue-400/30' : 'border-white/5'
                    } transition-colors`}>
                        <Zap size={11} className={`mx-auto mb-1 ${paceColor}`} />
                        <div className={`text-base font-black tabular-nums leading-none ${paceColor}`}>
                            {formatPace(displayPaceSec)}
                        </div>
                        <div className="text-[8px] text-text-muted uppercase font-black tracking-widest mt-0.5">/km</div>
                        {paceLabel && <div className={`text-[8px] font-black mt-0.5 ${paceColor}`}>{paceLabel}</div>}
                    </div>

                    {/* Speed */}
                    <div className="runna-card rounded-2xl p-3 text-center">
                        <Activity size={11} className="text-text-muted mx-auto mb-1" />
                        <div className="text-base font-black tabular-nums leading-none">{speedKmH.toFixed(1)}</div>
                        <div className="text-[8px] text-text-muted uppercase font-black tracking-widest mt-0.5">km/h</div>
                    </div>

                    {/* HR */}
                    <div className="runna-card rounded-2xl p-3 text-center">
                        <Heart size={11} className={`mx-auto mb-1 ${heartRate ? 'text-red-400' : 'text-text-muted'}`} />
                        <div className={`text-base font-black tabular-nums leading-none ${heartRate ? 'text-red-400' : 'text-text-muted'}`}>
                            {heartRate ?? '--'}
                        </div>
                        <div className="text-[8px] text-text-muted uppercase font-black tracking-widest mt-0.5">bpm</div>
                    </div>

                    {/* Cadence */}
                    <div className="runna-card rounded-2xl p-3 text-center">
                        <MapPin size={11} className="text-text-muted mx-auto mb-1" />
                        <div className="text-base font-black tabular-nums leading-none">{cadence ?? '--'}</div>
                        <div className="text-[8px] text-text-muted uppercase font-black tracking-widest mt-0.5">spm</div>
                    </div>
                </div>

                {/* Pace guidance pill */}
                <AnimatePresence>
                    {paceStatus && targetPaceMin && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className={`mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 ${
                                paceStatus === 'good' ? 'bg-primary/10 border border-primary/20' :
                                paceStatus === 'slow' ? 'bg-red-500/10 border border-red-500/20' :
                                'bg-blue-400/10 border border-blue-400/20'
                            }`}
                        >
                            {paceStatus === 'slow' ? <ChevronUp size={14} className="text-red-400" /> :
                             paceStatus === 'fast' ? <ChevronDown size={14} className="text-blue-400" /> :
                             <Minus size={14} className="text-primary" />}
                            <span className={`text-[10px] font-black uppercase tracking-widest ${paceColor}`}>
                                {paceLabel} · Cible {formatPace(targetPaceMin * 60)}/km
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1" />
            </div>

            {/* ── Controls ─────────────────────────────────────────── */}
            <div className="flex-shrink-0 px-6 pb-10 pt-3 flex gap-5 items-center justify-center">
                {phase === 'running' ? (
                    <>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePause}
                            className="w-[72px] h-[72px] bg-white/10 border border-white/15 rounded-3xl flex items-center justify-center"
                        >
                            <Pause size={26} />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleStop}
                            className="w-[72px] h-[72px] bg-red-500/12 border border-red-500/25 rounded-3xl flex items-center justify-center text-red-400"
                        >
                            <Square size={22} fill="currentColor" />
                        </motion.button>
                    </>
                ) : (
                    <>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleResume}
                            className="w-[72px] h-[72px] bg-primary rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30"
                        >
                            <Play size={26} className="text-white" fill="white" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleStop}
                            className="w-[72px] h-[72px] bg-red-500/12 border border-red-500/25 rounded-3xl flex items-center justify-center text-red-400"
                        >
                            <Square size={22} fill="currentColor" />
                        </motion.button>
                    </>
                )}
            </div>
        </div>
    );
}
