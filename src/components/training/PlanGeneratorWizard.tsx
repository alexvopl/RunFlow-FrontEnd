import { useState } from 'react';
import { ChevronLeft, Loader2, Calendar, Target, Activity, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface PlanGeneratorProps {
    onPlanGenerated: () => void;
}

const GOALS = [
    { id: '5k',            label: '5 KM',      icon: Zap,      desc: 'Rapide & intense' },
    { id: '10k',           label: '10 KM',     icon: Target,   desc: 'Classique' },
    { id: 'half_marathon', label: 'Semi',      icon: Activity, desc: 'Endurance' },
    { id: 'marathon',      label: 'Marathon',  icon: Target,   desc: 'Le graal' },
];

export function PlanGeneratorWizard({ onPlanGenerated }: PlanGeneratorProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        goal: 'half_marathon',
        durationWeeks: 12,
        sessionsPerWeek: 4,
        targetDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currentWeeklyKm: 30,
    });
    const [preview, setPreview] = useState<any>(null);

    const fetchPreview = async () => {
        setLoading(true);
        try {
            const res = await api.post('/training/preview', {
                goal: formData.goal,
                durationWeeks: formData.durationWeeks,
                sessionsPerWeek: formData.sessionsPerWeek,
                targetDate: formData.targetDate,
                userData: { currentWeeklyKm: formData.currentWeeklyKm },
            });
            setPreview(res.data);
        } catch (error) {
            console.error('Failed to fetch preview', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 3) fetchPreview();
        setStep(s => s + 1);
    };
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/training/generate', {
                goal: formData.goal,
                durationWeeks: formData.durationWeeks,
                sessionsPerWeek: formData.sessionsPerWeek,
                targetDate: formData.targetDate,
                userData: { currentWeeklyKm: formData.currentWeeklyKm },
            }, { timeout: 120000 });
            onPlanGenerated();
        } catch (error) {
            console.error('Failed to generate plan', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {

            /* ── Étape 1 : Objectif ─────────────────────────── */
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">Choisir un objectif</h2>
                            <p className="text-text-muted text-sm">Quelle distance prépares-tu ?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {GOALS.map(g => {
                                const isSelected = formData.goal === g.id;
                                const Icon = g.icon;
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => setFormData({ ...formData, goal: g.id })}
                                        className={`p-5 rounded-[24px] border-2 transition-all text-left ${
                                            isSelected
                                                ? 'border-primary/50 bg-primary/10'
                                                : 'glass-card border-transparent hover:border-white/15'
                                        }`}
                                        style={isSelected ? { boxShadow: '0 4px 20px rgba(90,178,255,0.12)' } : {}}
                                    >
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                                            isSelected ? 'bg-primary text-white' : 'glass-card text-text-muted'
                                        }`}
                                        style={isSelected ? { boxShadow: '0 4px 12px rgba(90,178,255,0.35)' } : {}}>
                                            <Icon size={20} />
                                        </div>
                                        <div className={`font-black tracking-tight text-lg mb-0.5 ${isSelected ? 'text-primary' : 'text-white'}`}>
                                            {g.label}
                                        </div>
                                        <div className="text-[10px] font-bold tracking-widest text-text-muted uppercase">{g.desc}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            /* ── Étape 2 : Niveau ───────────────────────────── */
            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">Ton niveau actuel</h2>
                            <p className="text-text-muted text-sm">Pour calibrer l'intensité du plan.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Volume actuel */}
                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                    Volume hebdomadaire actuel
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        max="200"
                                        value={formData.currentWeeklyKm}
                                        onChange={e => setFormData({ ...formData, currentWeeklyKm: parseInt(e.target.value) || 0 })}
                                        className="glass-hero rounded-2xl text-3xl font-black w-28 py-3 px-4 text-center focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                    <span className="text-text-muted font-black uppercase tracking-widest text-xs">km / semaine</span>
                                </div>
                            </div>

                            {/* Séances par semaine */}
                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                    Séances par semaine (objectif)
                                </label>
                                <div className="flex gap-2">
                                    {[3, 4, 5, 6].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setFormData({ ...formData, sessionsPerWeek: n })}
                                            className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all ${
                                                formData.sessionsPerWeek === n
                                                    ? 'bg-primary text-white scale-105'
                                                    : 'glass-hero text-text-muted hover:text-white'
                                            }`}
                                            style={formData.sessionsPerWeek === n
                                                ? { boxShadow: '0 4px 16px rgba(90,178,255,0.35)' }
                                                : {}}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            /* ── Étape 3 : Date ─────────────────────────────── */
            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">Date de l'objectif</h2>
                            <p className="text-text-muted text-sm">Quand est prévue ta course ?</p>
                        </div>

                        <div className="glass-card rounded-[22px] p-5">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                Date cible
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                                <input
                                    type="date"
                                    value={formData.targetDate}
                                    onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                                    className="w-full glass-hero rounded-2xl py-4 pl-12 pr-4 text-base font-black focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                            <p className="text-[10px] text-text-muted font-bold mt-4 leading-relaxed">
                                Un plan optimal dure entre 10 et 16 semaines. Le plan sera adapté à ton délai.
                            </p>
                        </div>
                    </div>
                );

            /* ── Étape 4 : Aperçu ───────────────────────────── */
            case 4:
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">Aperçu du plan</h2>
                            <p className="text-text-muted text-sm">Voici ce qui t'attend.</p>
                        </div>

                        {loading ? (
                            <div className="glass-card rounded-[22px] p-10 flex flex-col items-center gap-4">
                                <Loader2 className="animate-spin text-primary" size={36} />
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest animate-pulse">
                                    Génération par l'IA…
                                </p>
                            </div>
                        ) : preview ? (
                            <div className="glass-hero rounded-[28px] p-5 space-y-4 relative overflow-hidden">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-text-muted uppercase tracking-widest">Durée totale</span>
                                    <span className="text-3xl font-black text-primary">{preview.totalWeeks} sem.</span>
                                </div>
                                <div className="w-full h-px bg-white/8" />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="glass-card rounded-[18px] p-4">
                                        <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Pic semaine</div>
                                        <div className="text-xl font-black text-white">
                                            {Math.round((preview.estimatedPeakWeeklyMinutes || 0) / 60)}h
                                            <span className="text-xs text-text-muted font-bold"> max</span>
                                        </div>
                                    </div>
                                    <div className="glass-card rounded-[18px] p-4">
                                        <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Séances / sem.</div>
                                        <div className="text-xl font-black text-white">
                                            {formData.sessionsPerWeek}
                                            <span className="text-xs text-text-muted font-bold"> / sem</span>
                                        </div>
                                    </div>
                                </div>
                                {preview.phases && preview.phases.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {preview.phases.map((phase: any, i: number) => (
                                            <div key={i} className="glass-card rounded-[18px] p-3">
                                                <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">{phase.name}</div>
                                                <div className="text-sm font-black text-white">
                                                    {phase.weeks}
                                                    <span className="text-xs text-text-muted font-bold"> sem.</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[10px] text-text-muted leading-relaxed font-medium">
                                    Plan personnalisé avec semaines d'assimilation et montée en charge progressive
                                    basée sur tes {formData.currentWeeklyKm} km actuels.
                                </p>
                                <Zap size={100} className="absolute -bottom-8 -right-8 text-primary/5 -rotate-12 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-[22px] text-sm font-bold text-center">
                                Échec de la génération de l'aperçu. Réessaie.
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
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-10">
                {step > 1 && (
                    <button
                        onClick={handleBack}
                        className="w-14 h-14 glass-card rounded-2xl flex items-center justify-center hover:bg-white/8 transition-colors"
                    >
                        <ChevronLeft size={22} className="text-white" />
                    </button>
                )}

                {step < 4 ? (
                    <button
                        onClick={handleNext}
                        className="btn-primary flex-1 h-14 text-sm font-black"
                    >
                        Continuer
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary flex-1 h-14 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        {loading ? 'Génération en cours…' : 'Valider ce plan'}
                    </button>
                )}
            </div>
        </div>
    );
}
