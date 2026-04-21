import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** ID of the workout (used as display info, not sent to API) */
    workoutId: string;
    /** ID of the active training plan — required by backend */
    planId: string;
    /** Week number in the plan */
    weekNumber: number;
    /** Type of the workout (e.g. 'easy_run', 'long_run', etc.) */
    workoutType: string;
}

const FELT_OPTIONS: { value: 'easy' | 'right' | 'hard'; label: string; emoji: string; color: string }[] = [
    { value: 'easy', label: 'Facile', emoji: '😌', color: 'border-green-500/50 bg-green-500/10 text-green-400' },
    { value: 'right', label: 'Bien dosé', emoji: '💪', color: 'border-primary/50 bg-primary/10 text-primary' },
    { value: 'hard', label: 'Difficile', emoji: '🥵', color: 'border-red-500/50 bg-red-500/10 text-red-400' },
];

export function FeedbackModal({ isOpen, onClose, planId, weekNumber, workoutType }: FeedbackModalProps) {
    const [rpe, setRpe] = useState(0);
    const [felt, setFelt] = useState<'easy' | 'right' | 'hard' | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!felt || rpe === 0) return;
        setLoading(true);
        try {
            await api.post('/training/feedback', {
                planId,
                weekNumber,
                workoutType,
                perceivedEffort: rpe,
                felt,
            });
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-surface border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black uppercase tracking-tight">Comment s'est passée la séance ?</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div className="py-10 text-center">
                        <div className="text-5xl mb-4">🎉</div>
                        <p className="font-black uppercase tracking-widest text-primary text-sm">Feedback enregistré !</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Felt selector */}
                        <div>
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 block">
                                Ressenti global
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {FELT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFelt(opt.value)}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                                            felt === opt.value
                                                ? opt.color
                                                : 'border-white/5 bg-white/5 text-text-muted hover:bg-white/10'
                                        }`}
                                    >
                                        <span className="text-2xl">{opt.emoji}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RPE selector */}
                        <div>
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 block">
                                Effort perçu (RPE 1–10)
                            </label>
                            <div className="flex justify-between gap-1">
                                {Array.from({ length: 10 }).map((_, i) => {
                                    const val = i + 1;
                                    return (
                                        <button
                                            key={val}
                                            onClick={() => setRpe(val)}
                                            className={`flex-1 h-10 rounded-xl font-black text-sm transition-all ${
                                                rpe >= val
                                                    ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                                    : 'bg-white/5 hover:bg-white/10 text-text-muted'
                                            }`}
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
                            className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:scale-100"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enregistrer le feedback'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
