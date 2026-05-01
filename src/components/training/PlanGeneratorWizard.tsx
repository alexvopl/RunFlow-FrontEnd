import { useState } from 'react';
import { isAxiosError } from 'axios';
import { ChevronLeft, Loader2, Calendar, Target, Activity, Zap, TrendingUp, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface PhaseConfig {
    color: string;
    bg: string;
    border: string;
    glow: string;
    label: string;
    desc: string;
    zoneHint: string;
}

const PHASE_CONFIGS: Record<string, PhaseConfig> = {
    base: {
        color: '#5ab2ff',
        bg: 'rgba(90,178,255,0.09)',
        border: 'rgba(90,178,255,0.22)',
        glow: 'rgba(90,178,255,0.35)',
        label: 'BASE',
        desc: 'Fondation aérobie — effort facile, régularité',
        zoneHint: 'Z1–Z2 · 90%',
    },
    build: {
        color: '#22d3ee',
        bg: 'rgba(34,211,238,0.09)',
        border: 'rgba(34,211,238,0.22)',
        glow: 'rgba(34,211,238,0.30)',
        label: 'BUILD',
        desc: 'Volume progressif — endurance et côtes',
        zoneHint: 'Volume ↑',
    },
    intensity: {
        color: '#f97316',
        bg: 'rgba(249,115,22,0.09)',
        border: 'rgba(249,115,22,0.22)',
        glow: 'rgba(249,115,22,0.35)',
        label: 'INTENSITÉ',
        desc: 'Seuil & VO2max — pic de charge',
        zoneHint: 'Z4–Z5 · 20%',
    },
    specificity: {
        color: '#fbbf24',
        bg: 'rgba(251,191,36,0.09)',
        border: 'rgba(251,191,36,0.22)',
        glow: 'rgba(251,191,36,0.30)',
        label: 'SPÉCIFICITÉ',
        desc: 'Simulation course — allure et terrain cibles',
        zoneHint: 'Allure cible',
    },
    taper: {
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.09)',
        border: 'rgba(34,197,94,0.22)',
        glow: 'rgba(34,197,94,0.30)',
        label: 'AFFÛTAGE',
        desc: 'Volume –40% — rester frais pour le jour J',
        zoneHint: 'Vol. –40%',
    },
};

function getPhaseConfig(name: string): PhaseConfig {
    return PHASE_CONFIGS[name] ?? PHASE_CONFIGS.base;
}

interface PlanGeneratorProps {
    onPlanGenerated: () => void;
}

type GoalId = '5k' | '10k' | 'half_marathon' | 'marathon';
type LevelId = 'beginner' | 'intermediate' | 'advanced';
type TimingMode = 'race_date' | 'duration';

interface ApiErrorPayload {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
}

const MIN_PLAN_WEEKS = 6;
const MAX_PLAN_WEEKS = 24;
const DEFAULT_PLAN_WEEKS = 12;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const GOALS = [
    { id: '5k',            label: '5 KM',      icon: Zap,      desc: 'Rapide & intense' },
    { id: '10k',           label: '10 KM',     icon: Target,   desc: 'Classique' },
    { id: 'half_marathon', label: 'Semi',      icon: Activity, desc: 'Endurance' },
    { id: 'marathon',      label: 'Marathon',  icon: Target,   desc: 'Le graal' },
] as const;

const LEVELS: { id: LevelId; label: string; desc: string }[] = [
    { id: 'beginner',     label: 'Débutant',     desc: 'Base progressive' },
    { id: 'intermediate', label: 'Intermédiaire', desc: 'Charge équilibrée' },
    { id: 'advanced',     label: 'Avancé',       desc: 'Plus dense' },
];

const WEEK_DAYS = [
    { id: 1, label: 'Lun' },
    { id: 2, label: 'Mar' },
    { id: 3, label: 'Mer' },
    { id: 4, label: 'Jeu' },
    { id: 5, label: 'Ven' },
    { id: 6, label: 'Sam' },
    { id: 0, label: 'Dim' },
];

const RACE_DISTANCES = [
    { id: '',              label: 'Aucune' },
    { id: '5k',            label: '5 KM' },
    { id: '10k',           label: '10 KM' },
    { id: 'half_marathon', label: 'Semi' },
    { id: 'marathon',      label: 'Marathon' },
] as const;

