import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, ChevronLeft, ChevronRight, Flag, Plus, Loader2,
    MessageSquare, Calendar as CalendarIcon, Trash2, BarChart2,
    Zap, Timer, MapPin, Activity, Heart, Flame, Wind, Repeat2,
    TrendingUp, StickyNote, Route,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../services/api';
import { PlanGeneratorWizard } from '../components/training/PlanGeneratorWizard';
import { FeedbackModal } from '../components/training/FeedbackModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
    marathon: 'Marathon',
    half_marathon: 'Semi-marathon',
    '10k': '10 KM',
    '5k': '5 KM',
};

const PHASE_CONFIG: Record<string, { color: string; label: string; desc: string }> = {
    base:        { color: '#5ab2ff', label: 'Base aérobie',  desc: 'Fondation' },
    build:       { color: '#22d3ee', label: 'Construction',  desc: 'Volume ↑' },
    intensity:   { color: '#f97316', label: 'Intensité',     desc: 'Z4–Z5' },
    specificity: { color: '#fbbf24', label: 'Spécificité',   desc: 'Allure cible' },
    taper:       { color: '#22c55e', label: 'Affûtage',      desc: 'Vol. −40%' },
};

const WORKOUT_COLORS: Record<string, string> = {
    easy_run:             '#22c55e',
    long_run:             '#5ab2ff',
    recovery_run:         '#64748b',
    tempo:                '#f97316',
    threshold_intervals:  '#ef4444',
    vo2max_intervals:     '#ec4899',
    hill_repeats:         '#f59e0b',
    fartlek:              '#8b5cf6',
    progression_run:      '#22d3ee',
    race_pace:            '#f97316',
    strides:              '#a78bfa',
};

const WORKOUT_LABELS: Record<string, string> = {
    easy_run:             'Footing facile',
    long_run:             'Sortie longue',
    recovery_run:         'Récupération',
    tempo:                'Tempo',
    threshold_intervals:  'Intervalles seuil',
    vo2max_intervals:     'VO₂max',
    hill_repeats:         'Côtes',
    fartlek:              'Fartlek',
    progression_run:      'Progression',
    race_pace:            'Allure course',
    strides:              'Accélérations',
};

const DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Icons par type de séance — utilisés dans le calendrier (cohérents avec WORKOUT_COLORS)
const WORKOUT_ICONS: Record<string, React.ElementType> = {
    easy_run:            Activity,
    long_run:            Route,
    recovery_run:        Heart,
    tempo:               TrendingUp,
    threshold_intervals: Repeat2,
    vo2max_intervals:    Zap,
    hill_repeats:        TrendingUp,
    fartlek:             Wind,
    progression_run:     TrendingUp,
    race_pace:           Flag,
    strides:             Zap,
};

