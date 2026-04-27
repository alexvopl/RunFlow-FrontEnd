import { useState } from 'react';
import { X, Loader2, Activity as ActivityIcon, MapPin, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface ManualActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onActivityAdded: () => void;
}

const ACTIVITY_TYPES = [
    { value: 'run',     label: 'Course' },
    { value: 'trail',   label: 'Trail' },
    { value: 'walk',    label: 'Marche' },
    { value: 'cycling', label: 'Vélo' },
    { value: 'hike',    label: 'Rando' },
];

export function ManualActivityModal({ isOpen, onClose, onActivityAdded }: ManualActivityModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        activityType: 'run',
        startedAt: new Date().toISOString().slice(0, 16),
        distanceKm: '',
        durationMin: '',
        durationSec: '',
    });

    const update = (key: keyof typeof formData, value: string) =>
        setFormData(p => ({ ...p, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const distanceMeters = Math.round(parseFloat(formData.distanceKm || '0') * 1000);
            const durationSeconds =
                (parseInt(formData.durationMin || '0') * 60) + parseInt(formData.durationSec || '0');

            await api.post('/activities', {
                name: formData.name,
                activityType: formData.activityType,
                startedAt: new Date(formData.startedAt).toISOString(),
                distanceMeters,
                durationSeconds,
            });
            onActivityAdded();
            onClose();
            setFormData({
                name: '',
                activityType: 'run',
                startedAt: new Date().toISOString().slice(0, 16),
                distanceKm: '',
                durationMin: '',
                durationSec: '',
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Échec de l\'enregistrement. Réessaie.');
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
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-black tracking-tight">Enregistrer</h2>
                                <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-0.5">Activité manuelle</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm mb-4"
                            >
                                <AlertCircle size={15} className="flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Type */}
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Type</label>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                    {ACTIVITY_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => update('activityType', t.value)}
                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                                                formData.activityType === t.value
                                                    ? 'bg-primary text-white'
                                                    : 'glass-card text-text-muted hover:text-white'
                                            }`}
                                            style={formData.activityType === t.value
                                                ? { boxShadow: '0 4px 14px rgba(90,178,255,0.3)' }
                                                : {}}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Nom */}
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Nom</label>
                                <div className="relative">
                                    <ActivityIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => update('name', e.target.value)}
                                        placeholder="Ex : Course matinale"
                                        className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Distance + Durée */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Distance (km)</label>
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
                                            className="w-full glass-card rounded-2xl py-3.5 pl-10 pr-3 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Durée</label>
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative flex-1">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={13} />
                                            <input
                                                type="number"
                                                min="0"
                                                max="999"
                                                value={formData.durationMin}
                                                onChange={e => update('durationMin', e.target.value)}
                                                placeholder="00"
                                                className="w-full glass-card rounded-2xl py-3.5 pl-9 pr-2 text-sm font-bold placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
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
                                            className="w-14 glass-card rounded-2xl py-3.5 px-2 text-sm font-bold text-center placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <p className="text-[9px] text-text-muted/50 mt-1 font-bold">min : sec</p>
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">Date & Heure</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.startedAt}
                                    onChange={e => update('startedAt', e.target.value)}
                                    className="w-full glass-card rounded-2xl py-3.5 px-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3.5 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enregistrer l\'activité'}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
