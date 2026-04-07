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

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/clans', formData);
            onCreated();
            onClose();
        } catch (error) {
            console.error('Failed to create clan', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-surface border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-xl animate-in slide-in-from-bottom">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="text-primary" /> Create Clan
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-text-muted uppercase">Clan Name</label>
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
                        <label className="text-sm font-bold text-text-muted uppercase">Minimum Weekly Km</label>
                        <input
                            type="number"
                            value={formData.minWeeklyKm}
                            onChange={(e) => setFormData({ ...formData, minWeeklyKm: parseInt(e.target.value) || 0 })}
                            className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Clan'}
                    </button>
                </form>
            </div>
        </div>
    );
}
