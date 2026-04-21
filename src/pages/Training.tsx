import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, ClipboardList, LayoutGrid, Flag, Plus, Loader2, MessageSquare, Calendar as CalendarIcon, Zap, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../services/api';
import { PlanGeneratorWizard } from '../components/training/PlanGeneratorWizard';
import { FeedbackModal } from '../components/training/FeedbackModal';

export function Training() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activePlan, setActivePlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingPlan, setDeletingPlan] = useState(false);
    const [adaptationRecommended, setAdaptationRecommended] = useState<any>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const checkAdaptation = useCallback(async (planId: string) => {
        try {
            const res = await api.get(`/training/plans/${planId}/adaptation`);
            if (res.data.recommended) {
                setAdaptationRecommended(res.data);
            }
        } catch (error) {
            console.error('Failed to check adaptation', error);
        }
    }, []);

    const fetchPlan = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/training/plans');
            const plans = response.data?.plans ?? response.data;
            if (Array.isArray(plans) && plans.length > 0) {
                // The list endpoint returns lightweight metadata — fetch the full plan with workouts
                const fullPlanRes = await api.get(`/training/plans/${plans[0].id}`);
                const fullPlan = fullPlanRes.data?.plan ?? fullPlanRes.data;
                // Build a flat structure the UI expects from the full plan response
                const plan = {
                    ...fullPlan,
                    id: fullPlan.id,
                    name: fullPlan.goal,
                    goal: fullPlan.goal,
                    targetDate: fullPlan.targetDate,
                    startDate: fullPlan.periodization?.startDate,
                    totalDistance: fullPlan.weeks
                        ?.flatMap((w: any) => w.workouts)
                        .reduce((sum: number, w: any) => sum + (w.targetDistance || 0), 0)
                        .toFixed(0),
                    workouts: fullPlan.weeks?.flatMap((w: any) =>
                        w.workouts
                            .filter((wo: any) => wo.type !== 'rest')
                            .map((wo: any, i: number) => ({
                                id: `${fullPlan.id}-w${w.weekNumber}-${i}`,
                                date: (() => {
                                    const start = new Date(w.startDate);
                                    start.setDate(start.getDate() + i);
                                    return start.toISOString().split('T')[0];
                                })(),
                                title: wo.title,
                                description: wo.description,
                                durationMinutes: wo.targetDuration,
                                distanceKm: wo.targetDistance,
                            }))
                    ) ?? [],
                };
                setActivePlan(plan);
                checkAdaptation(plan.id);
            } else {
                setActivePlan(null);
            }
        } catch (error) {
            console.error('Failed to fetch plans', error);
        } finally {
            setLoading(false);
        }
    }, [checkAdaptation]);

    const handleAdaptation = async (accept: boolean) => {
        if (!activePlan) return;
        try {
            await api.post(`/training/plans/${activePlan.id}/adapt`, { accept });
            setAdaptationRecommended(null);
            if (accept) fetchPlan();
        } catch (error) {
            console.error('Failed to handle adaptation', error);
        }
    };

    const deletePlan = async () => {
        if (!activePlan) return;
        setDeletingPlan(true);
        setDeleteError(null);
        try {
            await api.delete(`/training/plans/${activePlan.id}`);
            setShowDeleteConfirm(false);
            setAdaptationRecommended(null);
            await fetchPlan();
        } catch (error) {
            console.error('Failed to delete plan', error);
            setDeleteError("Impossible de supprimer ce plan pour le moment.");
        } finally {
            setDeletingPlan(false);
        }
    };

    useEffect(() => {
        fetchPlan();
    }, [fetchPlan]);

    const dates = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!activePlan && !showWizard) {
        return (
            <div className="runna-screen px-4 pb-20 min-h-screen flex flex-col items-center justify-center text-center space-y-8">
                <div className="w-24 h-24 premium-panel rounded-[2rem] flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <Flag size={32} className="text-primary relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-highlight/10" />
                </div>
                <div className="max-w-xs">
                    <p className="page-eyebrow mb-3">Plan d'entraînement</p>
                    <h1 className="text-3xl font-black tracking-tight text-white mb-3">Aucun plan actif</h1>
                    <p className="text-text-muted text-sm font-medium leading-relaxed">Crée un programme structuré, clair et motivant pour retrouver ton cadre d'entraînement.</p>
                </div>
                <button
                    onClick={() => setShowWizard(true)}
                    className="btn-primary w-full max-w-xs text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform"
                >
                    <Plus size={18} />
                    Créer mon plan
                </button>
            </div>
        );
    }

    if (showWizard) {
        return (
            <div className="runna-screen px-4 pb-20 min-h-screen">
                <header className="pt-4 mb-8">
                    <p className="page-eyebrow mb-2">Plan d'entraînement</p>
                    <h1 className="page-title">Nouveau plan</h1>
                    <p className="page-subtitle mt-3">Crée un programme structuré, lisible et prêt à suivre séance par séance.</p>
                </header>
                <PlanGeneratorWizard onPlanGenerated={() => { setShowWizard(false); fetchPlan(); }} />
            </div>
        );
    }

    const workouts = activePlan.workouts || [];
    const selectedWorkout = workouts.find((w: any) => isSameDay(new Date(w.date), selectedDate));

    // Calculate current week based on plan start date
    const startDate = activePlan.startDate ? new Date(activePlan.startDate) : new Date();
    const targetDate = activePlan.targetDate ? new Date(activePlan.targetDate) : addDays(startDate, 12 * 7); // Default 12 weeks if missing
    const totalWeeks = Math.max(1, Math.ceil((targetDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const currentWeek = Math.max(1, Math.min(totalWeeks, Math.ceil((new Date().getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))));

    return (
        <div className="runna-screen pb-20">
            <FeedbackModal
            isOpen={showFeedback}
            onClose={() => setShowFeedback(false)}
            workoutId={selectedWorkout?.id || ''}
            planId={activePlan.id || ''}
            weekNumber={currentWeek}
            workoutType={selectedWorkout?.type || 'easy_run'}
        />

            {/* Delete Plan Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative w-full max-w-sm premium-panel p-6 shadow-2xl">
                        <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl mx-auto mb-4">
                            <Trash2 size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-center mb-2">Supprimer le plan ?</h3>
                        <p className="text-text-muted text-xs text-center font-medium leading-relaxed mb-6">Cette action est irréversible. Votre plan d'entraînement sera définitivement supprimé.</p>
                        {deleteError && (
                            <p className="text-red-400 text-xs text-center font-semibold mb-4">{deleteError}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-white/5 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={deletePlan}
                                disabled={deletingPlan}
                                className="flex-1 py-3 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {deletingPlan ? <Loader2 size={14} className="animate-spin" /> : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 space-y-8 pt-4">
                <header>
                    <div className="mb-6">
                        <p className="page-eyebrow mb-2">Plan d'entraînement</p>
                        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                            <div>
                                <h1 className="page-title">Entraînement</h1>
                                <p className="page-subtitle mt-3 max-w-xs">Un cockpit plus lisible pour suivre ton bloc, ton volume et la séance du jour.</p>
                            </div>
                            <div className="metric-pill hidden sm:inline-flex">
                                <Zap size={14} className="text-primary" />
                                Semaine {currentWeek}
                            </div>
                        </div>
                    </div>

                    <div className="runna-hero rounded-[32px] p-6">
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="max-w-[70%]">
                                <div className="runna-pill mb-3 w-fit">
                                    <CalendarIcon size={12} className="text-primary" />
                                    Bloc actif
                                </div>
                                <h2 className="text-[1.65rem] font-black leading-tight tracking-tight mb-2 text-white">{activePlan.name || activePlan.goal}</h2>
                                <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                    <CalendarIcon size={12} />
                                    <span>Objectif: <span className="text-white">{activePlan.targetDate}</span></span>
                                </div>
                            </div>
                            <div className="w-14 h-16 bg-primary rounded-[1.4rem] shadow-lg shadow-primary/20 flex flex-col items-center justify-center border border-white/20">
                                <div className="text-[10px] font-black text-white/70 uppercase leading-none mb-0.5">{activePlan.distance || '42k'}</div>
                                <div className="text-white font-black text-xs uppercase italic tracking-tighter">RUN</div>
                            </div>
                        </div>

                        <div className="flex gap-1.5 mb-4">
                            {Array.from({ length: totalWeeks }).map((_, i) => (
                                <div key={i} className={clsx(
                                    "h-1.5 flex-1 rounded-full",
                                    i < currentWeek ? "bg-primary" : i === currentWeek ? "bg-white" : "bg-white/10"
                                )} />
                            ))}
                        </div>

                        <div className="flex justify-between items-end mb-6 relative z-10">
                            <div>
                                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Semaines</div>
                                <div className="text-2xl font-black text-white">{currentWeek}/{totalWeeks}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Distance totale</div>
                                <div className="text-2xl font-black text-white">{activePlan.totalDistance || 0} <span className="text-sm font-bold text-text-muted">KM</span></div>
                            </div>
                        </div>

                        <button className="w-full py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-t border-white/10 hover:text-primary transition-colors text-text-muted">
                            <span className="flex items-center gap-2"><Flag size={14} /> {activePlan.targetEvent || 'Objectif Final'}</span>
                            <ChevronRight size={14} className="text-text-muted" />
                        </button>

                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[90px] -mr-32 -mt-32" />
                    </div>
                </header>

                {adaptationRecommended && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="runna-card rounded-[28px] p-6 relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <h3 className="text-sm font-black uppercase tracking-tight text-primary mb-2">Adaptation Recommandée</h3>
                            <p className="text-xs text-text-muted mb-4 font-medium leading-relaxed">
                                {adaptationRecommended.reason || "Nous avons détecté que votre progression nécessite un ajustement de votre plan."}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleAdaptation(true)}
                                    className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                                >
                                    Accepter
                                </button>
                                <button
                                    onClick={() => handleAdaptation(false)}
                                    className="px-6 py-2 bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Ignorer
                                </button>
                            </div>
                        </div>
                        <Zap size={64} className="absolute -bottom-4 -right-4 text-primary/5 transform rotate-12" />
                    </motion.div>
                )}

                    <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: ClipboardList, label: "Résumé", action: () => navigate('/activities') },
                        { icon: LayoutGrid, label: "Strava", action: () => navigate('/profile') },
                        { icon: Trash2, label: "Supprimer", action: () => setShowDeleteConfirm(true), danger: true },
                    ].map((item, i) => (
                        <button key={i} onClick={item.action} className={`runna-card rounded-[24px] p-4 flex flex-col items-center gap-3 transition-all group ${item.danger ? 'hover:border-red-400/30 hover:bg-red-500/5' : 'hover:border-primary/30 hover:bg-primary/5'}`}>
                            <div className={`w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center transition-colors ${item.danger ? 'group-hover:bg-red-500 group-hover:text-white group-hover:border-red-500' : 'group-hover:bg-primary group-hover:text-white group-hover:border-primary'}`}>
                                <item.icon size={20} className="text-text-muted group-hover:text-inherit" />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-tight text-text-muted group-hover:opacity-100 ${item.danger ? 'group-hover:text-red-400' : 'group-hover:text-primary'}`}>{item.label}</span>
                        </button>
                    ))}
                </div>

                <div>
                    <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 ml-2">Programme Semaine</h3>
                    <div className="flex overflow-x-auto no-scrollbar gap-3 pb-6 -mx-4 px-4">
                        {dates.map((date, i) => {
                            const isSelected = isSameDay(date, selectedDate);
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={clsx(
                                        "flex flex-col items-center min-w-[4rem] py-4 rounded-[1.5rem] border transition-all duration-300",
                                        isSelected
                                            ? "bg-primary text-white border-primary shadow-xl scale-105"
                                            : "bg-surface border-white/5 text-text-muted hover:bg-white/5"
                                    )}
                                >
                                    <span className="text-[9px] font-black uppercase tracking-widest mb-1">{format(date, 'EEE')}</span>
                                    <span className="text-base font-black">{format(date, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        {selectedWorkout ? (
                            <motion.div
                                key={selectedWorkout.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-surface border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl group"
                            >
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
                                        {isSameDay(selectedDate, new Date()) ? "Aujourd'hui" : format(selectedDate, 'dd/MM')}
                                    </div>
                                    <button
                                        onClick={() => setShowFeedback(true)}
                                        className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-text-muted transition-colors shadow-sm"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                </div>

                                <h2 className="text-xl font-black uppercase tracking-tight mb-2">{selectedWorkout.title}</h2>
                                <p className="text-text-muted text-xs font-medium mb-6 leading-relaxed">{selectedWorkout.description}</p>

                                <div className="flex gap-8 mb-8">
                                    {selectedWorkout.durationMinutes && (
                                        <div>
                                            <div className="text-2xl font-black">{selectedWorkout.durationMinutes} <span className="text-sm font-bold text-text-muted uppercase">Min</span></div>
                                            <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-1">Durée</div>
                                        </div>
                                    )}
                                    {selectedWorkout.distanceKm && (
                                        <div>
                                            <div className="text-2xl font-black">{selectedWorkout.distanceKm} <span className="text-sm font-bold text-text-muted uppercase">KM</span></div>
                                            <div className="text-[9px] text-text-muted uppercase font-black tracking-widest mt-1">Distance</div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => navigate('/workout', {
                                        state: {
                                            workout: {
                                                title: selectedWorkout.title,
                                                description: selectedWorkout.description,
                                                distanceKm: selectedWorkout.distanceKm,
                                                durationMinutes: selectedWorkout.durationMinutes,
                                                workoutId: selectedWorkout.id
                                            }
                                        }
                                    })}
                                    className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-[0.98] shadow-lg shadow-primary/20"
                                >
                                    <Play size={18} fill="currentColor" />
                                    Lancer la séance
                                </button>

                                <Zap size={120} className="absolute -bottom-8 -right-8 text-primary/5 transform -rotate-12" />
                            </motion.div>
                        ) : (
                            <div className="bg-surface border border-white/5 border-dashed rounded-3xl p-10 text-center">
                                <CalendarIcon size={40} className="text-text-muted/20 mx-auto mb-4" />
                                <p className="text-text-muted text-xs font-black uppercase tracking-widest">Repos aujourd'hui</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
