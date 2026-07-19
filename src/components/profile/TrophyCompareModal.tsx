import { X, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-end justify-center"
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg glass-card rounded-t-[36px] p-5"
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                    <Trophy size={16} className="text-black" fill="currentColor" />
                                </div>
                                <h2 className="text-lg font-black tracking-tight">Trophées</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">

                            <div className={compareWith ? 'grid grid-cols-2 gap-3' : ''}>
                                <div className="glass-card rounded-[22px] p-5 text-center relative overflow-hidden">
                                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Toi</div>
                                    <div className="text-4xl font-black text-white mb-1">{userTrophies}</div>
                                    <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Score actuel</div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                                </div>
                                {compareWith && <div className="glass-card rounded-[22px] p-5 text-center relative overflow-hidden">
                                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">
                                        {compareWith.name}
                                    </div>
                                    <div className="text-4xl font-black text-white mb-1">
                                        {compareWith.trophies}
                                    </div>
                                    <div className="text-[9px] font-bold text-primary uppercase tracking-widest">
                                        Concurrent
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                                </div>}
                            </div>

                            {!compareWith && <div className="glass-card rounded-[22px] p-4 text-center">
                                <p className="text-sm font-bold text-white">Le classement trophées arrive bientôt</p>
                                <p className="text-[10px] text-text-muted mt-1">Cette carte affiche uniquement tes données réelles.</p>
                            </div>
                            }
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