function optionalNumber(value: string) {
    if (value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function clampPlanWeeks(value: number) {
    return Math.min(MAX_PLAN_WEEKS, Math.max(MIN_PLAN_WEEKS, Math.round(value || MIN_PLAN_WEEKS)));
}

function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
}

function addWeeks(date: Date, weeks: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + weeks * 7);

    return next;
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return today;
}

function weeksUntilDate(targetDate: string) {
    const target = parseDateInput(targetDate);
    if (!target) return 0;

    return Math.ceil((target.getTime() - startOfToday().getTime()) / MS_PER_WEEK);
}

function extractApiError(error: unknown): ApiErrorPayload {
    if (!isAxiosError<ApiErrorPayload>(error)) {
        return {};
    }

    return error.response?.data ?? {};
}

function buildPlanErrorMessage(error: unknown) {
    const payload = extractApiError(error);
    const backendMessage = payload.message?.trim();
    const likelyAmbitiousPlan = payload.code === 'PREVIEW_ERROR' || payload.code === 'PLAN_GENERATION_ERROR';

    return {
        title: likelyAmbitiousPlan ? 'Objectif trop chaud.' : "Le moteur d'entraînement a calé.",
        body: likelyAmbitiousPlan
            ? "Le coach virtuel a sorti le carton prévention blessure. Avec ces paramètres, le plan demande une montée en charge un peu trop héroïque."
            : "Impossible de préparer un aperçu propre pour le moment.",
        hint: backendMessage
            ? backendMessage
            : 'Essaie une durée plus longue, une course plus courte, moins de séances, ou un volume actuel plus réaliste.',
    };
}

