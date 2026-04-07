import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    workoutId: string;
}

export function FeedbackModal({ isOpen, onClose, workoutId }: FeedbackModalProps) {
    const [rpe, setRpe] = useState(0); // 1-10
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/training/feedback', {
                workoutId,
                rpe,
                comment
            });
            onClose();
            // Maybe show success toast
        } catch (error) {
            console.error('Failed to submit feedback', error);
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
                        Workout Feedback
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-text-muted uppercase mb-3 block">Rate Perceived Exertion (RPE)</label>
                        <div className="flex justify-between gap-1">
                            {Array.from({ length: 10 }).map((_, i) => {
                                const val = i + 1;
                                return (
                                    <button
                                        key={val}
                                        onClick={() => setRpe(val)}
                                        className={`w-8 h-10 rounded-lg font-bold text-sm flex items-center justify-center transition-colors ${rpe >= val ? 'bg-primary text-black' : 'bg-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        {val}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-xs text-text-muted mt-2 font-medium">
                            <span>Easy</span>
                            <span>Max Effort</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-text-muted uppercase mb-2 block">Comments</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                            placeholder="How did it feel?"
                            rows={3}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || rpe === 0}
                        className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Feedback'}
                    </button>
                </div>
            </div>
        </div>
    );
}
