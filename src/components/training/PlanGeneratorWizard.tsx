import { useState } from 'react';
import { ChevronLeft, Loader2, Calendar, Target, Activity, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface PlanGeneratorProps {
    onPlanGenerated: () => void;
}

export function PlanGeneratorWizard({ onPlanGenerated }: PlanGeneratorProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        goal: 'half-marathon', // marathon, half, 10k, 5k
        durationWeeks: 12,
        sessionsPerWeek: 4,
        targetDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currentWeeklyKm: 30
    });
    const [preview, setPreview] = useState<any>(null);

    const handleNext = () => {
        if (step === 3) {
            fetchPreview();
        }
        setStep(step + 1);
    };
    const handleBack = () => setStep(step - 1);

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const res = await api.post('/training/preview', {
                goal: formData.goal,
                durationWeeks: formData.durationWeeks,
                sessionsPerWeek: formData.sessionsPerWeek,
                targetDate: formData.targetDate,
                userData: {
                    currentWeeklyKm: formData.currentWeeklyKm
                }
            });
            setPreview(res.data);
        } catch (error) {
            console.error('Failed to fetch preview', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/training/generate', {
                goal: formData.goal,
                durationWeeks: formData.durationWeeks,
                sessionsPerWeek: formData.sessionsPerWeek,
                targetDate: formData.targetDate,
                userData: {
                    currentWeeklyKm: formData.currentWeeklyKm
                }
            });
            onPlanGenerated();
        } catch (error) {
            console.error('Failed to generate plan', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Choisir un objectif</h2>
                            <p className="text-text-muted text-sm font-medium leading-relaxed">Quelle distance préparez-vous ?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: '5k', label: '5 KM', icon: Zap, desc: 'Rapide & intense' },
                                { id: '10k', label: '10 KM', icon: Target, desc: 'Classique' },
                                { id: 'half-marathon', label: 'SEMI', icon: Activity, desc: 'Endurance' },
                                { id: 'marathon', label: 'MARATHON', icon: Target, desc: 'Le graal' }
                            ].map(g => {
                                const isSelected = formData.goal === g.id;
                                const Icon = g.icon;
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => setFormData({ ...formData, goal: g.id })}
                                        className={`p-5 rounded-3xl border transition-all text-left group ${isSelected
                                                ? 'bg-primary/10 border-primary/50 shadow-lg shadow-primary/10'
                                                : 'bg-surface border-white/5 hover:bg-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors ${isSelected ? 'bg-primary text-black' : 'bg-white/5 text-text-muted group-hover:text-white'}`}>
                                            <Icon size={20} />
                                        </div>
                                        <div className={`font-black uppercase tracking-tight text-lg mb-1 transition-colors ${isSelected ? 'text-primary' : 'text-white'}`}>{g.label}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted">{g.desc}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Votre Niveau Actuel</h2>
                            <p className="text-text-muted text-sm font-medium leading-relaxed">Aidez-nous à calibrer l'intensité du plan.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-surface p-6 rounded-3xl border border-white/5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">Volume Hebdomadaire (actuel)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        max="200"
                                        value={formData.currentWeeklyKm}
                                        onChange={e => setFormData({ ...formData, currentWeeklyKm: parseInt(e.target.value) || 0 })}
                                        className="bg-background border border-white/10 rounded-2xl text-3xl font-black w-28 py-3 px-4 text-center focus:outline-none focus:border-primary/50 transition-colors"
                                    />
                                    <span className="text-text-muted font-black uppercase tracking-widest text-xs">KM / Semaine</span>
                                </div>
                            </div>

                            <div className="bg-surface p-6 rounded-3xl border border-white/5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">Séances par semaine (objectif)</label>
                                <div className="flex gap-2">
                                    {[3, 4, 5, 6].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setFormData({ ...formData, sessionsPerWeek: n })}
                                            className={`flex-1 py-4 rounded-2xl font-black transition-all ${formData.sessionsPerWeek === n
                                                    ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105'
                                                    : 'bg-background border border-white/5 text-text-muted hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Date de l'objectif</h2>
                            <p className="text-text-muted text-sm font-medium leading-relaxed">Quand est prévue votre course ?</p>
                        </div>

                        <div className="bg-surface p-6 rounded-3xl border border-white/5">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">Date cible</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
                                <input
                                    type="date"
                                    value={formData.targetDate}
                                    onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                                    className="w-full bg-background border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-lg font-black focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-text-muted font-bold mt-4">
                                Un plan optimal dure entre 10 et 16 semaines. Nous adapterons le plan à votre délai.
                            </p>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Aperçu du Plan</h2>
                            <p className="text-text-muted text-sm font-medium leading-relaxed">Voici ce qui vous attend.</p>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="animate-spin text-primary" size={40} />
                                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest animate-pulse">Génération par l'IA...</div>
                            </div>
                        ) : preview ? (
                            <div className="bg-surface rounded-3xl border border-white/5 p-6 space-y-6 shadow-2xl relative overflow-hidden">
                                <div className="flex justify-between items-center relative z-10">
                                    <span className="text-xs font-black text-text-muted uppercase tracking-widest">Distance Totale</span>
                                    <span className="text-3xl font-black text-primary">{preview.totalKm || 0} KM</span>
                                </div>
                                <div className="w-full h-px bg-white/10 relative z-10" />
                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                    <div className="p-4 bg-background rounded-2xl border border-white/5">
                                        <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Semaine Max</div>
                                        <div className="text-xl font-black">{preview.peakWeeklyKm || 0} <span className="text-xs text-text-muted">km</span></div>
                                    </div>
                                    <div className="p-4 bg-background rounded-2xl border border-white/5">
                                        <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Sortie Longue</div>
                                        <div className="text-xl font-black">{preview.longestRunKm || 0} <span className="text-xs text-text-muted">km</span></div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-text-muted leading-relaxed font-medium relative z-10">
                                    Ce plan personnalisé inclut des semaines d'assimilation et une montée en charge progressive basée sur vos {formData.currentWeeklyKm} km actuels.
                                </p>
                                <Zap size={120} className="absolute -bottom-10 -right-10 text-primary/5 transform -rotate-12" />
                            </div>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl text-sm font-bold text-center">
                                Échec de la génération de l'aperçu. Veuillez réessayer.
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col h-full mt-2">
            <div className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex gap-3 mt-12">
                {step > 1 && (
                    <button
                        onClick={handleBack}
                        className="w-14 h-14 bg-surface border border-white/5 rounded-2xl flex items-center justify-center hover:bg-white/5 transition-colors"
                    >
                        <ChevronLeft size={24} className="text-white" />
                    </button>
                )}

                {step < 4 ? (
                    <button
                        onClick={handleNext}
                        className="flex-1 h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl flex items-center justify-center"
                    >
                        Continuer
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 h-14 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        {loading ? 'Génération...' : 'Valider ce Plan'}
                    </button>
                )}
            </div>
        </div>
    );
}
