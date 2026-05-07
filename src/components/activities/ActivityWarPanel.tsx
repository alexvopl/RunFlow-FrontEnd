import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords, Zap, CheckCircle2, XCircle, AlertTriangle,
    Loader2, Activity, Timer, Mountain, Package, TrendingUp,
    Ticket, Info, SkipForward,
} from 'lucide-react';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MatchingBattle {
    battleId: string;
    warId: string;
    clanId: string;
    battleType: string;
    windowStart: string;
    windowEnd: string;
}

interface CreditResult {
    battleId: string;
    warId: string;
    score: number;
    status: 'credited' | 'skipped' | 'rejected' | string;
    message: string;
}

interface CreditResponse {
    activityId: string;
    validated: boolean;
    rejectionReason?: string;
    results: CreditResult[];
    summary?: {
        credited: number;
        totalPoints: number;
    };
}

type PanelState =
    | { phase: 'loading' }
    | { phase: 'empty' }
    | { phase: 'prompt'; battles: MatchingBattle[] }
    | { phase: 'crediting' }
    | { phase: 'rejected'; reason: string }
    | { phase: 'result'; credited: number; skipped: number; rejected: number; totalPoints: number; tickets: number | null };

export interface ActivityWarPanelProps {
    activityId: string;
    /** If true, auto-starts fetching immediately on mount */
    autoFetch?: boolean;
    onDismiss?: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const BATTLE_TYPE_LABELS: Record<string, string> = {
    consistency: 'Régularité',
    time_trial: 'Contre-la-montre',
    elevation: 'Dénivelé',
    volume_capped: 'Volume',
    longest_single: 'Plus longue course',
    distance: 'Distance totale',
    pace: 'Meilleure allure',
    streak: 'Régularité',
    time: 'Temps de course',
};

function BattleTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
    switch (type) {
        case 'consistency': case 'streak': return <Activity size={size} />;
        case 'time_trial': case 'time': case 'pace': return <Timer size={size} />;
        case 'elevation': return <Mountain size={size} />;
        case 'volume_capped': return <Package size={size} />;
        case 'longest_single': case 'distance': return <TrendingUp size={size} />;
        default: return <Swords size={size} />;
    }
}

