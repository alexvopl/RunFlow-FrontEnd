import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Activity, Timer, Mountain, Package, TrendingUp, Swords,
    CheckCircle2, RefreshCw, Plus, ChevronDown, ChevronUp,
    Loader2, Trophy, AlertCircle, Ticket, Clock,
} from 'lucide-react';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';
import { formatDistance, formatDuration, formatPaceSec } from '../../utils/format';
import type { WarBattle } from '../../hooks/useWarData';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BattleParticipation {
    id?: string;
    battleId: string;
    score: number;
    status: string;
    counted?: boolean;
    submittedAt?: string | null;
}

interface BattleScoreboardEntry {
    rank: number;
    clanId: string;
    clanName: string;
    totalPoints: number;
    contributors?: number;
}

interface WindowStats {
    countRuns: number;
    sumMinutes: number;
    sumElevationGain: number;
    maxDistance: number;
    minPaceSecPerKm: number | null;
    activityIds: string[];
}

interface UserActivity {
    id: string;
    name: string;
    activityType: string;
    startedAt: string;
    distanceMeters: number;
    durationSeconds: number;
    elevationGainM: number | null;
}

interface Props {
    battle: WarBattle;
    warId: string;
    myParticipation: BattleParticipation | null;
    myClanId: string;
    isPriority?: boolean;
    isOpen: boolean;
    onClose: () => void;
    onEnrolled: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BATTLE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; pulse?: boolean }> = {
    scheduled:  { label: 'À venir',          color: 'rgba(255,255,255,0.40)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' },
    upcoming:   { label: 'Bientôt',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    open:       { label: 'Ouvert',           color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', pulse: true },
    active:     { label: 'Ouvert',           color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', pulse: true },
    closed:     { label: 'Fenêtre fermée',   color: 'rgba(255,255,255,0.30)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
    scoring:    { label: 'Calcul en cours',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)' },
    finalized:  { label: 'Finalisée',        color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    completed:  { label: 'Terminée',         color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
    run: 'Course', trail: 'Trail', treadmill: 'Tapis', walk: 'Marche', hike: 'Randonnée', cycling: 'Vélo',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function BattleTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
    switch (type) {
        case 'consistency': case 'streak': return <Activity size={size} />;
        case 'time_trial': case 'time': case 'pace': return <Timer size={size} />;
        case 'elevation': return <Mountain size={size} />;
        case 'volume_capped': return <Package size={size} />;
        case 'longest_single': case 'distance': return <TrendingUp size={size} />;
        default: return <Swords size={size} />;
    }
}

interface Objective {
    title: string;
    description: string;
    scoreFormula: string;
    keyMetric: string;
}

function buildObjective(type: string, params: Record<string, any> = {}): Objective {
    switch (type) {
        case 'consistency': {
            const n = params.targetActivities ?? 3;
            const min = params.minDurationMinutes ?? 15;
            return {
                title: 'Régularité',
                description: `Réalisez ${n} activité${n > 1 ? 's' : ''} de minimum ${min} min dans la fenêtre.`,
                scoreFormula: `${n} activité${n > 1 ? 's' : ''} qualifiantes × 100 pts (cap 300)`,
                keyMetric: 'Activités complétées',
            };
        }
        case 'time_trial': {
            const distM = params.targetDistanceM ?? params.distanceMeters ?? 5000;
            const distKm = (distM / 1000).toFixed(1);
            return {
                title: 'Contre-la-montre',
                description: `Réalisez la meilleure allure sur ${distKm} km dans la fenêtre.`,
                scoreFormula: 'Score normalisé 0-1000 pts selon la vitesse',
                keyMetric: 'Meilleure allure',
            };
        }
        case 'elevation': {
            const cap = params.capElevationM ?? params.maxElevationM ?? 500;
            return {
                title: 'Dénivelé',
                description: `Accumulez le maximum de D+ (capé à ${cap} m).`,
                scoreFormula: `min(D+, ${cap} m) × 2 pts`,
                keyMetric: 'D+ cumulé',
            };
        }
        case 'volume_capped': {
            const capKm = params.maxDistanceKm;
            const capMin = params.capMinutes;
            if (capKm != null) {
                return {
                    title: 'Volume',
                    description: `Courez le plus possible avec un cap individuel à ${capKm} km.`,
                    scoreFormula: `min(distance, ${capKm} km) × 50 pts`,
                    keyMetric: 'Distance totale',
                };
            }
            if (capMin != null) {
                return {
                    title: 'Volume',
                    description: `Courez le plus possible avec un cap individuel à ${capMin} min.`,
                    scoreFormula: `min(durée, ${capMin} min) × pts`,
                    keyMetric: 'Temps de course',
                };
            }
            return {
                title: 'Volume',
                description: 'Distance totale avec cap individuel.',
                scoreFormula: 'min(distance, cap) × 50 pts',
                keyMetric: 'Distance totale',
            };
        }
        case 'longest_single': {
            const minKm = params.minDistanceKm ?? 5;
            return {
                title: 'Plus longue course',
                description: `Réalisez la course la plus longue possible (minimum ${minKm} km).`,
                scoreFormula: 'Longueur de la sortie × 50 pts (cap 1000)',
                keyMetric: 'Course la plus longue',
            };
        }
        default:
            return {
                title: type,
                description: 'Participez à cette épreuve pour marquer des points.',
                scoreFormula: 'Selon les règles de l\'épreuve',
                keyMetric: 'Score',
            };
    }
}

function formatWindowDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function windowCountdown(windowEnd: string): string {
    const ms = new Date(windowEnd).getTime() - Date.now();
    if (ms <= 0) return 'Fermée';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h === 0) return `Ferme dans ${m}m`;
    return `Ferme dans ${h}h ${String(m).padStart(2, '0')}m`;
}

function participationStatusLabel(status: string): { label: string; color: string } {
    switch (status) {
        case 'enrolled':    return { label: 'Inscrit', color: '#5ab2ff' };
        case 'submitted':   return { label: 'Activité soumise', color: '#f59e0b' };
        case 'counted':     return { label: 'Compté', color: '#10b981' };
        case 'rejected':    return { label: 'Rejeté', color: '#ef4444' };
        case 'scoring':     return { label: 'Calcul en cours', color: '#a78bfa' };
        default:            return { label: status, color: 'rgba(255,255,255,0.40)' };
    }
}

function isOpenBattle(status: string): boolean {
    return ['open', 'active'].includes(status);
}

function isFinalBattle(status: string): boolean {
    return ['finalized', 'completed'].includes(status);
}

function WindowStatRow({ label, value, isKey }: { label: string; value: string; isKey: boolean }) {
    return (
        <div className={`flex items-center justify-between py-2 ${isKey ? 'border-t border-white/5' : ''}`}>
            <span className="text-[11px] text-white/50 font-medium">{label}</span>
            <span className={`font-mono font-black text-sm ${isKey ? 'text-[#5ab2ff]' : 'text-white/80'}`}>{value}</span>
        </div>
    );
}

// ─── BattleDetailSheet ─────────────────────────────────────────────────────────

export function BattleDetailSheet({
    battle,
    warId,
    myParticipation,
    myClanId,
    isPriority,
    isOpen,
    onClose,
    onEnrolled,
}: Props) {
    const [scoreboard, setScoreboard] = useState<BattleScoreboardEntry[]>([]);
    const [windowStats, setWindowStats] = useState<WindowStats | null>(null);
    const [tickets, setTickets] = useState<number | null>(null);
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [loadingMain, setLoadingMain] = useState(false);
    const [showActivities, setShowActivities] = useState(false);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [participation, setParticipation] = useState<BattleParticipation | null>(myParticipation);
    const [error, setError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    const isOpen_ = isOpenBattle(battle.status);
    const isFinalized_ = isFinalBattle(battle.status);
    const enrolled = participation !== null;

    useEffect(() => {
        setParticipation(myParticipation);
    }, [myParticipation]);

    const loadMain = useCallback(async () => {
        if (!isOpen) return;
        setLoadingMain(true);
        setError(null);
        try {
            const [sbRes, statsRes, ticketsRes] = await Promise.all([
                api.get(`/game/battles/${battle.id}/scoreboard`).catch(() => null),
                (isOpen_ || enrolled)
                    ? api.get(`/game/battles/${battle.id}/window-stats`).catch(() => null)
                    : Promise.resolve(null),
                api.get(`/game/wars/${warId}/my-tickets`).catch(() => null),
            ]);
            setScoreboard(sbRes?.data?.scoreboard ?? []);
            if (statsRes?.data?.stats) setWindowStats(statsRes.data.stats);
            if (ticketsRes?.data?.remaining != null) setTickets(ticketsRes.data.remaining);
        } catch (e) {
            setError(resolveError(e, 'Impossible de charger les détails.'));
        } finally {
            setLoadingMain(false);
        }
    }, [isOpen, battle.id, warId, isOpen_, enrolled]);

    useEffect(() => {
        loadMain();
    }, [loadMain]);

    const loadActivities = useCallback(async () => {
        if (loadingActivities || activities.length > 0) return;
        setLoadingActivities(true);
        try {
            const res = await api.get('/activities?limit=20&type=run');
            setActivities(res.data.activities ?? []);
        } catch {
            setActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    }, [loadingActivities, activities.length]);

    const handleShowActivities = () => {
        const next = !showActivities;
        setShowActivities(next);
        if (next) loadActivities();
    };

    const handleEnroll = async () => {
        setEnrolling(true);
        setError(null);
        try {
            const res = await api.post(`/game/battles/${battle.id}/enroll`);
            setParticipation({ battleId: battle.id, score: 0, status: res.data.status ?? 'enrolled' });
            onEnrolled();
        } catch (e) {
            setError(resolveError(e, 'Impossible de s\'inscrire.'));
        } finally {
            setEnrolling(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);
        try {
            await api.post(`/game/battles/${battle.id}/refresh`);
            // Reload window stats + scoreboard
            const [sbRes, statsRes] = await Promise.all([
                api.get(`/game/battles/${battle.id}/scoreboard`).catch(() => null),
                api.get(`/game/battles/${battle.id}/window-stats`).catch(() => null),
            ]);
            setScoreboard(sbRes?.data?.scoreboard ?? []);
            if (statsRes?.data?.stats) setWindowStats(statsRes.data.stats);
            setSubmitSuccess('Score recalculé !');
            setTimeout(() => setSubmitSuccess(null), 2500);
        } catch (e) {
            setError(resolveError(e, 'Impossible de recalculer le score.'));
        } finally {
            setRefreshing(false);
        }
    };

    const handleSubmitActivity = async (activityId: string) => {
        setSubmittingId(activityId);
        setError(null);
        try {
            await api.post(`/game/battles/${battle.id}/submit`, { activityId });
            setSubmitSuccess('Activité soumise ! Score en cours de calcul.');
            setTimeout(() => setSubmitSuccess(null), 3000);
            setShowActivities(false);
            // Reload stats
            const statsRes = await api.get(`/game/battles/${battle.id}/window-stats`).catch(() => null);
            if (statsRes?.data?.stats) setWindowStats(statsRes.data.stats);
        } catch (e) {
            setError(resolveError(e, 'Impossible de soumettre l\'activité.'));
        } finally {
            setSubmittingId(null);
        }
    };

    const statusCfg = BATTLE_STATUS_CONFIG[battle.status] ?? BATTLE_STATUS_CONFIG.scheduled;
    const objective = buildObjective(battle.battleType, battle.params ?? {});
    const myScoreEntry = scoreboard.find(s => s.clanId === myClanId);

    // Filter activities to battle window for display relevance
    const windowStart = new Date(battle.windowStart).getTime();
    const windowEnd_ = new Date(battle.windowEnd).getTime();
    const windowActivities = activities.filter(a => {
        const t = new Date(a.startedAt).getTime();
        return t >= windowStart && t <= windowEnd_;
    });
    const otherActivities = activities.filter(a => {
        const t = new Date(a.startedAt).getTime();
        return t < windowStart || t > windowEnd_;
    });
    const sortedActivities = [...windowActivities, ...otherActivities];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto rounded-t-[28px] overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: 'none',
                            maxHeight: '92dvh',
                        }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-10 h-1 rounded-full bg-white/15" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
                            <div
                                className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(90,178,255,0.14)', border: '1px solid rgba(90,178,255,0.22)' }}
                            >
                                <span className="text-[#5ab2ff]">
                                    <BattleTypeIcon type={battle.battleType} size={16} />
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-white text-sm truncate">{objective.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <div
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                        style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}
                                    >
                                        {statusCfg.pulse && (
                                            <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: statusCfg.color }} />
                                        )}
                                        {statusCfg.label}
                                    </div>
                                    {isPriority && (
                                        <span
                                            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                            style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.28)', color: '#fbbf24' }}
                                        >
                                            ★ Priorité
                                        </span>
                                    )}
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                                        Épreuve #{battle.battleOrder}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 glass-card rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="overflow-y-auto pb-10" style={{ maxHeight: 'calc(92dvh - 80px)' }}>
                            <div className="px-5 pt-4 space-y-4">

                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-2.5 rounded-[14px] px-4 py-3"
                                            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}
                                        >
                                            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                                            <p className="text-[11px] text-red-300">{error}</p>
                                        </motion.div>
                                    )}
                                    {submitSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center gap-2.5 rounded-[14px] px-4 py-3"
                                            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)' }}
                                        >
                                            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                                            <p className="text-[11px] text-emerald-300">{submitSuccess}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Window */}
                                <div className="glass-card rounded-[20px] p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={12} style={{ color: '#5ab2ff' }} />
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">Fenêtre</h3>
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Début</p>
                                            <p className="text-[11px] font-bold text-white/80">{formatWindowDate(battle.windowStart)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Fin</p>
                                            <p className="text-[11px] font-bold text-white/80">{formatWindowDate(battle.windowEnd)}</p>
                                        </div>
                                    </div>
                                    {isOpen_ && (
                                        <div
                                            className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-[12px] text-[11px] font-black"
                                            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                            {windowCountdown(battle.windowEnd)}
                                        </div>
                                    )}
                                </div>

                                {/* Objective */}
                                <div className="glass-card rounded-[20px] p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Trophy size={12} style={{ color: '#5ab2ff' }} />
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">Objectif</h3>
                                    </div>
                                    <p className="text-[13px] font-bold text-white/90 leading-relaxed">{objective.description}</p>
                                    <div
                                        className="mt-3 px-3 py-2 rounded-[12px] flex items-center gap-2"
                                        style={{ background: 'rgba(90,178,255,0.06)', border: '1px solid rgba(90,178,255,0.12)' }}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Score</span>
                                        <span className="text-[11px] font-black text-[#5ab2ff]">{objective.scoreFormula}</span>
                                    </div>
                                </div>

                                {/* Enrollment / Participation */}
                                {isOpen_ && !enrolled && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={handleEnroll}
                                        disabled={enrolling}
                                        className="w-full btn-primary py-4 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {enrolling ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        S'inscrire à l'épreuve
                                    </motion.button>
                                )}

                                {enrolled && (
                                    <div
                                        className="rounded-[20px] p-4"
                                        style={{ background: 'rgba(90,178,255,0.08)', border: '1px solid rgba(90,178,255,0.20)' }}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={14} className="text-[#5ab2ff]" />
                                                <p className="text-[11px] font-black text-white/80">Ma participation</p>
                                            </div>
                                            {(() => {
                                                const pSt = participationStatusLabel(participation?.status ?? '');
                                                return (
                                                    <span
                                                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                        style={{ background: `${pSt.color}20`, color: pSt.color, border: `1px solid ${pSt.color}40` }}
                                                    >
                                                        {pSt.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex items-end gap-3">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Score</p>
                                                <p className="font-mono font-black text-white text-2xl">
                                                    {(participation?.score ?? 0).toFixed(0)}
                                                    <span className="text-sm text-white/30 ml-1">pts</span>
                                                </p>
                                            </div>
                                            {participation?.counted !== undefined && (
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Compté</p>
                                                    <p className={`font-black text-sm ${participation.counted ? 'text-emerald-400' : 'text-white/40'}`}>
                                                        {participation.counted ? 'Oui' : 'Non'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {(isOpen_ || !isFinalized_) && (
                                            <button
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[11px] font-black text-[#5ab2ff] transition-all active:scale-[0.97]"
                                                style={{ background: 'rgba(90,178,255,0.10)', border: '1px solid rgba(90,178,255,0.18)' }}
                                            >
                                                {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                Recalculer mon score
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Window stats */}
                                {loadingMain && (
                                    <div className="space-y-2">
                                        <div className="skeleton h-32 rounded-[20px]" />
                                    </div>
                                )}

                                {!loadingMain && windowStats && (
                                    <div className="glass-card rounded-[20px] p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Activity size={12} style={{ color: '#5ab2ff' }} />
                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">Mes stats dans la fenêtre</h3>
                                        </div>

                                        {windowStats.countRuns === 0 ? (
                                            <div className="py-4 text-center">
                                                <p className="text-[12px] text-white/30 font-bold">Aucune activité compatible</p>
                                                <p className="text-[11px] text-white/20 mt-0.5">
                                                    Les activités dans la fenêtre s'afficheront ici.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-white/5">
                                                <WindowStatRow
                                                    label="Activités"
                                                    value={`${windowStats.countRuns}`}
                                                    isKey={battle.battleType === 'consistency'}
                                                />
                                                {windowStats.sumMinutes > 0 && (
                                                    <WindowStatRow
                                                        label="Temps total"
                                                        value={`${Math.round(windowStats.sumMinutes)} min`}
                                                        isKey={false}
                                                    />
                                                )}
                                                {windowStats.maxDistance > 0 && (
                                                    <WindowStatRow
                                                        label={battle.battleType === 'longest_single' ? 'Plus longue course' : 'Distance max'}
                                                        value={`${(windowStats.maxDistance / 1000).toFixed(2)} km`}
                                                        isKey={['longest_single', 'volume_capped', 'distance'].includes(battle.battleType)}
                                                    />
                                                )}
                                                {windowStats.sumElevationGain > 0 && (
                                                    <WindowStatRow
                                                        label="D+ cumulé"
                                                        value={`${Math.round(windowStats.sumElevationGain)} m`}
                                                        isKey={battle.battleType === 'elevation'}
                                                    />
                                                )}
                                                {windowStats.minPaceSecPerKm != null && windowStats.minPaceSecPerKm > 0 && (
                                                    <WindowStatRow
                                                        label="Meilleure allure"
                                                        value={`${formatPaceSec(windowStats.minPaceSecPerKm)} /km`}
                                                        isKey={['time_trial', 'pace'].includes(battle.battleType)}
                                                    />
                                                )}
                                                {windowStats.activityIds.length > 0 && (
                                                    <div className="pt-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/25">
                                                            {windowStats.activityIds.length} activité{windowStats.activityIds.length > 1 ? 's' : ''} dans la fenêtre
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Submit activity (manual) */}
                                {isOpen_ && enrolled && (
                                    <div className="glass-card rounded-[20px] overflow-hidden">
                                        <button
                                            onClick={handleShowActivities}
                                            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Plus size={14} style={{ color: '#5ab2ff' }} />
                                                <span className="text-[12px] font-black text-white/80">Ajouter une activité manuellement</span>
                                            </div>
                                            {showActivities ? (
                                                <ChevronUp size={14} className="text-white/30" />
                                            ) : (
                                                <ChevronDown size={14} className="text-white/30" />
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {showActivities && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-white/[0.06] px-3 pb-3 pt-2 space-y-1.5 max-h-72 overflow-y-auto">
                                                        {loadingActivities && (
                                                            <div className="flex justify-center py-4">
                                                                <Loader2 size={16} className="animate-spin text-white/30" />
                                                            </div>
                                                        )}
                                                        {!loadingActivities && sortedActivities.length === 0 && (
                                                            <p className="text-center text-[11px] text-white/30 py-4">Aucune activité récente</p>
                                                        )}
                                                        {!loadingActivities && sortedActivities.map(act => {
                                                            const inWindow = windowStats?.activityIds.includes(act.id);
                                                            const isWindowAct = new Date(act.startedAt).getTime() >= windowStart
                                                                && new Date(act.startedAt).getTime() <= windowEnd_;
                                                            return (
                                                                <div
                                                                    key={act.id}
                                                                    className="flex items-center gap-3 rounded-[14px] px-3 py-2.5"
                                                                    style={{
                                                                        background: inWindow
                                                                            ? 'rgba(16,185,129,0.08)'
                                                                            : isWindowAct
                                                                                ? 'rgba(90,178,255,0.05)'
                                                                                : 'rgba(255,255,255,0.03)',
                                                                        border: inWindow
                                                                            ? '1px solid rgba(16,185,129,0.20)'
                                                                            : isWindowAct
                                                                                ? '1px solid rgba(90,178,255,0.12)'
                                                                                : '1px solid rgba(255,255,255,0.05)',
                                                                    }}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <p className="text-[11px] font-black text-white truncate">{act.name || ACTIVITY_TYPE_LABELS[act.activityType] || act.activityType}</p>
                                                                            {inWindow && <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0" />}
                                                                            {isWindowAct && !inWindow && (
                                                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-[#5ab2ff]"
                                                                                    style={{ background: 'rgba(90,178,255,0.12)' }}>
                                                                                    DANS LA FENÊTRE
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] text-white/35 mt-0.5 flex items-center gap-2">
                                                                            <span>{new Date(act.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                                                            {act.distanceMeters > 0 && <span>{formatDistance(act.distanceMeters)} km</span>}
                                                                            {act.durationSeconds > 0 && <span>{formatDuration(act.durationSeconds)}</span>}
                                                                        </p>
                                                                    </div>
                                                                    {!inWindow && (
                                                                        <button
                                                                            onClick={() => handleSubmitActivity(act.id)}
                                                                            disabled={submittingId !== null}
                                                                            className="flex-shrink-0 text-[10px] font-black px-2.5 py-1.5 rounded-full transition-all active:scale-95 disabled:opacity-40"
                                                                            style={{ background: 'rgba(90,178,255,0.15)', border: '1px solid rgba(90,178,255,0.25)', color: '#5ab2ff' }}
                                                                        >
                                                                            {submittingId === act.id ? <Loader2 size={10} className="animate-spin" /> : 'Soumettre'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Tickets */}
                                {tickets !== null && !isFinalized_ && (
                                    <div
                                        className="flex items-center gap-3 rounded-[16px] px-4 py-3"
                                        style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)' }}
                                    >
                                        <Ticket size={14} className="text-violet-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                                                {tickets} ticket{tickets !== 1 ? 's' : ''} restant{tickets !== 1 ? 's' : ''}
                                            </p>
                                            <p className="text-[10px] text-white/35 mt-0.5">Limite de participation pour cette guerre</p>
                                        </div>
                                    </div>
                                )}

                                {/* Battle scoreboard */}
                                {!loadingMain && scoreboard.length > 0 && (
                                    <div className="glass-card rounded-[20px] p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Trophy size={12} style={{ color: '#5ab2ff' }} />
                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">Classement de l'épreuve</h3>
                                            {isPriority && (
                                                <span
                                                    className="ml-auto text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.22)', color: '#fbbf24' }}
                                                >
                                                    ★ Priorité
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {scoreboard.map((row, i) => {
                                                const isMyClan = row.clanId === myClanId;
                                                const rankColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b47844' : 'rgba(255,255,255,0.25)';
                                                return (
                                                    <div
                                                        key={row.clanId}
                                                        className="flex items-center gap-3 rounded-[14px] px-3 py-2.5"
                                                        style={{
                                                            background: isMyClan ? 'rgba(90,178,255,0.08)' : 'rgba(255,255,255,0.02)',
                                                            border: isMyClan ? '1px solid rgba(90,178,255,0.18)' : '1px solid rgba(255,255,255,0.04)',
                                                        }}
                                                    >
                                                        <span className="font-mono font-black text-sm w-6 flex-shrink-0" style={{ color: rankColor }}>
                                                            #{row.rank}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`font-black text-xs truncate ${isMyClan ? 'text-[#5ab2ff]' : 'text-white'}`}>
                                                                {row.clanName}
                                                                {isMyClan && myScoreEntry && (
                                                                    <span className="text-white/30 ml-1">(toi)</span>
                                                                )}
                                                            </p>
                                                            {row.contributors != null && (
                                                                <p className="text-[9px] text-white/25 mt-0.5">
                                                                    {row.contributors} contributeur{row.contributors !== 1 ? 's' : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <p className="font-mono font-black text-white/80 text-sm flex-shrink-0">
                                                            {row.totalPoints.toLocaleString()}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Score change note */}
                                <p className="text-center text-[10px] text-white/20 px-4 leading-relaxed pb-2">
                                    Les scores peuvent évoluer jusqu'à la finalisation de l'épreuve.
                                </p>

                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
