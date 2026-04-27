import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    workoutId: string;
    planId: string;
    weekNumber: number;
    workoutType: string;
}

const FELT_OPTIONS: { value: 'easy' | 'right' | 'hard'; label: string; emoji: string; activeClass: string }[] = [
    { value: 'easy',  label: 'Facile',    emoji: '😌', activeClass: 'border-green-500/50 bg-green-500/10 text-green-400' },
    { value: 'right', label: 'Bien dosé', emoji: '💪', activeClass: 'border-primary/50 bg-primary/10 text-primary' },
    { value: 'hard',  label: 'Difficile', emoji: '🥵', activeClass: 'border-red-500/50 bg-red-500/10 text-red-400' },
];

export function FeedbackModal({ isOpen, onClose, planId, weekNumber, workoutType }: FeedbackModalProps) {
    const [rpe, setRpe] = useState(0);
    const [felt, setFelt] = useState<'easy' | 'right' | 'hard' | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!felt || rpe === 0) return;
        setLoading(true);
        try {
            await api.post('/training/feedback', { planId, weekNumber, workoutType, perceivedEffort: rpe, felt });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setRpe(0);
                setFelt(null);
                onClose();
            }, 1200);
        } catch (error) {
            console.error('Failed to submit feedback', error);
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
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black tracking-tight">Comment s'est passée la séance ?</h2>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-10 text-center"
                            >
                                <div className="text-5xl mb-4">🎉</div>
                                <p className="font-black text-primary text-sm uppercase tracking-widest">Feedback enregistré !</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-5">

                                {/* Ressenti */}
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 block">
                                        Ressenti global
                                    </label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {FELT_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFelt(opt.value)}
                                                className={`p-4 rounded-[20px] border-2 transition-all flex flex-col items-center gap-1.5 ${
                                                    felt === opt.value
                                                        ? opt.activeClass
                                                        : 'glass-card border-transparent text-text-muted hover:text-white'
                                                }`}
                                            >
                                                <span className="text-2xl">{opt.emoji}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* RPE */}
                                <div>
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 block">
                                        Effort perçu <span className="text-text-muted/40">(RPE 1–10)</span>
                                    </label>
                                    <div className="flex gap-1">
                                        {Array.from({ length: 10 }).map((_, i) => {
                                            const val = i + 1;
                                            return (
                                                <button
                                                    key={val}
                                                    onClick={() => setRpe(val)}
                                                    className={`flex-1 h-10 rounded-xl font-black text-sm transition-all ${
                                                        rpe >= val
                                                            ? 'bg-primary text-white'
                                                            : 'glass-card text-text-muted hover:text-white'
                                                    }`}
                                                    style={rpe >= val ? { boxShadow: '0 2px 10px rgba(90,178,255,0.25)' } : {}}
                                                >
                                                    {val}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[9px] text-text-muted mt-2 font-bold uppercase tracking-widest">
                                        <span>Facile</span>
                                        <span>Maximal</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || rpe === 0 || !felt}
                                    className="btn-primary w-full py-3.5 text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enregistrer le feedback'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
