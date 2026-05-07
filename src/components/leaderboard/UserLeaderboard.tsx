import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Trophy, Medal, TrendingUp, Activity, Star } from 'lucide-react';
import { api } from '../../services/api';
import { formatPaceSec } from '../../utils/format';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    totalDistanceM: number;
    totalDurationSec: number;
    totalActivities: number;
    avgPaceSecPerKm: number | null;
    longestRunM: number;
    elevationGainM: number;
}

type Period = 'global' | 'week' | 'month';

interface PeriodData {
    entries: LeaderboardEntry[];
    myRank: number | null;
    periodStart?: string;
    periodEnd?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtKm(m: number): string {
    const km = m / 1000;
    if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
    if (km >= 100) return `${Math.round(km)}`;
    return km.toFixed(1);
}

function entryName(e: LeaderboardEntry): string {
    return e.displayName || e.username || 'Inconnu';
}

function entryInitial(e: LeaderboardEntry): string {
    return entryName(e).charAt(0).toUpperCase();
}

// ─── Rank medal ────────────────────────────────────────────────────────────────

const RANK_STYLES: Record<number, { bg: string; color: string; border: string }> = {
    1: { bg: 'rgba(251,191,36,0.18)',  color: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
    2: { bg: 'rgba(148,163,184,0.18)', color: '#94a3b8', border: 'rgba(148,163,184,0.35)' },
    3: { bg: 'rgba(180,120,68,0.18)',  color: '#b47844', border: 'rgba(180,120,68,0.35)' },
};

function RankBadge({ rank }: { rank: number }) {
    const style = RANK_STYLES[rank] ?? {
        bg: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.35)',
        border: 'rgba(255,255,255,0.08)',
    };
    return (
        <div
            className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 font-mono font-black text-[11px]"
            style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
        >
            {rank <= 3 ? <Medal size={11} /> : rank}
        </div>
    );
}

// ─── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, isMe, index }: { entry: LeaderboardEntry; isMe: boolean; index: number }) {
    const km = entry.totalDistanceM / 1000;
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            className="flex items-center gap-3 rounded-[18px] px-3.5 py-3 transition-all"
            style={{
                background: isMe
                    ? 'linear-gradient(135deg, rgba(90,178,255,0.10), rgba(90,178,255,0.04))'
                    : entry.rank <= 3
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(255,255,255,0.025)',
                border: isMe
                    ? '1px solid rgba(90,178,255,0.22)'
                    : entry.rank <= 3
                        ? `1px solid ${RANK_STYLES[entry.rank]?.border ?? 'rgba(255,255,255,0.08)'}`
                        : '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <RankBadge rank={entry.rank} />

            {/* Avatar */}
            <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center font-black text-sm flex-shrink-0"
                style={isMe
                    ? { background: 'rgba(90,178,255,0.18)', color: '#5ab2ff', border: '1px solid rgba(90,178,255,0.28)' }
                    : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
                }
            >
                {entryInitial(entry)}
            </div>

            {/* Name + pace */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[13px] font-black text-white truncate leading-tight">
                        {entryName(entry)}
                    </span>
                    {isMe && (
                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/22 flex-shrink-0">
                            Moi
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-white/30 font-mono">
                    <span className="flex items-center gap-0.5">
                        <Activity size={7} className="flex-shrink-0" />
                        {entry.totalActivities}
                    </span>
                    {entry.avgPaceSecPerKm && (
                        <span>{formatPaceSec(entry.avgPaceSecPerKm)}/km</span>
                    )}
                </div>
            </div>

            {/* Distance */}
            <div className="text-right flex-shrink-0">
                <div className="font-mono font-black text-white text-sm leading-tight">
                    {km >= 100 ? Math.round(km) : km.toFixed(km >= 10 ? 0 : 1)}
                </div>
                <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">km</div>
            </div>
        </motion.div>
    );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[18px] px-3.5 py-3"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="skeleton w-7 h-7 rounded-[10px] flex-shrink-0" />
                    <div className="skeleton w-9 h-9 rounded-[12px] flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3 rounded-lg" style={{ width: `${45 + (i % 3) * 15}%` }} />
                        <div className="skeleton h-2 rounded-lg w-20" />
                    </div>
                    <div className="skeleton h-4 w-10 rounded-lg flex-shrink-0" />
                </div>
            ))}
        </div>
    );
}

