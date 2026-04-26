import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, Flag, Plus, Loader2, MessageSquare, Calendar as CalendarIcon, Trash2, X, TrendingUp, BarChart2, Zap, Target } from 'lucide-react';
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
            if (res.data.recommended) setAdaptationRecommended(res.data);
        } catch { /* silent */ }
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
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [checkAdaptation]);

    const handleAdaptation = async (accept: boolean) => {
        if (!activePlan) return;
        try {
            await api.post(`/training/plans/${activePlan.id}/adapt`, { accept });
            setAdaptationRecommended(null);
            if (accept) fetchPlan();
        } catch { /* silent */ }
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
        } catch {
            setDeleteError("Impossible de supprimer ce plan pour le moment.");
        } finally {
            setDeletingPlan(false);
        }
    };

    useEffect(() => { fetchPlan(); }, [fetchPlan]);

    const dates = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={28} />
            </div>
        );
    }

    if (!activePlan && !showWizard) {
        return (
            <div className="min-h-screen px-5 pb-28 flex flex-col items-center justify-center text-center gap-8">
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="glass-hero w-24 h-24 rounded-[28px] flex items-center justify-center"
                >
                    <Flag size={32} className="text-primary" />
                </motion.div>
                <div className="max-w-xs">
                    <h1 className="text-2xl font-black tracking-tight text-white mb-2">Pas encore de plan</h1>
                    <p className="text-text-muted text-sm leading-relaxed">Lance-toi ! Crée ton programme sur-mesure et commence à courir avec un vrai objectif.</p>
                </div>
                <button onClick={() => setShowWizard(true)} className="btn-primary w-full max-w-xs text-sm">
                    <Plus size={18} /> Créer mon plan
                </button>
            </div>
        );
    }

    if (showWizard) {
        return (
            <div className="min-h-screen px-5 pb-28">
                <header className="pt-8 mb-8">
                    <h1 className="text-2xl font-black tracking-tight">Nouveau plan</h1>
                    <p className="text-text-muted text-sm mt-1">Un programme sur-mesure, séance par séance.</p>
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
    const goalLabel = GOAL_LABELS[activePlan.goal?.toLowerCase()] || activePlan.goal || 'Objectif';

    return (
        <div className="pb-28">
            <FeedbackModal
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
                workoutId={selectedWorkout?.id || ''}
                planId={activePlan.id || ''}
                weekNumber={currentWeek}
                workoutType={selectedWorkout?.type || 'easy_run'}
            />

            {/* Delete Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                        <motion.div
                            initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                            className="relative w-full max-w-md glass-card rounded-t-[36px] p-6 pb-10"
                        >
                            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="w-14 h-14 rounded-2xl bg-red-500/12 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-red-400" />
                            </div>
                            <h3 className="text-lg font-black text-center mb-2">Supprimer le plan ?</h3>
                            <p className="text-text-muted text-sm text-center leading-relaxed mb-6">Cette action est irréversible. Ton programme sera définitivement supprimé.</p>
                            {deleteError && <p className="text-red-400 text-xs text-center font-semibold mb-4">{deleteError}</p>}
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3.5 rounded-full text-sm font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                                    Annuler
                                </button>
                                <button onClick={deletePlan} disabled={deletingPlan}
                                    className="flex-1 py-3.5 rounded-full bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGoalModal(false)} />
                        <motion.div
                            initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                            className="relative w-full max-w-md glass-hero rounded-t-[36px] p-6 pb-10"
                        >
                            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-0.5">Plan actif</p>
                                    <h3 className="text-xl font-black tracking-tight">{goalLabel}</h3>
                                </div>
                                <button onClick={() => setShowGoalModal(false)} className="w-9 h-9 flex items-center justify-center glass-card rounded-full">
                                    <X size={16} className="text-text-muted" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    { label: 'Date cible', value: activePlan.targetDate ? format(new Date(activePlan.targetDate), 'd MMM yyyy', { locale: fr }) : '—' },
                                    { label: 'Distance totale', value: `${activePlan.totalDistance || 0} km` },
                                    { label: 'Semaine en cours', value: `${currentWeek} / ${totalWeeks}` },
                                    { label: 'Avancement', value: `${progressPct}%` },
                                ].map((stat) => (
                                    <div key={stat.label} className="glass-card rounded-2xl p-4">
                                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">{stat.label}</div>
                                        <div className="text-base font-black text-white">{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-text-muted font-medium">Progression</span>
                                    <span className="text-primary font-bold">{progressPct}%</span>
                                </div>
                                <div className="xp-track">
                                    <div className="xp-fill" style={{ width: `${progressPct}%` }} />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="px-5 space-y-6 pt-7">

                {/* Header */}
                <header className="flex items-start justify-between">
                    <div>
                        <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">Entraînement</h1>
                        <p className="text-text-muted text-sm mt-0.5">Semaine {currentWeek} · {totalWeeks - currentWeek} semaines restantes</p>
                    </div>
                    <div className="glass-card rounded-2xl px-3 py-2 flex items-center gap-1.5">
                        <Zap size={13} className="text-primary" />
                        <span className="text-xs font-black text-white">Sem. {currentWeek}</span>
                    </div>
                </header>

                {/* Glass Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass-hero rounded-[32px] p-6"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-3">
                            <div className="rf-tag mb-2.5">
                                <Target size={9} /> Bloc actif
                            </div>
                            <h2 className="text-2xl font-black leading-tight tracking-tight text-white">{goalLabel}</h2>
                            <p className="text-sm text-text-muted mt-1">
                                {activePlan.targetDate
                                    ? format(new Date(activePlan.targetDate), "d MMMM yyyy", { locale: fr })
                                    : 'Date non définie'}
                            </p>
                        </div>
                        <div className="glass-card rounded-2xl px-3 py-2 text-center flex-shrink-0">
                            <div className="text-lg font-black text-white leading-none">{progressPct}%</div>
                            <div className="text-[8px] text-text-muted font-bold uppercase tracking-wide mt-0.5">complété</div>
                        </div>
                    </div>

                    {/* XP bar */}
                    <div className="mb-1.5">
                        <div className="xp-track">
                            <div className="xp-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-text-muted mb-5">
                        <span>Semaine {currentWeek} sur {totalWeeks}</span>
                        <span className="text-primary">{activePlan.totalDistance || 0} km au total</span>
                    </div>

                    {/* Objectif button */}
                    <button
                        onClick={() => setShowGoalModal(true)}
                        className="w-full flex items-center justify-between py-2.5 border-t border-white/10 group"
                    >
                        <span className="flex items-center gap-2 text-xs font-bold text-text-muted group-hover:text-white transition-colors">
                            <Flag size={13} className="text-primary" />
                            Voir les détails du plan
                        </span>
                        <ChevronRight size={14} className="text-text-muted/40 group-hover:text-white transition-colors" />
                    </button>
                </motion.div>

                {/* Adaptation banner */}
                {adaptationRecommended && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-[24px] p-5 border-l-2 border-primary">
                        <p className="text-xs font-black text-primary mb-1">Adaptation recommandée</p>
                        <p className="text-sm text-text-muted leading-relaxed mb-4">
                            {adaptationRecommended.reason || "Ta progression nécessite un léger ajustement du plan."}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => handleAdaptation(true)}
                                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-colors">
                                Accepter
                            </button>
                            <button onClick={() => handleAdaptation(false)}
                                className="btn-ghost-pill text-xs">
                                Ignorer
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { icon: BarChart2, label: 'Résumé', action: () => navigate('/activities') },
                        { icon: TrendingUp, label: 'Strava', action: () => navigate('/profile') },
                        { icon: Trash2, label: 'Supprimer', action: () => setShowDeleteConfirm(true), danger: true },
                    ].map((item, i) => (
                        <button key={i} onClick={item.action}
                            className={clsx('rf-action-btn', item.danger && 'rf-action-btn-danger')}>
                            <div className="w-9 h-9 rounded-2xl bg-white/6 flex items-center justify-center">
                                <item.icon size={17} />
                            </div>
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Calendar strip */}
                <div>
                    <h3 className="text-sm font-bold text-text-muted mb-3">Programme</h3>
                    <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-5 px-5">
                        {dates.map((date, i) => {
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            const hasWorkout = workouts.some((w: any) => isSameDay(new Date(w.date), date));
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={clsx(
                                        'day-pill flex-shrink-0',
                                        isSelected ? 'day-pill-active text-white' : 'text-text-muted'
                                    )}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wide mb-1">
                                        {format(date, 'EEE', { locale: fr })}
                                    </span>
                                    <span className={clsx(
                                        'text-sm font-black',
                                        isToday && !isSelected ? 'text-primary' : ''
                                    )}>
                                        {format(date, 'd')}
                                    </span>
                                    <div className={clsx(
                                        'w-1.5 h-1.5 rounded-full mt-1 transition-opacity',
                                        hasWorkout ? 'opacity-100' : 'opacity-0',
                                        isSelected ? 'bg-white/70' : 'bg-primary'
                                    )} />
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        {selectedWorkout ? (
                            <motion.div
                                key={selectedWorkout.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="glass-mission rounded-[28px] p-5 mt-4"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="rf-tag">
                                        {isSameDay(selectedDate, new Date()) ? "Aujourd'hui" : format(selectedDate, 'EEEE d MMM', { locale: fr })}
                                    </div>
                                    <button onClick={() => setShowFeedback(true)}
                                        className="glass-card w-9 h-9 flex items-center justify-center rounded-2xl text-text-muted hover:text-white transition-colors">
                                        <MessageSquare size={15} />
                                    </button>
                                </div>

                                <h2 className="text-xl font-black tracking-tight mb-2">{selectedWorkout.title}</h2>
                                <p className="text-text-muted text-sm leading-relaxed mb-5">{selectedWorkout.description}</p>

                                <div className="flex gap-6 mb-6">
                                    {selectedWorkout.durationMinutes && (
                                        <div>
                                            <div className="text-2xl font-black">{selectedWorkout.durationMinutes}<span className="text-xs font-bold text-text-muted ml-1">min</span></div>
                                            <div className="text-[9px] text-text-muted uppercase font-bold tracking-widest mt-0.5">Durée</div>
                                        </div>
                                    )}
                                    {selectedWorkout.distanceKm && (
                                        <div>
                                            <div className="text-2xl font-black">{selectedWorkout.distanceKm}<span className="text-xs font-bold text-text-muted ml-1">km</span></div>
                                            <div className="text-[9px] text-text-muted uppercase font-bold tracking-widest mt-0.5">Distance</div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => navigate('/workout', {
                                        state: { workout: {
                                            title: selectedWorkout.title,
                                            description: selectedWorkout.description,
                                            distanceKm: selectedWorkout.distanceKm,
                                            durationMinutes: selectedWorkout.durationMinutes,
                                            workoutId: selectedWorkout.id
                                        }}
                                    })}
                                    className="w-full py-4 bg-primary text-white font-black text-sm rounded-full flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all"
                                    style={{ boxShadow: '0 8px 28px rgba(90,178,255,0.38), inset 0 1px 0 rgba(255,255,255,0.25)' }}
                                >
                                    <Play size={17} fill="currentColor" />
                                    Lancer la séance
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-card rounded-[28px] p-10 text-center mt-4 border-dashed"
                            >
                                <CalendarIcon size={28} className="text-text-muted/30 mx-auto mb-3" />
                                <p className="text-text-muted text-sm font-bold">Jour de repos</p>
                                <p className="text-text-muted/50 text-xs mt-1">Profites-en pour récupérer 🙌</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
