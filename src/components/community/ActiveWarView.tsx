import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Timer, Mountain, Package, TrendingUp,
    Trophy, Swords, Lock, Loader2, Zap, Users, Flag,
    Crown, Medal, Hourglass, Calendar, ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
    WarSummary, WarOpponent, WarBattle, WarHighlight, RivalryContext,
    WarAggregate, TimelineData,
} from '../../hooks/useWarData';
import { BattleDetailSheet } from './BattleDetailSheet';
import { HighlightCard, WarHighlightsFeed } from './WarHighlightsFeed';
import { RivalryDetailSheet } from './ClanRivalriesView';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WarPlan {
    warId: string;
    clanId: string;
    status: 'voting' | 'locked';
    lockDeadlineAt: string | null;
    lockedAt: string | null;
    myVoteBattleId: string | null;
    totalVotes: number;
    voteCounts: Array<{ battleId: string; battleType: string; voteCount: number; isEligible: boolean }>;
    priorities: string[] | null;
}

interface BonusStats {
    max: number;
    used: number;
    remaining: number;
}

interface Props {
    warId: string;
    war: WarSummary;
    opponents: WarOpponent[];
    battles: WarBattle[];
    myParticipations: Array<{ id?: string; battleId: string; score: number; status: string; counted?: boolean; submittedAt?: string | null }>;
    hoursRemaining: number;
    scoreboard: Array<{ clanId: string; clanName: string; totalPoints: number; rank: number; contributors?: number; contributions?: number }>;
    highlights: WarHighlight[];
    timeline: TimelineData | null;
    aggregates: WarAggregate[];
    myClanId: string;
    myClanName: string;
    myRole: string;
    contributionKm: number;
    contributionActivities: number;
    rivalryContext: RivalryContext | null;
    onRefresh: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BATTLE_TYPE_LABELS: Record<string, string> = {
    consistency: 'Régularité',
    time_trial: 'Chrono',
    elevation: 'Dénivelé',
    volume_capped: 'Volume',
    longest_single: 'Plus longue sortie',
    distance: 'Distance totale',
    pace: 'Meilleure allure',
    streak: 'Régularité',
    time: 'Temps de course',
};

const BATTLE_STATUS_LABELS: Record<string, string> = {
    scheduled: 'À venir',
    upcoming: 'Bientôt',
    open: 'Ouvert',
    active: 'Ouvert',
    completed: 'Terminé',
    finalized: 'Terminé',
    closed: 'Clôturé',
};

const WAR_FORMAT_LABELS: Record<string, string> = {
    duel: 'Duel',
    league4: 'Ligue · 4',
    league8: 'Ligue · 8',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clanInitials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function formatWindowCountdown(windowEnd: string): string {
    const ms = new Date(windowEnd).getTime() - Date.now();
    if (ms <= 0) return 'Fermée';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h === 0) return `Ferme dans ${m}m`;
    return `Ferme dans ${h}h ${String(m).padStart(2, '0')}m`;
}

function formatOpensIn(opensIn: { hours: number; minutes: number }): string {
    if (opensIn.hours === 0 && opensIn.minutes === 0) return 'Ouvre maintenant';
    if (opensIn.hours === 0) return `Ouvre dans ${opensIn.minutes}m`;
    return `Ouvre dans ${opensIn.hours}h ${String(opensIn.minutes).padStart(2, '0')}m`;
}

function formatDeadlineCountdown(deadline: string): string {
    const ms = new Date(deadline).getTime() - Date.now();
    if (ms <= 0) return 'Expiré';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}


function BattleTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
    switch (type) {
        case 'consistency':
        case 'streak':
            return <Activity size={size} />;
        case 'time_trial':
        case 'time':
        case 'pace':
            return <Timer size={size} />;
        case 'elevation':
            return <Mountain size={size} />;
        case 'volume_capped':
            return <Package size={size} />;
        case 'longest_single':
        case 'distance':
            return <TrendingUp size={size} />;
        default:
            return <Swords size={size} />;
    }
}

// ─── BattleCard ────────────────────────────────────────────────────────────────

