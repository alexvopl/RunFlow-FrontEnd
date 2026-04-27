import { useState, useEffect } from 'react';
import { X, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface SocialModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
}

export function SocialModal({ isOpen, onClose, title }: SocialModalProps) {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const searchUsers = async (q: string) => {
        setLoading(true);
        try {
            const res = await api.get('/profiles/search', { params: { q } });
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to search profiles', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        void searchUsers('');
    }, [isOpen]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        const timer = setTimeout(() => searchUsers(val), 400);
        return () => clearTimeout(timer);
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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg glass-card rounded-t-[36px] flex flex-col overflow-hidden"
                        style={{ maxHeight: '80vh' }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-3 pt-2 flex-shrink-0">
                            <h2 className="text-lg font-black tracking-tight">{title}</h2>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-5 pb-3 flex-shrink-0">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={handleSearch}
                                    placeholder="Rechercher un profil…"
                                    className="w-full glass-card rounded-2xl py-3 pl-11 pr-4 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5"
                            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="glass-card rounded-[22px] p-3.5 flex items-center gap-3">
                                        <div className="skeleton w-10 h-10 rounded-2xl flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="skeleton h-3 w-1/2 rounded-lg" />
                                            <div className="skeleton h-2.5 w-1/3 rounded-lg" />
                                        </div>
                                    </div>
                                ))
                            ) : users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="w-16 h-16 glass-hero rounded-[20px] flex items-center justify-center">
                                        <Users size={26} className="text-text-muted/40" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-sm text-white">Aucun profil trouvé</p>
                                        <p className="text-xs text-text-muted mt-1">Essaie un autre nom</p>
                                    </div>
                                </div>
                            ) : (
                                users.map((user: any, i: number) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="glass-card rounded-[22px] p-3.5 flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 glass-hero rounded-2xl flex items-center justify-center font-black text-sm text-primary flex-shrink-0">
                                            {(user.name || user.username || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm text-white truncate">
                                                {user.name || user.username || 'Utilisateur'}
                                            </p>
                                            {user.trophies != null && (
                                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                                    {user.trophies} trophées
                                                </p>
                                            )}
                                        </div>
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
