import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, Square, ChevronLeft, MapPin,
    Zap, Heart, Activity, Volume2, VolumeX, Flag,
    ChevronUp, ChevronDown, Minus
} from 'lucide-react';
import { api } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────
interface WorkoutSegment {
    label: string;
    distanceKm?: number;
    durationSeconds?: number;
    targetPaceMin?: number; // min/km
    type: 'warmup' | 'run' | 'interval' | 'cooldown' | 'rest';
}

interface GuidedWorkout {
    title: string;
    description: string;
    distanceKm?: number;
    durationMinutes?: number;
    targetPaceMin?: number; // min/km — e.g. 5.5 = 5:30/km
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
    if (diff < -15) return 'fast'; // >15s/km too fast
    if (diff > 15) return 'slow';  // >15s/km too slow
    return 'good';
}

// ─── Component ───────────────────────────────────────────────────────────
export function LiveWorkout() {
    const navigate = useNavigate();
    const location = useLocation();

    // Guided workout passed via navigation state (from Training page)
    const guidedWorkout: GuidedWorkout | null = location.state?.workout || null;

    // Workout state
    const [phase, setPhase] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
    const [elapsed, setElapsed] = useState(0); // seconds
    const [distanceM, setDistanceM] = useState(0); // metres
    const [currentPaceSec, setCurrentPaceSec] = useState(0); // sec/km
    const [heartRate] = useState<number | null>(null);
    const [cadence, setCadence] = useState<number | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [segmentIndex, setSegmentIndex] = useState(0);
    const [segmentStartDistance, setSegmentStartDistance] = useState(0);
    const [segmentStartElapsed, setSegmentStartElapsed] = useState(0);
    const [beeped, setBeeped] = useState(false);
    const [lapToast, setLapToast] = useState<string | null>(null);
    const gpsPoints = useRef<GpsPoint[]>([]);
    const watchId = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastKmRef = useRef(0);
    const audioCtx = useRef<AudioContext | null>(null);
    const stepCountRef = useRef(0);
    const accelRef = useRef<any>(null);
    const workoutStartRef = useRef<number | null>(null);
    const completedLapsRef = useRef<WorkoutLap[]>([]);

    // Active segment
    const segments = guidedWorkout?.segments || null;
    const currentSegment = segments ? segments[segmentIndex] : null;
    const targetPaceMin = currentSegment?.targetPaceMin || guidedWorkout?.targetPaceMin;
    const segmentDistanceM = Math.max(0, distanceM - segmentStartDistance);
    const segmentElapsed = Math.max(0, elapsed - segmentStartElapsed);

    // ─── Beep function ────────────────────────────────────────────────────
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

    // ─── GPS tracking ─────────────────────────────────────────────────────
    const startGPS = useCallback(() => {
        if (!navigator.geolocation) return;
        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                const point: GpsPoint = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    timestamp: Date.now(),
                };
                gpsPoints.current.push(point);

                // Update distance
                if (gpsPoints.current.length >= 2) {
                    const prev = gpsPoints.current[gpsPoints.current.length - 2];
                    const d = haversineDistance(prev, point);
                    setDistanceM(prev => {
                        const newDist = prev + d;
                        // Splits: beep on each km
                        const prevKm = Math.floor(lastKmRef.current / 1000);
                        const newKm = Math.floor(newDist / 1000);
                        if (newKm > prevKm) {
                            beep(660, 0.3);
                        }
                        lastKmRef.current = newDist;
                        return newDist;
                    });

                    // Calculate rolling pace (last 5 points)
                    const recent = gpsPoints.current.slice(-5);
                    if (recent.length >= 2) {
                        const first = recent[0];
                        const last = recent[recent.length - 1];
                        const totalDist = recent.slice(1).reduce((acc, p, i) => acc + haversineDistance(recent[i], p), 0);
                        const totalTime = (last.timestamp - first.timestamp) / 1000;
                        if (totalDist > 5) {
                            const secPerKm = (totalTime / totalDist) * 1000;
                            setCurrentPaceSec(secPerKm);
                        }
                    }
                }
            },
            (err) => console.warn('GPS error:', err),
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
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
            if (mag > 12) { // Step detected
                const now = Date.now();
                const interval = now - lastPeak;
                if (interval > 250 && interval < 1500) {
                    stepBuffer.push(60000 / interval);
                    if (stepBuffer.length > 8) stepBuffer.shift();
                    const avg = stepBuffer.reduce((a, b) => a + b, 0) / stepBuffer.length;
                    setCadence(Math.round(avg * 2)); // steps -> spm
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
        if (phase !== 'running' || !targetPaceMin || paceToTrack <= 0) {
            setBeeped(false);
            return;
        }
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
            const lapDistanceMeters = Math.round(segmentDistanceM);
            const lapDurationSeconds = Math.max(1, segmentElapsed);
            completedLapsRef.current.push({
                index: completedLapsRef.current.length + 1,
                label: seg.label,
                distanceMeters: lapDistanceMeters,
                durationSeconds: lapDurationSeconds,
                avgPaceSecPerKm: Math.round(lapDurationSeconds / Math.max(lapDistanceMeters / 1000, 0.001)),
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
        const timeout = window.setTimeout(() => setLapToast(null), 2200);
        return () => window.clearTimeout(timeout);
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

        // Save activity
        if (distanceM > 50 && elapsed > 10) {
            try {
                const route = gpsPoints.current.map((point) => ({
                    lat: point.lat,
                    lng: point.lng,
                }));
                const splits = completedLapsRef.current.map((lap) => ({
                    kmNumber: lap.index,
                    splitTimeSec: lap.durationSeconds,
                    avgPaceSecPerKm: lap.avgPaceSecPerKm,
                }));

                await api.post('/activities', {
                    name: guidedWorkout?.title || 'Course libre',
                    activityType: 'run',
                    startedAt: new Date(workoutStartRef.current ?? Date.now()).toISOString(),
                    distanceMeters: Math.round(distanceM),
                    durationSeconds: elapsed,
                    source: 'manual',
                    route: route.length > 1 ? route : undefined,
                    splits: splits.length > 0 ? splits : undefined,
                });
            } catch (e) { console.error('Failed to save activity', e); }
        }
    }, [stopGPS, stopAccelerometer, distanceM, elapsed, guidedWorkout, beep]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopGPS(); stopAccelerometer(); };
    }, [stopGPS, stopAccelerometer]);

    // ─── Derived metrics ──────────────────────────────────────────────────
    const distanceKm = distanceM / 1000;
    const speedKmH = elapsed > 0 ? (distanceKm / elapsed) * 3600 : 0;
    const segmentPaceSec = segmentDistanceM > 25 && segmentElapsed > 0
        ? segmentElapsed / (segmentDistanceM / 1000)
        : 0;
    const displayPaceSec = currentSegment?.distanceKm ? segmentPaceSec : currentPaceSec;
    const paceStatus = paceStatusColor(displayPaceSec, targetPaceMin);
    const completionPct = guidedWorkout?.distanceKm
        ? Math.min(100, (distanceKm / guidedWorkout.distanceKm) * 100)
        : 0;

    const paceColor = {
        fast: 'text-blue-400',
        good: 'text-primary',
        slow: 'text-red-400',
        null: 'text-white',
    }[paceStatus ?? 'null'];

    const paceLabel = {
        fast: '↑ Trop rapide',
        good: '✓ Allure parfaite',
        slow: '↓ Trop lent',
        null: '',
    }[paceStatus ?? 'null'];

    // ─── Idle/Start Screen ────────────────────────────────────────────────
    if (phase === 'idle') {
        return (
            <div className="runna-screen flex flex-col">
                {/* Header */}
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

                {/* Stats preview */}
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

                {/* Segments */}
                {segments && (
                    <div className="px-4 pb-4">
                        <h3 className="section-label">Segments</h3>
                        <div className="space-y-2">
                            {segments.map((seg, i) => (
                                <div key={i} className="flex items-center gap-3 runna-card rounded-2xl p-3.5">
                                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${seg.type === 'warmup' ? 'bg-blue-400' :
                                        seg.type === 'interval' ? 'bg-orange-400' :
                                            seg.type === 'cooldown' ? 'bg-purple-400' :
                                                seg.type === 'rest' ? 'bg-white/20' :
                                                    'bg-primary'
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

                {/* Start button */}
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

    // ─── Done Screen ──────────────────────────────────────────────────────
    if (phase === 'done') {
        const avgPace = elapsed > 0 && distanceM > 0 ? elapsed / (distanceM / 1000) : 0;
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="runna-screen flex flex-col items-center justify-center px-6 text-center"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                    className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/30"
                >
                    <Flag size={40} className="text-white" fill="currentColor" />
                </motion.div>
                <h1 className="text-3xl font-black uppercase tracking-tight mb-1">Bravo !</h1>
                <p className="text-text-muted text-sm mb-8 font-medium">Séance terminée · Activité enregistrée</p>

                <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-10">
                    {[
                        { label: 'Distance', value: `${distanceKm.toFixed(2)}`, unit: 'km' },
                        { label: 'Temps', value: formatTime(elapsed), unit: '' },
                        { label: 'Allure moy.', value: formatPace(avgPace), unit: '/km' },
                    ].map(m => (
                        <div key={m.label} className="runna-card rounded-2xl p-4 text-center">
                            <div className="text-lg font-black text-white">{m.value}</div>
                            {m.unit && <div className="text-[9px] text-primary uppercase font-black tracking-widest">{m.unit}</div>}
                            <div className="text-[9px] text-text-muted uppercase tracking-widest mt-1 font-bold">{m.label}</div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/activities')}
                    className="btn-primary max-w-sm"
                >
                    Voir mes activités
                </button>
            </motion.div>
        );
    }

    // ─── Active Workout HUD ───────────────────────────────────────────────
    return (
        <div className="runna-screen flex flex-col select-none overflow-hidden">
            {/* Top bar */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between runna-topbar">
                <button
                    onClick={() => { if (window.confirm('Abandonner la séance ?')) handleStop(); }}
                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                        {phase === 'paused' ? '⏸ En pause' : '● En cours'}
                    </div>
                    {guidedWorkout && <div className="text-xs font-black text-white">{guidedWorkout.title}</div>}
                </div>
                <button
                    onClick={() => setSoundEnabled(s => !s)}
                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-text-muted"
                >
                    {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
            </div>

            {/* Guided segment banner */}
            <AnimatePresence>
                {currentSegment && (
                    <motion.div
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between ${currentSegment.type === 'interval' ? 'bg-orange-500/10 border border-orange-400/30' :
                            currentSegment.type === 'rest' ? 'runna-card' :
                                'bg-primary/10 border border-primary/20'
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
                        initial={{ opacity: 0, y: -16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.96 }}
                        className="mx-4 mt-3 rounded-2xl px-4 py-3 bg-primary/12 border border-primary/25"
                    >
                        <div className="text-[10px] font-black text-primary uppercase tracking-widest">Fractionné</div>
                        <div className="text-sm font-black text-white">{lapToast}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main metrics */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
                {/* Timer — huge */}
                <div className="text-center">
                    <div className="text-7xl font-black tabular-nums tracking-tighter leading-none text-white">
                        {formatTime(elapsed)}
                    </div>
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">Temps écoulé</div>
                </div>

                {/* Distance */}
                <div className="text-center">
                    <div className="text-5xl font-black tabular-nums leading-none text-white">
                        {distanceKm.toFixed(2)}
                        <span className="text-xl text-text-muted ml-1">km</span>
                    </div>
                </div>

                {/* Progress bar (guided mode) */}
                {guidedWorkout?.distanceKm && (
                    <div className="w-full max-w-xs">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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

                {/* Secondary metrics grid */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    {/* Pace */}
                        <div className={`runna-card rounded-2xl p-4 border ${paceStatus === 'good' ? 'border-primary/30' : paceStatus === 'slow' ? 'border-red-300' : paceStatus === 'fast' ? 'border-blue-300' : 'border-white/10'} text-center transition-colors`}>
                            <Zap size={14} className={`mx-auto mb-1 ${paceColor}`} />
                            <div className={`text-2xl font-black tabular-nums ${paceColor}`}>
                                {formatPace(displayPaceSec)}
                            </div>
                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-0.5">/km</div>
                        {paceLabel && (
                            <div className={`text-[9px] font-black mt-1 ${paceColor}`}>{paceLabel}</div>
                        )}
                    </div>

                    {/* Speed */}
                        <div className="runna-card rounded-2xl p-4 text-center">
                        <Activity size={14} className="text-text-muted mx-auto mb-1" />
                        <div className="text-2xl font-black tabular-nums">{speedKmH.toFixed(1)}</div>
                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-0.5">km/h</div>
                    </div>

                    {/* Heart rate */}
                        <div className="runna-card rounded-2xl p-4 text-center">
                        <Heart size={14} className={`mx-auto mb-1 ${heartRate ? 'text-red-400' : 'text-text-muted'}`} />
                        <div className={`text-2xl font-black tabular-nums ${heartRate ? 'text-red-400' : 'text-text-muted'}`}>
                            {heartRate ?? '--'}
                        </div>
                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-0.5">bpm</div>
                    </div>

                    {/* Cadence */}
                        <div className="runna-card rounded-2xl p-4 text-center">
                        <MapPin size={14} className="text-text-muted mx-auto mb-1" />
                        <div className="text-2xl font-black tabular-nums">
                            {cadence ?? '--'}
                        </div>
                        <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-0.5">spm</div>
                    </div>
                </div>

                {/* Pace guidance indicator */}
                <AnimatePresence>
                    {paceStatus && targetPaceMin && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${paceStatus === 'good' ? 'bg-primary/10 border border-primary/20' :
                                paceStatus === 'slow' ? 'bg-red-500/10 border border-red-500/20' :
                                    'bg-blue-400/10 border border-blue-400/20'
                                }`}
                        >
                            {paceStatus === 'slow' ? <ChevronUp size={16} className="text-red-400" /> :
                                paceStatus === 'fast' ? <ChevronDown size={16} className="text-blue-400" /> :
                                    <Minus size={16} className="text-primary" />}
                            <span className={`text-xs font-black uppercase tracking-widest ${paceColor}`}>
                                {paceLabel} · Cible {formatPace(targetPaceMin * 60)}/km
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="px-6 pb-12 pt-4 flex gap-4 items-center justify-center">
                {phase === 'running' ? (
                    <>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePause}
                            className="w-20 h-20 bg-white/10 border border-white/10 rounded-3xl flex items-center justify-center"
                        >
                            <Pause size={28} />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleStop}
                            className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500"
                        >
                            <Square size={24} fill="currentColor" />
                        </motion.button>
                    </>
                ) : (
                    <>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleResume}
                            className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30"
                        >
                            <Play size={28} className="text-white" fill="white" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleStop}
                            className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500"
                        >
                            <Square size={24} fill="currentColor" />
                        </motion.button>
                    </>
                )}
            </div>
        </div>
    );
}