// ─── UserLeaderboard ───────────────────────────────────────────────────────────

const PERIOD_CFG: { id: Period; label: string; endpoint: string }[] = [
    { id: 'global', label: 'All-time', endpoint: '/leaderboards/global' },
    { id: 'week',   label: 'Semaine',  endpoint: '/leaderboards/weekly' },
    { id: 'month',  label: 'Mois',     endpoint: '/leaderboards/monthly' },
];

interface Props {
    myUserId?: string;
}

export function UserLeaderboard({ myUserId }: Props) {
    const [period, setPeriod] = useState<Period>('week');
    const [data, setData] = useState<Record<Period, PeriodData | null>>({
        global: null, week: null, month: null,
    });
    const [loading, setLoading] = useState(true);

    const fetchPeriod = useCallback(async (p: Period) => {
        setLoading(true);
        const cfg = PERIOD_CFG.find(c => c.id === p)!;
        try {
            const res = await api.get(cfg.endpoint, { params: { limit: 50 } });
            setData(prev => ({
                ...prev,
                [p]: {
                    entries: Array.isArray(res.data?.entries) ? res.data.entries : [],
                    myRank: res.data?.myRank ?? null,
                    periodStart: res.data?.periodStart,
                    periodEnd: res.data?.periodEnd,
                },
            }));
        } catch {
            setData(prev => ({ ...prev, [p]: { entries: [], myRank: null } }));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchPeriod(period);
    }, [period, fetchPeriod]);

    const current = data[period];
    const entries = current?.entries ?? [];
    const myRank = current?.myRank ?? null;

    return (
        <div className="space-y-3">
            {/* Period switcher */}
            <div className="flex gap-1.5 p-1 rounded-[14px]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {PERIOD_CFG.map(cfg => (
                    <button
                        key={cfg.id}
                        onClick={() => setPeriod(cfg.id)}
                        className="flex-1 py-2 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all"
                        style={{
                            background: period === cfg.id ? 'rgba(90,178,255,0.18)' : 'transparent',
                            color: period === cfg.id ? '#5ab2ff' : 'rgba(255,255,255,0.35)',
                            border: period === cfg.id ? '1px solid rgba(90,178,255,0.28)' : '1px solid transparent',
                        }}
                    >
                        {cfg.label}
                    </button>
                ))}
            </div>

            {/* My rank banner */}
            <AnimatePresence mode="wait">
                {myRank !== null && !loading && (
                    <motion.div
                        key={`rank-${period}`}
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 rounded-[16px] px-4 py-3"
                        style={{
                            background: 'linear-gradient(135deg, rgba(90,178,255,0.12), rgba(34,211,238,0.05))',
                            border: '1px solid rgba(90,178,255,0.22)',
                        }}
                    >
                        <Star size={13} className="text-primary flex-shrink-0" />
                        <span className="text-[11px] font-black text-white/80 flex-1">Ton classement</span>
                        <span
                            className="font-mono font-black text-lg"
                            style={{ color: '#5ab2ff', textShadow: '0 0 12px rgba(90,178,255,0.4)' }}
                        >
                            #{myRank}
                        </span>
                    </motion.div>
                )}
                {myRank === null && !loading && entries.length > 0 && (
                    <motion.div
                        key={`unranked-${period}`}
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 rounded-[16px] px-4 py-3"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                        }}
                    >
                        <TrendingUp size={13} className="text-white/25 flex-shrink-0" />
                        <span className="text-[10px] text-white/30 font-bold">
                            3 activités minimum pour apparaître au classement
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List */}
            <AnimatePresence mode="wait">
                <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {loading ? (
                        <SkeletonRows />
                    ) : entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                            <div
                                className="w-16 h-16 rounded-[20px] flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                <Trophy size={26} className="text-white/20" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-white/50">Aucune donnée</p>
                                <p className="text-xs text-white/25 mt-1">
                                    {period === 'week' ? "Pas encore d'activité cette semaine" :
                                     period === 'month' ? "Pas encore d'activité ce mois" :
                                     "Minimum 3 activités requises pour apparaître"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {entries.map((entry, i) => (
                                <EntryRow
                                    key={entry.userId}
                                    entry={entry}
                                    isMe={entry.userId === myUserId}
                                    index={i}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
