import { motion } from 'framer-motion';
import { Calendar, Globe, MapPin, AlertCircle, TrendingUp, TrendingDown, Minus, Award, Lock } from 'lucide-react';
import { useSeasonData, type Division } from '../../hooks/useSeasonData';
import { ScopedLeaderboard } from '../leaderboard/ScopedLeaderboard';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function divisionColor(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('diamond') || n.includes('diamant')) return '#22d3ee';
    if (n.includes('plat')) return '#818cf8';
    if (n.includes('or') || n.includes('gold')) return '#fbbf24';
    if (n.includes('argent') || n.includes('silver')) return '#94a3b8';
    return '#b47844';
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── SeasonView ────────────────────────────────────────────────────────────────

interface Props {
    clanId: string;
    clanName: string;
    myUserId?: string;
}

export function SeasonView({ clanId, clanName, myUserId }: Props) {
    const { data, loading, error } = useSeasonData(clanId);

    if (loading) return <SeasonSkeleton />;

    if (error) {
        return (
            <div className="flex items-center gap-3 rounded-[16px] px-4 py-3.5"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}>
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-[11px] text-red-300 font-bold">{error}</p>
            </div>
        );
    }

    const { season, divisions, myClanDivision, daysRemaining, rating } = data;

    if (!season) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-[28px] p-8 text-center"
                style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
            >
                <div className="w-14 h-14 glass-hero rounded-[18px] flex items-center justify-center mx-auto mb-4">
                    <Calendar size={24} className="text-white/25" />
                </div>
                <p className="font-black text-white/60 text-base mb-1">Aucune saison active</p>
                <p className="text-text-muted text-sm">La prochaine saison sera lancée prochainement.</p>
            </motion.div>
        );
    }

    const myDiv = myClanDivision
        ? divisions.find(d => d.id === myClanDivision.divisionId)
        : null;
    const myDivColor = myDiv ? divisionColor(myDiv.name) : '#5ab2ff';
    const ratingDelta = rating && myClanDivision
        ? rating.rating - myClanDivision.ratingAtStart
        : null;
    const sNum = season.number ?? 1;

    return (
        <div className="space-y-4">

            {/* ── Season header ─────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-hero rounded-[28px] p-5"
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Saison</p>
                        <h2 className="text-2xl font-black text-white leading-none">Saison {sNum}</h2>
                        <p className="text-text-muted text-xs mt-1">
                            {fmtDate(season.startsAt)} → {fmtDate(season.endsAt)}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {/* Scope pill */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(90,178,255,0.10)', border: '1px solid rgba(90,178,255,0.20)' }}>
                            {season.scope === 'city'
                                ? <MapPin size={9} className="text-primary" />
                                : <Globe size={9} className="text-primary" />}
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                {season.scope === 'city' ? (season.city ?? 'Local') : 'Global'}
                            </span>
                        </div>
                        {/* Status pill */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Active</span>
                        </div>
                    </div>
                </div>

                {/* Days remaining bar */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold text-white/30">Progression</span>
                        <span className="text-[9px] font-mono font-black text-white/50">
                            {daysRemaining}j restants
                        </span>
                    </div>
                    {(() => {
                        const total = Math.max(1,
                            (new Date(season.endsAt).getTime() - new Date(season.startsAt).getTime()) / 86400000
                        );
                        const elapsed = total - daysRemaining;
                        const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                        return (
                            <div className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #5ab2ff, #22d3ee)' }}
                                />
                            </div>
                        );
                    })()}
                </div>
            </motion.div>

            {/* ── My clan division card ────────────────── */}
            {myClanDivision && myDiv ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-[24px] p-5"
                    style={{
                        background: `linear-gradient(135deg, ${myDivColor}0f, rgba(7,17,31,0.9))`,
                        border: `1px solid ${myDivColor}28`,
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                                style={{ background: `${myDivColor}18`, border: `1px solid ${myDivColor}30` }}>
                                <Award size={18} style={{ color: myDivColor }} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Mon clan</p>
                                <p className="font-black text-white text-base leading-tight">{clanName}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-white/30 mb-0.5">Division</p>
                            <span className="text-sm font-black" style={{ color: myDivColor }}>{myDiv.name}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <StatCell
                            label="Rating actuel"
                            value={rating?.rating?.toLocaleString('fr-FR') ?? myClanDivision.ratingAtStart.toLocaleString('fr-FR')}
                            color={myDivColor}
                        />
                        <StatCell
                            label="Départ saison"
                            value={myClanDivision.ratingAtStart.toLocaleString('fr-FR')}
                        />
                        <StatCell
                            label="Δ Rating"
                            value={ratingDelta != null
                                ? `${ratingDelta >= 0 ? '+' : ''}${ratingDelta.toLocaleString('fr-FR')}`
                                : '—'}
                            color={ratingDelta != null
                                ? ratingDelta > 0 ? '#10b981' : ratingDelta < 0 ? '#ef4444' : undefined
                                : undefined}
                            suffix={ratingDelta != null
                                ? ratingDelta > 0 ? <TrendingUp size={9} />
                                : ratingDelta < 0 ? <TrendingDown size={9} />
                                : <Minus size={9} />
                                : undefined}
                        />
                    </div>

                    {(rating?.wins != null || rating?.losses != null) && (
                        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-4 text-[10px] font-mono">
                            <span className="text-emerald-400 font-black">{rating.wins}V</span>
                            <span className="text-red-400 font-black">{rating.losses}D</span>
                            {rating.draws > 0 && <span className="text-white/30 font-black">{rating.draws}N</span>}
                        </div>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-[24px] p-5 flex items-center gap-4"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.08)' }}
                >
                    <div className="w-10 h-10 rounded-[12px] glass-card flex items-center justify-center flex-shrink-0">
                        <Lock size={16} className="text-white/30" />
                    </div>
                    <div>
                        <p className="font-black text-white/60 text-sm">Clan non assigné</p>
                        <p className="text-text-muted text-xs mt-0.5">
                            Votre clan rejoindra une division au prochain placement.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* ── Division ladder ──────────────────────── */}
            {divisions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-hero rounded-[28px] p-4"
                >
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3 flex items-center gap-1.5">
                        <Award size={9} /> Divisions
                    </p>
                    <DivisionLadder
                        divisions={divisions}
                        myDivisionId={myClanDivision?.divisionId}
                    />
                </motion.div>
            )}

            {/* ── Division leaderboard ─────────────────── */}
            {myClanDivision?.divisionId && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <h3 className="text-sm font-bold text-text-muted mb-3">
                        Classement — {myDiv?.name ?? 'Ma division'}
                    </h3>
                    <ScopedLeaderboard
                        scope="division"
                        entity="clan"
                        refId={myClanDivision.divisionId}
                        myId={clanId}
                        scoreLabel="pts"
                    />
                </motion.div>
            )}
        </div>
    );
}

// ─── StatCell ──────────────────────────────────────────────────────────────────

function StatCell({
    label, value, color, suffix,
}: {
    label: string;
    value: string;
    color?: string;
    suffix?: React.ReactNode;
}) {
    return (
        <div className="rounded-[14px] p-2.5 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="font-mono font-black text-sm" style={{ color: color ?? 'white' }}>
                    {value}
                </span>
                {suffix && <span style={{ color: color }}>{suffix}</span>}
            </div>
            <div className="text-[8px] uppercase tracking-widest text-white/25 font-bold">{label}</div>
        </div>
    );
}

// ─── DivisionLadder ────────────────────────────────────────────────────────────

function DivisionLadder({
    divisions,
    myDivisionId,
}: {
    divisions: Division[];
    myDivisionId?: string;
}) {
    // Sorted: highest tierOrder (Diamond) first
    const sorted = [...divisions].sort((a, b) => b.tierOrder - a.tierOrder);
    const top2 = new Set(sorted.slice(0, 2).map(d => d.id));
    const bottom2 = new Set(sorted.slice(-2).map(d => d.id));

    return (
        <div className="space-y-1">
            {sorted.map((div, i) => {
                const isMe = div.id === myDivisionId;
                const color = divisionColor(div.name);
                const isPromo = top2.has(div.id);
                const isRele = bottom2.has(div.id);

                return (
                    <motion.div
                        key={div.id}
                        initial={{ opacity: 0, x: isMe ? -8 : 0 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="relative flex items-center gap-2.5 rounded-[12px] px-3 py-2"
                        style={{
                            background: isMe
                                ? `linear-gradient(135deg, ${color}18, ${color}06)`
                                : isPromo ? 'rgba(16,185,129,0.03)'
                                : isRele ? 'rgba(239,68,68,0.03)'
                                : 'rgba(255,255,255,0.02)',
                            border: isMe
                                ? `1px solid ${color}35`
                                : isPromo ? '1px solid rgba(16,185,129,0.08)'
                                : isRele ? '1px solid rgba(239,68,68,0.08)'
                                : '1px solid rgba(255,255,255,0.04)',
                            boxShadow: isMe ? `0 0 14px ${color}10` : 'none',
                        }}
                    >
                        {/* Promo/rele indicator */}
                        {isPromo && !isMe && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r"
                                style={{ background: '#10b981' }} />
                        )}
                        {isRele && !isMe && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r"
                                style={{ background: '#ef4444' }} />
                        )}

                        {/* Color dot */}
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                                background: color,
                                boxShadow: isMe ? `0 0 6px ${color}90` : 'none',
                            }} />

                        {/* Name */}
                        <span className="text-[11px] font-black flex-1 leading-none"
                            style={{ color: isMe ? 'white' : 'rgba(255,255,255,0.35)' }}>
                            {div.name}
                        </span>

                        {/* Right side */}
                        {isMe ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                    style={{
                                        background: `${color}16`,
                                        color,
                                        border: `1px solid ${color}28`,
                                    }}>
                                    MON CLAN
                                </span>
                                <span className="text-[9px] font-mono font-black text-white/50">
                                    {div.minRating}–{div.maxRating}
                                </span>
                            </div>
                        ) : (
                            <span className="text-[8px] font-mono text-white/15">
                                {div.minRating}–{div.maxRating}
                            </span>
                        )}
                    </motion.div>
                );
            })}

            {/* Legend */}
            <div className="flex items-center gap-4 px-1 pt-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-3 rounded-r" style={{ background: 'rgba(16,185,129,0.5)' }} />
                    <span className="text-[7px] text-white/25">Promotion</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-3 rounded-r" style={{ background: 'rgba(239,68,68,0.5)' }} />
                    <span className="text-[7px] text-white/25">Relégation</span>
                </div>
            </div>
        </div>
    );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SeasonSkeleton() {
    return (
        <div className="space-y-4">
            <div className="skeleton h-32 rounded-[28px]" />
            <div className="skeleton h-28 rounded-[24px]" />
            <div className="skeleton h-56 rounded-[28px]" />
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton h-10 rounded-[12px]" />
                ))}
            </div>
        </div>
    );
}
