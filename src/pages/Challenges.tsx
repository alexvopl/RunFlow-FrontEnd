import { useState, useEffect } from 'react';
import { Loader2, Target, Star, Timer, Trophy, BarChart3, ChevronLeft, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { clsx } from 'clsx';

export function Challenges() {
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'challenges') {
                    const [challengesRes, statsRes] = await Promise.all([
                        api.get('/challenges/active'),
                        api.get('/challenges/stats').catch(() => ({ data: null }))
                    ]);
                    const activeChallenge = challengesRes.data?.challenge;
                    const myEntry = challengesRes.data?.myEntry;
                    const progress = challengesRes.data?.progress ?? 0;

                    setChallenges(activeChallenge ? [{
                        ...activeChallenge,
                        progress,
                        current: myEntry?.currentValue ?? 0,
                        goal: activeChallenge.targetValue,
                    }] : []);
                    setStats(statsRes.data);
                } else if (activeTab === 'history') {
                    const res = await api.get('/challenges/history');
                    setHistory(Array.isArray(res.data?.challenges) ? res.data.challenges : []);
                } else {
                    const endpoint = timeframe === 'global' ? '/leaderboards/global' : `/leaderboards/${timeframe}`;
                    const res = await api.get(endpoint);
                    setLeaderboard(Array.isArray(res.data?.entries) ? res.data.entries : []);
                }
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [activeTab, timeframe]);

    const handleOpenChallenge = async (challenge: any) => {
        setSelectedChallenge(challenge);
        try {
            const res = await api.get(`/challenges/${challenge.id}/leaderboard`);
            setChallengeLeaderboard(Array.isArray(res.data?.entries) ? res.data.entries : []);
        } catch {
            setChallengeLeaderboard([]);
        }
    };

    const handleRefresh = async (challengeId: string) => {
        setRefreshingId(challengeId);
        try {
            await api.post(`/challenges/${challengeId}/refresh`);
            // Re-fetch challenges after refresh
            const res = await api.get('/challenges/active');
            const activeChallenge = res.data?.challenge;
            const myEntry = res.data?.myEntry;
            const progress = res.data?.progress ?? 0;
            setChallenges(activeChallenge ? [{
                ...activeChallenge,
                progress,
                current: myEntry?.currentValue ?? 0,
                goal: activeChallenge.targetValue,
            }] : []);
        } catch (error) {
            console.error('Failed to refresh challenge', error);
        } finally {
            setRefreshingId(null);
        }
    };

    // Challenge Detail View
    if (selectedChallenge) {
        return (
            <div className="px-4 pb-24 min-h-screen">
                <header className="pt-2 mb-6">
                    <button
                        onClick={() => setSelectedChallenge(null)}
                        className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6 text-sm font-bold"
                    >
                        <ChevronLeft size={18} />
                        Retour aux défis
                    </button>
                    <h1 className="text-xl font-black uppercase tracking-tight">{selectedChallenge.title}</h1>
                    <p className="text-text-muted text-xs mt-1 font-medium">{selectedChallenge.description}</p>
                </header>

                {/* Progress */}
                <div className="hero-panel p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Progression</span>
                        <span className="text-primary font-black">{selectedChallenge.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedChallenge.progress || 0}%` }}
                            className="bg-primary h-full rounded-full"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Actuel</div>
                            <div className="font-black">{selectedChallenge.current || 0}</div>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Objectif</div>
                            <div className="font-black">{selectedChallenge.goal}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => handleRefresh(selectedChallenge.id)}
                        disabled={refreshingId === selectedChallenge.id}
                        className="mt-4 w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <RotateCw size={14} className={refreshingId === selectedChallenge.id ? 'animate-spin' : ''} />
                        Mettre à jour la progression
                    </button>
                </div>

                {/* Leaderboard */}
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 ml-1">Classement du défi</h3>
                {challengeLeaderboard.length > 0 ? (
                    <div className="premium-panel overflow-hidden divide-y divide-white/5">
                        {challengeLeaderboard.map((u: any, i: number) => (
                            <div key={i} className="p-4 flex items-center gap-4">
                                <div className={clsx(
                                    'w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs',
                                    i === 0 ? 'bg-rank-gold text-black' :
                                        i === 1 ? 'bg-rank-silver text-black' :
                                            i === 2 ? 'bg-rank-bronze text-white' :
                                                'bg-white/5 text-text-muted border border-white/5'
                                )}>
                                    {i + 1}
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-sm">
                                    {(u.clanName || u.displayName || u.username || '?').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-sm uppercase tracking-tight truncate">{u.clanName || u.displayName || u.username || 'Inconnu'}</div>
                                </div>
                                <div className="font-black">{u.currentValue || u.totalDistanceM || 0}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="premium-panel border-dashed p-8 text-center">
                        <Trophy size={32} className="text-text-muted/20 mx-auto mb-2" />
                        <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Classement indisponible</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="px-4 pb-24 min-h-screen">
            <header className="pt-4 mb-8">
                <div className="flex flex-col items-start gap-4 mb-6 sm:flex-row sm:justify-between sm:items-center">
                    <div>
                        <p className="page-eyebrow mb-2">Défis et classements</p>
                        <h1 className="page-title">Compétition</h1>
                    </div>
                    <div className="flex w-full overflow-x-auto no-scrollbar bg-white/5 p-1 rounded-2xl border border-white/5 sm:w-auto">
                        <button
                            onClick={() => setActiveTab('challenges')}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                activeTab === 'challenges' ? "bg-white text-black shadow-lg" : "text-text-muted hover:text-white"
                            )}
                        >
                            Défis
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                activeTab === 'history' ? "bg-white text-black shadow-lg" : "text-text-muted hover:text-white"
                            )}
                        >
                            Historique
                        </button>
                        <button
                            onClick={() => setActiveTab('leaderboard')}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                activeTab === 'leaderboard' ? "bg-white text-black shadow-lg" : "text-text-muted hover:text-white"
                            )}
                        >
                            Classement
                        </button>
                    </div>
                </div>

                {/* Stats bar — only on challenges tab */}
                {activeTab === 'challenges' && stats && (
                    <div className="grid grid-cols-3 gap-3 mb-6">
                            {[
                            { label: 'Complétés', value: stats.completed || 0 },
                            { label: 'Total défis', value: stats.totalChallenges || 0 },
                            { label: 'Points', value: stats.totalPointsEarned || 0 },
                        ].map((s, i) => (
                            <div key={i} className="premium-panel rounded-2xl p-3 text-center">
                                <div className="text-lg font-black">{s.value}</div>
                                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'challenges' && (
                    <div className="hero-panel p-5 relative overflow-hidden group">
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                <Star size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h2 className="font-black uppercase tracking-tight text-sm">Compétition en cours</h2>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-0.5">Participez pour gagner des récompenses</p>
                            </div>
                        </div>
                        <Star size={80} className="absolute -bottom-4 -right-4 text-primary/5 transform rotate-12" />
                    </div>
                )}
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        {activeTab === 'challenges' && (
                            <motion.div key="challenges-grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                {challenges.map((challenge, i) => (
                                    <motion.div
                                        key={challenge.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        onClick={() => handleOpenChallenge(challenge)}
                                        className="premium-panel p-6 relative overflow-hidden group hover:border-white/10 transition-all cursor-pointer active:scale-[0.98]"
                                    >
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-primary">
                                                {challenge.type || 'Endurance'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-text-muted">
                                                    <Timer size={14} />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{challenge.timeLeft || '2j restant'}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRefresh(challenge.id); }}
                                                    disabled={refreshingId === challenge.id}
                                                    className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                                                >
                                                    <RotateCw size={12} className={refreshingId === challenge.id ? 'animate-spin' : ''} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="line-clamp-2 text-lg font-black uppercase tracking-tight mb-2 group-hover:text-primary transition-colors break-words">{challenge.title}</h3>
                                        <p className="line-clamp-3 text-text-muted text-xs mb-6 font-medium leading-relaxed break-words">{challenge.description}</p>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                                                <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Objectif</div>
                                                <div className="font-black text-white">{challenge.goal}</div>
                                            </div>
                                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                                                <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Progression</div>
                                                <div className="font-black text-primary">{challenge.progress || 0}%</div>
                                            </div>
                                        </div>

                                        <div className="w-full bg-white/5 rounded-full h-1.5 mb-2 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${challenge.progress || 0}%` }}
                                                className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(190,242,100,0.5)]"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] text-text-muted font-black uppercase tracking-widest">
                                            <span>{challenge.current || 0} COMPLÉTÉ</span>
                                            <span>{challenge.goal}</span>
                                        </div>
                                    </motion.div>
                                ))}
                                {challenges.length === 0 && (
                                    <div className="text-center py-20 bg-surface rounded-3xl border border-white/5 border-dashed">
                                        <Target size={48} className="text-text-muted/20 mx-auto mb-4" />
                                        <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Aucun défi actif pour le moment</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'history' && (
                            <motion.div key="history-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                {history.map((challenge: any, i: number) => (
                                    <div key={challenge.id || i} className="bg-surface rounded-3xl p-5 border border-white/5 flex items-center gap-4 shadow-lg">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${challenge.completed ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-text-muted'}`}>
                                            <Trophy size={22} fill={challenge.completed ? 'currentColor' : 'none'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-sm uppercase tracking-tight truncate">{challenge.title}</div>
                                            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5 truncate">
                                                {challenge.completed ? '✓ Complété' : 'Expiré'} · {challenge.goal}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="font-black text-sm">{challenge.progress || 0}%</div>
                                            <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">progression</div>
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && (
                                    <div className="text-center py-20 bg-surface rounded-3xl border border-white/5 border-dashed">
                                        <BarChart3 size={48} className="text-text-muted/20 mx-auto mb-4" />
                                        <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Aucun historique disponible</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'leaderboard' && (
                            <motion.div key="leaderboard-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                                <div className="flex gap-2 p-4 bg-white/5 border-b border-white/5 overflow-x-auto no-scrollbar">
                                    {['global', 'weekly', 'monthly'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeframe(t as any)}
                                            className={clsx(
                                                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                                timeframe === t ? "bg-primary text-white" : "bg-white/5 text-text-muted"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <div className="divide-y divide-white/5">
                                    {leaderboard.map((u, i) => (
                                        <div key={i} className={clsx("p-5 flex items-center gap-4 group transition-colors hover:bg-white/5", i < 3 ? "bg-white/[0.02]" : "")}>
                                            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-lg",
                                                i === 0 ? "bg-rank-gold text-black" :
                                                    i === 1 ? "bg-rank-silver text-black" :
                                                        i === 2 ? "bg-rank-bronze text-white" :
                                                            "bg-white/5 text-text-muted border border-white/5"
                                            )}>
                                                {i + 1}
                                            </div>
                                            <div className="w-11 h-11 rounded-xl bg-surface border border-white/10 flex items-center justify-center font-black text-sm shadow-md">
                                                {u.name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">{u.name}</div>
                                                <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">{u.clanName || 'Sans Clan'}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-base text-white">{u.score || u.distance}</div>
                                                <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest">PTS</div>
                                            </div>
                                        </div>
                                    ))}
                                    {leaderboard.length === 0 && (
                                        <div className="p-12 text-center text-text-muted text-xs font-bold uppercase tracking-widest">
                                            Aucune donnée disponible
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        {activeTab === 'history' && (
                            <motion.div key="history-grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                {history.length > 0 ? history.map((challenge, i) => (
                                    <motion.div
                                        key={challenge.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="bg-surface rounded-3xl p-5 border border-white/5 shadow-xl"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-black uppercase tracking-tight text-sm">{challenge.title}</h3>
                                                <p className="text-xs text-text-muted mt-1">{challenge.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black">{challenge.myEntry?.finalRank ? `#${challenge.myEntry.finalRank}` : '-'}</div>
                                                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Classement</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="bg-surface border border-white/5 rounded-3xl p-8 text-center">
                                        <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Aucun historique</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        {activeTab === 'leaderboard' && (
                            <motion.div key="leaderboard-grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                                    <div key={entry.userId || i} className="bg-surface rounded-3xl p-4 border border-white/5 shadow-xl flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs">
                                            {entry.rank || i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-sm uppercase tracking-tight truncate">{entry.displayName || entry.username || 'Inconnu'}</div>
                                            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{(entry.totalDistanceM / 1000 || 0).toFixed(1)} km</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="bg-surface border border-white/5 rounded-3xl p-8 text-center">
                                        <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Aucun classement disponible</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
