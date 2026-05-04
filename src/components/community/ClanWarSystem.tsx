import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sword, Shield, Trophy, Zap, Flame, Clock, Users, Crown, Star,
    ChevronRight, Lock, Check, TrendingUp, TrendingDown, Minus,
    Mountain, Timer, Package, AlertTriangle, Activity,
    MessageSquare, UserPlus, BarChart2, Crosshair,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type WarStatus = 'scheduled' | 'roster_lock' | 'active' | 'finalized' | 'completed';
type BattleStatus = 'upcoming' | 'open' | 'active' | 'closed' | 'completed';
type BattleType = 'consistency' | 'time_trial' | 'elevation' | 'volume_capped' | 'longest_single';
type HighlightType = 'LEAD_CHANGE' | 'COMEBACK' | 'BATTLE_WON' | 'CLOSE_MATCH' | 'MVP_DAY' | 'WAR_STARTED' | 'WAR_ENDED';
type HighlightSeverity = 'info' | 'important' | 'critical';

interface Battle {
    id: string;
    type: BattleType;
    status: BattleStatus;
    designation: string;
    windowEnd: string;
    myScore: number;
    clanAvg: number;
    pointsAtStake: number;
    enrolled: boolean;
}

interface Highlight {
    id: string;
    type: HighlightType;
    severity: HighlightSeverity;
    createdAt: string;
    payload: Record<string, any>;
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    initials: string;
    distance: number;
    warRecord: string;
    division: string;
    divisionColor: string;
    trend: 'up' | 'down' | 'same';
    isMe?: boolean;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_WAR = {
    id: 'war-001',
    status: 'active' as WarStatus,
    weekNumber: 7,
    endsAt: new Date(Date.now() + 38 * 3600 * 1000 + 14 * 60 * 1000).toISOString(),
    myClan: { id: 'c1', name: 'IRON STRIDE', initials: 'IS', points: 187, members: 12 },
    opponent: { id: 'c2', name: 'APEX RUNNERS', initials: 'AR', points: 174, members: 11 },
    isCloseMatch: true,
};

const MOCK_BATTLES: Battle[] = [
    { id: 'b1', type: 'consistency', status: 'active', designation: 'ALPHA', windowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), myScore: 4, clanAvg: 3.2, pointsAtStake: 45, enrolled: true },
    { id: 'b2', type: 'time_trial', status: 'open', designation: 'BRAVO', windowEnd: new Date(Date.now() + 14 * 3600 * 1000).toISOString(), myScore: 0, clanAvg: 0, pointsAtStake: 60, enrolled: false },
    { id: 'b3', type: 'elevation', status: 'completed', designation: 'CHARLIE', windowEnd: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), myScore: 312, clanAvg: 287, pointsAtStake: 50, enrolled: true },
    { id: 'b4', type: 'volume_capped', status: 'upcoming', designation: 'DELTA', windowEnd: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), myScore: 0, clanAvg: 0, pointsAtStake: 55, enrolled: false },
];

const MOCK_HIGHLIGHTS: Highlight[] = [
    { id: 'h1', type: 'LEAD_CHANGE', severity: 'critical', createdAt: new Date(Date.now() - 23 * 60 * 1000).toISOString(), payload: { newLeader: 'IRON STRIDE', pointsNew: 187, pointsPrev: 174 } },
    { id: 'h2', type: 'MVP_DAY', severity: 'important', createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), payload: { clanName: 'IRON STRIDE', playerName: 'Lucas D.' } },
    { id: 'h3', type: 'BATTLE_WON', severity: 'important', createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), payload: { clanName: 'IRON STRIDE', battleDesignation: 'CHARLIE', points: 50 } },
    { id: 'h4', type: 'COMEBACK', severity: 'important', createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), payload: { clanName: 'APEX RUNNERS', newGap: 13 } },
    { id: 'h5', type: 'CLOSE_MATCH', severity: 'critical', createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), payload: { gap: 8 } },
];

const MOCK_MEMBERS = [
    { id: 'm1', name: 'Lucas D.', role: 'leader', pts: 87 },
    { id: 'm2', name: 'Marie T.', role: 'co_leader', pts: 54 },
    { id: 'm3', name: 'Alex R.', role: 'member', pts: 23 },
    { id: 'm4', name: 'Sophie B.', role: 'elder', pts: 18 },
    { id: 'm5', name: 'Theo M.', role: 'member', pts: 5 },
];

const MOCK_PLAN = {
    lockDeadlineAt: new Date(Date.now() + 4 * 3600 * 1000 + 22 * 60 * 1000).toISOString(),
    myVoteBattleId: 'b1',
    isLocked: false,
    bonusUsed: 120,
    bonusMax: 250,
    votes: [
        { battleId: 'b1', designation: 'ALPHA', type: 'consistency' as BattleType, count: 7 },
        { battleId: 'b2', designation: 'BRAVO', type: 'time_trial' as BattleType, count: 3 },
        { battleId: 'b4', designation: 'DELTA', type: 'volume_capped' as BattleType, count: 2 },
    ],
};

const MOCK_RIVALRY = {
    encounterNumber: 4, wins: 2, losses: 1, ties: 0,
    opponent: { name: 'APEX RUNNERS', initials: 'AR' },
    history: [
        { warId: 'w3', week: 3, myPoints: 210, theirPoints: 185, winner: 'mine' },
        { warId: 'w5', week: 5, myPoints: 162, theirPoints: 189, winner: 'theirs' },
        { warId: 'w6', week: 6, myPoints: 203, theirPoints: 178, winner: 'mine' },
    ],
};

