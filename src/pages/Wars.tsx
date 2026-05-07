import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Timer, ShieldAlert, Users, Shield, CalendarDays, Flame } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWarData } from '../hooks/useWarData';
import { api } from '../services/api';
import { resolveError } from '../services/errors';
import { useFeatureFlag } from '../services/featureFlags';
import { useInvalidation, type QueryTag } from '../services/queryInvalidation';
import { SeasonView } from '../components/community/SeasonView';
import { ActiveWarView } from '../components/community/ActiveWarView';
import { ClanRivalriesView } from '../components/community/ClanRivalriesView';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ClanInfo {
    id: string;
    name: string;
    badgeUrl: string | null;
    memberCount: number;
    totalDistanceM: number;
}

interface MyClanData {
    clan: ClanInfo | null;
    membership: {
        role: string;
        contributionDistanceM: number;
        contributionActivities: number;
    } | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function clanInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');
}

function formatHours(h: number): string {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function Wars() {
    const navigate = useNavigate();
    const { warId } = useParams();
    const warsEnabled = useFeatureFlag('GAME_WARS_V1');
    const [tab, setTab] = useState<'war' | 'season' | 'rivalries'>('war');
    const [myClan, setMyClan] = useState<MyClanData | null>(null);
    const [clanLoading, setClanLoading] = useState(true);
    const [clanError, setClanError] = useState<string | null>(null);

    const fetchClan = useCallback(async () => {
        setClanLoading(true);
        setClanError(null);
        try {
            const clanRes = await api.get<MyClanData>('/clans/me');
            setMyClan(clanRes.data);
        } catch (e) {
            setClanError(resolveError(e, 'Impossible de charger les données.'));
        } finally {
            setClanLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchClan();
    }, [fetchClan]);

    const clanInvalidationTags = useMemo<QueryTag[]>(() => ['clans', 'my-clan'], []);
    useInvalidation(clanInvalidationTags, fetchClan);

    const shouldLoadWar = Boolean(myClan?.clan) && warsEnabled !== false;
    const {
        data: warData,
        loading: warLoading,
        error: warError,
        refresh: refreshWar,
    } = useWarData(warId, { enabled: shouldLoadWar });

    const fetchWarData = useCallback(() => {
        void fetchClan();
        if (shouldLoadWar) void refreshWar();
    }, [fetchClan, refreshWar, shouldLoadWar]);

    const loading = clanLoading
        || (Boolean(myClan?.clan) && warsEnabled === null)
        || (shouldLoadWar && warLoading && !warData.war);
    const error = clanError ?? (shouldLoadWar ? warError : null);

    // ── Loading ──────────────────────────────
    if (loading) {
        return (
            <div className="px-5 pt-7 pb-28 space-y-5">
                <div className="skeleton h-8 w-40 rounded-xl" />
                <div className="skeleton h-56 rounded-[28px]" />
                <div className="skeleton h-32 rounded-[28px]" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-[20px]" />)}
                </div>
            </div>
        );
    }

    // ── Error ────────────────────────────────
    if (error) {
        return (
            <div className="px-5 pt-7 pb-28 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="glass-hero w-16 h-16 rounded-[20px] flex items-center justify-center">
                    <ShieldAlert size={28} className="text-red-400" />
                </div>
                <p className="font-bold text-white">{error}</p>
                <button onClick={fetchWarData} className="btn-primary px-6 py-3 text-sm font-black">
                    Réessayer
                </button>
            </div>
        );
    }

    // ── No clan ──────────────────────────────
    if (!myClan?.clan) {
        return (
            <div className="px-5 pt-7 pb-28">
                <header className="mb-8">
                    <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">Guerres</h1>
                    <p className="text-text-muted text-sm mt-0.5">Défie d'autres clans</p>
                </header>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[28px] p-8 text-center"
                >
                    <div className="w-16 h-16 glass-card rounded-[20px] flex items-center justify-center mx-auto mb-5">
                        <Shield size={28} className="text-primary" />
                    </div>
                    <h2 className="font-black text-white text-xl mb-2">Pas encore de clan</h2>
                    <p className="text-text-muted text-sm leading-relaxed mb-6">
                        Rejoins un clan ou crée le tien pour participer aux guerres hebdomadaires !
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/community')}
                            className="btn-primary py-3.5 font-black text-sm flex items-center justify-center gap-2"
                        >
                            <Users size={16} />
                            Rejoindre un clan
                        </button>
                        <button
                            onClick={() => navigate('/community')}
                            className="glass-card rounded-full py-3.5 font-black text-sm text-white flex items-center justify-center gap-2 border border-white/10 hover:border-primary/30 transition-colors"
                        >
                            <Swords size={16} className="text-primary" />
                            Créer mon clan
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const clan = myClan.clan;
    const war = warData.war;
    const opponents = warData.opponents;
    const battles = warData.battles;
    const myParticipations = warData.myParticipations;
    const hoursRemaining = warData.hoursRemaining;
    const scoreboard = warData.scoreboard;

    // ── No war active ────────────────────────
    if (!war) {
        return (
            <div className="px-5 pt-7 pb-28 space-y-5">
                <header>
                    <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">Guerres</h1>
                    <p className="text-text-muted text-sm mt-0.5">Défie d'autres clans</p>
                </header>

                {/* Clan card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[28px] p-5"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-black text-lg">{clanInitials(clan.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-white text-base truncate">{clan.name}</p>
                            <p className="text-text-muted text-xs mt-0.5">
                                {clan.memberCount} membres · {(clan.totalDistanceM / 1000).toFixed(0)} km au total
                            </p>
                        </div>
                        {myClan.membership?.role === 'leader' && (
                            <span className="rf-tag">Chef</span>
                        )}
                    </div>
                </motion.div>

                {/* Tab switcher */}
                <WarTabSwitcher tab={tab} onChange={setTab} />

                <AnimatePresence mode="wait">
                    {tab === 'war' ? (
                        <motion.div key="war" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="glass-card rounded-[28px] p-8 text-center border-dashed">
                                <div className="w-16 h-16 glass-hero rounded-[20px] flex items-center justify-center mx-auto mb-4">
                                    <Swords size={26} className="text-primary/60" />
                                </div>
                                <p className="font-black text-white mb-1">Aucune guerre en cours</p>
                                <p className="text-text-muted text-sm">
                                    {warsEnabled === false
                                        ? 'Les guerres ne sont pas encore disponibles sur cette API.'
                                        : 'La prochaine guerre sera planifiée automatiquement. Reviens bientôt !'}
                                </p>
                            </div>
                        </motion.div>
                    ) : tab === 'rivalries' ? (
                        <motion.div key="rivalries" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <ClanRivalriesView myClanId={clan.id} />
                        </motion.div>
                    ) : (
                        <motion.div key="season" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <SeasonView clanId={clan.id} clanName={clan.name} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ── Active war ───────────────────────────
    return (
        <div className="pb-28">
            <div className="px-5 space-y-4 pt-7">

                {/* Header */}
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">
                            {tab === 'season' ? 'Saison' : tab === 'rivalries' ? 'Rivalités' : 'Guerre'}
                        </h1>
                        <p className="text-text-muted text-sm mt-0.5">
                            {tab === 'season' || tab === 'rivalries' ? clan.name : `Semaine ${war.weekNumber}`}
                        </p>
                    </div>
                    {tab === 'war' && <WarStatusBadge status={war.status} />}
                </header>

                {/* Tab switcher */}
                <WarTabSwitcher tab={tab} onChange={setTab} />

                <AnimatePresence mode="wait">
                {tab === 'season' ? (
                    <motion.div key="season" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <SeasonView clanId={clan.id} clanName={clan.name} />
                    </motion.div>
                ) : tab === 'rivalries' ? (
                    <motion.div key="rivalries" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <ClanRivalriesView myClanId={clan.id} />
                    </motion.div>
                ) : (
                <motion.div key="war" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

                {/* Time remaining */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[22px] p-4 flex items-center gap-3"
                >
                    <div className="w-9 h-9 rounded-xl glass-card flex items-center justify-center flex-shrink-0">
                        <Timer size={18} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Temps restant</p>
                        <p className="font-mono font-black text-white text-base">{formatHours(hoursRemaining)}</p>
                    </div>
                </motion.div>

                <ActiveWarView
                    warId={war.id}
                    war={war}
                    opponents={opponents}
                    battles={battles}
                    myParticipations={myParticipations}
                    hoursRemaining={hoursRemaining}
                    scoreboard={scoreboard}
                    highlights={warData.highlights}
                    timeline={warData.timeline}
                    aggregates={warData.aggregates}
                    myClanId={clan.id}
                    myClanName={clan.name}
                    myRole={myClan.membership?.role ?? 'member'}
                    contributionKm={(myClan.membership?.contributionDistanceM ?? 0) / 1000}
                    contributionActivities={myClan.membership?.contributionActivities ?? 0}
                    rivalryContext={warData.rivalryContext}
                    onRefresh={fetchWarData}
                />

                </motion.div>
                )}
                </AnimatePresence>

            </div>
        </div>
    );
}

// ─── WarStatusBadge ────────────────────────────────────────────────────────────

function WarStatusBadge({ status }: { status: string }) {
    const cfg = WAR_STATUS_CONFIG[status] ?? WAR_STATUS_CONFIG.scheduled;
    return (
        <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
            <div
                className={`w-1.5 h-1.5 rounded-full ${cfg.pulse ? 'animate-pulse' : ''}`}
                style={{ background: cfg.dot }}
            />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: cfg.text }}>
                {cfg.label}
            </span>
        </div>
    );
}

const WAR_STATUS_CONFIG: Record<string, {
    label: string; bg: string; border: string; dot: string; text: string; pulse: boolean;
}> = {
    scheduled:    { label: 'Planifiée',    bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)', dot: 'rgba(255,255,255,0.40)', text: 'rgba(255,255,255,0.55)', pulse: false },
    matchmaking:  { label: 'Matchmaking',  bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  dot: '#f59e0b',                text: '#f59e0b',                pulse: true  },
    roster_lock:  { label: 'Roster lock',  bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)',  dot: '#f59e0b',                text: '#f59e0b',                pulse: false },
    active:       { label: 'En cours',     bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.25)',   dot: '#f87171',                text: '#f87171',                pulse: true  },
    finalized:    { label: 'Terminée',     bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  dot: '#10b981',                text: '#10b981',                pulse: false },
    completed:    { label: 'Archivée',     bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)', dot: 'rgba(255,255,255,0.30)', text: 'rgba(255,255,255,0.45)', pulse: false },
};

// ─── WarTabSwitcher ────────────────────────────────────────────────────────────

function WarTabSwitcher({
    tab,
    onChange,
}: {
    tab: 'war' | 'season' | 'rivalries';
    onChange: (t: 'war' | 'season' | 'rivalries') => void;
}) {
    const tabs = [
        { key: 'war' as const, label: 'Guerre', icon: <Swords size={11} /> },
        { key: 'season' as const, label: 'Saison', icon: <CalendarDays size={11} /> },
        { key: 'rivalries' as const, label: 'Rivalités', icon: <Flame size={11} /> },
    ];
    return (
        <div className="flex gap-1.5 p-1 glass-card rounded-[16px]">
            {tabs.map(({ key, label, icon }) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[11px] text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{
                        background: tab === key ? (key === 'rivalries' ? 'rgba(168,85,247,0.18)' : 'rgba(90,178,255,0.18)') : 'transparent',
                        color: tab === key ? (key === 'rivalries' ? '#a855f7' : '#5ab2ff') : 'rgba(255,255,255,0.35)',
                        border: tab === key ? (key === 'rivalries' ? '1px solid rgba(168,85,247,0.28)' : '1px solid rgba(90,178,255,0.28)') : '1px solid transparent',
                    }}
                >
                    {icon}{label}
                </button>
            ))}
        </div>
    );
}
