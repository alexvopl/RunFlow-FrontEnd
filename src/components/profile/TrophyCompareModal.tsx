import { X, Trophy, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrophyCompareModalProps {
    isOpen: boolean;
    onClose: () => void;
    userTrophies: number;
    compareWith?: {
        name: string;
        trophies: number;
    };
}

export function TrophyCompareModal({ isOpen, onClose, userTrophies, compareWith }: TrophyCompareModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="relative w-full max-w-lg bg-surface border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col"
            >
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
                            <Trophy size={20} className="text-black" fill="currentColor" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Trophées</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Comparison View */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-center relative overflow-hidden">
                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Vous</div>
                            <div className="text-4xl font-black text-white mb-1">{userTrophies}</div>
                            <div className="text-[9px] font-bold text-orange-500 uppercase">Ligue Maître</div>
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
                        </div>
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-center relative overflow-hidden">
                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">{compareWith?.name || 'Mondial'}</div>
                            <div className="text-4xl font-black text-white mb-1">{compareWith?.trophies || '750k+'}</div>
                            <div className="text-[9px] font-bold text-blue-500 uppercase">{compareWith ? 'Concurrent' : 'Top 1%'}</div>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                        </div>
                    </div>

                    <div className="bg-surface border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
                                <TrendingUp size={18} />
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase">Progression</div>
                                <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">+12 cette semaine</div>
                            </div>
                        </div>
                        <div className="text-green-500 font-black">+14%</div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Classement Clan</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs">#3</div>
                                    <span className="text-sm font-bold">Votre Clan</span>
                                </div>
                                <span className="text-sm font-black uppercase text-text-muted">75.4k</span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full py-4 bg-white text-black font-black uppercase rounded-2xl tracking-widest text-xs hover:scale-[1.02] transition-transform shadow-lg mt-4">
                        Voir le Panthéon
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
