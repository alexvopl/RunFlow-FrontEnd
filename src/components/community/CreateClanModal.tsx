import { useState } from 'react';
import { X, Loader2, Shield, AlertCircle, Globe, Lock, Minus, Plus, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';
import { useAuth } from '../../contexts/AuthContext';

interface CreateClanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

// ─── Local validation ──────────────────────────────────────────────────────────

function validate(form: {
    name: string;
    description: string;
    city: string;
    minWeeklyKm: number;
    maxMembers: number;
}): string | null {
    if (form.name.trim().length < 3) return 'Le nom doit comporter au moins 3 caractères.';
    if (form.name.trim().length > 30) return 'Le nom ne peut pas dépasser 30 caractères.';
    if (form.description.length > 500) return 'La description ne peut pas dépasser 500 caractères.';
    if (form.city.trim().length < 2) return 'Indique la ville du clan.';
    if (form.minWeeklyKm < 0 || form.minWeeklyKm > 200) return 'Le kilométrage minimum doit être entre 0 et 200.';
    if (form.maxMembers < 2 || form.maxMembers > 100) return 'Le nombre de membres doit être entre 2 et 100.';
    return null;
}

// ─── Badge preview ─────────────────────────────────────────────────────────────

function BadgePreview({ name }: { name: string }) {
    const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
    const hasName = name.trim().length > 0;
    return (
        <div className="flex flex-col items-center gap-2">
            <motion.div
                animate={{ scale: hasName ? 1 : 0.9, opacity: hasName ? 1 : 0.4 }}
                transition={{ type: 'spring', damping: 20 }}
                className="flex items-center justify-center font-black font-mono text-2xl"
                style={{
                    width: 80, height: 80,
                    borderRadius: 20,
                    background: hasName
                        ? 'linear-gradient(135deg, rgba(90,178,255,0.22), rgba(34,211,238,0.12))'
                        : 'rgba(255,255,255,0.04)',
                    border: hasName
                        ? '1.5px solid rgba(90,178,255,0.35)'
                        : '1.5px dashed rgba(255,255,255,0.12)',
                    color: hasName ? '#5ab2ff' : 'rgba(255,255,255,0.2)',
                    boxShadow: hasName ? '0 0 24px rgba(90,178,255,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                }}
            >
                {initials}
            </motion.div>
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/50">
                Aperçu badge
            </p>
        </div>
    );
}

// ─── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({
    value,
    min,
    max,
    step = 1,
    onChange,
    label,
}: {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    label?: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-[14px] px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
                type="button"
                onClick={() => onChange(Math.max(min, value - step))}
                disabled={value <= min}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                <Minus size={12} className="text-white" />
            </button>
            <div className="flex-1 text-center">
                <span className="font-mono font-black text-white text-lg leading-none">{value}</span>
                {label && <span className="text-[10px] text-text-muted ml-1.5 font-medium">{label}</span>}
            </div>
            <button
                type="button"
                onClick={() => onChange(Math.min(max, value + step))}
                disabled={value >= max}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                <Plus size={12} className="text-white" />
            </button>
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CreateClanModal({ isOpen, onClose, onCreated }: CreateClanModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        city: user?.city ?? '',
        isPublic: true,
        minWeeklyKm: 0,
        maxMembers: 50,
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const set = <K extends keyof typeof formData>(k: K, v: typeof formData[K]) =>
        setFormData(prev => ({ ...prev, [k]: v }));

    const handleClose = () => {
        setFormData({ name: '', description: '', city: user?.city ?? '', isPublic: true, minWeeklyKm: 0, maxMembers: 50 });
        setErrorMessage(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const localError = validate(formData);
        if (localError) { setErrorMessage(localError); return; }
        setLoading(true);
        setErrorMessage(null);
        try {
            await api.post('/clans', {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                city: formData.city.trim(),
                isPublic: formData.isPublic,
                minWeeklyKm: formData.minWeeklyKm,
                maxMembers: formData.maxMembers,
            });
            onCreated();
            handleClose();
        } catch (error) {
            setErrorMessage(resolveError(error, 'Impossible de créer ce clan pour le moment.'));
        } finally {
            setLoading(false);
        }
    };

    const nameTrimLen = formData.name.trim().length;
    const descLen = formData.description.length;
    const nameValid = nameTrimLen >= 3 && nameTrimLen <= 30;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-end justify-center"
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg rounded-t-[36px] flex flex-col overflow-hidden"
                        style={{
                            maxHeight: '92vh',
                            background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderBottom: 'none',
                        }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3.5 mb-2 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-4 pt-1 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgba(90,178,255,0.14)', border: '1px solid rgba(90,178,255,0.22)' }}>
                                    <Shield size={15} className="text-primary" />
                                </div>
                                <h2 className="text-base font-black tracking-tight text-white">Créer un clan</h2>
                            </div>
                            <button onClick={handleClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">

                                {/* Badge preview + Name */}
                                <div className="flex items-start gap-5">
                                    <BadgePreview name={formData.name} />
                                    <div className="flex-1 min-w-0">
                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 block">
                                            Nom du clan
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ex : Les Gazelles"
                                            value={formData.name}
                                            onChange={e => set('name', e.target.value)}
                                            maxLength={30}
                                            className="w-full rounded-[14px] px-4 py-3 text-white text-sm placeholder:text-text-muted/40 focus:outline-none transition-all"
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${nameTrimLen > 0 && !nameValid ? 'rgba(239,68,68,0.4)' : nameValid ? 'rgba(90,178,255,0.3)' : 'rgba(255,255,255,0.09)'}`,
                                            }}
                                        />
                                        <div className="flex justify-end mt-1">
                                            <span className={`text-[9px] font-mono font-bold ${nameTrimLen > 28 ? 'text-amber-400' : 'text-text-muted/40'}`}>
                                                {nameTrimLen}/30
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Error */}
                                <AnimatePresence>
                                    {errorMessage && (
                                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                            <AlertCircle size={11} className="text-red-400 flex-shrink-0" />
                                            <span className="text-[10px] text-red-300">{errorMessage}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Description */}
                                <div>
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 block">
                                        Description <span className="text-text-muted/35 normal-case font-medium tracking-normal">(optionnel)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Décris ton clan en quelques mots…"
                                        value={formData.description}
                                        onChange={e => set('description', e.target.value)}
                                        maxLength={500}
                                        className="w-full rounded-[14px] px-4 py-3 text-white text-sm placeholder:text-text-muted/40 focus:outline-none transition-all resize-none"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${descLen > 480 ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.09)'}`,
                                        }}
                                    />
                                    <div className="flex justify-end mt-1">
                                        <span className={`text-[9px] font-mono font-bold ${descLen > 480 ? 'text-amber-400' : 'text-text-muted/40'}`}>
                                            {descLen}/500
                                        </span>
                                    </div>
                                </div>

                                {/* Ville */}
                                <div>
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <MapPin size={11} /> Ville du clan
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex : Paris"
                                        value={formData.city}
                                        onChange={e => set('city', e.target.value)}
                                        maxLength={80}
                                        className="w-full rounded-[14px] px-4 py-3 text-white text-sm placeholder:text-text-muted/40 focus:outline-none transition-all"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                                    />
                                    <p className="text-[9px] text-text-muted/45 mt-1.5">Les défis, saisons et adversaires seront choisis dans cette ville.</p>
                                </div>

                                {/* Visibility toggle */}
                                <div className="rounded-[18px] p-4 flex items-center justify-between"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                                            style={formData.isPublic
                                                ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }
                                                : { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)' }}>
                                            {formData.isPublic
                                                ? <Globe size={13} style={{ color: '#10b981' }} />
                                                : <Lock size={13} style={{ color: '#f59e0b' }} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white leading-tight">
                                                {formData.isPublic ? 'Clan public' : 'Clan privé'}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-0.5">
                                                {formData.isPublic ? 'Visible et accessible à tous' : 'Accès par code uniquement'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => set('isPublic', !formData.isPublic)}
                                        className="w-11 h-6 rounded-full relative flex-shrink-0 transition-all"
                                        style={{
                                            background: formData.isPublic ? '#10b981' : 'rgba(255,255,255,0.12)',
                                            boxShadow: formData.isPublic ? '0 0 10px rgba(16,185,129,0.35)' : 'none',
                                        }}
                                    >
                                        <motion.span
                                            animate={{ x: formData.isPublic ? 20 : 2 }}
                                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                                            style={{ left: 0 }}
                                        />
                                    </button>
                                </div>

                                {/* Kilométrage minimum */}
                                <div>
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 block">
                                        Kilométrage hebdomadaire minimum
                                    </label>
                                    <Stepper
                                        value={formData.minWeeklyKm}
                                        min={0}
                                        max={200}
                                        step={5}
                                        onChange={v => set('minWeeklyKm', v)}
                                        label="km/semaine"
                                    />
                                    {formData.minWeeklyKm === 0 && (
                                        <p className="text-[9px] text-text-muted/40 mt-1.5 text-center">Aucun minimum requis</p>
                                    )}
                                </div>

                                {/* Max membres */}
                                <div>
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 block">
                                        Membres maximum
                                    </label>
                                    <Stepper
                                        value={formData.maxMembers}
                                        min={2}
                                        max={100}
                                        step={5}
                                        onChange={v => set('maxMembers', v)}
                                        label="membres max"
                                    />
                                </div>

                            </div>

                            {/* Footer CTA */}
                            <div className="px-5 py-4 flex-shrink-0 border-t border-white/[0.05]"
                                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileTap={{ scale: 0.97 }}
                                    className="btn-primary w-full py-3.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={15} />}
                                    {loading ? 'Création…' : 'Créer le clan'}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
