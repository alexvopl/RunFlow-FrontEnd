import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { api } from '../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClanRanking {
    rank: number;
    clanId: string;
    clanName: string;
    badgeUrl: string | null;
    memberCount: number;
    totalDistanceM: number;
    totalActivities: number;
    avgDistancePerMember: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clanInitials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function fmtKm(m: number): string {
    const km = m / 1000;
    if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
    if (km >= 100) return `${Math.round(km)}`;
    return km.toFixed(1);
}

// ─── Rank badge ────────────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, { bg: string; color: string; border: string }> = {
    1: { bg: 'rgba(251,191,36,0.18)',  color: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
    2: { bg: 'rgba(148,163,184,0.18)', color: '#94a3b8', border: 'rgba(148,163,184,0.35)' },
    3: { bg: 'rgba(180,120,68,0.18)',  color: '#b47844', border: 'rgba(180,120,68,0.35)' },
};

function RankBadge({ rank }: { rank: number }) {
    const style = RANK_COLORS[rank] ?? {
        bg: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.30)',
        border: 'rgba(255,255,255,0.08)',
    };
    return (
        <div
            className="w-7 h-7 rounded-[10px] flex items-center justify-center font-mono font-black text-[11px] flex-shrink-0"
            style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
        >
            {rank}
        </div>
    );
}

// ─── ClanLeaderboard ───────────────────────────────────────────────────────────

export function ClanLeaderboard() {
    const [rankings, setRankings] = useState<ClanRanking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/leaderboards/clans', { params: { limit: 20 } })
            .then(res => setRankings(Array.isArray(res.data?.rankings) ? res.data.rankings : []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[18px] px-3.5 py-3"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="skeleton w-7 h-7 rounded-[10px] flex-shrink-0" />
                    <div className="skeleton w-10 h-10 rounded-[12px] flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3 rounded-lg w-1/2" />
                        <div className="skeleton h-2 rounded-lg w-24" />
                    </div>
                    <div className="skeleton h-4 w-10 rounded-lg" />
                </div>
            ))}
        </div>
    );

    if (rankings.length === 0) return (
        <div className="rounded-[20px] p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <Users size={24} className="text-white/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-white/30">Aucun classement disponible</p>
        </div>
    );

    return (
        <div className="space-y-1.5">
            {rankings.map((clan, i) => (
                <motion.div
                    key={clan.clanId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 rounded-[18px] px-3.5 py-3"
                    style={{
                        background: clan.rank <= 3
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(255,255,255,0.025)',
                        border: clan.rank <= 3
                            ? `1px solid ${RANK_COLORS[clan.rank]?.border ?? 'rgba(255,255,255,0.07)'}`
                            : '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <RankBadge rank={clan.rank} />

                    {/* Clan badge (initials) */}
                    <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center font-black font-mono text-sm flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(90,178,255,0.18), rgba(34,211,238,0.08))',
                            border: '1px solid rgba(90,178,255,0.22)',
                            color: '#5ab2ff',
                        }}
                    >
                        {clanInitials(clan.clanName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white truncate leading-tight">{clan.clanName}</p>
                        <div className="flex items-center gap-2 text-[9px] text-white/30 font-mono mt-0.5">
                            <span className="flex items-center gap-0.5">
                                <Users size={7} className="flex-shrink-0" />
                                {clan.memberCount}
                            </span>
                            <span>· {fmtKm(clan.avgDistancePerMember)} km/membre</span>
                        </div>
                    </div>

                    {/* Total km */}
                    <div className="text-right flex-shrink-0">
                        <div className="font-mono font-black text-white text-sm leading-tight">
                            {fmtKm(clan.totalDistanceM)}
                        </div>
                        <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">km</div>
                    </div>
                </motion.div>
            ))}
            <p className="text-[8px] text-white/20 text-center pt-2 font-bold">
                Classement par distance totale cumulée
            </p>
        </div>
    );
}
