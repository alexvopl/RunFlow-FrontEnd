import { useState } from 'react';
import { X, Loader2, Save, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
    const { user, logout } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/profiles/me', { name });
            window.location.reload();
            onClose();
        } catch (error) {
            console.error('Failed to update profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError('');
        try {
            await api.delete('/profiles/me');
            logout();
        } catch (error) {
            console.error('Failed to delete account', error);
            setDeleteError('Impossible de supprimer le compte pour le moment.');
            setDeleting(false);
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
                            <h2 className="text-lg font-black tracking-tight">Modifier le profil</h2>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Nom */}
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Nom</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ton prénom"
                                    className="w-full glass-card rounded-2xl px-4 py-3.5 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || deleting}
                                className="btn-primary w-full py-3.5 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <Loader2 className="animate-spin" size={18} />
                                    : <><Save size={16} /> Enregistrer</>
                                }
                            </button>
                        </form>

                        {/* Danger zone */}
                        <div className="mt-6 pt-5 border-t border-white/8">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Zone dangereuse</p>

                            {deleteError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm mb-3">
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    {deleteError}
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                                {!confirmDelete ? (
                                    <motion.button
                                        key="ask"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        disabled={loading || deleting}
                                        className="w-full py-3.5 glass-card border border-red-500/20 text-red-400 rounded-full text-sm font-black flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                    >
                                        <Trash2 size={15} />
                                        Supprimer le compte
                                    </motion.button>
                                ) : (
                                    <motion.div
                                        key="confirm"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-2.5"
                                    >
                                        <p className="text-xs text-red-400 text-center font-bold">
                                            Cette action est irréversible. Confirme la suppression.
                                        </p>
                                        <div className="flex gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDelete(false)}
                                                className="flex-1 py-3.5 glass-card rounded-full text-sm font-bold hover:bg-white/8 transition-colors"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="flex-1 py-3.5 bg-red-500 text-white rounded-full text-sm font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                                            >
                                                {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Supprimer'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
