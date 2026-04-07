import { useState, useEffect } from 'react';
import { X, Search, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
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

    useEffect(() => {
        if (!isOpen) return;
        // Load initial results when modal opens
        searchUsers('');
    }, [isOpen]);

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

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        // Debounce: trigger search after short delay
        const timer = setTimeout(() => searchUsers(val), 400);
        return () => clearTimeout(timer);
    };

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
                className="relative w-full max-w-lg bg-surface border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        value={query}
                        onChange={handleSearch}
                        placeholder="Rechercher un profil..."
                        className="w-full bg-background border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/30 transition-all"
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-primary" size={24} />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
                            <Users size={40} className="opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Aucun profil trouvé</p>
                        </div>
                    ) : (
                        users.map((user: any) => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center font-black uppercase shadow-lg">
                                        {(user.name || user.username || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm block">{user.name || user.username || 'Utilisateur'}</span>
                                        {user.trophies != null && (
                                            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{user.trophies} trophées</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
}
