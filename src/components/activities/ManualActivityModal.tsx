import { useState } from 'react';
import { X, Loader2, Activity as ActivityIcon, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface ManualActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onActivityAdded: () => void;
}

const ACTIVITY_TYPES = [
    { value: 'RUN', label: 'Course' },
    { value: 'TRAIL', label: 'Trail' },
    { value: 'WALK', label: 'Marche' },
    { value: 'BIKE', label: 'Vélo' },
    { value: 'SWIM', label: 'Natation' },
];

export function ManualActivityModal({ isOpen, onClose, onActivityAdded }: ManualActivityModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        activityType: 'RUN',
        startedAt: new Date().toISOString().slice(0, 16),
        distanceKm: '',
        durationMin: '',
        durationSec: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const distanceMeters = Math.round(parseFloat(formData.distanceKm || '0') * 1000);
            const durationSeconds = (parseInt(formData.durationMin || '0') * 60) + parseInt(formData.durationSec || '0');

            await api.post('/activities', {
                name: formData.name,
                activityType: formData.activityType,
                startedAt: new Date(formData.startedAt).toISOString(),
                distanceMeters,
                durationSeconds,
            });
            onActivityAdded();
            onClose();
            // Reset form
            setFormData({
                name: '',
                activityType: 'RUN',
                startedAt: new Date().toISOString().slice(0, 16),
                distanceKm: '',
                durationMin: '',
                durationSec: '',
            });
        } catch (error: any) {
            setError(error.response?.data?.message || 'Échec de l\'enregistrement. Réessayez.');
        } finally {
            setLoading(false);
        }
    };

    const update = (key: keyof typeof formData, value: string) => setFormData(p => ({ ...p, [key]: value }));

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-surface border-t border-x border-white/10 rounded-t-3xl p-6 shadow-2xl"
                        style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom))` }}
                    >
                        {/* Handle bar */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Enregistrer</h2>
                                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-0.5">Activité manuelle</p>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-xs font-bold mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Activity type selector */}
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 block">Type</label>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                    {ACTIVITY_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => update('activityType', t.value)}
                                            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.activityType === t.value
                                                    ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                                    : 'bg-white/5 text-text-muted hover:bg-white/10'
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 block">Nom</label>
                                <div className="relative">
                                    <ActivityIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => update('name', e.target.value)}
                                        placeholder="Ex: Course matinale"
                                        className="w-full bg-background border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Distance + Duration side by side */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 block">Distance (km)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={formData.distanceKm}
                                            onChange={e => update('distanceKm', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-background border border-white/10 rounded-2xl py-3 pl-10 pr-3 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 block">Durée</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                                            <input
                                                type="number"
                                                min="0"
                                                max="999"
                                                value={formData.durationMin}
                                                onChange={e => update('durationMin', e.target.value)}
                                                placeholder="00"
                                                className="w-full bg-background border border-white/10 rounded-2xl py-3 pl-9 pr-2 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                                            />
                                        </div>
                                        <span className="text-text-muted font-black text-xs">:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={formData.durationSec}
                                            onChange={e => update('durationSec', e.target.value)}
                                            placeholder="00"
                                            className="w-16 bg-background border border-white/10 rounded-2xl py-3 px-3 text-sm font-bold text-center placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                    <p className="text-[9px] text-text-muted/50 mt-1 font-bold">min : sec</p>
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 block">Date & Heure</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.startedAt}
                                    onChange={e => update('startedAt', e.target.value)}
                                    className="w-full bg-background border border-white/10 rounded-2xl py-3 px-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary mt-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enregistrer l\'activité'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