const WORKOUT_SHORT: Record<string, string> = {
    easy_run:            'Facile',
    long_run:            'Long',
    recovery_run:        'Récup',
    tempo:               'Tempo',
    threshold_intervals: 'Seuil',
    vo2max_intervals:    'VO₂',
    hill_repeats:        'Côtes',
    fartlek:             'Fartlek',
    progression_run:     'Prog.',
    race_pace:           'Course',
    strides:             'Stride',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Training() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewedWeek, setViewedWeek] = useState(1); // initialized after plan loads
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

                const workouts = fullPlan.weeks?.flatMap((w: any) =>
                    w.workouts
                        .filter((wo: any) => wo.type !== 'rest')
                        .map((wo: any, i: number) => {
                            const start = new Date(w.startDate);
                            start.setDate(start.getDate() + i);
                            return {
                                id: `${fullPlan.id}-w${w.weekNumber}-${i}`,
                                date: start.toISOString().split('T')[0],
                                title: wo.title,
                                description: wo.description,
                                durationMinutes: wo.targetDuration,
                                distanceKm: wo.targetDistance,
                                targetPace: wo.targetPace,
                                targetHeartRate: wo.targetHeartRate,
                                warmup: wo.warmup,
                                segments: wo.segments,
                                cooldown: wo.cooldown,
                                notes: wo.notes,
                                type: wo.type,
                                zone: wo.zone,
                                rpe: wo.rpe,
                                phase: w.phase,
                                phaseLabel: w.phaseLabel,
                                weekNumber: w.weekNumber,
                            };
                        })
                ) ?? [];

                // Map every plan date → its phase
                const datePhaseMap: Record<string, { phase: string; phaseLabel: string }> = {};
                for (const w of (fullPlan.weeks ?? [])) {
                    let d = new Date(w.startDate);
                    const end = new Date(w.endDate);
                    while (d <= end) {
                        const key = d.toISOString().split('T')[0];
                        datePhaseMap[key] = { phase: w.phase, phaseLabel: w.phaseLabel };
                        d = addDays(d, 1);
                    }
                }

                const totalDistance = (fullPlan.weeks ?? [])
                    .flatMap((w: any) => w.workouts)
                    .reduce((s: number, wo: any) => s + (wo.targetDistance || 0), 0)
                    .toFixed(0);

                setActivePlan({
                    ...fullPlan,
                    startDate: fullPlan.periodization?.startDate,
                    totalDistance,
                    workouts,
                    datePhaseMap,
                    paces: fullPlan.paces,
                });
                // Initialize viewed week to current week after loading
                const start = new Date(fullPlan.periodization?.startDate ?? new Date());
                const end = new Date(fullPlan.targetDate ?? addDays(start, 84));
                const wTotal = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 86400_000)));
                const wElapsed = Math.max(0, (new Date().getTime() - start.getTime()) / (7 * 86400_000));
                setViewedWeek(Math.max(1, Math.min(wTotal, Math.ceil(wElapsed) || 1)));
                checkAdaptation(fullPlan.id);
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
            setDeleteError('Impossible de supprimer ce plan pour le moment.');
        } finally {
            setDeletingPlan(false);
        }
    };

    useEffect(() => { fetchPlan(); }, [fetchPlan]);

    // ─── Early returns ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={28} />
            </div>
        );
    }

    if (!activePlan && !showWizard) {
        return (
            <div className="min-h-screen px-5 pb-28 flex flex-col items-center justify-center text-center gap-6">
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
                    <p className="text-text-muted text-sm leading-relaxed">
                        Lance-toi ! Crée ton programme sur-mesure et commence à courir avec un vrai objectif.
                    </p>
                </div>
                <div className="w-full max-w-xs flex flex-col gap-3">
                    <button onClick={() => setShowWizard(true)} className="btn-primary w-full text-sm">
                        <Plus size={18} /> Créer mon plan
                    </button>
                    <button
                        onClick={() => navigate('/workout')}
                        className="w-full py-3.5 rounded-full border border-white/10 bg-white/5 text-white text-sm font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-colors active:scale-[0.97]"
                    >
                        <Play size={16} fill="currentColor" className="text-primary" />
                        Lancer une course libre
                    </button>
                </div>
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

    // ─── Plan calculations ──────────────────────────────────────────────────

    const workouts: any[] = activePlan.workouts ?? [];
    const datePhaseMap: Record<string, { phase: string; phaseLabel: string }> = activePlan.datePhaseMap ?? {};

    const workoutByDate: Record<string, any> = {};
    for (const w of workouts) workoutByDate[w.date] = w;

    const planStart = activePlan.startDate ? new Date(activePlan.startDate) : new Date();
    const planEnd = activePlan.targetDate ? new Date(activePlan.targetDate) : addDays(planStart, 84);
    const totalMs = planEnd.getTime() - planStart.getTime();
    const totalWeeks = Math.max(1, Math.ceil(totalMs / (7 * 86400_000)));

    // Fixed: real elapsed time, not week-ceiling
    const now = new Date();
    const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - planStart.getTime()));
    const progressPct = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;
    const currentWeek = Math.max(1, Math.min(totalWeeks, Math.ceil(elapsedMs / (7 * 86400_000)) || 1));
    const weeksLeft = Math.max(0, totalWeeks - currentWeek);

    const goalLabel = GOAL_LABELS[activePlan.goal?.toLowerCase()] ?? activePlan.goal ?? 'Objectif';

    const todayKey = now.toISOString().split('T')[0];
    const currentPhaseInfo = datePhaseMap[todayKey];
    const currentPhase = currentPhaseInfo?.phase ?? 'base';
    const phaseColor = PHASE_CONFIG[currentPhase]?.color ?? '#5ab2ff';

    const selectedDateKey = selectedDate.toISOString().split('T')[0];
    const selectedWorkout = workoutByDate[selectedDateKey];
    const selectedPhaseInfo = datePhaseMap[selectedDateKey];

    // ─── Weekly calendar data ────────────────────────────────────────────────
    const planWeeks: any[] = activePlan.weeks ?? [];
    const viewedWeekData = planWeeks.find((w: any) => w.weekNumber === viewedWeek) ?? planWeeks[0];
    const weekDays = viewedWeekData
        ? Array.from({ length: 7 }, (_, i) => addDays(new Date(viewedWeekData.startDate), i))
        : [];
    const planPhases: any[] = activePlan.periodization?.phases ?? activePlan.summary?.phases ?? [];

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="pb-28">
            <FeedbackModal
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
                workoutId={selectedWorkout?.id ?? ''}
                planId={activePlan.id ?? ''}
                weekNumber={currentWeek}
                workoutType={selectedWorkout?.type ?? 'easy_run'}
            />

            {/* Delete confirm sheet */}
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
                            <p className="text-text-muted text-sm text-center leading-relaxed mb-6">
                                Cette action est irréversible. Ton programme sera définitivement supprimé.
                            </p>
                            {deleteError && (
                                <p className="text-red-400 text-xs text-center font-semibold mb-4">{deleteError}</p>
                            )}
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

            <div className="px-5 space-y-5 pt-7">

                {/* ── Header ─────────────────────────────────────────── */}
                <header className="flex items-start justify-between">
                    <div>
                        <h1 className="text-[1.75rem] font-black tracking-tight leading-none text-white">Entraînement</h1>
                        <p className="text-text-muted text-sm mt-1">
                            Semaine {currentWeek} · {weeksLeft > 0 ? `${weeksLeft} sem. restantes` : 'Dernière ligne droite'}
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl px-3 py-2 flex items-center gap-1.5">
                        <Zap size={12} className="text-primary" />
                        <span className="text-xs font-black text-white">{progressPct}%</span>
                    </div>
                </header>

                {/* ── Hero card ──────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 }}
                    className="glass-hero rounded-[32px] p-5 relative overflow-hidden"
                >
                    {/* Dynamic phase ambient glow */}
                    <div
                        className="pointer-events-none absolute inset-0 rounded-[32px] opacity-[0.08] transition-all duration-700"
                        style={{ background: `radial-gradient(ellipse at 85% 0%, ${phaseColor}, transparent 65%)` }}
                    />

                    <div className="relative">
                        {/* Phase badge + goal */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 pr-4">
                                {currentPhaseInfo && (
                                    <div
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2.5 text-[9px] font-black uppercase tracking-widest border"
                                        style={{
                                            color: phaseColor,
                                            borderColor: `${phaseColor}35`,
                                            backgroundColor: `${phaseColor}12`,
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: phaseColor }} />
                                        {PHASE_CONFIG[currentPhase]?.label ?? currentPhaseInfo.phaseLabel}
                                    </div>
                                )}
                                <h2 className="text-2xl font-black leading-tight tracking-tight text-white">{goalLabel}</h2>
                                <p className="text-sm text-text-muted mt-0.5">
                                    {activePlan.targetDate
                                        ? format(new Date(activePlan.targetDate), "d MMMM yyyy", { locale: fr })
                                        : 'Date non définie'}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[2rem] font-black leading-none"
                                    style={{ color: phaseColor }}>
                                    {progressPct}<span className="text-base font-black text-text-muted">%</span>
                                </div>
                                <div className="text-[8px] text-text-muted font-bold uppercase tracking-widest mt-0.5">complété</div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
                                    className="h-full rounded-full"
                                    style={{
                                        background: `linear-gradient(90deg, ${phaseColor}cc, ${phaseColor})`,
                                        boxShadow: `0 0 12px ${phaseColor}88`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Key stats row */}
                        <div className="flex gap-3 mb-4">
                            {[
                                { label: 'Semaine', value: `${currentWeek} / ${totalWeeks}` },
                                { label: 'Total', value: `${activePlan.totalDistance} km` },
                                { label: 'Restant', value: weeksLeft > 0 ? `${weeksLeft} sem.` : 'Bientôt !' },
                            ].map((stat) => (
                                <div key={stat.label} className="flex-1 glass-card rounded-2xl px-3 py-2.5 text-center">
                                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-0.5">{stat.label}</div>
                                    <div className="text-xs font-black text-white">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Quick actions */}
                        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.07]">
                            <QuickAction icon={Play} label="Course libre" primary onClick={() => navigate('/workout')} />
                            <QuickAction icon={BarChart2} label="Résumé" onClick={() => navigate('/activities')} />
                            <QuickAction icon={Trash2} label="Supprimer" danger onClick={() => setShowDeleteConfirm(true)} />
                        </div>
                    </div>
                </motion.div>

                {/* ── Adaptation banner ──────────────────────────────── */}
                <AnimatePresence>
                    {adaptationRecommended && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="glass-card rounded-[24px] p-5 border-l-2 border-primary">
                            <p className="text-xs font-black text-primary mb-1">Adaptation recommandée</p>
                            <p className="text-sm text-text-muted leading-relaxed mb-4">
                                {adaptationRecommended.reason ?? "Ta progression nécessite un léger ajustement du plan."}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => handleAdaptation(true)}
                                    className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-colors">
                                    Accepter
                                </button>
                                <button onClick={() => handleAdaptation(false)} className="btn-ghost-pill text-xs">
                                    Ignorer
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Weekly Calendar ────────────────────────────────── */}
                <section>
                    <h3 className="text-sm font-black text-white mb-3">Programme</h3>

                    {/* Phase timeline strip */}
                    {planPhases.length > 0 && (
                        <div className="mb-4">
                            <div className="relative h-3">
                                {/* Phase color bars */}
                                <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                                    {planPhases.map((ph: any) => {
                                        const pct = (ph.weeks / totalWeeks) * 100;
                                        const color = PHASE_CONFIG[ph.name]?.color ?? '#5ab2ff';
                                        return (
                                            <div key={ph.name}
                                                title={PHASE_CONFIG[ph.name]?.label}
                                                style={{ width: `${pct}%`, background: color }}
                                            />
                                        );
                                    })}
                                </div>
                                {/* Current position marker */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                                    style={{ left: `${Math.min(98, Math.max(2, ((currentWeek - 0.5) / totalWeeks) * 100))}%` }}
                                >
                                    <div className="w-4 h-4 rounded-full bg-white shadow-lg border-2 border-[#07111f] flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    </div>
                                </div>
                            </div>
                            {/* Phase labels (compact) */}
                            <div className="flex mt-1">
                                {planPhases.map((ph: any) => {
                                    const color = PHASE_CONFIG[ph.name]?.color ?? '#5ab2ff';
                                    return (
                                        <div key={ph.name} style={{ width: `${(ph.weeks / totalWeeks) * 100}%` }}>
                                            <span className="text-[7px] font-black uppercase tracking-widest leading-none truncate block"
                                                style={{ color: `${color}80` }}>
                                                {PHASE_CONFIG[ph.name]?.label?.split(' ')[0] ?? ph.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Week navigator */}
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={() => setViewedWeek(w => Math.max(1, w - 1))}
                            disabled={viewedWeek <= 1}
                            className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
                        >
                            <ChevronLeft size={15} className="text-text-muted" />
                        </button>

                        <div className="flex-1 text-center">
                            <AnimatePresence mode="wait">
                                <motion.div key={viewedWeek}
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}
                                >
                                    <p className="text-sm font-black text-white leading-none">
                                        Semaine {viewedWeek}
                                        {viewedWeek === currentWeek && (
                                            <span className="ml-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 rounded-full px-1.5 py-0.5 align-middle">
                                                En cours
                                            </span>
                                        )}
                                    </p>
                                    {viewedWeekData && (
                                        <p className="text-[10px] text-text-muted mt-0.5">
                                            {viewedWeekData.startDate ? format(new Date(viewedWeekData.startDate), 'd MMM', { locale: fr }) : ''}{' '}
                                            – {viewedWeekData.endDate ? format(new Date(viewedWeekData.endDate), 'd MMM', { locale: fr }) : ''}
                                            {viewedWeekData.isRecoveryWeek && (
                                                <span className="ml-1.5 text-[8px] font-bold text-text-muted/60 border border-white/10 rounded-full px-1.5 py-0.5">
                                                    Décharge
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={() => setViewedWeek(w => Math.min(totalWeeks, w + 1))}
                            disabled={viewedWeek >= totalWeeks}
                            className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
                        >
                            <ChevronRight size={15} className="text-text-muted" />
                        </button>
                    </div>

                    {/* 7-day tiles */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 }}
                        className="glass-card rounded-[28px] p-3"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={viewedWeek}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.16 }}
                                className="grid grid-cols-7 gap-1"
                            >
                                {weekDays.map((day, i) => {
                                    const key = day.toISOString().split('T')[0];
                                    const workout = workoutByDate[key];
                                    const isDayToday = isToday(day);
                                    const isSelected = isSameDay(day, selectedDate);
                                    const color = workout ? (WORKOUT_COLORS[workout.type] ?? '#5ab2ff') : null;
                                    const WIcon = workout ? (WORKOUT_ICONS[workout.type] ?? Activity) : null;

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(day)}
                                            className={clsx(
                                                'flex flex-col items-center py-2.5 rounded-2xl transition-all active:scale-95',
                                                isSelected ? 'ring-1 ring-white/30' : '',
                                            )}
                                            style={{
                                                background: isSelected
                                                    ? (color ? `${color}22` : 'rgba(255,255,255,0.10)')
                                                    : isDayToday
                                                        ? 'rgba(90,178,255,0.08)'
                                                        : undefined,
                                            }}
                                        >
                                            {/* Day label */}
                                            <span className="text-[8px] font-black uppercase tracking-widest text-text-muted/50 leading-none mb-1">
                                                {DAY_HEADERS[i]}
                                            </span>

                                            {/* Date number */}
                                            <span className={clsx(
                                                'text-[13px] font-black leading-none mb-2',
                                                isSelected ? 'text-white' : isDayToday ? 'text-primary' : 'text-white/80'
                                            )}>
                                                {format(day, 'd')}
                                            </span>

                                            {/* Workout icon bubble — exact color = workout type color */}
                                            {WIcon && color ? (
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5"
                                                    style={{
                                                        background: isSelected ? `${color}35` : `${color}18`,
                                                        border: `1px solid ${color}${isSelected ? '60' : '30'}`,
                                                        boxShadow: isSelected ? `0 0 10px ${color}40` : undefined,
                                                    }}
                                                >
                                                    <WIcon size={14} style={{ color }} />
                                                </div>
                                            ) : (
                                                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-1.5" />
                                            )}

                                            {/* Short label */}
                                            {workout ? (
                                                <span className="text-[8px] font-bold leading-none text-center px-0.5"
                                                    style={{ color: isSelected ? color ?? '#fff' : `${color}cc` }}>
                                                    {WORKOUT_SHORT[workout.type] ?? '—'}
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-bold text-text-muted/25 leading-none">Repos</span>
                                            )}

                                            {/* Duration */}
                                            {workout?.durationMinutes && (
                                                <span className="text-[7px] font-bold text-text-muted/50 mt-0.5 leading-none">
                                                    {workout.durationMinutes}m
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>

                        {/* Week footer: phase + volume */}
                        {viewedWeekData && (
                            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ background: PHASE_CONFIG[viewedWeekData.phase]?.color ?? '#5ab2ff' }}
                                    />
                                    <span
                                        className="text-[9px] font-black uppercase tracking-widest"
                                        style={{ color: PHASE_CONFIG[viewedWeekData.phase]?.color ?? '#5ab2ff' }}
                                    >
                                        {PHASE_CONFIG[viewedWeekData.phase]?.label ?? viewedWeekData.phaseLabel}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-text-muted">
                                    {viewedWeekData.targetWeeklyKm ? `${viewedWeekData.targetWeeklyKm} km · ` : ''}
                                    {viewedWeekData.workouts?.filter((w: any) => w.type !== 'rest').length ?? 0} séances
                                </span>
                            </div>
                        )}
                    </motion.div>

                    {/* Workout type legend — same colors as the bubbles above */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
                        {weekDays
                            .map(day => workoutByDate[day.toISOString().split('T')[0]])
                            .filter(Boolean)
                            .filter((w, i, arr) => arr.findIndex(x => x.type === w.type) === i)
                            .map(w => (
                                <div key={w.type} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: WORKOUT_COLORS[w.type] ?? '#5ab2ff' }} />
                                    <span className="text-[9px] font-bold text-text-muted">{WORKOUT_LABELS[w.type] ?? w.type}</span>
                                </div>
                            ))
                        }
                    </div>
                </section>

                {/* ── Selected day card ──────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {selectedWorkout ? (
                        <WorkoutCard
                            key={selectedWorkout.id}
                            workout={selectedWorkout}
                            date={selectedDate}
                            paces={activePlan.paces}
                            onFeedback={() => setShowFeedback(true)}
                            onStart={() => navigate('/workout', {
                                state: {
                                    workout: {
                                        title: selectedWorkout.title,
                                        description: selectedWorkout.description,
                                        distanceKm: selectedWorkout.distanceKm,
                                        durationMinutes: selectedWorkout.durationMinutes,
                                        workoutId: selectedWorkout.id,
                                    }
                                }
                            })}
                        />
                    ) : (
                        <motion.div
                            key={selectedDateKey}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="glass-card rounded-[28px] p-6 text-center"
                        >
                            <CalendarIcon size={28} className="text-text-muted/25 mx-auto mb-3" />
                            <p className="text-white/80 text-sm font-black capitalize">
                                {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                            </p>
                            <p className="text-text-muted/60 text-xs mt-1 mb-5">
                                {selectedPhaseInfo ? 'Repos · Récupère bien 🙌' : 'Hors du plan'}
                            </p>
                            <button
                                onClick={() => navigate('/workout')}
                                className="w-full py-3 rounded-full border border-white/10 bg-white/5 text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-colors active:scale-[0.97]"
                            >
                                <Play size={13} fill="currentColor" className="text-primary" />
                                Course libre quand même
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function QuickAction({
    icon: Icon,
    label,
    onClick,
    primary,
    danger,
}: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    primary?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                'flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95 group',
                primary ? 'bg-primary/15 border border-primary/25 hover:bg-primary/25' : 'bg-white/5 border border-white/8 hover:bg-white/10',
                danger && 'hover:bg-red-500/12 hover:border-red-500/25'
            )}
        >
            <Icon
                size={18}
                className={clsx(
                    'transition-colors',
                    primary ? 'text-primary' : danger ? 'text-text-muted group-hover:text-red-400' : 'text-text-muted group-hover:text-white'
                )}
            />
            <span className={clsx(
                'text-[9px] font-black uppercase tracking-wide transition-colors',
                primary ? 'text-primary' : danger ? 'text-text-muted group-hover:text-red-400' : 'text-text-muted group-hover:text-white'
            )}>
                {label}
            </span>
        </button>
    );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtPace(secPerKm: number): string {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtPaceRange(range: { min: number; max: number } | undefined): string | null {
    if (!range) return null;
    const faster = Math.min(range.min, range.max);
    const slower = Math.max(range.min, range.max);
    return `${fmtPace(faster)} – ${fmtPace(slower)} /km`;
}

function fmtDur(min: number | undefined): string | null {
    if (!min) return null;
    return min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min} min`;
}

const ZONE_CONFIG = {
    z1: { color: '#64748b', label: 'Récup',    fullLabel: 'Récupération' },
    z2: { color: '#22c55e', label: 'Aérobie',  fullLabel: 'Endurance aérobie' },
    z3: { color: '#22d3ee', label: 'Tempo',    fullLabel: 'Seuil aérobie' },
    z4: { color: '#f97316', label: 'Seuil',    fullLabel: 'Seuil lactique' },
    z5: { color: '#ef4444', label: 'VO₂',      fullLabel: 'VO₂max / Anaérobie' },
} as const;

const SEGMENT_STYLE = {
    warmup:   { color: '#f97316', icon: Flame,   label: 'Échauffement' },
    main:     { color: '#5ab2ff', icon: TrendingUp, label: 'Corps de séance' },
    cooldown: { color: '#22d3ee', icon: Wind,    label: 'Retour au calme' },
    interval: { color: '#ef4444', icon: Repeat2, label: 'Intervalle' },
    recovery: { color: '#22c55e', icon: Heart,   label: 'Récupération' },
} as const;

// ─── WorkoutCard ──────────────────────────────────────────────────────────────

function WorkoutCard({
    workout,
    date,
    paces,
    onFeedback,
    onStart,
}: {
    workout: any;
    date: Date;
    paces: any;
    onFeedback: () => void;
    onStart: () => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const workoutColor = WORKOUT_COLORS[workout.type] ?? '#5ab2ff';
    const phaseColor = PHASE_CONFIG[workout.phase]?.color ?? '#5ab2ff';
    const workoutLabel = WORKOUT_LABELS[workout.type] ?? workout.type;
    const paceStr = fmtPaceRange(workout.targetPace);

    // HR info: prefer workout.targetHeartRate, then look up zone from paces
    const zoneKey = workout.zone as keyof typeof ZONE_CONFIG | undefined;
    const zoneCfg = zoneKey ? ZONE_CONFIG[zoneKey] : null;
    const hrRange = workout.targetHeartRate ?? (zoneKey ? paces?.zones?.[zoneKey] : null);

    // Group segments for display
    const segments: any[] = workout.segments ?? [];
    const intervalGroups = groupIntervals(segments);
    const hasStructure = workout.warmup || intervalGroups.length > 0 || workout.cooldown;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-mission rounded-[28px] p-5 relative overflow-hidden"
        >
            {/* Ambient tint */}
            <div
                className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[0.07]"
                style={{ background: `radial-gradient(ellipse at 90% 0%, ${workoutColor}, transparent 55%)` }}
            />

            <div className="relative space-y-4">
                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="rf-tag mb-2">
                            {isToday(date) ? "Aujourd'hui" : format(date, 'EEEE d MMM', { locale: fr })}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: workoutColor }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: workoutColor }}>
                                {workoutLabel}
                            </span>
                            {workout.phase && PHASE_CONFIG[workout.phase] && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                                    style={{ color: phaseColor, borderColor: `${phaseColor}30`, backgroundColor: `${phaseColor}10` }}>
                                    {PHASE_CONFIG[workout.phase].label}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onFeedback}
                        className="glass-card w-9 h-9 flex items-center justify-center rounded-2xl text-text-muted hover:text-white transition-colors shrink-0"
                    >
                        <MessageSquare size={14} />
                    </button>
                </div>

                {/* ── Title + description ── */}
                <div>
                    <h2 className="text-xl font-black tracking-tight leading-tight mb-1.5">{workout.title}</h2>
                    <p className="text-text-muted text-sm leading-relaxed">{workout.description}</p>
                </div>

                {/* ── Key stats chips ── */}
                <div className="flex flex-wrap gap-2">
                    {workout.durationMinutes && (
                        <StatChip icon={Timer} value={fmtDur(workout.durationMinutes) ?? ''} />
                    )}
                    {workout.distanceKm && (
                        <StatChip icon={MapPin} value={`${workout.distanceKm} km`} />
                    )}
                    {workout.rpe && (
                        <StatChip icon={Activity} value={`RPE ${workout.rpe}/10`} />
                    )}
                    {paceStr && (
                        <StatChip icon={TrendingUp} value={paceStr} accent={workoutColor} />
                    )}
                </div>

                {/* ── HR Zone bar ── */}
                {zoneKey && (
                    <ZoneBar activeZone={zoneKey} hrRange={hrRange} paces={paces} />
                )}

                {/* ── Session structure ── */}
                {hasStructure && (
                    <div>
                        <button
                            onClick={() => setExpanded(e => !e)}
                            className="w-full flex items-center justify-between mb-2 group"
                        >
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                Programme de séance
                            </span>
                            <ChevronRight
                                size={13}
                                className={clsx('text-text-muted/50 transition-transform duration-200', expanded && 'rotate-90')}
                            />
                        </button>

                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.22 }}
                                    className="overflow-hidden"
                                >
                                    <div className="rounded-2xl overflow-hidden border border-white/[0.07]">
                                        {workout.warmup && (
                                            <SegmentRow segment={workout.warmup} segType="warmup" isFirst isLast={!intervalGroups.length && !workout.cooldown} />
                                        )}
                                        {intervalGroups.map((g, gi) => (
                                            <IntervalGroupRow key={gi} group={g} isFirst={!workout.warmup && gi === 0} isLast={!workout.cooldown && gi === intervalGroups.length - 1} />
                                        ))}
                                        {workout.cooldown && (
                                            <SegmentRow segment={workout.cooldown} segType="cooldown" isFirst={!workout.warmup && !intervalGroups.length} isLast />
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Notes ── */}
                {workout.notes && (
                    <div className="flex gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                        <StickyNote size={13} className="text-text-muted/60 shrink-0 mt-0.5" />
                        <p className="text-xs text-text-muted leading-relaxed">{workout.notes}</p>
                    </div>
                )}

                {/* ── CTA ── */}
                <button
                    onClick={onStart}
                    className="w-full py-4 text-white font-black text-sm rounded-full flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all"
                    style={{
                        background: `linear-gradient(135deg, ${workoutColor}bb, ${workoutColor})`,
                        boxShadow: `0 8px 28px ${workoutColor}44, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    }}
                >
                    <Play size={17} fill="currentColor" />
                    Lancer la séance
                </button>
            </div>
        </motion.div>
    );
}

// ─── Zone bar ─────────────────────────────────────────────────────────────────

function ZoneBar({ activeZone, hrRange, paces }: { activeZone: string; hrRange: any; paces?: any }) {
    const navigate = useNavigate();
    const zones = Object.entries(ZONE_CONFIG) as [keyof typeof ZONE_CONFIG, typeof ZONE_CONFIG[keyof typeof ZONE_CONFIG]][];
    return (
        <button
            onClick={() => navigate('/zones', { state: { paces } })}
            className="w-full text-left"
        >
        <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Zone d'intensité</span>
            <span className="text-primary/60 flex items-center gap-0.5 text-[8px]">Voir tout <ChevronRight size={9} /></span>
        </div>
            <div className="flex gap-1 mb-2">
                {zones.map(([key, cfg]) => {
                    const isActive = key === activeZone;
                    return (
                        <div
                            key={key}
                            className={clsx(
                                'flex-1 h-7 rounded-xl flex flex-col items-center justify-center gap-0 transition-all duration-300',
                                isActive ? 'opacity-100' : 'opacity-30'
                            )}
                            style={{
                                background: isActive ? cfg.color : `${cfg.color}30`,
                                boxShadow: isActive ? `0 0 12px ${cfg.color}60` : undefined,
                            }}
                        >
                            <span className={clsx('text-[8px] font-black leading-none', isActive ? 'text-white' : 'text-white/50')}>
                                {key.toUpperCase()}
                            </span>
                        </div>
                    );
                })}
            </div>
            {(hrRange || zoneCfg) && (
                <div className="flex items-center gap-2">
                    <Heart size={10} className="shrink-0" style={{ color: ZONE_CONFIG[activeZone as keyof typeof ZONE_CONFIG]?.color ?? '#5ab2ff' }} />
                    <span className="text-[10px] font-black" style={{ color: ZONE_CONFIG[activeZone as keyof typeof ZONE_CONFIG]?.color ?? '#5ab2ff' }}>
                        {ZONE_CONFIG[activeZone as keyof typeof ZONE_CONFIG]?.fullLabel}
                    </span>
                    {hrRange?.min && hrRange?.max && (
                        <span className="text-[10px] text-text-muted font-medium">
                            · {hrRange.min}–{hrRange.max} bpm
                        </span>
                    )}
                </div>
            )}
        </button>
    );
}

// ─── Segment row ──────────────────────────────────────────────────────────────

function SegmentRow({ segment, segType, isFirst, isLast }: {
    segment: any;
    segType: keyof typeof SEGMENT_STYLE;
    isFirst: boolean;
    isLast: boolean;
}) {
    const cfg = SEGMENT_STYLE[segType] ?? SEGMENT_STYLE.main;
    const Icon = cfg.icon;
    const durStr = fmtDur(segment.duration);
    const paceStr = fmtPaceRange(segment.pace);
    const hrRange = segment.targetHeartRate;

    return (
        <div className={clsx(
            'flex gap-3 px-4 py-3 bg-white/[0.025]',
            !isLast && 'border-b border-white/[0.06]'
        )}>
            {/* Left accent + icon */}
            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <div
                    className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}35` }}
                >
                    <Icon size={11} style={{ color: cfg.color }} />
                </div>
                {!isLast && <div className="w-px flex-1 min-h-[12px] bg-white/[0.06]" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                        {cfg.label}
                    </span>
                    {durStr && <span className="text-[10px] font-bold text-text-muted shrink-0">{durStr}</span>}
                </div>
                <p className="text-xs text-white/70 leading-snug">{segment.description}</p>
                {(paceStr || hrRange) && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {paceStr && (
                            <span className="text-[9px] font-bold text-text-muted/70 flex items-center gap-1">
                                <TrendingUp size={8} className="shrink-0" />{paceStr}
                            </span>
                        )}
                        {hrRange?.min && hrRange?.max && (
                            <span className="text-[9px] font-bold text-text-muted/70 flex items-center gap-1">
                                <Heart size={8} className="shrink-0" />{hrRange.min}–{hrRange.max} bpm
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Interval group row ───────────────────────────────────────────────────────

function IntervalGroupRow({ group, isFirst, isLast }: {
    group: ReturnType<typeof groupIntervals>[number];
    isFirst: boolean;
    isLast: boolean;
}) {
    if (group.type === 'single') {
        return <SegmentRow segment={group.segment} segType={group.segment.type as keyof typeof SEGMENT_STYLE} isFirst={isFirst} isLast={isLast} />;
    }

    const { count, interval, recovery } = group;
    const paceStr = fmtPaceRange(interval?.pace);
    const distStr = interval?.distance ? `${interval.distance} km` : fmtDur(interval?.duration);
    const recStr = fmtDur(recovery?.duration);
    const hrRange = interval?.targetHeartRate;

    return (
        <div className={clsx(
            'flex gap-3 px-4 py-3 bg-white/[0.025]',
            !isLast && 'border-b border-white/[0.06]'
        )}>
            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <div className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 bg-red-500/20 border border-red-500/35">
                    <Repeat2 size={11} className="text-red-400" />
                </div>
                {!isLast && <div className="w-px flex-1 min-h-[12px] bg-white/[0.06]" />}
            </div>
            <div className="flex-1 pb-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                        {count} × {distStr}
                    </span>
                </div>
                {interval?.description && (
                    <p className="text-xs text-white/70 leading-snug">{interval.description}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {paceStr && (
                        <span className="text-[9px] font-bold text-text-muted/70 flex items-center gap-1">
                            <TrendingUp size={8} />{paceStr}
                        </span>
                    )}
                    {hrRange?.min && hrRange?.max && (
                        <span className="text-[9px] font-bold text-text-muted/70 flex items-center gap-1">
                            <Heart size={8} />{hrRange.min}–{hrRange.max} bpm
                        </span>
                    )}
                    {recStr && (
                        <span className="text-[9px] font-bold text-green-400/70 flex items-center gap-1">
                            <Heart size={8} />Récup {recStr}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, value, accent }: { icon: React.ElementType; value: string; accent?: string }) {
    return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
            <Icon size={10} className="text-text-muted shrink-0" style={accent ? { color: accent } : undefined} />
            <span className="text-[10px] font-bold text-white/80">{value}</span>
        </div>
    );
}

// ─── Segment grouping helper ───────────────────────────────────────────────────

type IntervalGroup =
    | { type: 'intervals'; count: number; interval: any; recovery: any }
    | { type: 'single'; segment: any };

function groupIntervals(segments: any[]): IntervalGroup[] {
    const groups: IntervalGroup[] = [];
    let i = 0;
    while (i < segments.length) {
        const seg = segments[i];
        if (seg.type === 'interval') {
            let count = 0;
            let firstInterval: any = null;
            let firstRecovery: any = null;
            while (i < segments.length && (segments[i].type === 'interval' || segments[i].type === 'recovery')) {
                if (segments[i].type === 'interval') { count++; if (!firstInterval) firstInterval = segments[i]; }
                else if (!firstRecovery) { firstRecovery = segments[i]; }
                i++;
            }
            groups.push({ type: 'intervals', count, interval: firstInterval, recovery: firstRecovery });
        } else {
            groups.push({ type: 'single', segment: seg });
            i++;
        }
    }
    return groups;
}
