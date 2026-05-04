import { useState } from 'react';
import { X, Loader2, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';

interface CreateClanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateClanModal({ isOpen, onClose, onCreated }: CreateClanModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPublic: true,
        minWeeklyKm: 0,
        maxMembers: 50,
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        try {
            await api.post('/clans', formData);
            onCreated();
            onClose();
            setFormData({ name: '', description: '', isPublic: true, minWeeklyKm: 0, maxMembers: 50 });
        } catch (error) {
            console.error('Failed to create clan', error);
            setErrorMessage(resolveError(error, 'Impossible de créer ce clan pour le moment.'));
        } finally {
            setLoading(false);
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
                        style={{ maxHeight: '88vh' }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-4 pt-2 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                                    <Shield size={16} className="text-primary" />
                                </div>
                                <h2 className="text-lg font-black tracking-tight">Créer un clan</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">

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

                                {/* Nom */}
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">
                                        Nom du clan
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex : Les Gazelles de Paris"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full glass-card rounded-2xl px-4 py-3.5 text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">
                                        Description <span className="text-text-muted/40 normal-case font-medium">(optionnel)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Décris ton clan en quelques mots…"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full glass-card rounded-2xl px-4 py-3.5 text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all resize-none"
                                    />
                                </div>

                                {/* Kilométrage minimum */}
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">
                                        Kilométrage hebdo minimum (km)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={formData.minWeeklyKm === 0 ? '' : formData.minWeeklyKm}
                                        onChange={(e) => setFormData({ ...formData, minWeeklyKm: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className="w-full glass-card rounded-2xl px-4 py-3.5 text-white text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>

                                {/* Visibilité */}
                                <div className="glass-card rounded-[22px] p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-black text-white">Clan public</p>
                                        <p className="text-[11px] text-text-muted mt-0.5">Visible dans la liste des clans</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                                        className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${
                                            formData.isPublic ? 'bg-primary' : 'bg-white/15'
                                        }`}
                                        style={formData.isPublic ? { boxShadow: '0 0 12px rgba(90,178,255,0.4)' } : {}}
                                    >
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                                            formData.isPublic ? 'left-6' : 'left-0.5'
                                        }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-4 flex-shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full py-3.5 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Créer le clan'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
