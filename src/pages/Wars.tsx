import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Timer, ShieldAlert, Users, Trophy, Zap, Shield, Clock, CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

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

interface WarOpponent {
    clanId: string;
    clanName: string;
    clanBadgeUrl: string | null;
    points: number;
    rank: number;
}

interface Battle {
    id: string;
    battleType: string;
    windowStart: string;
    windowEnd: string;
    status: string;
    battleOrder: number;
}

interface ScoreEntry {
    rank: number;
    clanId: string;
    clanName: string;
    totalPoints: number;
    contributors?: number;
    contributions?: number;
}

interface WarCurrentData {
    war: {
        id: string;
        status: string;
        startsAt: string;
        endsAt: string;
        format: string;
        weekNumber: number;
    } | null;
    opponents: WarOpponent[];
    battles: Battle[];
    myParticipations: Array<{ battleId: string; score: number; status: string }>;
    hoursRemaining: number;
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

const BATTLE_TYPE_LABELS: Record<string, string> = {
    distance: 'Distance totale',
    pace: 'Meilleure allure',
    elevation: 'Dénivelé',
    streak: 'Régularité',
    time: 'Temps de course',
};

const BATTLE_STATUS_LABELS: Record<string, string> = {
    scheduled: 'À venir',
    upcoming: 'Bientôt',
    active: 'En cours',
    open: 'En cours',
    completed: 'Terminé',
    finalized: 'Finalisé',
    closed: 'Clôturé',
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function Wars() {
    const [myClan, setMyClan] = useState<MyClanData | null>(null);
    const [warData, setWarData] = useState<WarCurrentData | null>(null);
    const [scoreboard, setScoreboard] = useState<ScoreEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWarData();
    }, []);

    const fetchWarData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Get my clan first
            const clanRes = await api.get<MyClanData>('/clans/me');
            setMyClan(clanRes.data);