const DIVISION_LADDER = [
    { id: 'diamond', label: 'Diamond', color: '#22d3ee' },
    { id: 'platinum_1', label: 'Platine I', color: '#818cf8' },
    { id: 'platinum_2', label: 'Platine II', color: '#818cf8' },
    { id: 'gold_1', label: 'Or I', color: '#fbbf24' },
    { id: 'gold_2', label: 'Or II', color: '#fbbf24' },
    { id: 'gold_3', label: 'Or III', color: '#fbbf24' },
    { id: 'silver_1', label: 'Argent I', color: '#94a3b8' },
    { id: 'silver_2', label: 'Argent II', color: '#94a3b8' },
    { id: 'silver_3', label: 'Argent III', color: '#94a3b8' },
    { id: 'bronze_1', label: 'Bronze I', color: '#b45309' },
    { id: 'bronze_2', label: 'Bronze II', color: '#b45309' },
    { id: 'bronze_3', label: 'Bronze III', color: '#b45309' },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, name: 'SUMMIT CHASERS', initials: 'SC', distance: 892, warRecord: '8-1', division: 'Or I', divisionColor: '#fbbf24', trend: 'up' },
    { rank: 2, name: 'IRON STRIDE', initials: 'IS', distance: 734, warRecord: '6-2', division: 'Argent II', divisionColor: '#94a3b8', trend: 'up', isMe: true },
    { rank: 3, name: 'APEX RUNNERS', initials: 'AR', distance: 712, warRecord: '5-3', division: 'Argent II', divisionColor: '#94a3b8', trend: 'same' },
    { rank: 4, name: 'TRAIL WOLVES', initials: 'TW', distance: 687, warRecord: '5-3', division: 'Argent III', divisionColor: '#94a3b8', trend: 'down' },
    { rank: 5, name: 'ROAD THUNDER', initials: 'RT', distance: 601, warRecord: '4-4', division: 'Bronze I', divisionColor: '#b45309', trend: 'up' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeUntil(iso: string): string {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}min`;
    return `${Math.floor(m / 60)}h`;
}

const BATTLE_ICONS: Record<BattleType, React.ReactNode> = {
    consistency: <Activity size={14} />,
    time_trial: <Timer size={14} />,
    elevation: <Mountain size={14} />,
    volume_capped: <Package size={14} />,
    longest_single: <TrendingUp size={14} />,
};

const BATTLE_LABELS: Record<BattleType, string> = {
    consistency: 'Régularité',
    time_trial: 'Chrono',
    elevation: 'Dénivelé',
    volume_capped: 'Volume',
    longest_single: 'Plus longue sortie',
};

const BATTLE_STATUS: Record<BattleStatus, { label: string; color: string; pulse: boolean }> = {
    upcoming: { label: 'PRÉVU', color: '#475569', pulse: false },
    open: { label: 'OUVERT', color: '#f59e0b', pulse: false },
    active: { label: 'ACTIF', color: '#ef4444', pulse: true },
    closed: { label: 'FERMÉ', color: '#475569', pulse: false },
    completed: { label: 'TERMINÉ', color: '#10b981', pulse: false },
};

const WAR_STATUS: Record<WarStatus, { label: string; color: string }> = {
    scheduled: { label: 'PROGRAMMÉE', color: '#475569' },
    roster_lock: { label: 'ROSTER LOCK', color: '#f59e0b' },
    active: { label: 'EN COURS', color: '#ef4444' },
    finalized: { label: 'TERMINÉE', color: '#10b981' },
    completed: { label: 'ARCHIVÉE', color: '#334155' },
};

const HIGHLIGHT_META: Record<HighlightType, { icon: React.ReactNode; label: string; color: string }> = {
    LEAD_CHANGE: { icon: <Zap size={13} />, label: 'RENVERSEMENT', color: '#ef4444' },
    COMEBACK: { icon: <Flame size={13} />, label: 'COMEBACK', color: '#f97316' },
    BATTLE_WON: { icon: <Trophy size={13} />, label: 'VICTOIRE BATTLE', color: '#fbbf24' },
    CLOSE_MATCH: { icon: <Crosshair size={13} />, label: 'MATCH SERRÉ', color: '#a855f7' },
    MVP_DAY: { icon: <Star size={13} />, label: 'MVP DU JOUR', color: '#22d3ee' },
    WAR_STARTED: { icon: <Sword size={13} />, label: 'GUERRE LANCÉE', color: '#5ab2ff' },
    WAR_ENDED: { icon: <Shield size={13} />, label: 'GUERRE TERMINÉE', color: '#10b981' },
};

// ─── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ iso, color = '#ef4444', label }: { iso: string; color?: string; label?: string }) {
    const [t, setT] = useState(timeUntil(iso));
    useEffect(() => {
        const iv = setInterval(() => setT(timeUntil(iso)), 1000);
        return () => clearInterval(iv);
    }, [iso]);
    return (
        <div className="text-center leading-none">
            {label && <div className="text-[7px] uppercase tracking-widest font-black mb-0.5" style={{ color: `${color}80` }}>{label}</div>}
            <div className="font-mono font-black text-sm" style={{ color, textShadow: `0 0 10px ${color}50` }}>{t}</div>
        </div>
    );
}

// ─── ClanBadge ─────────────────────────────────────────────────────────────────

function ClanBadge({ initials, size = 44, color = '#5ab2ff', glow = false }: {
    initials: string; size?: number; color?: string; glow?: boolean;
}) {
    return (
        <motion.div
            className="flex items-center justify-center shrink-0 font-black text-white"
            animate={glow ? { boxShadow: [`0 0 0px ${color}00`, `0 0 18px ${color}55`, `0 0 0px ${color}00`] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
                width: size, height: size,
                borderRadius: size * 0.24,
                background: `linear-gradient(135deg, ${color}1a, ${color}08)`,
                border: `1.5px solid ${color}30`,
                fontSize: size * 0.30,
                letterSpacing: '0.04em',
            }}
        >
            {initials}
        </motion.div>
    );
}

// ─── PulseRing ─────────────────────────────────────────────────────────────────

function PulseRing({ color, size = 10 }: { color: string; size?: number }) {
    return (
        <motion.div
            className="rounded-full shrink-0"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: size, height: size, background: color, boxShadow: `0 0 6px ${color}` }}
        />
    );
}

// ─── ClanHome ──────────────────────────────────────────────────────────────────

export function ClanHome() {
    const warActive = MOCK_WAR.status === 'active';
    const maxPts = Math.max(...MOCK_MEMBERS.map(m => m.pts));

    return (
        <div className="space-y-3 px-4 py-3">
            {/* War alert strip */}
            {warActive && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between px-4 py-2.5 rounded-[18px]"
                    style={{
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.13), rgba(239,68,68,0.04))',
                        border: '1px solid rgba(239,68,68,0.22)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <PulseRing color="#ef4444" size={7} />
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-400">GUERRE ACTIVE · S{MOCK_WAR.weekNumber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-xs font-mono font-black text-white">
                            {MOCK_WAR.myClan.points} <span className="text-white/25">—</span> {MOCK_WAR.opponent.points}
                        </div>
                        <Countdown iso={MOCK_WAR.endsAt} color="#ef4444" label="fin" />
                    </div>
                </motion.div>
            )}

            {/* Hero card */}
            <div
                className="rounded-[22px] overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, rgba(90,178,255,0.07) 0%, rgba(7,17,31,0.6) 100%)',
                    border: '1px solid rgba(90,178,255,0.11)',
                }}
            >
                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3.5 mb-5">
                        <ClanBadge initials="IS" size={52} glow={warActive} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[18px] font-black text-white tracking-tight leading-none">IRON STRIDE</span>
                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                    style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }}>
                                    Argent II
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-[10px] text-white/40">
                                <span className="flex items-center gap-1"><Users size={9} /><b className="text-white/60">{MOCK_WAR.myClan.members}</b>/20</span>
                                <span>·</span>
                                <span className="font-mono">734 km</span>
                                <span>·</span>
                                <span className="font-mono font-bold" style={{ color: '#5ab2ff' }}>1187 pts</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { icon: <MessageSquare size={14} />, label: 'Chat', color: '#5ab2ff' },
                            { icon: <UserPlus size={14} />, label: 'Inviter', color: '#22d3ee' },
                            { icon: <Sword size={14} />, label: 'Guerre', color: '#ef4444' },
                            { icon: <BarChart2 size={14} />, label: 'Stats', color: '#10b981' },
                        ].map((a, i) => (
                            <motion.button
                                key={a.label}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileTap={{ scale: 0.93 }}
                                className="flex flex-col items-center gap-1.5 py-3 rounded-[14px]"
                                style={{ background: `${a.color}0a`, border: `1px solid ${a.color}18` }}
                            >
                                <div style={{ color: a.color }}>{a.icon}</div>
                                <span className="text-[8px] font-black uppercase tracking-wide text-white/50">{a.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Member contributions */}
                <div className="border-t border-white/[0.05] px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Contributions war</span>
                        <span className="text-[8px] font-mono text-white/25">{MOCK_WAR.myClan.points} pts</span>
                    </div>
                    <div className="space-y-2">
                        {MOCK_MEMBERS.map((m, i) => (
                            <motion.div key={m.id} className="flex items-center gap-2.5"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 + 0.15 }}>
                                <div className="w-5 h-5 rounded-[8px] flex items-center justify-center shrink-0"
                                    style={{ background: m.role === 'leader' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)' }}>
                                    {m.role === 'leader'
                                        ? <Crown size={8} className="text-yellow-400" />
                                        : <span className="text-[7px] font-black text-white/30">{m.name[0]}</span>}
                                </div>
                                <span className="text-[10px] font-bold text-white/60 w-14 truncate shrink-0">{m.name}</span>
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(m.pts / maxPts) * 100}%` }}
                                        transition={{ duration: 0.75, delay: i * 0.05 + 0.25, ease: 'easeOut' }}
                                        style={{ background: 'linear-gradient(90deg, #5ab2ff, #22d3ee)' }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-white/40 shrink-0 w-6 text-right">{m.pts}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── WarHub ────────────────────────────────────────────────────────────────────

export function WarHub() {
    const { myClan, opponent, status, isCloseMatch, endsAt, weekNumber } = MOCK_WAR;
    const [now, setNow] = useState(() => Date.now());
    const wcfg = WAR_STATUS[status];
    const winning = myClan.points > opponent.points;
    const gap = Math.abs(myClan.points - opponent.points);

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    // War progress ring: percentage of time elapsed
    const totalDuration = 7 * 24 * 3600 * 1000;
    const elapsed = totalDuration - (new Date(endsAt).getTime() - now);
    const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
    const r = 38;
    const circ = 2 * Math.PI * r;

    return (
        <div className="space-y-3 px-4 py-3">
            {/* Close match danger */}
            <AnimatePresence>
                {isCloseMatch && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="rounded-[16px] overflow-hidden"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                        <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                            className="flex items-center gap-2 px-4 py-2.5">
                            <AlertTriangle size={11} className="text-red-400 shrink-0" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-red-300">DANGER — MATCH SERRÉ · Écart {gap} pts</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Duel card */}
            <div className="rounded-[22px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Status bar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]"
                    style={{ background: `${wcfg.color}0c` }}>
                    <div className="flex items-center gap-2">
                        {status === 'active' && <PulseRing color={wcfg.color} size={6} />}
                        <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: wcfg.color }}>{wcfg.label}</span>
                        <span className="text-[8px] font-mono text-white/25">· S{weekNumber}</span>
                    </div>
                    <Countdown iso={endsAt} color={wcfg.color} label="fin" />
                </div>

                {/* Score duel */}
                <div className="grid grid-cols-[1fr,80px,1fr] items-center gap-2 px-4 py-6"
                    style={{ background: 'linear-gradient(180deg, rgba(7,17,31,0) 0%, rgba(239,68,68,0.02) 100%)' }}>
                    {/* My clan */}
                    <div className="flex flex-col items-center gap-2">
                        <ClanBadge initials={myClan.initials} size={44} glow={winning} color="#5ab2ff" />
                        <span className="text-[8px] font-black uppercase tracking-wide text-white/50 text-center leading-tight">{myClan.name}</span>
                        <motion.div
                            key={myClan.points}
                            initial={{ scale: 1.15, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="font-black font-mono leading-none"
                            style={{
                                fontSize: '2.25rem',
                                color: winning ? '#10b981' : '#ef4444',
                                textShadow: winning ? '0 0 18px rgba(16,185,129,0.45)' : '0 0 18px rgba(239,68,68,0.45)',
                            }}
                        >
                            {myClan.points}
                        </motion.div>
                        <span className="text-[7px] font-black uppercase tracking-widest"
                            style={{ color: winning ? '#10b981' : '#ef4444' }}>
                            {winning ? '▲ EN TÊTE' : '▼ DERRIÈRE'}
                        </span>
                    </div>

                    {/* Center ring + VS */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative w-[80px] h-[80px]">
                            <svg width="80" height="80" className="absolute inset-0 -rotate-90">
                                <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                <motion.circle
                                    cx="40" cy="40" r={r}
                                    fill="none"
                                    stroke={wcfg.color}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={circ}
                                    initial={{ strokeDashoffset: circ }}
                                    animate={{ strokeDashoffset: circ * (1 - progress) }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    style={{ filter: `drop-shadow(0 0 4px ${wcfg.color}80)` }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[8px] font-black text-white/20 leading-none tracking-widest">VS</span>
                                <Sword size={12} className="text-white/15 mt-0.5" />
                            </div>
                        </div>
                        <RivalryBadge compact />
                    </div>

                    {/* Opponent */}
                    <div className="flex flex-col items-center gap-2">
                        <ClanBadge initials={opponent.initials} size={44} color="#64748b" />
                        <span className="text-[8px] font-black uppercase tracking-wide text-white/50 text-center leading-tight">{opponent.name}</span>
                        <motion.div
                            key={opponent.points}
                            initial={{ scale: 1.15, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="font-black font-mono leading-none"
                            style={{
                                fontSize: '2.25rem',
                                color: !winning ? '#10b981' : '#ef4444',
                                textShadow: !winning ? '0 0 18px rgba(16,185,129,0.45)' : '0 0 18px rgba(239,68,68,0.45)',
                            }}
                        >
                            {opponent.points}
                        </motion.div>
                        <span className="text-[7px] font-black uppercase tracking-widest"
                            style={{ color: !winning ? '#10b981' : '#ef4444' }}>
                            {!winning ? '▲ EN TÊTE' : '▼ DERRIÈRE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Battles */}
            <div className="flex items-center justify-between px-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Missions</span>
                <span className="text-[8px] font-mono text-white/20">{MOCK_BATTLES.length} battles</span>
            </div>
            <div className="space-y-2">
                {MOCK_BATTLES.map((b, i) => (
                    <motion.div key={b.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                        <BattleMissionCard battle={b} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ─── BattleMissionCard ─────────────────────────────────────────────────────────

export function BattleMissionCard({ battle }: { battle: Battle }) {
    const [open, setOpen] = useState(false);
    const cfg = BATTLE_STATUS[battle.status];
    const actionable = battle.status === 'open' || battle.status === 'active';

    return (
        <motion.div
            layout
            className="rounded-[18px] overflow-hidden"
            style={{
                background: `linear-gradient(135deg, ${cfg.color}0e 0%, rgba(7,17,31,0.85) 100%)`,
                border: `1px solid ${cfg.color}28`,
            }}
        >
            <button className="w-full text-left p-4" onClick={() => setOpen(!open)}>
                <div className="flex items-center gap-3">
                    {/* Icon with status ring */}
                    <div className="relative shrink-0">
                        <motion.div
                            className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                            style={{ background: `${cfg.color}12`, border: `1.5px solid ${cfg.color}35`, color: cfg.color }}
                            animate={cfg.pulse ? { boxShadow: [`0 0 0 ${cfg.color}00`, `0 0 10px ${cfg.color}55`, `0 0 0 ${cfg.color}00`] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            {BATTLE_ICONS[battle.type]}
                        </motion.div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                MISSION {battle.designation}
                            </span>
                            <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                style={{ background: `${cfg.color}14`, color: cfg.color, border: `1px solid ${cfg.color}22` }}>
                                {cfg.label}
                            </span>
                        </div>
                        <div className="text-[13px] font-black text-white leading-none mb-1.5">{BATTLE_LABELS[battle.type]}</div>
                        <div className="flex items-center gap-3 text-[9px] font-mono text-white/40">
                            <span className="flex items-center gap-1"><Clock size={8} /><Countdown iso={battle.windowEnd} color={cfg.color} /></span>
                            {battle.myScore > 0 && (
                                <span>Moi: <b className="text-white/70">{battle.myScore}</b> · Moy: {battle.clanAvg}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="text-right">
                            <div className="text-[6px] uppercase tracking-widest text-white/25">pts</div>
                            <div className="text-sm font-black font-mono" style={{ color: '#10b981' }}>+{battle.pointsAtStake}</div>
                        </div>
                        <ChevronRight size={11} className="text-white/25 transition-transform"
                            style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {open && actionable && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-white/[0.05]"
                    >
                        <div className="px-4 py-3 flex gap-2">
                            {!battle.enrolled ? (
                                <motion.button whileTap={{ scale: 0.96 }}
                                    className="flex-1 py-2.5 rounded-[12px] font-black text-[10px] uppercase tracking-widest"
                                    style={{ background: `linear-gradient(135deg, ${cfg.color}28, ${cfg.color}10)`, border: `1px solid ${cfg.color}45`, color: cfg.color }}>
                                    S'INSCRIRE
                                </motion.button>
                            ) : (
                                <div className="flex-1 py-2.5 rounded-[12px] flex items-center justify-center gap-1.5"
                                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <Check size={11} className="text-emerald-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">INSCRIT</span>
                                </div>
                            )}
                            <button className="px-3 py-2.5 rounded-[12px] text-[9px] font-black uppercase tracking-widest text-white/35"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                Soumettre
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── WarPlanPanel ──────────────────────────────────────────────────────────────

export function WarPlanPanel() {
    const { votes, myVoteBattleId, isLocked, bonusUsed, bonusMax, lockDeadlineAt } = MOCK_PLAN;
    const [myVote, setMyVote] = useState(myVoteBattleId);
    const totalVotes = votes.reduce((s, v) => s + v.count, 0);

    return (
        <div className="px-4 py-3 space-y-3">
            <div
                className="rounded-[22px] overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, rgba(239,68,68,0.07), rgba(7,17,31,0.85))',
                    border: '1px solid rgba(239,68,68,0.18)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/[0.08]">
                    <div className="flex items-center gap-2">
                        <Sword size={11} className="text-red-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-400">BRIEFING TACTIQUE</span>
                    </div>
                    {!isLocked
                        ? <Countdown iso={lockDeadlineAt} color="#f59e0b" label="lock dans" />
                        : (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)' }}>
                                <Lock size={8} className="text-emerald-400" />
                                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400">VERROUILLÉ</span>
                            </div>
                        )}
                </div>

                {/* Vote rows */}
                <div className="px-4 py-3 space-y-2">
                    {votes.map((v, i) => {
                        const mine = myVote === v.battleId;
                        return (
                            <motion.button
                                key={v.battleId}
                                disabled={isLocked}
                                onClick={() => setMyVote(v.battleId)}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="w-full text-left rounded-[14px] p-3 transition-all"
                                style={{
                                    background: mine ? 'rgba(90,178,255,0.09)' : 'rgba(255,255,255,0.03)',
                                    border: mine ? '1px solid rgba(90,178,255,0.32)' : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: mine ? '0 0 14px rgba(90,178,255,0.08)' : 'none',
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-[8px] flex items-center justify-center"
                                            style={{ background: mine ? 'rgba(90,178,255,0.18)' : 'rgba(255,255,255,0.05)', color: mine ? '#5ab2ff' : '#64748b' }}>
                                            {BATTLE_ICONS[v.type]}
                                        </div>
                                        <span className="text-[10px] font-black text-white">MISSION {v.designation}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-mono text-white/40">{v.count} votes</span>
                                        {mine && (
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                                style={{ background: '#5ab2ff' }}>
                                                <Check size={8} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(v.count / totalVotes) * 100}%` }}
                                        transition={{ duration: 0.7, delay: i * 0.06 + 0.2 }}
                                        style={{ background: mine ? '#5ab2ff' : 'rgba(255,255,255,0.18)' }}
                                    />
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Bonus bar */}
                <div className="mx-4 mb-3 rounded-[12px] p-3"
                    style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400/60">BONUS +10% ACTIVÉ</span>
                        <span className="text-[8px] font-mono font-black text-emerald-400">{bonusUsed}/{bonusMax} pts</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(bonusUsed / bonusMax) * 100}%` }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }}
                        />
                    </div>
                </div>

                {/* Lock CTA */}
                {!isLocked && (
                    <div className="px-4 pb-4">
                        <motion.button whileTap={{ scale: 0.97 }}
                            className="w-full py-3 rounded-[14px] flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.08))',
                                border: '1px solid rgba(239,68,68,0.35)',
                                color: '#ef4444',
                            }}>
                            <Lock size={11} />VERROUILLER LA STRATÉGIE
                        </motion.button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── HighlightsFeed ────────────────────────────────────────────────────────────

function HighlightCard({ h, index }: { h: Highlight; index: number }) {
    const meta = HIGHLIGHT_META[h.type];
    const critical = h.severity === 'critical';

    const renderBody = () => {
        switch (h.type) {
            case 'LEAD_CHANGE':
                return <><b className="text-white">{h.payload.newLeader}</b> prend la tête — <span className="font-mono">{h.payload.pointsNew}</span> <span className="text-white/30">vs</span> <span className="font-mono text-white/50">{h.payload.pointsPrev}</span></>;
            case 'MVP_DAY':
                return <><b className="text-white">{h.payload.playerName}</b> <span className="text-white/40">· {h.payload.clanName}</span></>;
            case 'BATTLE_WON':
                return <><b className="text-white">{h.payload.clanName}</b> <span className="text-white/40">· MISSION {h.payload.battleDesignation} ·</span> <span className="font-mono" style={{ color: '#10b981' }}>+{h.payload.points} pts</span></>;
            case 'COMEBACK':
                return <><b className="text-white">{h.payload.clanName}</b> revient — écart: <span className="font-mono font-bold text-white">{h.payload.newGap} pts</span></>;
            case 'CLOSE_MATCH':
                return <>Écart réduit à <span className="font-mono font-bold text-white">{h.payload.gap} pts</span></>;
            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.07 }}
            className="rounded-[15px] overflow-hidden"
            style={{
                background: `linear-gradient(135deg, ${meta.color}12 0%, rgba(7,17,31,0.85) 100%)`,
                border: `1px solid ${meta.color}22`,
                boxShadow: critical ? `0 0 16px ${meta.color}18` : 'none',
            }}
        >
            <div className="flex items-start gap-2.5 p-3">
                <motion.div
                    className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}28`, color: meta.color }}
                    animate={critical ? { boxShadow: [`0 0 0 ${meta.color}00`, `0 0 8px ${meta.color}45`, `0 0 0 ${meta.color}00`] } : {}}
                    transition={{ duration: 1.6, repeat: Infinity }}
                >
                    {meta.icon}
                </motion.div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-[7px] font-mono text-white/25">{timeAgo(h.createdAt)}</span>
                    </div>
                    <div className="text-[10px] text-white/55 leading-relaxed">{renderBody()}</div>
                </div>
            </div>
        </motion.div>
    );
}

export function HighlightsFeed() {
    return (
        <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2 px-0.5">
                <PulseRing color="#ef4444" size={6} />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">FIL DES ÉVÉNEMENTS</span>
            </div>
            <div className="space-y-2">
                {MOCK_HIGHLIGHTS.map((h, i) => <HighlightCard key={h.id} h={h} index={i} />)}
            </div>
        </div>
    );
}

// ─── RivalryBadge ──────────────────────────────────────────────────────────────

export function RivalryBadge({ compact = false }: { compact?: boolean }) {
    const { wins, losses, encounterNumber } = MOCK_RIVALRY;
    if (compact) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(168,85,247,0.13)', border: '1px solid rgba(168,85,247,0.28)' }}>
                <Trophy size={8} style={{ color: '#a855f7' }} />
                <span className="text-[7px] font-black uppercase tracking-widest text-purple-300">#{encounterNumber}</span>
                <span className="text-[7px] text-purple-400/60">·</span>
                <span className="text-[7px] font-mono font-bold text-purple-300">{wins}V–{losses}D</span>
            </motion.div>
        );
    }
    return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <Trophy size={10} style={{ color: '#a855f7' }} />
            <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">Rivalité #{encounterNumber}</span>
            <div className="w-px h-3 bg-purple-500/25" />
            <span className="text-[8px] font-mono font-bold text-purple-300">{wins}V – {losses}D</span>
        </motion.div>
    );
}

// ─── RivalryPage ───────────────────────────────────────────────────────────────

export function RivalryPage() {
    const { wins, losses, ties, opponent, history } = MOCK_RIVALRY;
    const total = wins + losses + ties;

    return (
        <div className="px-4 py-3 space-y-3">
            {/* Hero */}
            <div className="rounded-[22px] p-5"
                style={{
                    background: 'linear-gradient(160deg, rgba(168,85,247,0.1), rgba(7,17,31,0.9))',
                    border: '1px solid rgba(168,85,247,0.18)',
                }}>
                <div className="flex items-center justify-between mb-5">
                    <div className="space-y-2">
                        <span className="text-[7px] font-black uppercase tracking-widest text-purple-400/60">Rivalité de saison</span>
                        <div className="flex items-center gap-2">
                            <ClanBadge initials="IS" size={30} color="#a855f7" />
                            <span className="text-xs font-black text-white/20">VS</span>
                            <ClanBadge initials={opponent.initials} size={30} color="#475569" />
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[7px] uppercase tracking-widest text-white/25 mb-0.5">Rencontre</div>
                        <div className="text-3xl font-black font-mono text-purple-400">#{MOCK_RIVALRY.encounterNumber}</div>
                    </div>
                </div>

                {/* W/D/L boxes */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                        { label: 'Victoires', val: wins, color: '#10b981' },
                        { label: 'Défaites', val: losses, color: '#ef4444' },
                        { label: 'Égalités', val: ties, color: '#475569' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="rounded-[14px] p-3 text-center"
                            style={{ background: `${color}0e`, border: `1px solid ${color}1c` }}>
                            <div className="text-2xl font-black font-mono" style={{ color }}>{val}</div>
                            <div className="text-[7px] font-black uppercase tracking-widest text-white/25 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Ratio bar */}
                <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {[
                        { w: (wins / total) * 100, bg: 'linear-gradient(90deg,#10b981,#34d399)' },
                        { w: (ties / total) * 100, bg: 'rgba(71,85,105,0.5)' },
                        { w: (losses / total) * 100, bg: 'rgba(239,68,68,0.55)' },
                    ].map(({ w, bg }, i) => (
                        <motion.div key={i} className="h-full" style={{ background: bg }}
                            initial={{ width: 0 }} animate={{ width: `${w}%` }}
                            transition={{ duration: 0.9, delay: i * 0.2 }} />
                    ))}
                </div>
            </div>

            {/* History */}
            <div className="px-0.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/25">Historique</span>
            </div>
            <div className="space-y-2">
                {history.map((enc, i) => {
                    const won = enc.winner === 'mine';
                    return (
                        <motion.div key={enc.warId}
                            initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className="flex items-center gap-3 rounded-[15px] p-3"
                            style={{
                                background: won ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                                border: `1px solid ${won ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)'}`,
                            }}>
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                                style={{ background: won ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.09)' }}>
                                {won ? <Trophy size={12} className="text-emerald-400" /> : <Shield size={12} className="text-red-400" />}
                            </div>
                            <div className="flex-1">
                                <div className="text-[7px] font-black uppercase tracking-widest text-white/30 mb-0.5">Semaine {enc.week}</div>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-black font-mono" style={{ color: won ? '#10b981' : '#ef4444' }}>{enc.myPoints}</span>
                                    <span className="text-white/20 text-xs">–</span>
                                    <span className="text-sm font-black font-mono text-white/40">{enc.theirPoints}</span>
                                </div>
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                                style={{
                                    background: won ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.09)',
                                    color: won ? '#10b981' : '#ef4444',
                                    border: `1px solid ${won ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
                                }}>
                                {won ? 'VICTOIRE' : 'DÉFAITE'}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── SeasonDivisionView ────────────────────────────────────────────────────────

export function SeasonDivisionView() {
    const myDiv = 'silver_2';
    const myRating = 1187;

    return (
        <div className="px-4 py-3 space-y-3">
            {/* Season header */}
            <div className="rounded-[20px] p-4"
                style={{ background: 'linear-gradient(135deg, rgba(90,178,255,0.07), rgba(7,17,31,0.85))', border: '1px solid rgba(90,178,255,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-[7px] font-black uppercase tracking-widest text-white/25 mb-0.5">Saison 3</div>
                        <div className="text-base font-black text-white">Division Ladder</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[7px] uppercase tracking-widest text-white/25 mb-0.5">Rating</div>
                        <div className="text-xl font-black font-mono" style={{ color: '#5ab2ff' }}>{myRating}</div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: 'Guerres', val: '6W–2L', color: '#10b981' },
                        { label: 'Rang div.', val: '#4', color: '#5ab2ff' },
                        { label: 'Δ Rating', val: '+87', color: '#fbbf24' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="rounded-[12px] p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="text-xs font-black font-mono" style={{ color }}>{val}</div>
                            <div className="text-[7px] uppercase tracking-widest text-white/25 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ladder */}
            <div className="space-y-1">
                {DIVISION_LADDER.map((div, i) => {
                    const isMe = div.id === myDiv;
                    const isPromo = i <= 1;
                    const isRele = i >= DIVISION_LADDER.length - 2;
                    return (
                        <motion.div key={div.id}
                            initial={{ opacity: 0, x: isMe ? -12 : 0 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-2.5 rounded-[12px] px-3 py-2 relative"
                            style={{
                                background: isMe ? `linear-gradient(135deg, ${div.color}16, ${div.color}06)` : isPromo ? 'rgba(16,185,129,0.03)' : isRele ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)',
                                border: isMe ? `1px solid ${div.color}38` : isPromo ? '1px solid rgba(16,185,129,0.08)' : isRele ? '1px solid rgba(239,68,68,0.08)' : '1px solid rgba(255,255,255,0.04)',
                                boxShadow: isMe ? `0 0 16px ${div.color}12` : 'none',
                            }}>
                            {/* Side indicator */}
                            {isPromo && !isMe && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r" style={{ background: '#10b981' }} />}
                            {isRele && !isMe && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r" style={{ background: '#ef4444' }} />}

                            <div className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: div.color, boxShadow: isMe ? `0 0 5px ${div.color}90` : 'none' }} />
                            <span className="text-[11px] font-black flex-1" style={{ color: isMe ? 'white' : 'rgba(255,255,255,0.35)' }}>
                                {div.label}
                            </span>
                            {isMe ? (
                                <>
                                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                        style={{ background: `${div.color}16`, color: div.color, border: `1px solid ${div.color}28` }}>
                                        MON CLAN
                                    </span>
                                    <span className="font-mono font-black text-[11px] text-white">{myRating}</span>
                                </>
                            ) : (
                                <span className="text-[8px] font-mono text-white/15">{(12 - i) * 100 + 1000}</span>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-0.5">
                <div className="flex items-center gap-1.5"><div className="w-1 h-3 rounded-r bg-emerald-500/50" /><span className="text-[7px] text-white/25">Promotion</span></div>
                <div className="flex items-center gap-1.5"><div className="w-1 h-3 rounded-r bg-red-500/50" /><span className="text-[7px] text-white/25">Relégation</span></div>
            </div>
        </div>
    );
}

// ─── ClanLeaderboardRow ────────────────────────────────────────────────────────

export function ClanLeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
    const isTop3 = entry.rank <= 3;
    const medalColors = ['#fbbf24', '#94a3b8', '#b45309'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 rounded-[15px] px-3 py-2.5"
            style={{
                background: entry.isMe
                    ? 'linear-gradient(135deg, rgba(90,178,255,0.07), rgba(90,178,255,0.02))'
                    : 'rgba(255,255,255,0.02)',
                border: entry.isMe ? '1px solid rgba(90,178,255,0.18)' : '1px solid rgba(255,255,255,0.04)',
            }}>
            {/* Rank */}
            <div className="w-7 flex items-center justify-center shrink-0">
                {isTop3 ? (
                    <div className="w-5 h-5 rounded-[7px] flex items-center justify-center"
                        style={{ background: `${medalColors[entry.rank - 1]}18`, border: `1px solid ${medalColors[entry.rank - 1]}35` }}>
                        <span className="text-[8px] font-black" style={{ color: medalColors[entry.rank - 1] }}>{entry.rank}</span>
                    </div>
                ) : (
                    <span className="text-[10px] font-mono font-bold text-white/25">#{entry.rank}</span>
                )}
            </div>

            <ClanBadge initials={entry.initials} size={30} color={entry.isMe ? '#5ab2ff' : '#3d4f63'} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-black text-white truncate">{entry.name}</span>
                    {entry.isMe && <span className="text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full bg-primary/18 text-primary border border-primary/22 shrink-0">MOI</span>}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-mono text-white/35">{entry.distance} km</span>
                    <span className="text-white/15 text-[8px]">·</span>
                    <span className="text-[7px] font-bold text-white/30">{entry.warRecord}</span>
                    <span className="text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                        style={{ background: `${entry.divisionColor}12`, color: entry.divisionColor, border: `1px solid ${entry.divisionColor}20` }}>
                        {entry.division}
                    </span>
                </div>
            </div>

            <div className="shrink-0">
                {entry.trend === 'up' && <TrendingUp size={11} className="text-emerald-400" />}
                {entry.trend === 'down' && <TrendingDown size={11} className="text-red-400" />}
                {entry.trend === 'same' && <Minus size={11} className="text-white/15" />}
            </div>
        </motion.div>
    );
}

// ─── ClanWarSystemDemo ─────────────────────────────────────────────────────────

type DemoTab = 'home' | 'war' | 'plan' | 'highlights' | 'rivalry' | 'season' | 'leaderboard';

const DEMO_TABS: { key: DemoTab; label: string }[] = [
    { key: 'home', label: 'Clan' },
    { key: 'war', label: 'Guerre' },
    { key: 'plan', label: 'Stratégie' },
    { key: 'highlights', label: 'Events' },
    { key: 'rivalry', label: 'Rivalité' },
    { key: 'season', label: 'Division' },
    { key: 'leaderboard', label: 'Classement' },
];

export function ClanWarSystemDemo() {
    const [tab, setTab] = useState<DemoTab>('war');

    return (
        <div className="min-h-screen pb-32" style={{ background: '#07111f' }}>
            {/* Header */}
            <div className="sticky top-0 z-20 px-4 pt-8 pb-2"
                style={{ background: 'linear-gradient(180deg, #07111f 65%, transparent)' }}>
                <div className="flex items-center gap-2 mb-2.5">
                    <PulseRing color="#ef4444" size={6} />
                    <span className="text-[7px] font-black uppercase tracking-widest text-white/20">CLAN SYSTEM · DEMO</span>
                </div>
                {/* Scrollable tab bar */}
                <div className="flex gap-1.5 overflow-x-auto py-0.5" style={{ scrollbarWidth: 'none' }}>
                    {DEMO_TABS.map(t => (
                        <motion.button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            whileTap={{ scale: 0.93 }}
                            className="shrink-0 px-3 py-1.5 rounded-[10px] text-[9px] font-black uppercase tracking-wide transition-colors"
                            style={{
                                background: tab === t.key ? '#5ab2ff' : 'rgba(255,255,255,0.06)',
                                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.38)',
                            }}
                        >
                            {t.label}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 7 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -7 }}
                    transition={{ duration: 0.16 }}
                >
                    {tab === 'home' && <ClanHome />}
                    {tab === 'war' && <WarHub />}
                    {tab === 'plan' && <WarPlanPanel />}
                    {tab === 'highlights' && <HighlightsFeed />}
                    {tab === 'rivalry' && <RivalryPage />}
                    {tab === 'season' && <SeasonDivisionView />}
                    {tab === 'leaderboard' && (
                        <div className="px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between px-0.5 mb-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Classement Clans</span>
                                <span className="text-[8px] font-mono text-white/20">par distance</span>
                            </div>
                            {MOCK_LEADERBOARD.map((e, i) => <ClanLeaderboardRow key={e.rank} entry={e} index={i} />)}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
