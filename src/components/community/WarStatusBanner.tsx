import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, ChevronRight, Clock } from 'lucide-react';
import { useWarData } from '../../hooks/useWarData';

function formatTimeLeft(hours: number): string {
    if (hours <= 0) return 'Terminée';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function WarStatusBanner() {
    const navigate = useNavigate();
    const { data, loading } = useWarData(undefined, {
        warIntervalMs: 90_000,
        highlightsIntervalMs: 999_999_999,
        timelineIntervalMs: 999_999_999,
    });

    const { war, scoreboard, hoursRemaining } = data;

    if (loading || !war) return null;
    if (!['active', 'live', 'ongoing'].includes(war.status ?? '')) return null;

    const top = scoreboard.slice(0, 2);
    if (top.length < 1) return null;

    const leader = top[0];
    const runnerUp = top[1] ?? null;
    const totalPoints = (leader?.totalPoints ?? 0) + (runnerUp?.totalPoints ?? 1);
    const leaderPct = totalPoints > 0 ? ((leader?.totalPoints ?? 0) / totalPoints) * 100 : 50;
    const isClose = runnerUp && Math.abs((leader?.totalPoints ?? 0) - (runnerUp?.totalPoints ?? 0)) < 50;

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => navigate('/wars')}
            className="mx-5 mb-4 rounded-[20px] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
            style={{
                background: 'linear-gradient(135deg, rgba(30, 8, 8, 0.95) 0%, rgba(20, 6, 18, 0.95) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                boxShadow: '0 0 32px rgba(239, 68, 68, 0.10), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
        >
            {/* Top row */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                <div className="flex items-center gap-2">
                    {/* Pulsing live dot */}
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400">
                        Guerre en cours
                    </span>
                    {isClose && (
                        <span
                            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                        >
                            Serré
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-white/40">
                    <Clock size={11} />
                    <span className="text-[11px] font-semibold text-white/50">
                        {formatTimeLeft(hoursRemaining)}
                    </span>
                    <ChevronRight size={14} className="text-white/30" />
                </div>
            </div>

            {/* Score section */}
            <div className="px-4 pb-3">
                {runnerUp ? (
                    <>
                        <div className="flex items-center justify-between mb-2.5">
                            {/* Clan 1 */}
                            <div className="flex items-center gap-2 min-w-0">
                                <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                                    style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.3)' }}
                                >
                                    {leader.clanName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-white truncate max-w-[90px]">{leader.clanName}</p>
                                    <p className="text-[11px] font-black text-red-400">{leader.totalPoints.toLocaleString()} pts</p>
                                </div>
                            </div>

                            {/* VS */}
                            <div className="flex flex-col items-center mx-2 shrink-0">
                                <Swords size={16} className="text-white/30" />
                                <span className="text-[9px] font-black text-white/25 uppercase tracking-widest mt-0.5">vs</span>
                            </div>

                            {/* Clan 2 */}
                            <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                                <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                                    style={{ background: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.2)' }}
                                >
                                    {runnerUp.clanName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 text-right">
                                    <p className="text-[12px] font-bold text-white/70 truncate max-w-[90px]">{runnerUp.clanName}</p>
                                    <p className="text-[11px] font-black text-white/40">{runnerUp.totalPoints.toLocaleString()} pts</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)' }}
                                initial={{ width: '50%' }}
                                animate={{ width: `${Math.max(10, Math.min(90, leaderPct))}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white"
                            style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.3)' }}
                        >
                            {leader.clanName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-white">{leader.clanName}</p>
                            <p className="text-[11px] font-black text-red-400">{leader.totalPoints.toLocaleString()} pts</p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
