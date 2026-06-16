import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Timer, Trophy, Flame, Shield, Users } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MatchmadeWar {
    id: string;
    status: 'preparation' | 'active' | 'finished';
    prepEndsAt: string;
    startedAt: string;
    endsAt: string;
    myClanId: string;
    myClanName: string;
    myClanBadge: string | null;
    myClanMembers: number;
    opponentClanId: string;
    opponentClanName: string;
    opponentClanBadge: string | null;
    opponentClanMembers: number;
}

interface Props {
    war: MatchmadeWar;
    scores: { km1: number; km2: number };
    winnerId?: string | null;
    onRefresh: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function useCountdown(target: string): string {
    const calc = () => {
        const diff = new Date(target).getTime() - Date.now();
        if (diff <= 0) return '00:00:00';
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        const s = Math.floor((diff % 60_000) / 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const [display, setDisplay] = useState(calc);
    useEffect(() => {
        const id = setInterval(() => setDisplay(calc()), 1000);
        return () => clearInterval(id);
    }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

    return display;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MatchmadeWarView({ war, scores, winnerId, onRefresh }: Props) {
    const isPrep = war.status === 'preparation';
    const isActive = war.status === 'active';
    const isFinished = war.status === 'finished';

    // For preparation: countdown to war start; for active: countdown to end
    const countdownTarget = isPrep ? war.startedAt : war.endsAt;
    const countdown = useCountdown(countdownTarget);

    // Auto-refresh when a phase transition is expected
    useEffect(() => {
        const msToTransition = isPrep
            ? new Date(war.startedAt).getTime() - Date.now()
            : isActive
                ? new Date(war.endsAt).getTime() - Date.now()
                : null;

        if (!msToTransition || msToTransition <= 0) return;
        const id = setTimeout(() => onRefresh(), msToTransition + 2000);
        return () => clearTimeout(id);
    }, [war.id, war.status, war.startedAt, war.endsAt, isPrep, isActive, onRefresh]);

    const myKm = scores.km1;   // km1 = my clan (see mapWar, isClan1 means myClan = clan1)
    const theirKm = scores.km2;
    const myWon = winnerId === war.myClanId;
    const theyWon = winnerId === war.opponentClanId;
    const draw = isFinished && !winnerId;

    return (
        <div className="space-y-4">

            {/* ── Status / timer ─────────────────────────────────────── */}
            {!isFinished && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[22px] p-4 flex items-center gap-3"
                >
                    <div className="w-9 h-9 rounded-xl glass-card flex items-center justify-center shrink-0">
                        <Timer size={18} className={isPrep ? 'text-amber-400' : 'text-primary animate-pulse'} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                            {isPrep ? 'Guerre dans' : 'Temps restant'}
                        </p>
                        <p className="font-mono font-black text-white text-lg tracking-wider">{countdown}</p>
                    </div>
                    {isPrep && (
                        <div className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                            style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.28)' }}>
                            Préparation
                        </div>
                    )}
                    {isActive && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.28)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-400">En cours</span>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Result banner (finished) ───────────────────────────── */}
            {isFinished && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-[22px] p-5 text-center"
                    style={{
                        background: draw
                            ? 'rgba(255,255,255,0.04)'
                            : myWon
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.04))'
                                : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
                        border: draw
                            ? '1px solid rgba(255,255,255,0.10)'
                            : myWon
                                ? '1px solid rgba(16,185,129,0.3)'
                                : '1px solid rgba(239,68,68,0.25)',
                    }}
                >
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-2"
                        style={{ background: draw ? 'rgba(255,255,255,0.06)' : myWon ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.14)' }}>
                        {draw ? <Shield size={20} className="text-white/50" /> :
                         myWon ? <Trophy size={20} className="text-emerald-400" /> :
                         <Swords size={20} className="text-red-400" />}
                    </div>
                    <div className="text-xl font-black text-white mb-0.5">
                        {draw ? 'Égalité !' : myWon ? 'Victoire !' : 'Défaite'}
                    </div>
                    <div className="text-[11px] text-white/45">
                        {draw
                            ? 'Les deux clans ont couru la même distance.'
                            : myWon
                                ? `${war.myClanName} remporte la guerre !`
                                : `${war.opponentClanName} remporte la guerre.`}
                    </div>
                </motion.div>
            )}

            {/* ── Scoreboard ─────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-hero rounded-[24px] p-5"
            >
                {/* Header */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Swords size={13} className="text-white/30" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/35">
                        {isPrep ? 'Adversaires' : 'Score'}
                    </span>
                </div>

                {/* Two clans side by side */}
                <div className="flex items-center gap-4">
                    {/* My clan */}
                    <div className={`flex-1 text-center ${isFinished && myWon ? 'opacity-100' : isFinished && theyWon ? 'opacity-40' : ''}`}>
                        <div
                            className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-2 font-black text-lg"
                            style={{
                                background: 'rgba(90,178,255,0.15)',
                                color: '#5ab2ff',
                                border: isFinished && myWon ? '2px solid rgba(16,185,129,0.5)' : '1px solid rgba(90,178,255,0.25)',
                            }}
                        >
                            {initials(war.myClanName)}
                        </div>
                        <div className="text-[11px] font-black text-white truncate">{war.myClanName}</div>
                        <div className="flex items-center justify-center gap-1 text-[9px] text-white/35 mt-0.5">
                            <Users size={8} />{war.myClanMembers} membres
                        </div>
                        {!isPrep && (
                            <div className="mt-2 text-2xl font-black text-white font-mono">
                                {myKm.toFixed(1)}
                                <span className="text-[11px] text-white/40 font-bold ml-1">km</span>
                            </div>
                        )}
                        {isFinished && myWon && <div className="mt-1 text-[9px] font-black text-emerald-400">VAINQUEUR</div>}
                    </div>

                    {/* VS divider */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Flame size={14} className="text-amber-400" />
                        </div>
                        <span className="text-[9px] font-black text-white/25">VS</span>
                    </div>

                    {/* Opponent */}
                    <div className={`flex-1 text-center ${isFinished && theyWon ? 'opacity-100' : isFinished && myWon ? 'opacity-40' : ''}`}>
                        <div
                            className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-2 font-black text-lg"
                            style={{
                                background: 'rgba(168,85,247,0.12)',
                                color: '#a855f7',
                                border: isFinished && theyWon ? '2px solid rgba(239,68,68,0.45)' : '1px solid rgba(168,85,247,0.22)',
                            }}
                        >
                            {initials(war.opponentClanName)}
                        </div>
                        <div className="text-[11px] font-black text-white truncate">{war.opponentClanName}</div>
                        <div className="flex items-center justify-center gap-1 text-[9px] text-white/35 mt-0.5">
                            <Users size={8} />{war.opponentClanMembers} membres
                        </div>
                        {!isPrep && (
                            <div className="mt-2 text-2xl font-black text-white font-mono">
                                {theirKm.toFixed(1)}
                                <span className="text-[11px] text-white/40 font-bold ml-1">km</span>
                            </div>
                        )}
                        {isFinished && theyWon && <div className="mt-1 text-[9px] font-black text-red-400">VAINQUEUR</div>}
                    </div>
                </div>

                {/* Prep phase explanation */}
                {isPrep && (
                    <div className="mt-4 rounded-[14px] px-4 py-3 text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[10px] text-white/40 leading-relaxed">
                            La guerre commence dans quelques instants. Toutes les activités de course effectuées pendant la guerre seront comptabilisées.
                        </p>
                    </div>
                )}

                {/* Active phase progress bar */}
                {isActive && (() => {
                    const total = myKm + theirKm;
                    const myPct = total > 0 ? (myKm / total) * 100 : 50;
                    return (
                        <div className="mt-4">
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <motion.div
                                    initial={{ width: '50%' }}
                                    animate={{ width: `${myPct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #5ab2ff, #3b82f6)' }}
                                />
                            </div>
                            <div className="flex justify-between text-[8px] text-white/25 font-bold mt-1">
                                <span>{war.myClanName}</span>
                                <span>{war.opponentClanName}</span>
                            </div>
                        </div>
                    );
                })()}
            </motion.div>

            {/* ── Rule reminder ──────────────────────────────────────── */}
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-[16px] px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <p className="text-[10px] text-white/35 leading-relaxed text-center">
                        Chaque kilomètre couru par les membres du clan compte pour la guerre. Le clan avec le plus de km au total remporte la victoire !
                    </p>
                </motion.div>
            )}
        </div>
    );
}