function BattleCard({
    battle,
    enrolled,
    enrolling,
    participation,
    isPriority,
    onEnroll,
    onPress,
}: {
    battle: WarBattle;
    enrolled: boolean;
    enrolling: boolean;
    participation: { score: number; counted?: boolean } | null;
    isPriority?: boolean;
    onEnroll: (id: string) => void;
    onPress: (b: WarBattle) => void;
}) {
    const [enrollError] = useState<string | null>(null);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isOpen = ['open', 'active'].includes(battle.status);
    const isCompleted = ['completed', 'finalized', 'closed'].includes(battle.status);

    const bgStyle = isCompleted
        ? { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }
        : isOpen
            ? { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.22)' }
            : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' };

    const handleEnroll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        onEnroll(battle.id);
    };

    useEffect(() => {
        return () => {
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        };
    }, []);

    return (
        <button
            className="w-full rounded-[20px] p-4 border text-left active:scale-[0.98] transition-transform"
            style={bgStyle}
            onClick={() => onPress(battle)}
        >
            <div className="flex items-start justify-between gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    enrolled ? 'bg-emerald-500/15 border border-emerald-500/25' :
                    isOpen ? 'bg-red-500/15 border border-red-500/20' : 'glass-card'
                }`}>
                    <span className={enrolled ? 'text-emerald-400' : isOpen ? 'text-red-400' : 'text-white/30'}>
                        <BattleTypeIcon type={battle.battleType} size={16} />
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm text-white uppercase tracking-wide">
                            {BATTLE_TYPE_LABELS[battle.battleType] ?? battle.battleType}
                        </p>
                        {isPriority && (
                            <span
                                className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.30)', color: '#fbbf24' }}
                            >
                                ★ PRIORITÉ
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                            isOpen ? 'text-red-400' :
                            isCompleted ? 'text-white/20' : 'text-white/40'
                        }`}>
                            {BATTLE_STATUS_LABELS[battle.status] ?? battle.status}
                        </span>
                        {isOpen && (
                            <span className="text-[10px] text-white/40">
                                {formatWindowCountdown(battle.windowEnd)}
                            </span>
                        )}
                    </div>
                    {participation && participation.score > 0 && (
                        <p className="text-[10px] font-mono font-black mt-1" style={{ color: participation.counted ? '#10b981' : 'rgba(255,255,255,0.40)' }}>
                            {participation.score.toFixed(0)} pts {participation.counted ? '✓' : ''}
                        </p>
                    )}
                    {enrollError && (
                        <p className="text-[10px] text-red-400 mt-1">{enrollError}</p>
                    )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-1.5">
                    {enrolled ? (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                            ✓ Inscrit
                        </span>
                    ) : isOpen ? (
                        <button
                            onClick={handleEnroll}
                            disabled={enrolling}
                            className="text-[10px] font-black text-white bg-red-500/80 hover:bg-red-500 active:scale-95 transition-all px-3 py-1.5 rounded-full flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {enrolling ? <Loader2 size={10} className="animate-spin" /> : null}
                            S'inscrire
                        </button>
                    ) : null}
                    <ChevronRight size={14} className="text-white/20" />
                </div>
            </div>
        </button>
    );
}

// ─── OpponentMini ──────────────────────────────────────────────────────────────

function OpponentMini({ opponent, isLeader }: { opponent: WarOpponent; isLeader: boolean }) {
    return (
        <div
            className="rounded-[18px] p-3 flex items-center gap-3 border"
            style={{
                background: 'rgba(239,68,68,0.06)',
                borderColor: 'rgba(239,68,68,0.18)',
            }}
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.30)' }}
            >
                <span className="text-red-400 font-black text-xs">{clanInitials(opponent.clanName)}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-white text-xs truncate">{opponent.clanName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-black text-white/30">#{opponent.rank}</span>
                    {isLeader && <Crown size={10} className="text-amber-400" />}
                </div>
            </div>
            <p className="font-mono font-black text-red-400 text-base">{opponent.points.toLocaleString()}</p>
        </div>
    );
}

// ─── ActiveWarView ─────────────────────────────────────────────────────────────