            // If in a clan, get current war
            if (clanRes.data.clan) {
                try {
                    const warRes = await api.get<WarCurrentData>('/game/wars/current');
                    setWarData(warRes.data);

                    // If war exists, get scoreboard
                    if (warRes.data.war) {
                        try {
                            const sbRes = await api.get<{ scoreboard: ScoreEntry[] }>(
                                `/game/wars/${warRes.data.war.id}/scoreboard`
                            );
                            setScoreboard(sbRes.data.scoreboard ?? []);
                        } catch {
                            // Scoreboard not critical
                        }
                    }
                } catch {
                    // Game Wars might be disabled (feature flag off) → treat as no war
                    setWarData({ war: null, opponents: [], battles: [], myParticipations: [], hoursRemaining: 0 });
                }
            }
        } catch {
            setError('Impossible de charger les données.');
        } finally {
            setLoading(false);
        }
    };

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
                        <button className="btn-primary py-3.5 font-black text-sm flex items-center justify-center gap-2">
                            <Users size={16} />
                            Rejoindre un clan
                        </button>
                        <button className="glass-card rounded-full py-3.5 font-black text-sm text-white flex items-center justify-center gap-2 border border-white/10 hover:border-primary/30 transition-colors">
                            <Swords size={16} className="text-primary" />
                            Créer mon clan
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const clan = myClan.clan;
    const war = warData?.war ?? null;
    const opponents = warData?.opponents ?? [];
    const battles = warData?.battles ?? [];
    const myParticipations = warData?.myParticipations ?? [];
    const hoursRemaining = warData?.hoursRemaining ?? 0;

    // My clan's score from scoreboard
    const myScore = scoreboard.find(s => s.clanId === clan.id);
    const opponentScore = opponents[0] ? scoreboard.find(s => s.clanId === opponents[0].clanId) : null;

    const myPoints = myScore?.totalPoints ?? 0;
    const opponentPoints = opponentScore?.totalPoints ?? opponents[0]?.points ?? 0;
    const totalPoints = myPoints + opponentPoints;
    const myPct = totalPoints > 0 ? Math.round((myPoints / totalPoints) * 100) : 50;
    const opponentPct = totalPoints > 0 ? 100 - myPct : 50;

    const opponent = opponents[0] ?? null;

    const participatedIds = new Set(myParticipations.map(p => p.battleId));

    // ── No war active ────────────────────────
    if (!war) {
        return (
            <div className="px-5 pt-7 pb-28">
                <header className="mb-6">
                    <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">Guerres</h1>
                    <p className="text-text-muted text-sm mt-0.5">Défie d'autres clans</p>
                </header>

                {/* Clan card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[28px] p-5 mb-4"
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

                {/* No war state */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card rounded-[28px] p-8 text-center border-dashed"
                >
                    <div className="w-16 h-16 glass-hero rounded-[20px] flex items-center justify-center mx-auto mb-4">
                        <Swords size={26} className="text-primary/60" />
                    </div>
                    <p className="font-black text-white mb-1">Aucune guerre en cours</p>
                    <p className="text-text-muted text-sm">
                        La prochaine guerre sera planifiée automatiquement. Reviens bientôt !
                    </p>
                </motion.div>
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
                        <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">Guerre</h1>
                        <p className="text-text-muted text-sm mt-0.5">Semaine {war.weekNumber}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/25">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-red-400 text-[10px] font-black uppercase tracking-wider">En cours</span>
                    </div>
                </header>

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
                        <p className="text-[10px] font-bold text-text-muted">Temps restant</p>
                        <p className="font-black text-white text-base">{formatHours(hoursRemaining)}</p>
                    </div>
                </motion.div>

                {/* VS Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass-hero rounded-[28px] p-5"
                >
                    {/* Clans row */}
                    <div className="flex items-center justify-between mb-6">
                        {/* My clan */}
                        <div className="flex-1 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-2.5 shadow-[0_0_18px_rgba(90,178,255,0.25)]">
                                <span className="text-primary font-black text-xl">{clanInitials(clan.name)}</span>
                            </div>
                            <p className="font-black text-white text-sm leading-tight">{clan.name}</p>
                            <p className="text-primary font-black text-sm mt-0.5">{myPoints.toLocaleString()} pts</p>
                        </div>

                        {/* VS */}
                        <div className="font-black text-2xl text-text-muted/30 italic mx-3">VS</div>

                        {/* Opponent */}
                        {opponent ? (
                            <div className="flex-1 text-center">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-2.5 shadow-[0_0_18px_rgba(239,68,68,0.2)]">
                                    <span className="text-red-400 font-black text-xl">{clanInitials(opponent.clanName)}</span>
                                </div>
                                <p className="font-black text-white text-sm leading-tight">{opponent.clanName}</p>
                                <p className="text-red-400 font-black text-sm mt-0.5">{opponentPoints.toLocaleString()} pts</p>
                            </div>
                        ) : (
                            <div className="flex-1 text-center">
                                <div className="w-16 h-16 mx-auto rounded-2xl glass-card flex items-center justify-center mb-2.5">
                                    <Users size={22} className="text-text-muted" />
                                </div>
                                <p className="font-black text-text-muted text-sm">Adversaire</p>
                            </div>
                        )}
                    </div>

                    {/* Progress bar */}
                    {totalPoints > 0 && (
                        <div className="relative h-3 rounded-full overflow-hidden glass-card">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${myPct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="absolute left-0 top-0 h-full bg-primary rounded-full"
                                style={{ boxShadow: '0 0 10px rgba(90,178,255,0.5)' }}
                            />
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${opponentPct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="absolute right-0 top-0 h-full bg-red-500/80 rounded-full"
                            />
                        </div>
                    )}
                    {totalPoints > 0 && (
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] font-bold text-primary">{myPct}%</span>
                            <span className="text-[10px] font-bold text-red-400">{opponentPct}%</span>
                        </div>
                    )}
                    {totalPoints === 0 && (
                        <div className="h-3 rounded-full glass-card" />
                    )}
                </motion.div>

                {/* My contribution */}
                {myClan.membership && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        <div className="glass-card rounded-[22px] p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Zap size={12} className="text-primary" />
                                <span className="text-[10px] font-bold text-text-muted">Ma contribution</span>
                            </div>
                            <p className="text-xl font-black text-white">
                                {(myClan.membership.contributionDistanceM / 1000).toFixed(1)}
                                <span className="text-sm font-bold text-text-muted ml-1">km</span>
                            </p>
                        </div>
                        <div className="glass-card rounded-[22px] p-4">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Trophy size={12} className="text-primary" />
                                <span className="text-[10px] font-bold text-text-muted">Séances</span>
                            </div>
                            <p className="text-xl font-black text-white">
                                {myClan.membership.contributionActivities}
                                <span className="text-sm font-bold text-text-muted ml-1">runs</span>
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Battles */}
                {battles.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-text-muted mb-3">Épreuves</h3>
                        <div className="space-y-2.5">
                            <AnimatePresence>
                                {battles.map((battle, i) => {
                                    const participated = participatedIds.has(battle.id);
                                    const isActive = ['active', 'open'].includes(battle.status);
                                    const isCompleted = ['completed', 'finalized', 'closed'].includes(battle.status);

                                    return (
                                        <motion.div
                                            key={battle.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="rf-activity-row group"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                                                participated ? 'glass-hero' :
                                                isActive ? 'bg-red-500/15 border border-red-500/20' : 'glass-card'
                                            }`}>
                                                {participated
                                                    ? <CheckCircle size={18} className="text-primary" />
                                                    : isActive
                                                        ? <Swords size={18} className="text-red-400" />
                                                        : <Circle size={18} className="text-text-muted/50" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm text-white truncate">
                                                    {BATTLE_TYPE_LABELS[battle.battleType] ?? battle.battleType}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[10px] font-bold ${
                                                        isActive ? 'text-red-400' :
                                                        isCompleted ? 'text-text-muted/50' : 'text-text-muted'
                                                    }`}>
                                                        {BATTLE_STATUS_LABELS[battle.status] ?? battle.status}
                                                    </span>
                                                    {participated && (
                                                        <span className="text-[10px] font-bold text-primary">· Participé ✓</span>
                                                    )}
                                                </div>
                                            </div>
                                            {isActive && !participated && (
                                                <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full flex-shrink-0">
                                                    LIVE
                                                </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {battles.length === 0 && war && (
                    <div className="glass-card rounded-[24px] p-6 text-center">
                        <p className="text-text-muted text-sm">Les épreuves seront disponibles au début de la guerre.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