function formatWindow(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const sLabel = s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const eLabel = e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${sLabel} → ${eLabel}`;
}

// ─── ActivityWarPanel ──────────────────────────────────────────────────────────

export function ActivityWarPanel({ activityId, autoFetch = true, onDismiss }: ActivityWarPanelProps) {
    const [state, setState] = useState<PanelState>({ phase: autoFetch ? 'loading' : 'empty' });

    const fetchMatchingBattles = useCallback(async () => {
        setState({ phase: 'loading' });
        try {
            const res = await api.get(`/game/activities/${activityId}/matching-battles`);
            const battles: MatchingBattle[] = res.data?.matchingBattles ?? [];
            if (battles.length === 0) {
                setState({ phase: 'empty' });
            } else {
                setState({ phase: 'prompt', battles });
            }
        } catch {
            // If matching-battles fails (e.g. no war active), silently show empty
            setState({ phase: 'empty' });
        }
    }, [activityId]);

    useEffect(() => {
        if (autoFetch) fetchMatchingBattles();
    }, [autoFetch, fetchMatchingBattles]);

    const handleCredit = useCallback(async (battles: MatchingBattle[]) => {
        setState({ phase: 'crediting' });
        try {
            const res = await api.post<CreditResponse>(`/game/activities/${activityId}/credit-validated`);
            const data = res.data;

            if (!data.validated) {
                setState({ phase: 'rejected', reason: data.rejectionReason ?? 'Activité rejetée par le système de validation.' });
                return;
            }

            const credited = data.summary?.credited ?? data.results.filter(r => r.status === 'credited').length;
            const skipped = data.results.filter(r => r.status === 'skipped').length;
            const rejected = data.results.filter(r => r.status === 'rejected').length;
            const totalPoints = data.summary?.totalPoints ?? 0;

            // Fetch tickets from the first warId
            let tickets: number | null = null;
            const firstWarId = data.results.find(r => r.warId)?.warId ?? battles[0]?.warId;
            if (firstWarId) {
                try {
                    const tRes = await api.get(`/game/wars/${firstWarId}/my-tickets`);
                    tickets = tRes.data?.remaining ?? null;
                } catch {
                    // tickets are non-critical
                }
            }

            setState({ phase: 'result', credited, skipped, rejected, totalPoints, tickets });
        } catch (e) {
            const msg = resolveError(e, 'Impossible de créditer cette activité.');
            setState({ phase: 'rejected', reason: msg });
        }
    }, [activityId]);

    // ── Render ─────────────────────────────────────────────────────────────────

    if (state.phase === 'loading') {
        return (
            <div className="flex items-center gap-2 py-3">
                <Loader2 size={14} className="animate-spin text-white/30" />
                <span className="text-[11px] text-white/30">Recherche d'épreuves compatibles…</span>
            </div>
        );
    }

    if (state.phase === 'empty') {
        return null;
    }

    return (
        <AnimatePresence mode="wait">
            {state.phase === 'prompt' && (
                <motion.div
                    key="prompt"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="rounded-[20px] p-4 space-y-3"
                    style={{ background: 'rgba(90,178,255,0.08)', border: '1px solid rgba(90,178,255,0.20)' }}
                >
                    <div className="flex items-center gap-2">
                        <Swords size={14} style={{ color: '#5ab2ff' }} />
                        <p className="text-[12px] font-black text-white">
                            {state.battles.length} épreuve{state.battles.length > 1 ? 's' : ''} de guerre compatible{state.battles.length > 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        {state.battles.map(b => (
                            <div key={b.battleId} className="flex items-center gap-2.5 rounded-[12px] px-3 py-2"
                                style={{ background: 'rgba(90,178,255,0.06)', border: '1px solid rgba(90,178,255,0.12)' }}>
                                <span className="text-[#5ab2ff]">
                                    <BattleTypeIcon type={b.battleType} size={12} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-white truncate">
                                        {BATTLE_TYPE_LABELS[b.battleType] ?? b.battleType}
                                    </p>
                                    <p className="text-[9px] text-white/35 font-mono">{formatWindow(b.windowStart, b.windowEnd)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => handleCredit(state.battles)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[11px] font-black transition-all active:scale-[0.97]"
                            style={{ background: '#5ab2ff', color: '#07111f' }}
                        >
                            <Zap size={12} />
                            Créditer cette activité
                        </button>
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="px-4 py-2.5 rounded-[12px] text-[11px] font-black text-white/40 transition-all active:scale-[0.97]"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                            >
                                Ignorer
                            </button>
                        )}
                    </div>
                </motion.div>
            )}

            {state.phase === 'crediting' && (
                <motion.div
                    key="crediting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 rounded-[20px] px-4 py-3"
                    style={{ background: 'rgba(90,178,255,0.06)', border: '1px solid rgba(90,178,255,0.12)' }}
                >
                    <Loader2 size={14} className="animate-spin text-[#5ab2ff]" />
                    <span className="text-[11px] font-black text-[#5ab2ff]">Crédit en cours…</span>
                </motion.div>
            )}

            {state.phase === 'rejected' && (
                <motion.div
                    key="rejected"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-[20px] p-4 space-y-2"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}
                >
                    <div className="flex items-center gap-2">
                        <XCircle size={14} className="text-red-400 flex-shrink-0" />
                        <p className="text-[12px] font-black text-red-300">Activité non validée</p>
                    </div>
                    <p className="text-[11px] text-red-300/70 leading-relaxed pl-5">{state.reason}</p>
                    <p className="text-[10px] text-white/25 pl-5">
                        Les activités inhabituelles sont vérifiées pour protéger l'équité du jeu.
                    </p>
                </motion.div>
            )}

            {state.phase === 'result' && (
                <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-[20px] p-4 space-y-3"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                            <p className="text-[12px] font-black text-emerald-300">Activité créditée</p>
                        </div>
                        {state.totalPoints > 0 && (
                            <p className="font-mono font-black text-emerald-400 text-base">
                                +{state.totalPoints.toLocaleString()} pts
                            </p>
                        )}
                    </div>

                    {/* Summary row */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {state.credited > 0 && (
                            <Pill icon={<CheckCircle2 size={10} />} label={`${state.credited} créditée${state.credited > 1 ? 's' : ''}`} color="#10b981" />
                        )}
                        {state.skipped > 0 && (
                            <Pill icon={<SkipForward size={10} />} label={`${state.skipped} ignorée${state.skipped > 1 ? 's' : ''}`} color="rgba(255,255,255,0.40)" />
                        )}
                        {state.rejected > 0 && (
                            <Pill icon={<XCircle size={10} />} label={`${state.rejected} rejetée${state.rejected > 1 ? 's' : ''}`} color="#f87171" />
                        )}
                    </div>

                    {/* Tickets */}
                    {state.tickets !== null && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                            <Ticket size={10} className="text-violet-400" />
                            <span className="text-[10px] font-black text-violet-400">
                                {state.tickets} ticket{state.tickets !== 1 ? 's' : ''} restant{state.tickets !== 1 ? 's' : ''} cette guerre
                            </span>
                        </div>
                    )}

                    {/* Score disclaimer */}
                    <ScoreDisclaimer />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Reusable score disclaimer ─────────────────────────────────────────────────

export function ScoreDisclaimer() {
    return (
        <div className="flex items-start gap-1.5">
            <Info size={10} className="text-white/20 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-white/25 leading-relaxed">
                Les scores peuvent évoluer après recalcul ou finalisation de l'épreuve.
            </p>
        </div>
    );
}

// ─── WarReversalBadge — shown after game soft-delete ──────────────────────────

export function WarReversalBadge({ reversalsApplied }: { reversalsApplied: number }) {
    if (reversalsApplied === 0) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-[14px] px-3 py-2"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)' }}
        >
            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
            <p className="text-[11px] font-black text-amber-300">
                {reversalsApplied} score{reversalsApplied > 1 ? 's' : ''} de guerre annulé{reversalsApplied > 1 ? 's' : ''}
            </p>
        </motion.div>
    );
}

// ─── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
    return (
        <span
            className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full"
            style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
        >
            {icon}{label}
        </span>
    );
}