export function ActiveWarView({
    warId,
    war,
    opponents,
    battles,
    myParticipations,
    scoreboard,
    highlights,
    timeline,
    aggregates,
    myClanId,
    myClanName,
    myRole,
    contributionKm,
    contributionActivities,
    rivalryContext,
    onRefresh,
}: Props) {
    const [plan, setPlan] = useState<WarPlan | null>(null);
    const [bonusStats, setBonusStats] = useState<BonusStats | null>(null);
    const [showHighlightsFeed, setShowHighlightsFeed] = useState(false);
    const [showRivalrySheet, setShowRivalrySheet] = useState(false);
    const [enrolling, setEnrolling] = useState<Set<string>>(new Set());
    const [enrolled, setEnrolled] = useState<Set<string>>(
        () => new Set(myParticipations.map(p => p.battleId))
    );
    const [votingBattleId, setVotingBattleId] = useState<string | null>(null);
    const [locking, setLocking] = useState(false);
    const [lockingRoster, setLockingRoster] = useState(false);
    const [rosterLocked, setRosterLocked] = useState(false);
    const [, setDeadlineTick] = useState(0);
    const [selectedBattle, setSelectedBattle] = useState<WarBattle | null>(null);

    useEffect(() => {
        setEnrolled(new Set(myParticipations.map(p => p.battleId)));
    }, [myParticipations]);

    useEffect(() => {
        Promise.all([
            api.get<WarPlan>(`/game/wars/${warId}/plan`).catch(() => null),
            api.get(`/game/wars/${warId}/bonus-stats`).catch(() => null),
        ]).then(([planRes, bonusRes]) => {
            if (planRes) setPlan(planRes.data);
            if (bonusRes?.data) {
                const d = bonusRes.data;
                setBonusStats({
                    max: d.max ?? d.bonusMax ?? 0,
                    used: d.used ?? d.bonusUsed ?? 0,
                    remaining: d.remaining ?? d.bonusRemaining ?? 0,
                });
            }
        });
    }, [warId]);

    useEffect(() => {
        if (!plan || plan.status !== 'voting' || !plan.lockDeadlineAt) return;
        const id = setInterval(() => setDeadlineTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [plan]);

    const handleEnroll = useCallback(async (battleId: string) => {
        setEnrolling(prev => new Set(prev).add(battleId));
        try {
            await api.post(`/game/battles/${battleId}/enroll`);
            setEnrolled(prev => new Set(prev).add(battleId));
            onRefresh();
        } catch {
            // error handled per-card
        } finally {
            setEnrolling(prev => {
                const next = new Set(prev);
                next.delete(battleId);
                return next;
            });
        }
    }, [onRefresh]);

    const handleVote = useCallback(async (battleId: string) => {
        if (!plan) return;
        const prev = plan.myVoteBattleId;
        setPlan(p => p ? { ...p, myVoteBattleId: battleId } : p);
        setVotingBattleId(battleId);
        try {
            await api.put(`/game/wars/${warId}/plan/vote`, { battleId });
        } catch {
            setPlan(p => p ? { ...p, myVoteBattleId: prev } : p);
        } finally {
            setVotingBattleId(null);
        }
    }, [plan, warId]);

    const handleLock = useCallback(async () => {
        setLocking(true);
        try {
            await api.post(`/game/wars/${warId}/plan/lock`);
            setPlan(p => p ? { ...p, status: 'locked' } : p);
        } catch {
            // silently fail
        } finally {
            setLocking(false);
        }
    }, [warId]);

    const handleRosterLock = useCallback(async () => {
        setLockingRoster(true);
        try {
            await api.post(`/game/wars/${warId}/roster/lock`);
            setRosterLocked(true);
            onRefresh();
        } catch {
            // error visible via badge
        } finally {
            setLockingRoster(false);
        }
    }, [warId, onRefresh]);

    const isFinalized = ['finalized', 'completed'].includes(war.status);
    const isRosterLock = war.status === 'roster_lock';
    const isDeadlineExpired = Boolean(
        plan?.status === 'voting' && plan.lockDeadlineAt && new Date(plan.lockDeadlineAt).getTime() <= Date.now()
    );
    const prioritySet = new Set(plan?.priorities ?? []);

    const myScore = scoreboard.find(s => s.clanId === myClanId);
    const myAggregate = aggregates.find(a => a.clanId === myClanId);
    const opponent = opponents[0] ?? null;
    const opponentScore = opponent ? scoreboard.find(s => s.clanId === opponent.clanId) : null;
    const isLeague = (war.format ?? 'duel') !== 'duel' && opponents.length > 1;

    const myPoints = myScore?.totalPoints ?? 0;
    const opponentPoints = opponentScore?.totalPoints ?? opponent?.points ?? 0;
    const totalPoints = myPoints + opponentPoints;
    const myPct = totalPoints > 0 ? Math.round((myPoints / totalPoints) * 100) : 50;
    const opponentPct = totalPoints > 0 ? 100 - myPct : 50;

    const isCloseBattle = !isFinalized && totalPoints > 0
        && Math.abs(myPoints - opponentPoints) / Math.max(myPoints, opponentPoints) < 0.08;
    const gap = Math.abs(myPoints - opponentPoints);

    const isLeader = ['leader', 'co_leader'].includes(myRole);

    // ── Final state ────────────────────────────────────────────────────────────
    if (isFinalized) {
        const orderedScoreboard = [...scoreboard].sort((a, b) => a.rank - b.rank);
        const winner = orderedScoreboard[0] ?? null;
        const myRow = orderedScoreboard.find(s => s.clanId === myClanId);
        const myFinalRank = myRow?.rank ?? null;
        const isWin = myFinalRank === 1;

        return (
            <div className="space-y-4">
                {/* Format + final badge */}
                <div className="flex items-center gap-2 flex-wrap">
                    <FormatBadge format={war.format} />
                    <span
                        className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}
                    >
                        Guerre terminée
                    </span>
                </div>

                {/* Winner card */}
                {winner && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-hero rounded-[28px] p-5 text-center"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Trophy size={28} className="text-amber-400" style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.5))' }} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Vainqueur</p>
                            <p className="font-black text-white text-lg">{winner.clanName}</p>
                            <p className="font-mono font-black text-amber-400 text-2xl">{winner.totalPoints.toLocaleString()} pts</p>
                            {myFinalRank !== null && (
                                <div
                                    className="mt-3 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                                    style={{
                                        background: isWin ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                                        border: isWin ? '1px solid rgba(251,191,36,0.30)' : '1px solid rgba(255,255,255,0.10)',
                                        color: isWin ? '#fbbf24' : 'rgba(255,255,255,0.55)',
                                    }}
                                >
                                    {isWin ? '🏆 Victoire' : `Rang #${myFinalRank} pour ${myClanName}`}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Final standings */}
                <div className="glass-card rounded-[24px] p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Medal size={12} style={{ color: '#5ab2ff' }} />
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">Classement final</h3>
                    </div>
                    <div className="space-y-2">
                        {orderedScoreboard.map((row, i) => {
                            const isMine = row.clanId === myClanId;
                            const rankColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b47844' : 'rgba(255,255,255,0.30)';
                            return (
                                <div
                                    key={row.clanId}
                                    className="flex items-center gap-3 rounded-[14px] px-3 py-2"
                                    style={{
                                        background: isMine ? 'rgba(90,178,255,0.10)' : 'rgba(255,255,255,0.03)',
                                        border: isMine ? '1px solid rgba(90,178,255,0.22)' : '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <span className="font-mono font-black text-sm w-6" style={{ color: rankColor }}>
                                        #{row.rank}
                                    </span>
                                    <p className={`flex-1 font-black text-xs truncate ${isMine ? 'text-[#5ab2ff]' : 'text-white'}`}>
                                        {row.clanName}
                                        {isMine && <span className="text-white/30 ml-1">(toi)</span>}
                                    </p>
                                    <p className="font-mono font-black text-white/70 text-sm">{row.totalPoints.toLocaleString()}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Highlights archive */}
                {highlights.length > 0 && (
                    <HighlightsList highlights={highlights} onViewAll={() => setShowHighlightsFeed(true)} />
                )}

                <div className="flex justify-center pt-1">
                    <button
                        onClick={onRefresh}
                        className="text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1.5 py-2"
                    >
                        <Zap size={10} />
                        Actualiser
                    </button>
                </div>

                {rivalryContext && (
                    <RivalryDetailSheet
                        rivalryId={rivalryContext.rivalryId}
                        myClanId={myClanId}
                        myClanName={myClanName}
                        isOpen={showRivalrySheet}
                        onClose={() => setShowRivalrySheet(false)}
                    />
                )}
            </div>
        );
    }

    // ── Active / roster_lock view ──────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Format + status row */}
            <div className="flex items-center gap-2 flex-wrap">
                <FormatBadge format={war.format} />
                {isRosterLock && (
                    <span
                        className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1"
                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
                    >
                        <Lock size={10} />
                        Roster verrouillé
                    </span>
                )}
                {isRosterLock && isLeader && !rosterLocked && (
                    <button
                        onClick={handleRosterLock}
                        disabled={lockingRoster}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.96] disabled:opacity-50"
                        style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.30)', color: '#f59e0b' }}
                    >
                        {lockingRoster ? <Loader2 size={10} className="animate-spin" /> : <Lock size={10} />}
                        Verrouiller le roster
                    </button>
                )}
                {timeline?.endsIn && (
                    <span className="text-[10px] font-mono font-black text-white/40 flex items-center gap-1 ml-auto">
                        <Hourglass size={10} />
                        {timeline.endsIn.formatted}
                    </span>
                )}
            </div>

            {/* A) Close match banner */}
            <AnimatePresence>
                {isCloseBattle && (
                    <motion.div
                        key="close-match"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-[16px] px-4 py-3 flex items-center gap-2.5"
                        style={{
                            background: 'rgba(239,68,68,0.10)',
                            border: '1px solid rgba(239,68,68,0.22)',
                        }}
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-red-400">
                            MATCH SERRÉ — {gap} pts d'écart
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* B) VS card OR league grid */}
            {isLeague ? (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass-hero rounded-[28px] p-5"
                >
                    {/* My clan tile */}
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: 'rgba(90,178,255,0.15)',
                                border: '1px solid rgba(90,178,255,0.30)',
                                boxShadow: '0 0 14px rgba(90,178,255,0.18)',
                            }}
                        >
                            <span className="text-[#5ab2ff] font-black text-sm">{clanInitials(myClanName)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-white text-sm truncate">{myClanName}</p>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Mon clan · #{myScore?.rank ?? '?'}</p>
                        </div>
                        <p className="font-mono font-black text-[#5ab2ff] text-xl">{myPoints.toLocaleString()}</p>
                    </div>

                    {/* Separator */}
                    <div className="text-center text-[9px] font-black uppercase tracking-widest text-white/20 mb-2.5">
                        VS · {opponents.length} adversaires
                    </div>

                    {/* Opponents list */}
                    <div className="space-y-2">
                        {opponents
                            .slice()
                            .sort((a, b) => a.rank - b.rank)
                            .map(o => (
                                <OpponentMini key={o.clanId} opponent={o} isLeader={o.rank === 1} />
                            ))}
                    </div>

                    {rivalryContext && rivalryContext.isRivalryMatch && (
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => setShowRivalrySheet(true)}
                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full active:scale-95 transition-transform"
                                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7' }}
                            >
                                🔥 Rivalité #{rivalryContext.encounterNumber} · {rivalryContext.winsLow}V–{rivalryContext.winsHigh}V {rivalryContext.ties}N
                            </button>
                        </div>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass-hero rounded-[28px] overflow-hidden"
                >
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-5">
                            {/* My clan */}
                            <div className="flex-1 text-center">
                                <div
                                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-2.5"
                                    style={{
                                        background: 'rgba(90,178,255,0.15)',
                                        border: '1px solid rgba(90,178,255,0.30)',
                                        boxShadow: '0 0 20px rgba(90,178,255,0.20)',
                                    }}
                                >
                                    <span className="text-[#5ab2ff] font-black text-xl">{clanInitials(myClanName)}</span>
                                </div>
                                <p className="font-black text-white text-xs leading-tight truncate px-1">{myClanName}</p>
                                <p className="font-mono font-black text-[#5ab2ff] text-lg mt-0.5">{myPoints.toLocaleString()}</p>
                                <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 inline-block ${
                                    myPoints >= opponentPoints ? 'text-[#5ab2ff]' : 'text-white/30'
                                }`}>
                                    {myPoints > opponentPoints ? 'EN TÊTE' : myPoints < opponentPoints ? 'DERRIÈRE' : '—'}
                                </span>
                            </div>

                            {/* VS */}
                            <div className="font-black text-2xl text-white/20 italic mx-2">VS</div>

                            {/* Opponent */}
                            {opponent ? (
                                <div className="flex-1 text-center">
                                    <div
                                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-2.5"
                                        style={{
                                            background: 'rgba(239,68,68,0.15)',
                                            border: '1px solid rgba(239,68,68,0.30)',
                                            boxShadow: '0 0 20px rgba(239,68,68,0.15)',
                                        }}
                                    >
                                        <span className="text-red-400 font-black text-xl">{clanInitials(opponent.clanName)}</span>
                                    </div>
                                    <p className="font-black text-white text-xs leading-tight truncate px-1">{opponent.clanName}</p>
                                    <p className="font-mono font-black text-red-400 text-lg mt-0.5">{opponentPoints.toLocaleString()}</p>
                                    <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 inline-block ${
                                        opponentPoints > myPoints ? 'text-red-400' : 'text-white/30'
                                    }`}>
                                        {opponentPoints > myPoints ? 'EN TÊTE' : opponentPoints < myPoints ? 'DERRIÈRE' : '—'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex-1 text-center">
                                    <div className="w-16 h-16 mx-auto rounded-2xl glass-card flex items-center justify-center mb-2.5">
                                        <span className="text-white/20 font-black text-xl">?</span>
                                    </div>
                                    <p className="font-black text-white/40 text-xs">En attente</p>
                                </div>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${myPct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="absolute left-0 top-0 h-full rounded-full"
                                style={{ background: '#5ab2ff', boxShadow: '0 0 10px rgba(90,178,255,0.5)' }}
                            />
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${opponentPct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="absolute right-0 top-0 h-full rounded-full"
                                style={{ background: 'rgba(239,68,68,0.75)' }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] font-bold" style={{ color: '#5ab2ff' }}>{myPct}%</span>
                            <span className="text-[10px] font-bold text-red-400">{opponentPct}%</span>
                        </div>
                    </div>

                    {/* Rivalry pill */}
                    {rivalryContext && rivalryContext.isRivalryMatch && (
                        <div className="px-5 pb-4 flex justify-center">
                            <button
                                onClick={() => setShowRivalrySheet(true)}
                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full active:scale-95 transition-transform"
                                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7' }}
                            >
                                🔥 Rivalité #{rivalryContext.encounterNumber} · {rivalryContext.winsLow}V–{rivalryContext.winsHigh}V {rivalryContext.ties}N
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* C) My contribution */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`grid gap-3 ${myScore ? 'grid-cols-3' : 'grid-cols-2'}`}
            >
                <div className="glass-card rounded-[22px] p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingUp size={12} style={{ color: '#5ab2ff' }} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Distance</span>
                    </div>
                    <p className="font-mono font-black text-white text-xl">
                        {contributionKm.toFixed(1)}
                        <span className="text-sm font-bold text-white/30 ml-1">km</span>
                    </p>
                </div>
                <div className="glass-card rounded-[22px] p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Activity size={12} style={{ color: '#5ab2ff' }} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Séances</span>
                    </div>
                    <p className="font-mono font-black text-white text-xl">
                        {contributionActivities}
                        <span className="text-sm font-bold text-white/30 ml-1">runs</span>
                    </p>
                </div>
                {myScore && (
                    <div className="glass-card rounded-[22px] p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Trophy size={12} style={{ color: '#5ab2ff' }} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Pts gagnés</span>
                        </div>
                        <p className="font-mono font-black text-white text-xl">
                            {myScore.totalPoints.toLocaleString()}
                        </p>
                    </div>
                )}
            </motion.div>

            {/* C2) Aggregates — clan stats */}
            {myAggregate && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="glass-card rounded-[22px] p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Flag size={12} style={{ color: '#5ab2ff' }} />
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">Stats du clan</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <AggregateStat icon={<Users size={11} />} label="Participants" value={`${myAggregate.participantsCount}`} />
                        <AggregateStat icon={<Activity size={11} />} label="Contributions" value={`${myAggregate.contributionsCount}`} />
                        <AggregateStat icon={<Zap size={11} />} label="Pts dernières 24h" value={myAggregate.pointsLast24h.toLocaleString()} accent />
                        <AggregateStat icon={<Swords size={11} />} label="Épreuves jouées" value={`${myAggregate.battlesParticipated}`} />
                    </div>
                </motion.div>
            )}

            {/* D) Timeline state */}
            {timeline?.state && timeline.state.leaderClanName && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.13 }}
                    className="glass-card rounded-[22px] p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Crown size={12} className="text-amber-400" />
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/60">État de la guerre</h3>
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Crown size={12} className="text-amber-400" />
                                <span className="text-[11px] text-white/80 font-black truncate">{timeline.state.leaderClanName}</span>
                            </div>
                            <span className="font-mono font-black text-amber-400 text-sm">{timeline.state.leaderPoints.toLocaleString()}</span>
                        </div>
                        {timeline.state.runnerUpClanName && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Medal size={12} className="text-white/30" />
                                    <span className="text-[11px] text-white/55 font-black truncate">{timeline.state.runnerUpClanName}</span>
                                </div>
                                <span className="font-mono font-black text-white/40 text-sm">{timeline.state.runnerUpPoints.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Écart</span>
                            <span className={`font-mono font-black text-sm ${timeline.state.isClose ? 'text-red-400' : 'text-white/50'}`}>
                                {timeline.state.pointsGap.toLocaleString()} pts
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* E) War plan */}
            {plan && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass-card rounded-[24px] p-4 space-y-3"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {plan.status === 'locked' ? (
                                <Lock size={14} style={{ color: '#5ab2ff' }} />
                            ) : (
                                <Swords size={14} style={{ color: '#5ab2ff' }} />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                {plan.status === 'locked' ? 'Stratégie verrouillée' : 'Stratégie'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {plan.status === 'voting' && isDeadlineExpired && (
                                <span
                                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171' }}
                                >
                                    Expiré
                                </span>
                            )}
                            {plan.status === 'voting' && plan.lockDeadlineAt && !isDeadlineExpired && (
                                <span className="text-[10px] font-mono font-black text-white/40">
                                    {formatDeadlineCountdown(plan.lockDeadlineAt)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Voting state */}
                    {plan.status === 'voting' && (
                        <div className="space-y-2">
                            {plan.voteCounts.filter(v => v.isEligible).map(v => {
                                const isMyVote = plan.myVoteBattleId === v.battleId;
                                const barPct = plan.totalVotes > 0 ? (v.voteCount / plan.totalVotes) * 100 : 0;
                                const voteDisabled = votingBattleId !== null || isDeadlineExpired;
                                return (
                                    <button
                                        key={v.battleId}
                                        onClick={() => handleVote(v.battleId)}
                                        disabled={voteDisabled}
                                        className="w-full rounded-[14px] p-3 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                                        style={{
                                            background: isMyVote ? 'rgba(90,178,255,0.12)' : 'rgba(255,255,255,0.04)',
                                            border: isMyVote ? '1px solid rgba(90,178,255,0.28)' : '1px solid rgba(255,255,255,0.08)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/50">
                                                    <BattleTypeIcon type={v.battleType} size={13} />
                                                </span>
                                                <span className="text-[11px] font-black text-white">
                                                    {BATTLE_TYPE_LABELS[v.battleType] ?? v.battleType}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-white/40">{v.voteCount} vote{v.voteCount !== 1 ? 's' : ''}</span>
                                                {isMyVote && (
                                                    <span
                                                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                        style={{ background: 'rgba(90,178,255,0.20)', color: '#5ab2ff' }}
                                                    >
                                                        Mon vote
                                                    </span>
                                                )}
                                                {votingBattleId === v.battleId && (
                                                    <Loader2 size={10} className="animate-spin text-white/40" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${barPct}%` }}
                                                transition={{ duration: 0.4 }}
                                                className="h-full rounded-full"
                                                style={{ background: isMyVote ? '#5ab2ff' : 'rgba(255,255,255,0.25)' }}
                                            />
                                        </div>
                                    </button>
                                );
                            })}

                            {isLeader && !isDeadlineExpired && (
                                <button
                                    onClick={handleLock}
                                    disabled={locking}
                                    className="w-full py-3 rounded-[14px] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    style={{ background: 'rgba(90,178,255,0.15)', border: '1px solid rgba(90,178,255,0.25)', color: '#5ab2ff' }}
                                >
                                    {locking ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                                    Verrouiller la stratégie
                                </button>
                            )}
                        </div>
                    )}

                    {/* Locked priorities */}
                    {plan.status === 'locked' && plan.priorities && (
                        <div className="flex flex-wrap gap-2">
                            {plan.priorities.map(battleId => {
                                const vc = plan.voteCounts.find(v => v.battleId === battleId);
                                const type = vc?.battleType ?? battleId;
                                return (
                                    <span
                                        key={battleId}
                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                        style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.22)', color: '#fbbf24' }}
                                    >
                                        <BattleTypeIcon type={type} size={10} />
                                        {BATTLE_TYPE_LABELS[type] ?? type}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Bonus stats */}
                    {bonusStats && bonusStats.max > 0 && (
                        <div
                            className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 border-t border-white/[0.06] pt-3 mt-1"
                        >
                            <Zap size={11} style={{ color: '#5ab2ff' }} className="flex-shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex-1">Bonus</span>
                            <div className="flex items-center gap-3">
                                <BonusStat label="Max" value={bonusStats.max} />
                                <BonusStat label="Utilisés" value={bonusStats.used} />
                                <BonusStat label="Restants" value={bonusStats.remaining} accent={bonusStats.remaining > 0} />
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* F) Active battles (timeline) */}
            {timeline && timeline.activeBattles.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30">Épreuves en cours</h3>
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        {timeline.activeBattles.map(b => (
                            <div key={b.battleId} className="rounded-[16px] px-4 py-3 flex items-center gap-3"
                                 style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
                            >
                                <span className="text-red-400">
                                    <BattleTypeIcon type={b.battleType} size={14} />
                                </span>
                                <span className="flex-1 text-[11px] font-black text-white truncate">
                                    {BATTLE_TYPE_LABELS[b.battleType] ?? b.battleType}
                                </span>
                                <span className="text-[10px] font-mono font-black text-red-400">
                                    {b.closesIn.hours}h {String(b.closesIn.minutes).padStart(2, '0')}m
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* G) Battles list */}
            {battles.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                >
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Toutes les épreuves</h3>
                    <div className="space-y-2.5">
                        {battles.map((battle, i) => (
                            <motion.div
                                key={battle.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                            >
                                <BattleCard
                                    battle={battle}
                                    enrolled={enrolled.has(battle.id)}
                                    enrolling={enrolling.has(battle.id)}
                                    participation={myParticipations.find(p => p.battleId === battle.id) ?? null}
                                    isPriority={prioritySet.has(battle.id)}
                                    onEnroll={handleEnroll}
                                    onPress={setSelectedBattle}
                                />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* H) Upcoming battles (timeline) */}
            {timeline && timeline.upcomingBattles.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.20 }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={11} className="text-white/30" />
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30">À venir</h3>
                    </div>
                    <div className="space-y-2">
                        {timeline.upcomingBattles.map(b => (
                            <div key={b.battleId} className="glass-card rounded-[16px] px-4 py-3 flex items-center gap-3">
                                <span className="text-white/40">
                                    <BattleTypeIcon type={b.battleType} size={14} />
                                </span>
                                <span className="flex-1 text-[11px] font-black text-white/70 truncate">
                                    {BATTLE_TYPE_LABELS[b.battleType] ?? b.battleType}
                                </span>
                                <span className="text-[10px] font-mono font-black text-white/40">
                                    {formatOpensIn(b.opensIn)}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {battles.length === 0 && (!timeline || (timeline.activeBattles.length === 0 && timeline.upcomingBattles.length === 0)) && (
                <div className="glass-card rounded-[24px] p-6 text-center">
                    <p className="text-white/30 text-sm">Les épreuves seront disponibles au début de la guerre.</p>
                </div>
            )}

            {/* I) Highlights */}
            {highlights.length > 0 && (
                <HighlightsList highlights={highlights} onViewAll={() => setShowHighlightsFeed(true)} />
            )}

            {/* Spacer */}
            <div className="h-2" />

            {/* Refresh hint */}
            <div className="flex justify-center">
                <button
                    onClick={onRefresh}
                    className="text-[10px] font-black uppercase tracking-widest text-white/20 flex items-center gap-1.5 py-2"
                >
                    <Zap size={10} />
                    Actualiser
                </button>
            </div>

            {/* Battle detail sheet */}
            {selectedBattle && (
                <BattleDetailSheet
                    battle={selectedBattle}
                    warId={warId}
                    myParticipation={myParticipations.find(p => p.battleId === selectedBattle.id) ?? null}
                    myClanId={myClanId}
                    isPriority={prioritySet.has(selectedBattle.id)}
                    isOpen={selectedBattle !== null}
                    onClose={() => setSelectedBattle(null)}
                    onEnrolled={() => {
                        setEnrolled(prev => new Set(prev).add(selectedBattle.id));
                        onRefresh();
                    }}
                />
            )}

            {/* Full highlights feed */}
            <WarHighlightsFeed
                warId={warId}
                isOpen={showHighlightsFeed}
                onClose={() => setShowHighlightsFeed(false)}
                initialHighlights={highlights}
            />

            {/* Rivalry detail sheet */}
            {rivalryContext && (
                <RivalryDetailSheet
                    rivalryId={rivalryContext.rivalryId}
                    myClanId={myClanId}
                    myClanName={myClanName}
                    isOpen={showRivalrySheet}
                    onClose={() => setShowRivalrySheet(false)}
                />
            )}
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FormatBadge({ format }: { format?: string }) {
    const label = WAR_FORMAT_LABELS[format ?? 'duel'] ?? 'Duel';
    return (
        <span
            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(90,178,255,0.10)', border: '1px solid rgba(90,178,255,0.20)', color: '#5ab2ff' }}
        >
            <Swords size={10} />
            {label}
        </span>
    );
}

function AggregateStat({
    icon, label, value, accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className={accent ? 'text-[#5ab2ff]' : 'text-white/30'}>{icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</span>
            </div>
            <p className={`font-mono font-black text-base ${accent ? 'text-[#5ab2ff]' : 'text-white'}`}>{value}</p>
        </div>
    );
}

function BonusStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div className="text-center">
            <p className={`font-mono font-black text-sm ${accent ? 'text-[#5ab2ff]' : 'text-white/70'}`}>{value}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-0.5">{label}</p>
        </div>
    );
}

function HighlightsList({
    highlights,
    onViewAll,
}: {
    highlights: WarHighlight[];
    onViewAll?: () => void;
}) {
    const top = highlights.slice(0, 3);
    const hasMore = highlights.length > 3;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30">Événements</h3>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                {onViewAll && highlights.length > 0 && (
                    <button
                        onClick={onViewAll}
                        className="text-[10px] font-black text-white/30 hover:text-[#5ab2ff] transition-colors flex items-center gap-1"
                    >
                        Voir tout · {highlights.length}
                    </button>
                )}
            </div>
            <div className="space-y-2">
                {top.map((h, i) => (
                    <motion.div
                        key={h.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                    >
                        <HighlightCard highlight={h} />
                    </motion.div>
                ))}
                {hasMore && onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="w-full py-2.5 rounded-[16px] text-[10px] font-black text-white/30 hover:text-white/50 transition-colors flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <ChevronRight size={11} />
                        {highlights.length - 3} événement{highlights.length - 3 > 1 ? 's' : ''} de plus
                    </button>
                )}
            </div>
        </motion.div>
    );
}
