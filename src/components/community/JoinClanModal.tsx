import { useState, useEffect } from 'react';
import { X, Loader2, Users, Search, AlertCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface JoinClanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoined: () => void;
}

export function JoinClanModal({ isOpen, onClose, onJoined }: JoinClanModalProps) {
    const [clans, setClans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fetchClans = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await api.get('/clans');
            setClans(Array.isArray(res.data?.clans) ? res.data.clans : []);
        } catch (error) {
            console.error('Failed to fetch clans', error);
            setErrorMessage('Impossible de charger les clans pour le moment.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) void fetchClans();
    }, [isOpen]);

    const handleJoin = async (clanId: string) => {
        setJoiningId(clanId);
        setErrorMessage(null);
        try {
            await api.post(`/clans/${clanId}/join`);
            onJoined();
            onClose();
        } catch (error) {
            console.error('Failed to join clan', error);
            setErrorMessage('Impossible de rejoindre ce clan pour le moment.');
        } finally {
            setJoiningId(null);
        }
    };

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
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg glass-card rounded-t-[36px] flex flex-col overflow-hidden"
                        style={{ maxHeight: '85vh' }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-4 pt-2 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                                    <Search size={16} className="text-primary" />
                                </div>
                                <h2 className="text-lg font-black tracking-tight">Rejoindre un clan</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5"
                            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

                            {errorMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm"
                                >
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    {errorMessage}
                                </motion.div>
                            )}

                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="glass-card rounded-[22px] p-4 flex items-center gap-3">
                                        <div className="skeleton w-11 h-11 rounded-2xl flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="skeleton h-3 w-1/2 rounded-lg" />
                                            <div className="skeleton h-2.5 w-1/3 rounded-lg" />
                                        </div>
                                        <div className="skeleton w-20 h-8 rounded-full flex-shrink-0" />
                                    </div>
                                ))
                            ) : clans.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="w-16 h-16 glass-hero rounded-[20px] flex items-center justify-center">
                                        <Users size={26} className="text-text-muted/40" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-sm text-white">Aucun clan disponible</p>
                                        <p className="text-xs text-text-muted mt-1">Crée le premier !</p>
                                    </div>
                                </div>
                            ) : (
                                clans.map((clan, i) => (
                                    <motion.div
                                        key={clan.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="glass-card rounded-[22px] p-4 flex items-center gap-3.5"
                                    >
                                        {/* Avatar */}
                                        <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm font-black text-primary">
                                                {clan.name?.slice(0, 2).toUpperCase() || '??'}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm text-white truncate">{clan.name}</p>
                                            <div className="flex items-center gap-2.5 mt-0.5">
                                                <span className="text-[10px] text-text-muted font-medium flex items-center gap-1">
                                                    <Users size={10} />
                                                    {clan.memberCount ?? 0}/{clan.maxMembers ?? 50}
                                                </span>
                                                {clan.minWeeklyKm > 0 && (
                                                    <span className="text-[10px] text-text-muted font-medium">
                                                        Min. {clan.minWeeklyKm} km/sem
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Join button */}
                                        <button
                                            onClick={() => handleJoin(clan.id)}
                                            disabled={!!joiningId}
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-xs font-black rounded-full hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
                                            style={{ boxShadow: '0 4px 14px rgba(90,178,255,0.25)' }}
                                        >
                                            {joiningId === clan.id
                                                ? <Loader2 size={13} className="animate-spin" />
                                                : <><ChevronRight size={13} /> Rejoindre</>
                                            }
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
