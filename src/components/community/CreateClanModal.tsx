import { useState } from 'react';
import { X, Loader2, Shield } from 'lucide-react';
import { api } from '../../services/api';

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
        maxMembers: 50
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        try {
            await api.post('/clans', formData);
            onCreated();
            onClose();
        } catch (error) {
            console.error('Failed to create clan', error);
            setErrorMessage("Impossible de créer ce clan pour le moment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-surface shadow-xl animate-in slide-in-from-bottom sm:max-h-[90vh] sm:rounded-3xl sm:border">
                <div className="flex justify-between items-center px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="text-primary" /> Créer un clan
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-6 custom-scrollbar">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-text-muted uppercase">Nom du clan</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-text-muted uppercase">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-text-muted uppercase">Kilométrage hebdo minimum</label>
                                <input
                                    type="number"
                                    value={formData.minWeeklyKm}
                                    onChange={(e) => setFormData({ ...formData, minWeeklyKm: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/10 px-5 py-4 sm:px-6" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                        {errorMessage && (
                            <p className="mb-3 text-center text-sm font-semibold text-red-400">{errorMessage}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Créer le clan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
