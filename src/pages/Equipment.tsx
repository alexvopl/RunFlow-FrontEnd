import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Footprints, Pencil, Trash2, X, Check, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Shoe {
    id: string;
    name: string;
    brand: string | null;
    totalKm: number;
    warningKm: number;
    maxKm: number;
    isActive: boolean;
    createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGaugeColor(totalKm: number, warningKm: number, maxKm: number): string {
    if (totalKm >= maxKm)     return '#ef4444';   // red
    if (totalKm >= warningKm) return '#f59e0b';   // amber
    return '#22c55e';                              // green
}

function getStatusLabel(totalKm: number, warningKm: number, maxKm: number) {
    if (totalKm >= maxKm)     return { text: 'À remplacer',  color: '#ef4444' };
    if (totalKm >= warningKm) return { text: 'À surveiller', color: '#f59e0b' };
    return { text: 'En forme', color: '#22c55e' };
}

function GaugeBar({ totalKm, warningKm, maxKm }: { totalKm: number; warningKm: number; maxKm: number }) {
    const pct = Math.min((totalKm / maxKm) * 100, 100);
    const color = getGaugeColor(totalKm, warningKm, maxKm);
    const warningPct = Math.min((warningKm / maxKm) * 100, 100);

    return (
        <div className="space-y-1.5">
            <div className="relative h-2.5 bg-white/8 rounded-full overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
                />
                {/* Warning marker */}
                <div
                    className="absolute top-0 bottom-0 w-px bg-white/30"
                    style={{ left: `${warningPct}%` }}
                />
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
                    {getStatusLabel(totalKm, warningKm, maxKm).text}
                </span>
                <span className="text-[9px] font-bold text-text-muted">
                    {Math.round(totalKm)} / {Math.round(maxKm)} km
                </span>
            </div>
        </div>
    );
}

// ── Shoe Card ─────────────────────────────────────────────────────────────────

function ShoeCard({ shoe, onEdit, onDelete, onToggleActive }: {
    shoe: Shoe;
    onEdit: (shoe: Shoe) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, active: boolean) => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`glass-card rounded-[24px] p-5 border-2 transition-all ${
                shoe.isActive ? 'border-primary/30' : 'border-transparent'
            }`}
            style={shoe.isActive ? { boxShadow: '0 4px 24px rgba(90,178,255,0.10)' } : {}}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${
                        shoe.isActive ? 'bg-primary/15' : 'glass-hero'
                    }`}>
                        👟
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-sm text-white truncate">{shoe.name}</h3>
                        {shoe.brand && (
                            <p className="text-[10px] text-text-muted font-bold mt-0.5">{shoe.brand}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {shoe.isActive && (
                        <span className="px-2 py-0.5 bg-primary/15 text-primary text-[8px] font-black rounded-full border border-primary/20 uppercase tracking-wide">
                            Active
                        </span>
                    )}
                    <button
                        onClick={() => onEdit(shoe)}
                        className="w-8 h-8 glass-hero rounded-xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-8 h-8 glass-hero rounded-xl flex items-center justify-center text-text-muted hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* KM counter */}
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black tabular-nums" style={{
                    color: getGaugeColor(shoe.totalKm, shoe.warningKm, shoe.maxKm)
                }}>
                    {Math.round(shoe.totalKm)}
                </span>
                <span className="text-sm font-black text-text-muted">km</span>
                {shoe.totalKm >= shoe.warningKm && (
                    <AlertTriangle size={14} className="ml-1 mb-0.5" style={{
                        color: shoe.totalKm >= shoe.maxKm ? '#ef4444' : '#f59e0b'
                    }} />
                )}
            </div>

            {/* Gauge */}
            <GaugeBar totalKm={shoe.totalKm} warningKm={shoe.warningKm} maxKm={shoe.maxKm} />

            {/* Toggle active */}
            <button
                onClick={() => onToggleActive(shoe.id, !shoe.isActive)}
                className={`mt-4 w-full py-2.5 rounded-2xl text-xs font-black transition-all ${
                    shoe.isActive
                        ? 'glass-hero text-text-muted hover:text-white'
                        : 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20'
                }`}
            >
                {shoe.isActive ? 'Retirer de l\'actif' : 'Définir comme active'}
            </button>

            {/* Delete confirmation */}
            <AnimatePresence>
                {confirmDelete && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="mt-3 glass-hero rounded-2xl p-3 flex items-center gap-3"
                    >
                        <p className="flex-1 text-xs font-bold text-white">Supprimer cette chaussure ?</p>
                        <button
                            onClick={() => { onDelete(shoe.id); setConfirmDelete(false); }}
                            className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400"
                        >
                            <Check size={13} />
                        </button>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="w-8 h-8 glass-card rounded-xl flex items-center justify-center text-text-muted"
                        >
                            <X size={13} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Shoe Form Modal ───────────────────────────────────────────────────────────

interface ShoeFormProps {
    isOpen: boolean;
    initial?: Shoe | null;
    onClose: () => void;
    onSave: (data: Partial<Shoe> & { name: string }) => Promise<void>;
}

function ShoeFormModal({ isOpen, initial, onClose, onSave }: ShoeFormProps) {
    const [name, setName]           = useState('');
    const [brand, setBrand]         = useState('');
    const [warningKm, setWarningKm] = useState(500);
    const [maxKm, setMaxKm]         = useState(700);
    const [isActive, setIsActive]   = useState(false);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(initial?.name ?? '');
            setBrand(initial?.brand ?? '');
            setWarningKm(initial?.warningKm ?? 500);
            setMaxKm(initial?.maxKm ?? 700);
            setIsActive(initial?.isActive ?? false);
            setError('');
        }
    }, [isOpen, initial]);

    const handleSubmit = async () => {
        if (!name.trim()) { setError('Le nom est obligatoire.'); return; }
        if (warningKm >= maxKm) { setError('Le seuil d\'alerte doit être inférieur au max.'); return; }
        setLoading(true);
        try {
            await onSave({ name: name.trim(), brand: brand.trim() || undefined, warningKm, maxKm, isActive });
            onClose();
        } catch {
            setError('Une erreur est survenue.');
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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg glass-card rounded-t-[36px] overflow-hidden"
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-4 pt-2">
                            <h2 className="text-lg font-black tracking-tight">
                                {initial ? 'Modifier la chaussure' : 'Ajouter une chaussure'}
                            </h2>
                            <button onClick={onClose} className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 space-y-3">
                            {/* Name */}
                            <div className="glass-card rounded-[22px] px-4 py-3">
                                <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1.5">
                                    Nom de la chaussure *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="ex: Nike Pegasus 41"
                                    className="w-full bg-transparent text-sm font-bold text-white placeholder:text-text-muted/40 focus:outline-none"
                                />
                            </div>

                            {/* Brand */}
                            <div className="glass-card rounded-[22px] px-4 py-3">
                                <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1.5">
                                    Marque (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={brand}
                                    onChange={e => setBrand(e.target.value)}
                                    placeholder="ex: Nike, Adidas, Asics…"
                                    className="w-full bg-transparent text-sm font-bold text-white placeholder:text-text-muted/40 focus:outline-none"
                                />
                            </div>

                            {/* Thresholds */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="glass-card rounded-[22px] px-4 py-3">
                                    <label className="text-[9px] font-black text-amber-400/80 uppercase tracking-widest block mb-1.5">
                                        Alerte (km)
                                    </label>
                                    <input
                                        type="number"
                                        value={warningKm}
                                        onChange={e => setWarningKm(Number(e.target.value))}
                                        min={1}
                                        className="w-full bg-transparent text-xl font-black text-white focus:outline-none"
                                    />
                                </div>
                                <div className="glass-card rounded-[22px] px-4 py-3">
                                    <label className="text-[9px] font-black text-red-400/80 uppercase tracking-widest block mb-1.5">
                                        Maximum (km)
                                    </label>
                                    <input
                                        type="number"
                                        value={maxKm}
                                        onChange={e => setMaxKm(Number(e.target.value))}
                                        min={1}
                                        className="w-full bg-transparent text-xl font-black text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="glass-card rounded-[22px] px-4 py-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-black text-white">Chaussure active</p>
                                    <p className="text-[10px] text-text-muted mt-0.5">Les km seront ajoutés à cette paire</p>
                                </div>
                                <button
                                    onClick={() => setIsActive(v => !v)}
                                    className={`relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
                                        isActive ? 'bg-primary' : 'bg-white/10'
                                    }`}
                                    style={isActive ? { boxShadow: '0 0 12px rgba(90,178,255,0.4)' } : {}}
                                >
                                    <motion.div
                                        layout
                                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                                        animate={{ left: isActive ? '1.625rem' : '0.125rem' }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl"
                                    >
                                        <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                                        <p className="text-xs font-bold text-red-400">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="btn-primary w-full h-14 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                {loading ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Ajouter la chaussure'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Equipment() {
    const navigate = useNavigate();
    const [shoes, setShoes]         = useState<Shoe[]>([]);
    const [loading, setLoading]     = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editShoe, setEditShoe]   = useState<Shoe | null>(null);

    const fetchShoes = async () => {
        try {
            const res = await api.get('/equipment');
            setShoes(Array.isArray(res.data) ? res.data : []);
        } catch {
            setShoes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchShoes(); }, []);

    const handleAdd = async (data: Partial<Shoe> & { name: string }) => {
        await api.post('/equipment', {
            name:       data.name,
            brand:      data.brand || undefined,
            warningKm:  data.warningKm,
            maxKm:      data.maxKm,
            isActive:   data.isActive,
        });
        await fetchShoes();
    };

    const handleEdit = async (data: Partial<Shoe> & { name: string }) => {
        if (!editShoe) return;
        await api.patch(`/equipment/${editShoe.id}`, {
            name:       data.name,
            brand:      data.brand ?? null,
            warningKm:  data.warningKm,
            maxKm:      data.maxKm,
            isActive:   data.isActive,
        });
        await fetchShoes();
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/equipment/${id}`);
            setShoes(prev => prev.filter(s => s.id !== id));
        } catch { /* silent */ }
    };

    const handleToggleActive = async (id: string, active: boolean) => {
        try {
            await api.patch(`/equipment/${id}`, { isActive: active });
            await fetchShoes();
        } catch { /* silent */ }
    };

    const totalKmAll = shoes.reduce((s, sh) => s + sh.totalKm, 0);

    return (
        <div className="min-h-screen pb-36">
            <div className="px-5 pt-7 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="text-[1.7rem] font-black tracking-tight text-white">Mon équipement</h1>
                    </div>
                    <button
                        onClick={() => { setEditShoe(null); setModalOpen(true); }}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                        style={{
                            background: 'linear-gradient(135deg, #5ab2ff, #3b82f6)',
                            boxShadow: '0 4px 14px rgba(90,178,255,0.4)',
                        }}
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Summary card */}
                {shoes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-hero rounded-[28px] p-5 flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Footprints size={22} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">Total toutes paires</p>
                            <p className="text-2xl font-black text-white">
                                {Math.round(totalKmAll).toLocaleString('fr-FR')}
                                <span className="text-sm text-text-muted font-bold ml-1">km</span>
                            </p>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">Paires</p>
                            <p className="text-2xl font-black text-white">{shoes.length}</p>
                        </div>
                    </motion.div>
                )}

                {/* Shoes list */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="glass-card rounded-[24px] p-5 space-y-4">
                                <div className="flex gap-3">
                                    <div className="skeleton w-11 h-11 rounded-2xl flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton h-3.5 w-1/2 rounded-lg" />
                                        <div className="skeleton h-2.5 w-1/3 rounded-lg" />
                                    </div>
                                </div>
                                <div className="skeleton h-8 w-24 rounded-lg" />
                                <div className="skeleton h-2.5 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : shoes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-hero rounded-[28px] p-10 flex flex-col items-center gap-4"
                    >
                        <div className="w-16 h-16 glass-card rounded-[20px] flex items-center justify-center text-3xl">
                            👟
                        </div>
                        <div className="text-center">
                            <p className="font-black text-base text-white mb-1">Aucune chaussure</p>
                            <p className="text-sm text-text-muted leading-relaxed">
                                Ajoute ta première paire pour suivre son kilométrage automatiquement.
                            </p>
                        </div>
                        <button
                            onClick={() => { setEditShoe(null); setModalOpen(true); }}
                            className="btn-primary px-6 h-12 text-sm font-black flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Ajouter une chaussure
                        </button>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        <div className="space-y-4">
                            {shoes.map(shoe => (
                                <ShoeCard
                                    key={shoe.id}
                                    shoe={shoe}
                                    onEdit={s => { setEditShoe(s); setModalOpen(true); }}
                                    onDelete={handleDelete}
                                    onToggleActive={handleToggleActive}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                )}

                {/* Info tip */}
                {shoes.length > 0 && (
                    <div className="glass-card rounded-[20px] px-4 py-3.5 flex items-start gap-3">
                        <AlertTriangle size={14} className="text-amber-400/70 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                            Les kilomètres sont automatiquement ajoutés à la chaussure active à chaque course enregistrée (app ou Strava).
                        </p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <ShoeFormModal
                isOpen={modalOpen}
                initial={editShoe}
                onClose={() => { setModalOpen(false); setEditShoe(null); }}
                onSave={editShoe ? handleEdit : handleAdd}
            />
        </div>
    );
}
