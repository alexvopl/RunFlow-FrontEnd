import { useState, useEffect, useCallback } from 'react';
import { Loader2, Target, Star, Timer, Trophy, BarChart3, ChevronLeft, RotateCw, ChevronRight, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { clsx } from 'clsx';

// ─── Helpers ─────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <div className="w-7 h-7 rounded-lg bg-rank-gold flex items-center justify-center font-black text-black text-xs">1</div>;
    if (rank === 2) return <div className="w-7 h-7 rounded-lg bg-rank-silver flex items-center justify-center font-black text-black text-xs">2</div>;
    if (rank === 3) return <div className="w-7 h-7 rounded-lg bg-rank-bronze flex items-center justify-center font-black text-white text-xs">3</div>;
    return <div className="w-7 h-7 rounded-lg glass-card flex items-center justify-center font-black text-text-muted text-xs">{rank}</div>;
}

const TABS = [
    { key: 'challenges', label: 'Défis' },
    { key: 'history', label: 'Historique' },
    { key: 'leaderboard', label: 'Classement' },
] as const;

const TIMEFRAMES = [
    { key: 'global', label: 'Global' },
    { key: 'weekly', label: 'Semaine' },
    { key: 'monthly', label: 'Mois' },
] as const;

// ─────────────────────────────────────────────────────────────────────────
export function Challenges() {
    const { challengeId } = useParams();
    const [activeTab, setActiveTab] = useState<'challenges' | 'history' | 'leaderboard'>('challenges');
    const [timeframe, setTimeframe] = useState<'global' | 'weekly' | 'monthly'>('global');
    const [challenges, setChallenges] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
    const [challengeLeaderboard, setChallengeLeaderboard] = useState<any[]>([]);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadChallengeLeaderboard = useCallback(async (id: string) => {
        try {
            const res = await api.get(`/challenges/${id}/leaderboard`);
            setChallengeLeaderboard(Array.isArray(res.data?.entries) ? res.data.entries : []);
        } catch {
            setChallengeLeaderboard([]);
        }
    }, []);

    const openChallenge = useCallback(async (challenge: any) => {
        setSelectedChallenge(challenge);
        await loadChallengeLeaderboard(challenge.id);
    }, [loadChallengeLeaderboard]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'challenges') {
                    const [challengesRes, statsRes] = await Promise.all([
                        api.get('/challenges/active'),
                        api.get('/challenges/stats').catch(() => ({ data: null })),
                    ]);
                    const activeChallenge = challengesRes.data?.challenge;
                    const myEntry = challengesRes.data?.myEntry;
                    const progress = challengesRes.data?.progress ?? 0;
                    const normalizedChallenge = activeChallenge ? {
                        ...activeChallenge,
                        progress,
                        current: myEntry?.currentValue ?? 0,
                        goal: activeChallenge.targetValue,
                    } : null;
                    setChallenges(normalizedChallenge ? [normalizedChallenge] : []);
                    setStats(statsRes.data);
                    if (challengeId) {
                        const linkedChallenge = normalizedChallenge?.id === challengeId
                            ? normalizedChallenge
                            : await api.get(`/challenges/${challengeId}`)
                                .then(res => res.data?.challenge ?? res.data)
                                .catch(() => null);
                        if (linkedChallenge) {
                            setSelectedChallenge(linkedChallenge);
                            void loadChallengeLeaderboard(challengeId);
                        }
                    }
                } else if (activeTab === 'history') {
                    const res = await api.get('/challenges/history');
                    setHistory(Array.isArray(res.data?.challenges) ? res.data.challenges : []);
                } else {
                    const endpoint = timeframe === 'global' ? '/leaderboards/global' : `/leaderboards/${timeframe}`;
                    const res = await api.get(endpoint);
                    setLeaderboard(Array.isArray(res.data?.entries) ? res.data.entries : []);
                }
            } catch { /* silent */ }
            finally { setLoading(false); }
        };
        void fetchData();
    }, [activeTab, challengeId, loadChallengeLeaderboard, timeframe]);

    const handleOpenChallenge = async (challenge: any) => {
        await openChallenge(challenge);
    };

    const handleRefresh = async (challengeId: string) => {
        setRefreshingId(challengeId);
        try {
            await api.post(`/challenges/${challengeId}/refresh`);
            const res = await api.get('/challenges/active');
            const activeChallenge = res.data?.challenge;
            const myEntry = res.data?.myEntry;
            const progress = res.data?.progress ?? 0;
            setChallenges(activeChallenge ? [{
                ...activeChallenge, progress,
                current: myEntry?.currentValue ?? 0,
                goal: activeChallenge.targetValue,
            }] : []);
        } catch { /* silent */ }
        finally { setRefreshingId(null); }
    };

    // ── Challenge detail sheet ──────────────────────────────────────────
    if (selectedChallenge) {
        return (
            <div className="px-5 pt-7 pb-28">
                <button onClick={() => setSelectedChallenge(null)}
                    className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6 text-sm font-bold">
                    <ChevronLeft size={18} />
                    Retour aux défis
                </button>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[28px] p-5 mb-4">
                    <div className="rf-tag mb-3">
                        <Star size={9} /> {selectedChallenge.type || 'Endurance'}
                    </div>
                    <h1 className="text-xl font-black tracking-tight text-white mb-1">{selectedChallenge.title}</h1>
                    <p className="text-text-muted text-sm leading-relaxed mb-5">{selectedChallenge.description}</p>

                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-text-muted font-medium">Progression</span>
                        <span className="text-primary font-bold">{selectedChallenge.progress || 0}%</span>
                    </div>
                    <div className="xp-track mb-4">
                        <div className="xp-fill" style={{ width: `${selectedChallenge.progress || 0}%` }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="glass-card rounded-2xl p-3 text-center">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Actuel</div>
                            <div className="font-black text-white">{selectedChallenge.current || 0}</div>
                        </div>
                        <div className="glass-card rounded-2xl p-3 text-center">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Objectif</div>
                            <div className="font-black text-white">{selectedChallenge.goal}</div>
                        </div>
                    </div>

                    <button onClick={() => handleRefresh(selectedChallenge.id)}
                        disabled={refreshingId === selectedChallenge.id}
                        className="w-full py-2.5 glass-card rounded-full text-xs font-black text-text-muted hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        <RotateCw size={13} className={refreshingId === selectedChallenge.id ? 'animate-spin' : ''} />
                        Mettre à jour la progression
                    </button>
                </motion.div>

                <h3 className="text-sm font-bold text-text-muted mb-3">Classement du défi</h3>
                {challengeLeaderboard.length > 0 ? (
                    <div className="space-y-2">
                        {challengeLeaderboard.map((u: any, i: number) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="rf-activity-row">
                                <RankBadge rank={i + 1} />
                                <div className="w-9 h-9 rounded-xl glass-hero flex items-center justify-center font-black text-sm text-primary flex-shrink-0">
                                    {(u.clanName || u.displayName || u.username || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm text-white truncate">
                                        {u.clanName || u.displayName || u.username || 'Inconnu'}
                                    </p>
                                </div>
                                <span className="text-sm font-black text-primary flex-shrink-0">
                                    {u.currentValue || u.totalDistanceM || 0}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card rounded-[24px] p-10 text-center border-dashed">
                        <Trophy size={28} className="text-text-muted/20 mx-auto mb-2" />
                        <p className="text-text-muted text-sm font-bold">Classement indisponible</p>
                    </div>
                )}
            </div>
        );
    }

    // ── Main view ───────────────────────────────────────────────────────
    return (
        <div className="pb-28">
            <div className="px-5 space-y-5 pt-7">

                {/* Header */}
                <header>
                    <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">Compétition</h1>
                    <p className="text-text-muted text-sm mt-0.5">Défis et classements</p>
                </header>

                {/* Stats bar (challenges tab only) */}
                {activeTab === 'challenges' && stats && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Complétés', value: stats.completed || 0 },
                            { label: 'Total', value: stats.totalChallenges || 0 },
                            { label: 'Points', value: stats.totalPointsEarned || 0 },
                        ].map((s, i) => (
                            <div key={i} className="glass-card rounded-[20px] p-3 text-center">
                                <div className="text-xl font-black text-white">{s.value}</div>
                                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pill tabs */}
                <div className="flex gap-2 p-1 glass-card rounded-2xl">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={clsx(
                                'flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                                activeTab === tab.key
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-text-muted hover:text-white'
                            )}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin text-primary" size={28} />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">

                        {/* ── Challenges tab ─────────────────────── */}
                        {activeTab === 'challenges' && (
                            <motion.div key="challenges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="space-y-3">
                                {challenges.length > 0 ? challenges.map((challenge, i) => (
                                    <motion.button key={challenge.id}
                                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                        onClick={() => handleOpenChallenge(challenge)}
                                        className="w-full text-left glass-hero rounded-[28px] p-5 active:scale-[0.98] transition-all group">

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="rf-tag">
                                                <Star size={9} /> {challenge.type || 'Endurance'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-text-muted">
                                                    <Timer size={12} />
                                                    <span className="text-[10px] font-bold">{challenge.timeLeft || '—'}</span>
                                                </div>
                                                <button onClick={e => { e.stopPropagation(); handleRefresh(challenge.id); }}
                                                    disabled={refreshingId === challenge.id}
                                                    className="w-7 h-7 glass-card rounded-lg flex items-center justify-center hover:text-white transition-colors disabled:opacity-50">
                                                    <RotateCw size={12} className={refreshingId === challenge.id ? 'animate-spin' : ''} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-black tracking-tight text-white mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                            {challenge.title}
                                        </h3>
                                        <p className="text-text-muted text-xs leading-relaxed mb-4 line-clamp-2">{challenge.description}</p>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="glass-card rounded-2xl p-3">
                                                <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Objectif</div>
                                                <div className="font-black text-white text-sm">{challenge.goal}</div>
                                            </div>
                                            <div className="glass-card rounded-2xl p-3">
                                                <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Complété</div>
                                                <div className="font-black text-primary text-sm">{challenge.progress || 0}%</div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between text-[10px] font-bold text-text-muted mb-1.5">
                                            <span>{challenge.current || 0} accompli</span>
                                            <span>{challenge.goal}</span>
                                        </div>
                                        <div className="xp-track">
                                            <div className="xp-fill" style={{ width: `${challenge.progress || 0}%` }} />
                                        </div>

                                        <div className="flex items-center justify-end mt-3">
                                            <span className="text-[10px] font-bold text-text-muted group-hover:text-primary transition-colors flex items-center gap-1">
                                                Voir le classement <ChevronRight size={12} />
                                            </span>
                                        </div>
                                    </motion.button>
                                )) : (
                                    <div className="glass-card rounded-[24px] p-12 text-center border-dashed">
                                        <div className="glass-hero w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                                            <Target size={28} className="text-primary" />
                                        </div>
                                        <p className="font-bold text-white mb-1">Aucun défi actif</p>
                                        <p className="text-text-muted text-sm">Les prochains défis seront bientôt disponibles.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── History tab ────────────────────────── */}
                        {activeTab === 'history' && (
                            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="space-y-2.5">
                                {history.length > 0 ? history.map((challenge: any, i: number) => (
                                    <motion.div key={challenge.id || i}
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                        className="rf-activity-row">
                                        <div className={clsx(
                                            'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0',
                                            challenge.completed ? 'bg-primary/15 border border-primary/25' : 'glass-card'
                                        )}>
                                            <Trophy size={20} className={challenge.completed ? 'text-primary' : 'text-text-muted/40'}
                                                fill={challenge.completed ? 'currentColor' : 'none'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm text-white truncate">{challenge.title}</p>
                                            <p className="text-[10px] text-text-muted font-bold mt-0.5">
                                                {challenge.completed ? '✓ Complété' : 'Expiré'} · {challenge.goal}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-black text-sm text-white">{challenge.progress || 0}%</p>
                                            <p className="text-[9px] text-text-muted font-bold">progression</p>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="glass-card rounded-[24px] p-12 text-center border-dashed">
                                        <div className="glass-hero w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                                            <BarChart3 size={28} className="text-primary" />
                                        </div>
                                        <p className="font-bold text-white mb-1">Aucun historique</p>
                                        <p className="text-text-muted text-sm">Participe à des défis pour les voir ici.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── Leaderboard tab ────────────────────── */}
                        {activeTab === 'leaderboard' && (
                            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="space-y-4">
                                {/* Timeframe pills */}
                                <div className="flex gap-2">
                                    {TIMEFRAMES.map(t => (
                                        <button key={t.key} onClick={() => setTimeframe(t.key as typeof timeframe)}
                                            className={clsx(
                                                'px-4 py-2 rounded-full text-xs font-black transition-all',
                                                timeframe === t.key
                                                    ? 'bg-primary text-white shadow-[0_4px_12px_rgba(90,178,255,0.3)]'
                                                    : 'glass-card text-text-muted hover:text-white'
                                            )}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {leaderboard.length > 0 ? (
                                    <div className="space-y-2">
                                        {leaderboard.map((u, i) => (
                                            <motion.div key={i}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                                className={clsx('rf-activity-row', i < 3 && 'glass-hero')}>
                                                <RankBadge rank={i + 1} />
                                                <div className="w-9 h-9 rounded-xl glass-card flex items-center justify-center font-black text-sm text-primary flex-shrink-0">
                                                    {u.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-sm text-white truncate">{u.name || 'Inconnu'}</p>
                                                    <p className="text-[10px] text-text-muted font-bold truncate">{u.clanName || 'Sans clan'}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-black text-sm text-white">{u.score || u.distance || 0}</p>
                                                    <p className="text-[9px] text-primary font-black">pts</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="glass-card rounded-[24px] p-12 text-center border-dashed">
                                        <div className="glass-hero w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                                            <Medal size={28} className="text-primary" />
                                        </div>
                                        <p className="font-bold text-white mb-1">Aucune donnée</p>
                                        <p className="text-text-muted text-sm">Le classement sera disponible prochainement.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