export function PlanGeneratorWizard({ onPlanGenerated }: PlanGeneratorProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        goal: 'half_marathon' as GoalId,
        level: 'intermediate' as LevelId,
        timingMode: 'race_date' as TimingMode,
        durationWeeks: DEFAULT_PLAN_WEEKS,
        sessionsPerWeek: 4,
        targetDate: formatDateInput(addWeeks(new Date(), DEFAULT_PLAN_WEEKS)),
        currentWeeklyKm: 30,
        recentRaceDistance: '' as '' | GoalId,
        raceHours: '',
        raceMinutes: '',
        raceSeconds: '',
        availableDays: [1, 2, 3, 4, 5] as number[],
        age: '',
        restingHR: '',
        maxHR: '',
        aerobicThresholdHR: '',
        lactateThresholdHR: '',
    });
    const [preview, setPreview] = useState<any>(null);
    const [previewError, setPreviewError] = useState<ReturnType<typeof buildPlanErrorMessage> | null>(null);
    const [submitError, setSubmitError] = useState<ReturnType<typeof buildPlanErrorMessage> | null>(null);

    const buildRecentRaceTime = () => {
        if (!formData.recentRaceDistance) return undefined;

        const hours = optionalNumber(formData.raceHours) ?? 0;
        const minutes = optionalNumber(formData.raceMinutes) ?? 0;
        const seconds = optionalNumber(formData.raceSeconds) ?? 0;
        const timeSeconds = hours * 3600 + minutes * 60 + seconds;

        if (timeSeconds <= 0) return undefined;
        return {
            distance: formData.recentRaceDistance,
            timeSeconds,
        };
    };

    const buildUserData = () => {
        const userData: Record<string, unknown> = {};
        const recentRaceTime = buildRecentRaceTime();
        const age = optionalNumber(formData.age);
        const restingHR = optionalNumber(formData.restingHR);
        const maxHR = optionalNumber(formData.maxHR);
        const aerobicThresholdHR = optionalNumber(formData.aerobicThresholdHR);
        const lactateThresholdHR = optionalNumber(formData.lactateThresholdHR);

        if (formData.currentWeeklyKm > 0) userData.currentWeeklyKm = formData.currentWeeklyKm;
        if (recentRaceTime) userData.recentRaceTime = recentRaceTime;
        if (formData.availableDays.length > 0) userData.availableDays = formData.availableDays;
        if (age !== undefined) userData.age = age;
        if (restingHR !== undefined) userData.restingHR = restingHR;
        if (maxHR !== undefined) userData.maxHR = maxHR;
        if (aerobicThresholdHR !== undefined) userData.aerobicThresholdHR = aerobicThresholdHR;
        if (lactateThresholdHR !== undefined) userData.lactateThresholdHR = lactateThresholdHR;

        return userData;
    };

    const syncFitnessProfile = async () => {
        const recentRaceTime = buildRecentRaceTime();
        const profile: Record<string, unknown> = { level: formData.level };
        const age = optionalNumber(formData.age);
        const restingHR = optionalNumber(formData.restingHR);
        const maxHR = optionalNumber(formData.maxHR);
        const aerobicThresholdHR = optionalNumber(formData.aerobicThresholdHR);
        const lactateThresholdHR = optionalNumber(formData.lactateThresholdHR);

        if (age !== undefined) profile.age = age;
        if (restingHR !== undefined) profile.restingHR = restingHR;
        if (maxHR !== undefined) profile.maxHR = maxHR;
        if (aerobicThresholdHR !== undefined) profile.aerobicThresholdHR = aerobicThresholdHR;
        if (lactateThresholdHR !== undefined) profile.lactateThresholdHR = lactateThresholdHR;
        // recentRace (not recentRaceTime) is the field name in UserFitnessProfile
        if (recentRaceTime) profile.recentRace = recentRaceTime;

        try { await api.put('/training/zones', profile); } catch { /* silent — non-blocking */ }
    };

    const resolveSchedule = () => {
        if (formData.timingMode === 'duration') {
            const durationWeeks = clampPlanWeeks(formData.durationWeeks);

            return {
                durationWeeks,
                targetDate: formatDateInput(addWeeks(startOfToday(), durationWeeks)),
            };
        }

        return {
            durationWeeks: clampPlanWeeks(weeksUntilDate(formData.targetDate)),
            targetDate: formData.targetDate,
        };
    };

    const getTimingError = () => {
        if (formData.timingMode === 'duration') {
            if (formData.durationWeeks < MIN_PLAN_WEEKS || formData.durationWeeks > MAX_PLAN_WEEKS) {
                return `Choisis une durée entre ${MIN_PLAN_WEEKS} et ${MAX_PLAN_WEEKS} semaines.`;
            }

            return null;
        }

        const targetDate = parseDateInput(formData.targetDate);
        if (!targetDate) return 'Choisis une date de course.';

        const weeks = weeksUntilDate(formData.targetDate);
        if (weeks < MIN_PLAN_WEEKS) {
            return `La date cible doit laisser au moins ${MIN_PLAN_WEEKS} semaines de préparation.`;
        }
        if (weeks > MAX_PLAN_WEEKS) {
            return `La date cible ne peut pas dépasser ${MAX_PLAN_WEEKS} semaines de préparation.`;
        }

        return null;
    };

    const schedule = resolveSchedule();
    const timingError = getTimingError();
    const canContinue = step !== 3 || !timingError;

    const buildTrainingPayload = () => ({
        goal: formData.goal,
        level: formData.level,
        durationWeeks: schedule.durationWeeks,
        sessionsPerWeek: formData.sessionsPerWeek,
        targetDate: schedule.targetDate,
        userData: buildUserData(),
    });

    const toggleAvailableDay = (day: number) => {
        setFormData(previous => ({
            ...previous,
            availableDays: previous.availableDays.includes(day)
                ? previous.availableDays.filter(value => value !== day)
                : [...previous.availableDays, day].sort((a, b) => a - b),
        }));
    };

    const fetchPreview = async () => {
        setLoading(true);
        setPreview(null);
        setPreviewError(null);
        setSubmitError(null);
        try {
            const res = await api.post('/training/preview', buildTrainingPayload());
            setPreview(res.data?.preview ?? res.data);
        } catch (error) {
            setPreviewError(buildPlanErrorMessage(error));
            console.error('Failed to fetch preview', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (!canContinue) return;
        if (step === 3) fetchPreview();
        setStep(s => s + 1);
    };
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        if (!preview || previewError) return;

        setLoading(true);
        setSubmitError(null);
        try {
            await api.post('/training/generate', buildTrainingPayload(), { timeout: 120000 });
            await syncFitnessProfile();
            onPlanGenerated();
        } catch (error) {
            setSubmitError(buildPlanErrorMessage(error));
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
                            {/* Niveau */}
                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                    Niveau d'entraînement
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {LEVELS.map(level => {
                                        const isSelected = formData.level === level.id;
                                        return (
                                            <button
                                                key={level.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, level: level.id })}
                                                className={`rounded-2xl px-3 py-3 text-left transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-white scale-[1.02]'
                                                        : 'glass-hero text-text-muted hover:text-white'
                                                }`}
                                                style={isSelected ? { boxShadow: '0 4px 16px rgba(90,178,255,0.35)' } : {}}
                                            >
                                                <div className="text-xs font-black">{level.label}</div>
                                                <div className={`text-[8px] font-bold mt-1 ${isSelected ? 'text-white/75' : 'text-text-muted'}`}>
                                                    {level.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Volume actuel */}
                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                    Volume hebdomadaire actuel
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        max="300"
                                        value={formData.currentWeeklyKm === 0 ? '' : formData.currentWeeklyKm}
                                        onChange={e => setFormData({ ...formData, currentWeeklyKm: e.target.value === '' ? 0 : Number(e.target.value) })}
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
                                    {[3, 4, 5, 6, 7].map(n => (
                                        <button
                                            key={n}
                                            type="button"
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

                            {/* Données cardio */}
                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1 block">
                                    Données cardio <span className="text-text-muted/40 normal-case tracking-normal">(optionnel)</span>
                                </label>
                                <p className="text-[9px] text-text-muted/60 mb-3 leading-relaxed">
                                    Plus tu fournis de données, plus les zones et allures sont précises.
                                </p>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    {[
                                        { key: 'age', label: 'Âge', min: 10, max: 100 },
                                        { key: 'restingHR', label: 'FC repos', min: 30, max: 100 },
                                        { key: 'maxHR', label: 'FC max', min: 120, max: 220 },
                                    ].map(field => (
                                        <div key={field.key}>
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">
                                                {field.label}
                                            </span>
                                            <input
                                                type="number"
                                                min={field.min}
                                                max={field.max}
                                                value={formData[field.key as 'age' | 'restingHR' | 'maxHR']}
                                                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                className="w-full glass-hero rounded-2xl px-3 py-3 text-sm font-black text-center focus:outline-none focus:border-primary/50 transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'aerobicThresholdHR', label: 'Seuil aérobie', hint: 'AeT bpm', min: 80, max: 210 },
                                        { key: 'lactateThresholdHR', label: 'Seuil lactique', hint: 'LT2 bpm', min: 80, max: 220 },
                                    ].map(field => (
                                        <div key={field.key}>
                                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1.5 block">
                                                {field.label}
                                                <span className="ml-1 text-[7px] font-bold text-primary/50 normal-case tracking-normal">avancé</span>
                                            </span>
                                            <input
                                                type="number"
                                                min={field.min}
                                                max={field.max}
                                                placeholder={field.hint}
                                                value={formData[field.key as 'aerobicThresholdHR' | 'lactateThresholdHR']}
                                                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                className="w-full glass-hero rounded-2xl px-3 py-3 text-sm font-black text-center placeholder:text-text-muted/30 focus:outline-none focus:border-primary/50 transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            /* ── Étape 3 : Cadre du plan ───────────────────── */
            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">Cadre du plan</h2>
                            <p className="text-text-muted text-sm">Course datée ou cycle d'entraînement.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                    Calendrier
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'race_date' as TimingMode, label: 'Course cible', desc: 'Date connue', icon: Calendar },
                                        { id: 'duration' as TimingMode, label: 'Durée libre', desc: 'Cycle simple', icon: Clock },
                                    ].map(option => {
                                        const isSelected = formData.timingMode === option.id;
                                        const Icon = option.icon;

                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, timingMode: option.id })}
                                                className={`rounded-2xl px-3 py-3 text-left transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-white scale-[1.02]'
                                                        : 'glass-hero text-text-muted hover:text-white'
                                                }`}
                                                style={isSelected ? { boxShadow: '0 4px 16px rgba(90,178,255,0.35)' } : {}}
                                            >
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Icon size={15} />
                                                    <span className="text-xs font-black leading-tight">{option.label}</span>
                                                </div>
                                                <div className={`text-[8px] font-bold ${isSelected ? 'text-white/75' : 'text-text-muted'}`}>
                                                    {option.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {formData.timingMode === 'race_date' ? (
                                <div className="glass-card rounded-[22px] p-5">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">
                                            Date de course
                                        </label>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                            {schedule.durationWeeks} sem.
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                        <input
                                            type="date"
                                            min={formatDateInput(addWeeks(startOfToday(), MIN_PLAN_WEEKS))}
                                            max={formatDateInput(addWeeks(startOfToday(), MAX_PLAN_WEEKS))}
                                            value={formData.targetDate}
                                            onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                                            className="w-full glass-hero rounded-2xl py-3 pl-10 pr-3 text-sm font-black focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <p className="text-[9px] text-text-muted font-bold mt-3">
                                        Préparation calculée automatiquement entre {MIN_PLAN_WEEKS} et {MAX_PLAN_WEEKS} semaines.
                                    </p>
                                    {timingError && <p className="text-[10px] text-danger font-bold mt-3">{timingError}</p>}
                                </div>
                            ) : (
                                <div className="glass-card rounded-[22px] p-5">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">
                                            Durée du plan
                                        </label>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                            Fin {new Date(`${schedule.targetDate}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock size={18} className="text-primary shrink-0" />
                                        <input
                                            type="number"
                                            min={MIN_PLAN_WEEKS}
                                            max={MAX_PLAN_WEEKS}
                                            value={formData.durationWeeks === 0 ? '' : formData.durationWeeks}
                                            onChange={e => setFormData({ ...formData, durationWeeks: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            className="w-24 glass-hero rounded-2xl py-3 px-3 text-lg font-black text-center focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                        <input
                                            type="range"
                                            min={MIN_PLAN_WEEKS}
                                            max={MAX_PLAN_WEEKS}
                                            value={clampPlanWeeks(formData.durationWeeks)}
                                            onChange={e => setFormData({ ...formData, durationWeeks: Number(e.target.value) })}
                                            className="min-w-0 flex-1 accent-primary"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-4">
                                        {[8, 12, 16, 20].map(weeks => (
                                            <button
                                                key={weeks}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, durationWeeks: weeks })}
                                                className={`py-2.5 rounded-2xl text-[10px] font-black transition-all ${
                                                    formData.durationWeeks === weeks
                                                        ? 'bg-primary text-white'
                                                        : 'glass-hero text-text-muted hover:text-white'
                                                }`}
                                            >
                                                {weeks} sem.
                                            </button>
                                        ))}
                                    </div>
                                    {timingError && <p className="text-[10px] text-danger font-bold mt-3">{timingError}</p>}
                                </div>
                            )}

                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                    Performance récente <span className="text-text-muted/40 normal-case tracking-normal">(optionnel)</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    <select
                                        value={formData.recentRaceDistance}
                                        onChange={e => setFormData({
                                            ...formData,
                                            recentRaceDistance: e.target.value as '' | GoalId,
                                            raceHours: e.target.value === '' ? '' : formData.raceHours,
                                            raceMinutes: e.target.value === '' ? '' : formData.raceMinutes,
                                            raceSeconds: e.target.value === '' ? '' : formData.raceSeconds,
                                        })}
                                        className="col-span-4 glass-hero rounded-2xl px-3 py-3 text-sm font-black focus:outline-none focus:border-primary/50 transition-all"
                                    >
                                        {RACE_DISTANCES.map(distance => (
                                            <option key={distance.id} value={distance.id}>{distance.label}</option>
                                        ))}
                                    </select>
                                    {[
                                        { key: 'raceHours', label: 'h' },
                                        { key: 'raceMinutes', label: 'min' },
                                        { key: 'raceSeconds', label: 's' },
                                    ].map(field => (
                                        <input
                                            key={field.key}
                                            type="number"
                                            min="0"
                                            max={field.key === 'raceHours' ? '12' : '59'}
                                            placeholder={field.label}
                                            value={formData[field.key as 'raceHours' | 'raceMinutes' | 'raceSeconds']}
                                            disabled={!formData.recentRaceDistance}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                            className="glass-hero rounded-2xl px-3 py-3 text-sm font-black text-center placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-all disabled:opacity-40"
                                        />
                                    ))}
                                    <div className="glass-hero rounded-2xl px-3 py-3 text-sm font-black text-center text-text-muted">
                                        temps
                                    </div>
                                </div>
                                <p className="text-[9px] text-text-muted font-bold mt-3 leading-relaxed">
                                    Si renseignée, cette performance sert à calculer les allures. Le niveau reste utilisé pour structurer la charge.
                                </p>
                            </div>

                            <div className="glass-card rounded-[22px] p-5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">
                                    Jours préférés <span className="text-text-muted/40 normal-case tracking-normal">(optionnel)</span>
                                </label>
                                <div className="grid grid-cols-7 gap-1.5">
                                    {WEEK_DAYS.map(day => {
                                        const isSelected = formData.availableDays.includes(day.id);
                                        return (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => toggleAvailableDay(day.id)}
                                                className={`py-3 rounded-2xl text-[10px] font-black transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-white'
                                                        : 'glass-hero text-text-muted hover:text-white'
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            /* ── Étape 4 : Aperçu ───────────────────────────── */
            case 4: {
                const weeklyData: { week: number; km: number; phase: string; isRecovery: boolean }[] = preview?.weeklyData ?? [];
                const maxKm = weeklyData.length > 0 ? Math.max(...weeklyData.map((w: any) => w.km)) : 0;
                const startKm = preview?.startingWeeklyKm ?? formData.currentWeeklyKm;

                // Group consecutive weeks by phase for background bands
                const phaseGroups: { phase: string; weeks: typeof weeklyData }[] = [];
                weeklyData.forEach((w: any) => {
                    const last = phaseGroups[phaseGroups.length - 1];
                    if (last && last.phase === w.phase) last.weeks.push(w);
                    else phaseGroups.push({ phase: w.phase, weeks: [w] });
                });

                return (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-0.5">Ton plan</h2>
                            <p className="text-text-muted text-xs font-medium">Périodisation personnalisée · {preview?.totalWeeks ?? '—'} semaines</p>
                        </div>

                        {loading ? (
                            <div className="glass-card rounded-[22px] p-10 flex flex-col items-center gap-4">
                                <Loader2 className="animate-spin text-primary" size={36} />
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest animate-pulse">
                                    Génération…
                                </p>
                            </div>
                        ) : preview ? (
                            <div className="space-y-3">
                                {submitError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-[22px] p-5 border border-amber-400/20 bg-amber-400/10"
                                    >
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-2">
                                            Ajustement nécessaire
                                        </p>
                                        <h3 className="text-lg font-black text-white mb-1">{submitError.title}</h3>
                                        <p className="text-sm font-bold text-text-muted leading-relaxed">{submitError.body}</p>
                                        <p className="text-xs font-bold text-amber-200/80 leading-relaxed mt-3">{submitError.hint}</p>
                                    </motion.div>
                                )}

                                {/* ── Stats ─── */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="glass-hero rounded-[22px] p-4 flex items-center justify-between"
                                >
                                    {[
                                        { label: 'Durée', value: `${preview.totalWeeks}`, unit: 'sem.', color: '#5ab2ff' },
                                        { label: 'Pic volume', value: `${Math.round(preview.estimatedPeakWeeklyKm ?? 0)}`, unit: 'km/sem', color: '#f97316' },
                                        { label: 'Départ', value: `${Math.round(startKm)}`, unit: 'km/sem', color: '#94a3b8' },
                                    ].map(({ label, value, unit, color }, idx) => (
                                        <div key={idx} className="text-center flex-1">
                                            <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: `${color}99` }}>{label}</div>
                                            <div className="text-2xl font-black leading-none" style={{ color }}>{value}</div>
                                            <div className="text-[8px] font-bold text-text-muted mt-0.5">{unit}</div>
                                        </div>
                                    ))}
                                </motion.div>

                                {/* ── Graphe volume km/semaine ─── */}
                                {weeklyData.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1, duration: 0.3 }}
                                        className="glass-card rounded-[20px] p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp size={11} className="text-primary" />
                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Volume km / semaine</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-bold text-text-muted">{Math.round(startKm)}</span>
                                                <div className="w-8 h-px bg-text-muted/20" />
                                                <span className="text-[8px] font-black" style={{ color: '#f97316' }}>{Math.round(maxKm)} km</span>
                                            </div>
                                        </div>

                                        {/* Barres groupées par phase */}
                                        <div className="flex items-end gap-px h-20 rounded-lg overflow-hidden">
                                            {phaseGroups.map((group, gi) => {
                                                const cfg = getPhaseConfig(group.phase);
                                                return (
                                                    <div
                                                        key={gi}
                                                        className="flex items-end gap-px h-full relative"
                                                        style={{ flex: group.weeks.length, background: `${cfg.color}08` }}
                                                    >
                                                        {group.weeks.map((w: any, wi: number) => (
                                                            <div
                                                                key={wi}
                                                                className="flex-1 rounded-t-sm transition-all"
                                                                style={{
                                                                    height: `${maxKm > 0 ? (w.km / maxKm) * 100 : 0}%`,
                                                                    background: cfg.color,
                                                                    opacity: w.isRecovery ? 0.28 : 0.75,
                                                                    minWidth: 2,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Phase legend sous le graphe */}
                                        <div className="flex mt-2.5 gap-px">
                                            {phaseGroups.map((group, gi) => {
                                                const cfg = getPhaseConfig(group.phase);
                                                return (
                                                    <div
                                                        key={gi}
                                                        className="flex items-center justify-center gap-1 overflow-hidden"
                                                        style={{ flex: group.weeks.length }}
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                                                        <span className="text-[7px] font-black uppercase truncate" style={{ color: cfg.color }}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── Phase cards ─── */}
                                {preview.phases && preview.phases.length > 0 && (
                                    <div className="space-y-2">
                                        {preview.phases.map((phase: any, i: number) => {
                                            const cfg = getPhaseConfig(phase.name);
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -6 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.18 + i * 0.06, duration: 0.25 }}
                                                    className="rounded-[16px] pl-4 pr-3 py-3 relative overflow-hidden flex items-center gap-3"
                                                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                                                >
                                                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: cfg.color }} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                                                                {cfg.label}
                                                            </span>
                                                            <span className="text-sm font-black text-white">
                                                                {phase.weeks}<span className="text-[9px] text-text-muted font-bold ml-0.5">sem</span>
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-text-muted font-medium mt-0.5 truncate">{cfg.desc}</p>
                                                    </div>
                                                    <div
                                                        className="shrink-0 px-2 py-1 rounded-full text-[8px] font-black"
                                                        style={{ background: `${cfg.color}15`, color: cfg.color }}
                                                    >
                                                        {cfg.zoneHint}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-[28px] p-6 border border-amber-400/20 bg-amber-400/10 text-left"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-300/20 flex items-center justify-center mb-5">
                                    <Activity size={24} className="text-amber-300" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-2">
                                    Risque blessure détecté
                                </p>
                                <h3 className="text-xl font-black text-white tracking-tight mb-2">
                                    {previewError?.title ?? 'Objectif trop chaud.'}
                                </h3>
                                <p className="text-sm font-bold text-text-muted leading-relaxed">
                                    {previewError?.body ?? "Le coach virtuel a sorti le carton prévention blessure. Avec ces paramètres, le plan demande une montée en charge un peu trop héroïque."}
                                </p>
                                <p className="text-xs font-bold text-amber-200/80 leading-relaxed mt-4">
                                    {previewError?.hint ?? 'Allonge la durée, baisse la distance cible ou pars d’un volume hebdo plus proche de ta réalité.'}
                                </p>
                                <div className="grid grid-cols-3 gap-2 mt-5">
                                    {[
                                        {
                                            label: '+ semaines',
                                            action: () => {
                                                setFormData({ ...formData, timingMode: 'duration', durationWeeks: Math.min(MAX_PLAN_WEEKS, schedule.durationWeeks + 4) });
                                                setStep(3);
                                            },
                                        },
                                        {
                                            label: 'moins loin',
                                            action: () => {
                                                setFormData({ ...formData, goal: formData.goal === 'marathon' ? 'half_marathon' : formData.goal === 'half_marathon' ? '10k' : '5k' });
                                                setStep(1);
                                            },
                                        },
                                        { label: 'volume réel', action: () => setStep(2) },
                                    ].map(action => (
                                        <button
                                            key={action.label}
                                            type="button"
                                            onClick={action.action}
                                            className="rounded-2xl bg-white/6 border border-white/10 px-2 py-3 text-[10px] font-black text-white hover:bg-white/10 transition-colors"
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                );
            }
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
                        disabled={!canContinue}
                        className="btn-primary flex-1 h-14 text-sm font-black disabled:opacity-50 disabled:active:scale-100"
                    >
                        Continuer
                    </button>
                ) : (
                    preview ? (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="btn-primary flex-1 h-14 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            {loading ? 'Génération en cours…' : 'Valider ce plan'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setStep(3)}
                            disabled={loading}
                            className="btn-primary flex-1 h-14 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            Modifier les réglages
                        </button>
                    )
                )}
            </div>
        </div>
    );
}
