import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, Flag, Plus, Loader2, MessageSquare, Calendar as CalendarIcon, Zap, Trash2, X, TrendingUp, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../services/api';
import { PlanGeneratorWizard } from '../components/training/PlanGeneratorWizard';
import { FeedbackModal } from '../components/training/FeedbackModal';

const GOAL_LABELS: Record<string, string> = {
    marathon: 'Marathon',
    half_marathon: 'Semi-marathon',
    '10k': '10 KM',
    '5k': '5 KM',
};

export function Training() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activePlan, setActivePlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
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
                const fullPlanRes = await api.get(`/training/plans/${plans[0].id}`);
                const fullPlan = fullPlanRes.data?.plan ?? fullPlanRes.data;
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
                <Loader2 className="animate-spin text-primary" size={28} />
            </div>
        );
    }

    if (!activePlan && !showWizard) {
        return (
            <div className="runna-screen px-4 pb-24 min-h-screen flex flex-col items-center justify-center text-center gap-8">
                <div className="w-20 h-20 rounded-[24px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Flag size={28} className="text-primary" />
                </div>
                <div className="max-w-xs">
                    <h1 className="text-2xl font-black tracking-tight text-white mb-2">Aucun plan actif</h1>
                    <p className="text-text-muted text-sm leading-relaxed">Crée un programme structuré et motivant pour retrouver ton cadre d'entraînement.</p>
                </div>
                <button
                    onClick={() => setShowWizard(true)}
                    className="btn-primary w-full max-w-xs text-xs uppercase tracking-widest"
                >
                    <Plus size={16} />
                    Créer mon plan
                </button>
            </div>
        );
    }

    if (showWizard) {
        return (
            <div className="runna-screen px-4 pb-24 min-h-screen">
                <header className="pt-6 mb-8">
                    <h1 className="text-2xl font-black tracking-tight text-white">Nouveau plan</h1>
                    <p className="text-text-muted text-sm mt-1">Un programme structuré, séance par séance.</p>
                </header>
                <PlanGeneratorWizard onPlanGenerated={() => { setShowWizard(false); fetchPlan(); }} />
            </div>
        );
    }

    const workouts = activePlan.workouts || [];
    const selectedWorkout = workouts.find((w: any) => isSameDay(new Date(w.date), selectedDate));

    const startDate = activePlan.startDate ? new Date(activePlan.startDate) : new Date();
    const targetDate = activePlan.targetDate ? new Date(activePlan.targetDate) : addDays(startDate, 12 * 7);
    const totalWeeks = Math.max(1, Math.ceil((targetDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const currentWeek = Math.max(1, Math.min(totalWeeks, Math.ceil((new Date().getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))));
    const progressPct = Math.round((currentWeek / totalWeeks) * 100);
    const goalLabel = GOAL_LABELS[activePlan.goal?.toLowerCase()] || activePlan.goal || 'Objectif Final';

    return (
        <div className="runna-screen pb-24">
            <FeedbackModal
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
                workoutId={selectedWorkout?.id || ''}
                planId={activePlan.id || ''}
                weekNumber={currentWeek}
                workoutType={selectedWorkout?.type || 'easy_run'}
            />

            {/* Delete Plan Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-end justify-center"
                    >
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                        <motion.div
                            initial={{ y: 24, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 24, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="relative w-full max-w-md bg-surface border border-white/10 rounded-t-[32px] p-6 pb-10"
                        >
                            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-center w-14 h-14 bg-red-500/10 rounded-2xl mx-auto mb-4 border border-red-500/20">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-center mb-2">Supprimer le plan ?</h3>
                            <p className="text-text-muted text-sm text-center leading-relaxed mb-6">Cette action est irréversible. Ton plan d'entraînement sera définitivement supprimé.</p>
                            {deleteError && (
                                <p className="text-red-400 text-xs text-center font-semibold mb-4">{deleteError}</p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3.5 bg-white/6 text-sm font-bold rounded-2xl hover:bg-white/10 transition-colors border border-white/8"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={deletePlan}
                                    disabled={deletingPlan}
                                    className="flex-1 py-3.5 bg-red-500 text-white text-sm font-bold rounded-2xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {deletingPlan ? <Loader2 size={14} className="animate-spin" /> : 'Supprimer'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Goal Detail Modal */}
            <AnimatePresence>
                {showGoalModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-end justify-center"
                    >
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGoalModal(false)} />
                        <motion.div
                            initial={{ y: 24, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 24, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="relative w-full max-w-md bg-surface border border-white/10 rounded-t-[32px] p-6 pb-10"
                        >
                            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black tracking-tight">Objectif Final</h3>
                                <button onClick={() => setShowGoalModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors">
                                    <X size={18} className="text-text-muted" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-background rounded-2xl p-4 border border-white/6">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Objectif</div>
                                    <div className="text-base font-black text-primary">{goalLabel}</div>
                                </div>
                                <div className="bg-background rounded-2xl p-4 border border-white/6">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Date cible</div>
                                    <div className="text-sm font-black">
                                        {activePlan.targetDate ? format(new Date(activePlan.targetDate), 'dd MMM yyyy', { locale: fr }) : '—'}
                                    </div>
                                </div>
                                <div className="bg-background rounded-2xl p-4 border border-white/6">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Progression</div>
                                    <div className="text-base font-black">Sem. {currentWeek}<span className="text-text-muted text-sm font-medium">/{totalWeeks}</span></div>
                                </div>
                                <div className="bg-background rounded-2xl p-4 border border-white/6">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Distance totale</div>
                                    <div className="text-base font-black">{activePlan.totalDistance || 0}<span className="text-text-muted text-sm font-medium"> km</span></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-text-muted font-medium">Avancement du plan</span>
                                    <span className="text-xs font-black text-primary">{progressPct}%</span>
                                </div>
                                <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="px-4 space-y-6 pt-6">

                {/* Header */}
                <header>
                    <h1 className="text-2xl font-black tracking-tight text-white">Entraînement</h1>
                    <p className="text-text-muted text-sm mt-1">Semaine {currentWeek} sur {totalWeeks}</p>
                </header>

                {/* Hero Plan Card */}
                <div className="plan-hero-card rounded-[28px] p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-4">
                            <div className="rf-tag mb-2">Bloc actif</div>
                            <h2 className="text-xl font-black leading-tight tracking-tight text-white">{goalLabel}</h2>
                            <p className="text-text-muted text-xs mt-1 font-medium">
                                Objectif : <span className="text-white">
                                    {activePlan.targetDate ? format(new Date(activePlan.targetDate), 'dd MMM yyyy', { locale: fr }) : '—'}
                                </span>
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="text-2xl font-black text-white">{currentWeek}</div>
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest">/ {totalWeeks} sem.</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                        <div className="flex gap-1">
                            {Array.from({ length: totalWeeks }).map((_, i) => (
                                <div key={i} className={clsx(
                                    'h-1 flex-1 rounded-full transition-all',
                                    i < currentWeek - 1 ? 'bg-primary' :
                                    i === currentWeek - 1 ? 'bg-primary/70' :
                                    'bg-white/10'
                                )} />
                            ))}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/8 mb-3">
                        <div>
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Distance totale</div>
                            <div className="text-lg font-black text-white">{activePlan.totalDistance || 0} <span className="text-xs font-bold text-text-muted">KM</span></div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Avancement</div>
                            <div className="text-lg font-black text-primary">{progressPct}%</div>
                        </div>
                    </div>

                    {/* Objectif Final row */}
                    <button
                        onClick={() => setShowGoalModal(true)}
                        className="w-full py-3 flex items-center justify-between border-t border-white/8 hover:bg-white/4 rounded-b-xl transition-colors group"
                    >
                        <span className="flex items-center gap-2 text-xs font-bold text-text-muted group-hover:text-white transition-colors">
                            <Flag size={13} className="text-primary" />
                            Voir les détails du plan
                        </span>
                        <ChevronRight size={13} className="text-text-muted group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* Adaptation banner */}
                {adaptationRecommended && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="runna-card rounded-[24px] p-5 border-l-2 border-primary"
                    >
                        <h3 className="text-sm font-black text-primary mb-1">Adaptation recommandée</h3>
                        <p className="text-xs text-text-muted mb-4 leading-relaxed">
                            {adaptationRecommended.reason || "Nous avons détecté que ta progression nécessite un ajustement."}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAdaptation(true)}
                                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
                            >
                                Accepter
                            </button>
                            <button
                                onClick={() => handleAdaptation(false)}
                                className="px-5 py-2 bg-white/6 text-xs font-bold rounded-xl hover:bg-white/10 transition-colors border border-white/8"
                            >
                                Ignorer
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { icon: BarChart2, label: 'Résumé', action: () => navigate('/activities'), variant: 'default' },
                        { icon: TrendingUp, label: 'Strava', action: () => navigate('/profile'), variant: 'default' },
                        { icon: Trash2, label: 'Supprimer', action: () => setShowDeleteConfirm(true), variant: 'danger' },
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={item.action}
                            className={clsx(
                                'rf-action-btn',
                                item.variant === 'danger' ? 'rf-action-btn-danger' : ''
                            )}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Weekly calendar */}
                <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Programme</h3>
                    <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-4 px-4">
                        {dates.map((date, i) => {
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            const hasWorkout = workouts.some((w: any) => isSameDay(new Date(w.date), date));
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={clsx(
                                        'flex flex-col items-center min-w-[3.5rem] py-3 rounded-2xl border transition-all duration-200 relative',
                                        isSelected
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                                            : 'bg-surface border-white/6 text-text-muted hover:bg-white/5'
                                    )}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wide mb-1">
                                        {format(date, 'EEE', { locale: fr })}
                                    </span>
                                    <span className={clsx('text-base font-black', isToday && !isSelected && 'text-primary')}>
                                        {format(date, 'd')}
                                    </span>
                                    {hasWorkout && (
                                        <div className={clsx(
                                            'w-1 h-1 rounded-full mt-1',
                                            isSelected ? 'bg-white/60' : 'bg-primary'
                                        )} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        {selectedWorkout ? (
                            <motion.div
                                key={selectedWorkout.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-surface border border-white/6 rounded-3xl p-5 mt-4"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest">
                                        {isSameDay(selectedDate, new Date()) ? "Aujourd'hui" : format(selectedDate, 'dd MMM', { locale: fr })}
                                    </div>
                                    <button
                                        onClick={() => setShowFeedback(true)}
                                        className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-text-muted transition-colors"
                                    >
                                        <MessageSquare size={16} />
                                    </button>
                                </div>

                                <h2 className="text-lg font-black tracking-tight mb-1.5">{selectedWorkout.title}</h2>
                                <p className="text-text-muted text-sm leading-relaxed mb-5">{selectedWorkout.description}</p>

                                <div className="flex gap-6 mb-6">
                                    {selectedWorkout.durationMinutes && (
                                        <div>
                                            <div className="text-2xl font-black">{selectedWorkout.durationMinutes} <span className="text-xs font-bold text-text-muted">MIN</span></div>
                                            <div className="text-[9px] text-text-muted uppercase font-bold tracking-widest mt-0.5">Durée</div>
                                        </div>
                                    )}
                                    {selectedWorkout.distanceKm && (
                                        <div>
                                            <div className="text-2xl font-black">{selectedWorkout.distanceKm} <span className="text-xs font-bold text-text-muted">KM</span></div>
                                            <div className="text-[9px] text-text-muted uppercase font-bold tracking-widest mt-0.5">Distance</div>
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
                                    className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                                >
                                    <Play size={16} fill="currentColor" />
                                    Lancer la séance
                                </button>
                            </motion.div>
                        ) : (
                            <div className="bg-surface border border-white/6 border-dashed rounded-3xl p-10 text-center mt-4">
                                <CalendarIcon size={32} className="text-text-muted/20 mx-auto mb-3" />
                                <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Repos</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
