import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    format, addDays, isSameDay, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, eachDayOfInterval, addMonths,
    subMonths, isSameMonth, isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, ChevronLeft, ChevronRight, Flag, Plus, Loader2,
    MessageSquare, Calendar as CalendarIcon, Trash2, BarChart2,
    Zap, Timer, MapPin, Activity,
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

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ─── Component ────────────────────────────────────────────────────────────────

export function Training() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date());
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
                });
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

    // Build calendar day grid for the current month view
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = endOfMonth(calendarMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [calendarMonth]);

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

    // Active phases in the visible calendar month (for legend filtering)
    const phasesInMonth = new Set<string>();
    for (const day of calendarDays) {
        const key = day.toISOString().split('T')[0];
        const info = datePhaseMap[key];
        if (info) phasesInMonth.add(info.phase);
    }

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

                {/* ── Monthly Calendar ───────────────────────────────── */}
                <section>
                    {/* Calendar header */}
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-white">Calendrier du plan</h3>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCalendarMonth(m => subMonths(m, 1))}
                                className="w-8 h-8 flex items-center justify-center glass-card rounded-xl hover:bg-white/10 active:scale-95 transition-all"
                            >
                                <ChevronLeft size={14} className="text-text-muted" />
                            </button>
                            <motion.span
                                key={calendarMonth.toISOString()}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs font-black text-white min-w-[76px] text-center capitalize"
                            >
                                {format(calendarMonth, 'MMMM yyyy', { locale: fr })}
                            </motion.span>
                            <button
                                onClick={() => setCalendarMonth(m => addMonths(m, 1))}
                                className="w-8 h-8 flex items-center justify-center glass-card rounded-xl hover:bg-white/10 active:scale-95 transition-all"
                            >
                                <ChevronRight size={14} className="text-text-muted" />
                            </button>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="glass-card rounded-[28px] p-4"
                    >
                        {/* Day-of-week headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAY_HEADERS.map((d, i) => (
                                <div key={i} className="text-center text-[9px] font-black text-text-muted/50 uppercase tracking-widest py-1.5">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={calendarMonth.toISOString()}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.18 }}
                                className="grid grid-cols-7 gap-y-0.5"
                            >
                                {calendarDays.map((day, i) => {
                                    const key = day.toISOString().split('T')[0];
                                    const workout = workoutByDate[key];
                                    const phaseInfo = datePhaseMap[key];
                                    const isCurrentMonth = isSameMonth(day, calendarMonth);
                                    const isDayToday = isToday(day);
                                    const isSelected = isSameDay(day, selectedDate);
                                    const dayPhaseColor = phaseInfo ? (PHASE_CONFIG[phaseInfo.phase]?.color ?? '#5ab2ff') : null;
                                    const dotColor = workout ? (WORKOUT_COLORS[workout.type] ?? '#5ab2ff') : null;

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setSelectedDate(day);
                                                if (!isSameMonth(day, calendarMonth)) setCalendarMonth(day);
                                            }}
                                            className={clsx(
                                                'relative flex flex-col items-center justify-center h-10 rounded-xl transition-all duration-150',
                                                !isCurrentMonth && 'opacity-20 pointer-events-none',
                                                isSelected && 'ring-1 ring-white/40',
                                            )}
                                            style={{
                                                background: isSelected
                                                    ? (dayPhaseColor ? `${dayPhaseColor}28` : 'rgba(255,255,255,0.12)')
                                                    : isDayToday
                                                        ? 'rgba(90,178,255,0.12)'
                                                        : (dayPhaseColor && isCurrentMonth)
                                                            ? `${dayPhaseColor}07`
                                                            : undefined,
                                            }}
                                        >
                                            <span className={clsx(
                                                'text-[11px] font-bold leading-none',
                                                isSelected
                                                    ? 'text-white'
                                                    : isDayToday
                                                        ? 'text-primary'
                                                        : 'text-white/75'
                                            )}>
                                                {format(day, 'd')}
                                            </span>

                                            {/* Workout dot */}
                                            <div className="h-[7px] flex items-center justify-center mt-0.5">
                                                {dotColor ? (
                                                    <div
                                                        className="w-1.5 h-1.5 rounded-full"
                                                        style={{
                                                            background: dotColor,
                                                            boxShadow: isSelected ? `0 0 5px ${dotColor}` : undefined,
                                                        }}
                                                    />
                                                ) : phaseInfo && isCurrentMonth ? (
                                                    <div className="w-1 h-1 rounded-full bg-white/12" />
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>

                        {/* Phase legend — only phases visible in current month */}
                        {phasesInMonth.size > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/[0.07] flex flex-wrap gap-x-4 gap-y-1.5">
                                {Object.entries(PHASE_CONFIG)
                                    .filter(([phase]) => phasesInMonth.has(phase))
                                    .map(([phase, cfg]) => (
                                        <div key={phase} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wide">{cfg.label}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </motion.div>
                </section>

                {/* ── Selected day card ──────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {selectedWorkout ? (
                        <WorkoutCard
                            key={selectedWorkout.id}
                            workout={selectedWorkout}
                            date={selectedDate}
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

function WorkoutCard({
    workout,
    date,
    onFeedback,
    onStart,
}: {
    workout: any;
    date: Date;
    onFeedback: () => void;
    onStart: () => void;
}) {
    const workoutColor = WORKOUT_COLORS[workout.type] ?? '#5ab2ff';
    const phaseColor = PHASE_CONFIG[workout.phase]?.color ?? '#5ab2ff';
    const workoutLabel = WORKOUT_LABELS[workout.type] ?? workout.type;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-mission rounded-[28px] p-5 relative overflow-hidden"
        >
            {/* Workout type ambient tint */}
            <div
                className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[0.06]"
                style={{ background: `radial-gradient(ellipse at 90% 0%, ${workoutColor}, transparent 60%)` }}
            />

            <div className="relative">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="rf-tag mb-2">
                            {isToday(date) ? "Aujourd'hui" : format(date, 'EEEE d MMM', { locale: fr })}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: workoutColor }} />
                            <span
                                className="text-[10px] font-black uppercase tracking-widest"
                                style={{ color: workoutColor }}
                            >
                                {workoutLabel}
                            </span>
                            {workout.zone && (
                                <span className="text-[10px] font-bold text-text-muted/60 uppercase tracking-wide">
                                    · {workout.zone.toUpperCase()}
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

                <h2 className="text-xl font-black tracking-tight leading-tight mb-2">{workout.title}</h2>
                <p className="text-text-muted text-sm leading-relaxed mb-5">{workout.description}</p>

                {/* Stats row */}
                <div className="flex gap-5 mb-6">
                    {workout.durationMinutes && (
                        <StatPill icon={Timer} value={`${workout.durationMinutes}`} unit="min" />
                    )}
                    {workout.distanceKm && (
                        <StatPill icon={MapPin} value={`${workout.distanceKm}`} unit="km" />
                    )}
                    {workout.rpe && (
                        <StatPill icon={Activity} value={`${workout.rpe}`} unit="/ 10 RPE" />
                    )}
                </div>

                {/* Phase chip */}
                {workout.phase && PHASE_CONFIG[workout.phase] && (
                    <div className="flex items-center gap-1.5 mb-5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: phaseColor }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: phaseColor }}>
                            Phase {PHASE_CONFIG[workout.phase].label}
                        </span>
                    </div>
                )}

                {/* CTA */}
                <button
                    onClick={onStart}
                    className="w-full py-4 text-white font-black text-sm rounded-full flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all"
                    style={{
                        background: `linear-gradient(135deg, ${workoutColor}cc, ${workoutColor})`,
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

function StatPill({ icon: Icon, value, unit }: { icon: React.ElementType; value: string; unit: string }) {
    return (
        <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white leading-none">{value}</span>
                <span className="text-xs font-bold text-text-muted">{unit}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
                <Icon size={9} className="text-text-muted/50" />
            </div>
        </div>
    );
}
