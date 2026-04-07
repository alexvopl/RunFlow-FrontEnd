import { Shield, Users, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface Clan {
    id: string;
    name: string;
    level: number;
    memberCount: number;
    maxMembers: number;
    score: number;
    rank?: number;
}

interface ClanCardProps {
    clan: Clan;
    rank: number;
    onClick: () => void;
}

export function ClanCard({ clan, rank, onClick }: ClanCardProps) {
    const getRankColor = (r: number) => {
        if (r === 1) return 'bg-rank-gold text-black';
        if (r === 2) return 'bg-rank-silver text-black';
        if (r === 3) return 'bg-rank-bronze text-white';
        return 'bg-white/5 text-text-muted';
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="w-full bg-surface border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-all relative overflow-hidden group shadow-lg"
        >
            {/* Rank Badge */}
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0",
                getRankColor(rank)
            )}>
                {rank}
            </div>

            {/* Clan Shield/Icon */}
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                <Shield size={24} className="text-primary" fill="currentColor" fillOpacity={0.2} />
            </div>

            {/* Info */}
            <div className="flex-1 text-left">
                <h3 className="font-black uppercase tracking-tight text-sm leading-tight group-hover:text-primary transition-colors">
                    {clan.name}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase">
                        <Users size={12} className="text-primary" />
                        {clan.memberCount}/{clan.maxMembers}
                    </div>
                    <div className="px-1.5 py-0.5 bg-primary/10 rounded text-[9px] font-black text-primary uppercase">
                        LVL {clan.level}
                    </div>
                </div>
            </div>

            {/* Score */}
            <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 font-black text-lg text-yellow-500">
                    {clan.score}
                    <Trophy size={16} className="fill-current" />
                </div>
                <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Score</div>
            </div>

            {/* Hover background effect */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
    );
}

import { clsx } from 'clsx';
