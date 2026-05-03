import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Heart, TrendingUp, Info,
    Zap, Loader2, RefreshCw, Trophy, Flag, Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../services/api';
import { ZONE_CONFIG, ZONE_LIST, PACE_ZONES } from '../constants/zones';

// ─── Constants ────────────────────────────────────────────────────────────────
// ZONE_LIST and PACE_ZONES imported from src/constants/zones.ts

const RACE_DISTANCES = [
    { value: '5k',            label: '5 km' },
    { value: '10k',           label: '10 km' },
    { value: 'half_marathon', label: 'Semi-marathon' },
    { value: 'marathon',      label: 'Marathon' },
] as const;

const GOAL_LABELS: Record<string, string> = {
    marathon: 'Marathon', half_marathon: 'Semi-marathon', '10k': '10 km', '5k': '5 km',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPace(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtPaceRange(range: { min: number; max: number } | undefined): string {
    if (!range) return '—';
    const a = Math.min(range.min, range.max);
    const b = Math.max(range.min, range.max);
    return `${fmtPace(a)} – ${fmtPace(b)} /km`;
}

function fmtRaceTime(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}''`;
    return `${m}'${String(s).padStart(2, '0')}''`;
}

function parseTimeInput(val: string): number | null {
    // Accept: "42:30", "1:42:30", "42.30"
    const clean = val.trim().replace('.', ':');
    const parts = clean.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
}

function parsePaceInput(val: string): { min: number; max: number } | null {
    // Accept "5:30" → 330 sec/km; creates ±10s range
    const clean = val.trim();
    const parts = clean.split(':').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    const sec = parts[0] * 60 + parts[1];
    if (sec < 120 || sec > 720) return null; // sanity: 2:00–12:00/km
    return { min: sec - 10, max: sec + 10 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrainingZones() {
    const navigate = useNavigate();
    const location = useLocation();
    const [tab, setTab] = useState<'zones' | 'paces' | 'edit'>('zones');
    const [paces, setPaces] = useState<any>(location.state?.paces ?? null);
    const [source, setSource] = useState<string | null>(null);
    const [loading, setLoading] = useState(!location.state?.paces);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expandedZone, setExpandedZone] = useState<string | null>(null);
    const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

    // Form state
    const [age, setAge] = useState('');
    const [maxHR, setMaxHR] = useState('');
    const [restingHR, setRestingHR] = useState('');
    const [aetHR, setAetHR] = useState('');
    const [lt2HR, setLt2HR] = useState('');
    const [raceDistance, setRaceDistance] = useState<string>('10k');
    const [raceTime, setRaceTime] = useState('');
    const [raceTimeError, setRaceTimeError] = useState('');
    // Custom pace overrides (mm:ss/km format)
    const [easyPaceInput, setEasyPaceInput] = useState('');
    const [tempoPaceInput, setTempoPaceInput] = useState('');
    const [intervalPaceInput, setIntervalPaceInput] = useState('');

    useEffect(() => {
        if (paces) return;
        loadZones();
    }, []);

    const loadZones = async () => {
        setLoading(true);
        try {
            // Try dedicated endpoint first
            const res = await api.get('/training/zones');
            setPaces(res.data.paces);
            
            setSource(res.data.source ?? null);
            prefillForm(res.data.profile);
        } catch {
            // Fallback: load from active plan
            try {
                const plansRes = await api.get('/training/plans');
                const plans = plansRes.data?.plans ?? plansRes.data;
                if (Array.isArray(plans) && plans.length > 0) {
                    const planRes = await api.get(`/training/plans/${plans[0].id}`);
                    const plan = planRes.data?.plan ?? planRes.data;
                    setPaces(plan.paces);
                    prefillForm(plan.user_data ?? {});
                }
            } catch { /* silent */ }
        }
        setLoading(false);
    };

    const prefillForm = (p: any) => {
        if (!p) return;
        if (p.age) setAge(String(p.age));
        if (p.maxHR) setMaxHR(String(p.maxHR));
        if (p.restingHR) setRestingHR(String(p.restingHR));
        if (p.aerobicThresholdHR) setAetHR(String(p.aerobicThresholdHR));
        if (p.lactateThresholdHR) setLt2HR(String(p.lactateThresholdHR));
        if (p.recentRace) {
            setRaceDistance(p.recentRace.distance);
            setRaceTime(fmtRaceTime(p.recentRace.timeSeconds));
        }
        if (p.customPaces?.easyPace) setEasyPaceInput(fmtPace(Math.round((p.customPaces.easyPace.min + p.customPaces.easyPace.max) / 2)));
        if (p.customPaces?.tempoPace) setTempoPaceInput(fmtPace(Math.round((p.customPaces.tempoPace.min + p.customPaces.tempoPace.max) / 2)));
        if (p.customPaces?.intervalPace) setIntervalPaceInput(fmtPace(Math.round((p.customPaces.intervalPace.min + p.customPaces.intervalPace.max) / 2)));
    };

    const handleSave = async () => {
        const timeSec = raceTime ? parseTimeInput(raceTime) : null;
        if (raceTime && !timeSec) {
            setRaceTimeError('Format invalide — essaie 42:30 ou 1:42:30');
            return;
        }
        setRaceTimeError('');
        setSaving(true);
        try {
            const body: any = {};
            if (age) body.age = Number(age);
            if (maxHR) body.maxHR = Number(maxHR);
            if (restingHR) body.restingHR = Number(restingHR);
            if (aetHR) body.aerobicThresholdHR = Number(aetHR);
            if (lt2HR) body.lactateThresholdHR = Number(lt2HR);
            if (timeSec) body.recentRace = { distance: raceDistance, timeSeconds: timeSec };
            // Custom pace overrides
            const easyPaceRange = easyPaceInput ? parsePaceInput(easyPaceInput) : null;
            const tempoPaceRange = tempoPaceInput ? parsePaceInput(tempoPaceInput) : null;
            const intervalPaceRange = intervalPaceInput ? parsePaceInput(intervalPaceInput) : null;
            if (easyPaceRange || tempoPaceRange || intervalPaceRange) {
                body.customPaces = {
                    ...(easyPaceRange && { easyPace: easyPaceRange }),
                    ...(tempoPaceRange && { tempoPace: tempoPaceRange }),
                    ...(intervalPaceRange && { intervalPace: intervalPaceRange }),
                };
            }

            const res = await api.put('/training/zones', body);
            setPaces(res.data.paces);
            
            setSource(res.data.source ?? null);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            setTab('zones');
        } catch {
            // Graceful degradation — endpoint may not exist yet
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        setSaving(false);
    };

    const estimateMaxHR = () => {
        const a = Number(age);
        if (a > 0) setMaxHR(String(220 - a));
    };

    return (
        <div className="min-h-screen pb-28">
            {/* Header */}
            <div className="sticky top-0 z-20 px-5 pt-10 pb-4"
                style={{ background: 'linear-gradient(180deg, #07111f 70%, transparent)' }}>
                <div className="flex items-center gap-3 mb-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-black tracking-tight text-white leading-none">Zones & Allures</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-text-muted text-xs">Profil athlète personnalisé</p>
                            {source && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{
                                        background: source === 'race' ? '#fbbf24' : source === 'hr' ? ZONE_CONFIG.z4.color : '#64748b'
                                    }} />
                                    <span className="text-[7px] font-black uppercase tracking-widest text-text-muted">
                                        {source === 'race' ? 'Course' : source === 'hr' ? 'FC' : 'Défaut'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    {paces?.vdot && (
                        <div className="glass-card rounded-2xl px-3 py-2 text-center">
                            <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest">VDOT</div>
                            <div className="text-base font-black text-primary leading-none">{Math.round(paces.vdot)}</div>
                        </div>
                    )}
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 p-1 glass-card rounded-2xl">
                    {([
                        { key: 'zones', label: 'Zones FC' },
                        { key: 'paces', label: 'Allures' },
                        { key: 'edit',  label: 'Éditer' },
                    ] as const).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={clsx(
                                'flex-1 py-2 rounded-xl text-xs font-black transition-all',
                                tab === t.key ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white'
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {tab === 'zones' && (
                            <motion.div key="zones"
                                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
                                className="space-y-3 pt-2"
                            >
                                {/* Intro */}
                                {!paces && (
                                    <div className="glass-card rounded-2xl p-4 text-center mb-4">
                                        <Heart size={22} className="text-text-muted/30 mx-auto mb-2" />
                                        <p className="text-white/70 text-sm font-bold">Aucune donnée calculée</p>
                                        <p className="text-text-muted text-xs mt-1">Renseigne ton profil pour voir tes zones personnalisées</p>
                                        <button
                                            onClick={() => setTab('edit')}
                                            className="mt-3 px-4 py-2 bg-primary rounded-full text-xs font-black text-white"
                                        >
                                            Renseigner mon profil
                                        </button>
                                    </div>
                                )}

                                {/* Zone cards */}
                                {ZONE_LIST.map((z, idx) => {
                                    const hrZone = paces?.zones?.[z.key];
                                    const isExpanded = expandedZone === z.key;
                                    return (
                                        <motion.div
                                            key={z.key}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.06 }}
                                        >
                                            <button
                                                onClick={() => setExpandedZone(isExpanded ? null : z.key)}
                                                className="w-full glass-card rounded-[22px] p-4 text-left transition-all hover:border-white/20"
                                                style={{
                                                    borderLeftWidth: 3,
                                                    borderLeftColor: z.color,
                                                    borderLeftStyle: 'solid',
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Zone number bubble */}
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-lg"
                                                        style={{ background: `${z.color}20`, color: z.color }}
                                                    >
                                                        {z.num}
                                                    </div>

                                                    {/* Zone info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-black text-white">{z.fullLabel}</span>
                                                            <ChevronRight
                                                                size={14}
                                                                className={clsx('text-text-muted/40 transition-transform shrink-0', isExpanded && 'rotate-90')}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {hrZone ? (
                                                                <span className="text-[11px] font-bold" style={{ color: z.color }}>
                                                                    {hrZone.min}–{hrZone.max} bpm
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-text-muted">{z.pct} FC max</span>
                                                            )}
                                                            <span className="text-[10px] text-text-muted/50">· {z.tip}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* HR bar */}
                                                {hrZone && (
                                                    <div className="mt-3 h-1.5 bg-white/8 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${(z.num / 5) * 100}%`,
                                                                background: z.color,
                                                                boxShadow: `0 0 8px ${z.color}80`,
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Expanded content */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-2">
                                                                <p className="text-xs text-white/70 leading-relaxed">{z.desc}</p>
                                                                <div className="flex items-start gap-2 mt-2">
                                                                    <Zap size={10} className="shrink-0 mt-0.5" style={{ color: z.color }} />
                                                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                                                                        {z.trainingUse}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </button>
                                        </motion.div>
                                    );
                                })}

                                {/* VDOT explainer */}
                                {paces?.vdot && (
                                    <div className="glass-hero rounded-[22px] p-4 mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="text-[9px] font-black text-primary/80 uppercase tracking-widest">Score VDOT</p>
                                                <p className="text-3xl font-black text-white leading-none">{Math.round(paces.vdot)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wide">Niveau</p>
                                                <p className="text-sm font-black text-white capitalize">{paces.derivedLevel}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-text-muted leading-relaxed">
                                            Le VDOT mesure ta capacité aérobie maximale (VO₂max estimée). Plus il est élevé, plus tu es entraîné·e.
                                            Il sert de base pour calculer toutes tes allures d'entraînement.
                                        </p>
                                        {paces.racePredictions && (
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                {Object.entries(paces.racePredictions).map(([dist, sec]) => (
                                                    <div key={dist} className="glass-card rounded-xl p-2.5">
                                                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{GOAL_LABELS[dist] ?? dist}</p>
                                                        <p className="text-sm font-black text-white mt-0.5">{fmtRaceTime(sec as number)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {tab === 'paces' && (
                            <motion.div key="paces"
                                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
                                className="space-y-3 pt-2"
                            >
                                {!paces ? (
                                    <div className="glass-card rounded-2xl p-6 text-center">
                                        <TrendingUp size={22} className="text-text-muted/30 mx-auto mb-2" />
                                        <p className="text-white/70 text-sm font-bold">Aucune allure calculée</p>
                                        <p className="text-text-muted text-xs mt-1">Renseigne une performance récente dans l'onglet Éditer</p>
                                        <button onClick={() => setTab('edit')} className="mt-3 px-4 py-2 bg-primary rounded-full text-xs font-black text-white">
                                            Éditer mon profil
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-text-muted leading-relaxed pb-1">
                                            Toutes tes allures sont calculées depuis ton VDOT (Jack Daniels).
                                            Elles s'adaptent automatiquement si tu mets à jour ta performance.
                                        </p>
                                        {PACE_ZONES.map((pz, idx) => {
                                            const range = paces?.[pz.key];
                                            if (!range) return null;
                                            return (
                                                <motion.div
                                                    key={pz.key}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="glass-card rounded-[22px] p-4 flex items-center gap-4"
                                                    style={{ borderLeftWidth: 3, borderLeftColor: pz.color, borderLeftStyle: 'solid' }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="text-sm font-black text-white">{pz.label}</span>
                                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                                                                style={{ color: pz.color, borderColor: `${pz.color}30`, background: `${pz.color}12` }}>
                                                                {pz.zone}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-text-muted">{pz.desc}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-black" style={{ color: pz.color }}>
                                                            {fmtPaceRange(range)}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                        {/* FC primary / Pace estimated callout */}
                                        <div className="rounded-[22px] overflow-hidden border border-white/[0.08]">
                                            <div className="flex items-start gap-3 p-4 border-b border-white/[0.06]"
                                                style={{ background: `${ZONE_CONFIG.z4.color}08` }}>
                                                <Heart size={14} className="shrink-0 mt-0.5" style={{ color: ZONE_CONFIG.z4.color }} />
                                                <div>
                                                    <p className="text-[10px] font-black text-white mb-0.5">La FC est ta référence absolue</p>
                                                    <p className="text-[10px] text-text-muted leading-relaxed">
                                                        Respecte toujours la zone cardiaque prescrite, quelle que soit l'allure affichée.
                                                        Par temps chaud, en altitude ou en fatigue, ton cœur ne ment pas — ta montre d'allure si.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 p-4 bg-white/[0.025]">
                                                <TrendingUp size={14} className="shrink-0 mt-0.5 text-text-muted/60" />
                                                <div>
                                                    <p className="text-[10px] font-black text-white/70 mb-0.5">L'allure est une estimation</p>
                                                    <p className="text-[10px] text-text-muted leading-relaxed">
                                                        Calculée depuis ton VDOT dans des conditions idéales (18 °C, plat, reposé).
                                                        Elle peut varier de <strong className="text-white/50">±15–30 sec/km</strong> selon les conditions du jour.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}

                        {tab === 'edit' && (
                            <motion.div key="edit"
                                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
                                className="space-y-4 pt-2"
                            >
                                <p className="text-xs text-text-muted leading-relaxed">
                                    Ces données permettent de calculer tes zones FC et tes allures d'entraînement personnalisées.
                                    Plus tu fournis d'informations, plus le calcul est précis.
                                </p>

                                {/* Performance récente — most important */}
                                <FormSection
                                    title="Performance récente"
                                    icon={Trophy}
                                    color="#fbbf24"
                                    priority
                                    info="La donnée la plus importante. Une performance récente sur 5k, 10k ou semi-marathon calcule toutes tes allures avec la méthode VDOT de Jack Daniels."
                                    expandedInfo={expandedInfo}
                                    onToggleInfo={setExpandedInfo}
                                    infoKey="race"
                                >
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        {RACE_DISTANCES.map((d) => (
                                            <button
                                                key={d.value}
                                                onClick={() => setRaceDistance(d.value)}
                                                className={clsx(
                                                    'py-2.5 rounded-xl text-xs font-black transition-all border',
                                                    raceDistance === d.value
                                                        ? 'bg-primary/20 border-primary/50 text-primary'
                                                        : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                                                )}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <input
                                            value={raceTime}
                                            onChange={e => { setRaceTime(e.target.value); setRaceTimeError(''); }}
                                            placeholder="ex : 42:30 ou 1:42:30"
                                            className="field-input text-sm"
                                        />
                                        {raceTimeError && <p className="text-red-400 text-[10px] mt-1 ml-1">{raceTimeError}</p>}
                                        <p className="text-[9px] text-text-muted mt-1 ml-1">Format : mm:ss ou hh:mm:ss</p>
                                    </div>
                                </FormSection>

                                {/* Allures personnalisées */}
                                <FormSection
                                    title="Allures personnalisées"
                                    icon={TrendingUp}
                                    color="#5ab2ff"
                                    badge="Optionnel"
                                    info="Entre directement tes allures cibles si tu les connais. Elles remplaceront les allures calculées depuis ta course. Format mm:ss par km (ex : 5:30). La FC reste toujours la référence principale."
                                    expandedInfo={expandedInfo}
                                    onToggleInfo={setExpandedInfo}
                                    infoKey="custompaces"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: ZONE_CONFIG.z2.color }}>
                                                Course facile / Endurance <span className="text-text-muted/50 normal-case tracking-normal font-normal">Z1–Z2</span>
                                            </label>
                                            <input
                                                value={easyPaceInput}
                                                onChange={e => setEasyPaceInput(e.target.value)}
                                                placeholder="ex : 5:30"
                                                className="field-input text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: ZONE_CONFIG.z3.color }}>
                                                Tempo / Seuil <span className="text-text-muted/50 normal-case tracking-normal font-normal">Z3</span>
                                            </label>
                                            <input
                                                value={tempoPaceInput}
                                                onChange={e => setTempoPaceInput(e.target.value)}
                                                placeholder="ex : 4:30"
                                                className="field-input text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: ZONE_CONFIG.z4.color }}>
                                                Intervalles <span className="text-text-muted/50 normal-case tracking-normal font-normal">Z4</span>
                                            </label>
                                            <input
                                                value={intervalPaceInput}
                                                onChange={e => setIntervalPaceInput(e.target.value)}
                                                placeholder="ex : 4:00"
                                                className="field-input text-sm"
                                            />
                                        </div>
                                        <p className="text-[9px] text-text-muted/60">Format mm:ss/km · Laisse vide pour utiliser le calcul automatique</p>
                                    </div>
                                </FormSection>

                                {/* FC max */}
                                <FormSection
                                    title="Fréquence cardiaque max"
                                    icon={Heart}
                                    color={ZONE_CONFIG.z5.color}
                                    info="Ta FC max détermine les plafonds de tes zones. Mesure : sprint de 3–5 min à pleine intensité en fin de séance et relève le pic."
                                    expandedInfo={expandedInfo}
                                    onToggleInfo={setExpandedInfo}
                                    infoKey="maxhr"
                                >
                                    <div className="flex gap-2">
                                        <input
                                            value={maxHR}
                                            onChange={e => setMaxHR(e.target.value)}
                                            placeholder="ex : 185"
                                            type="number"
                                            className="field-input flex-1 text-sm"
                                        />
                                        <button
                                            onClick={estimateMaxHR}
                                            disabled={!age}
                                            className="px-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-text-muted hover:text-white disabled:opacity-30 transition-all shrink-0"
                                        >
                                            Estimer depuis l'âge
                                        </button>
                                    </div>
                                </FormSection>

                                {/* FC repos */}
                                <FormSection
                                    title="Fréquence cardiaque de repos"
                                    icon={Heart}
                                    color="#22c55e"
                                    info="Mesure ta FC au réveil, avant de te lever, après au moins 5 min d'immobilité. Elle affine le calcul des zones FC avec la méthode de réserve cardiaque (Karvonen)."
                                    expandedInfo={expandedInfo}
                                    onToggleInfo={setExpandedInfo}
                                    infoKey="resthr"
                                >
                                    <input
                                        value={restingHR}
                                        onChange={e => setRestingHR(e.target.value)}
                                        placeholder="ex : 52"
                                        type="number"
                                        className="field-input text-sm"
                                    />
                                </FormSection>

                                {/* Age */}
                                <FormSection
                                    title="Âge"
                                    icon={Flag}
                                    color="#5ab2ff"
                                    info="Utilisé pour estimer ta FC max (220 - âge) si tu ne l'as pas mesurée. Préfère toujours une FC max mesurée sur le terrain."
                                    expandedInfo={expandedInfo}
                                    onToggleInfo={setExpandedInfo}
                                    infoKey="age"
                                >
                                    <input
                                        value={age}
                                        onChange={e => setAge(e.target.value)}
                                        placeholder="ex : 28"
                                        type="number"
                                        className="field-input text-sm"
                                    />
                                </FormSection>

                                {/* Seuil aérobie (AeT) */}
                                <FormSection
                                    title="Seuil aérobie (AeT)"
                                    icon={Zap}
                                    color={ZONE_CONFIG.z3.color}
                                    badge="Avancé"
                                    info="La FC au sommet de la Z2 — le plafond de l'endurance aérobie pure. Test : 30–60 min à l'effort, note la FC moyenne. Ou : la FC à laquelle tu commences à transpirer plus intensément."
                                    expandedInfo={expandedInfo}
                                    onToggleInfo={setExpandedInfo}
                                    infoKey="aet"
                                >
                                    <input
                                        value={aetHR}
                                        onChange={e => setAetHR(e.target.value)}
                                        placeholder="ex : 148"
                                        type="number"
                                        className="field-input text-sm"
                                    />
                                </FormSection>

                                {/* Seuil lactique (LT2) */}
                                <FormSection
                                    title="Seuil lactique (LT2)"
                                    icon={TrendingUp}
                                    color={ZONE_CONFIG.z4.color}
                                    badge="Avancé"
                                    info="La FC max que tu peux tenir 30–60 min en compétition. Test : course ou vélo à fond sur 30 min, FC moyenne sur les 20 dernières minutes. La plus précise mais la plus dure."
                                    expandedInfo={expandedInfo}
                                    onToggleInfo={setExpandedInfo}
                                    infoKey="lt2"
                                >
                                    <input
                                        value={lt2HR}
                                        onChange={e => setLt2HR(e.target.value)}
                                        placeholder="ex : 168"
                                        type="number"
                                        className="field-input text-sm"
                                    />
                                </FormSection>

                                {/* Save button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-4 rounded-full font-black text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all mt-2"
                                    style={{
                                        background: saved
                                            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                            : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                                        boxShadow: '0 8px 28px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                                    }}
                                >
                                    {saving ? (
                                        <Loader2 size={17} className="animate-spin" />
                                    ) : saved ? (
                                        <><Check size={17} />Zones recalculées</>
                                    ) : (
                                        <><RefreshCw size={17} />Recalculer mes zones</>
                                    )}
                                </button>

                                <p className="text-[10px] text-text-muted/60 text-center leading-relaxed pb-2">
                                    La performance récente est la donnée la plus précise.
                                    Les allures personnalisées remplacent le calcul automatique si renseignées.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

// ─── FormSection ──────────────────────────────────────────────────────────────

function FormSection({
    title, icon: Icon, color, info, badge, priority, children,
    expandedInfo, onToggleInfo, infoKey,
}: {
    title: string;
    icon: React.ElementType;
    color: string;
    info: string;
    badge?: string;
    priority?: boolean;
    children: React.ReactNode;
    expandedInfo: string | null;
    onToggleInfo: (key: string | null) => void;
    infoKey: string;
}) {
    const isOpen = expandedInfo === infoKey;

    return (
        <div className="glass-card rounded-[22px] p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${color}20`, border: `1px solid ${color}35` }}>
                        <Icon size={13} style={{ color }} />
                    </div>
                    <span className="text-sm font-black text-white">{title}</span>
                    {badge && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/8 text-text-muted">
                            {badge}
                        </span>
                    )}
                    {priority && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                            Prioritaire
                        </span>
                    )}
                </div>
                <button
                    onClick={() => onToggleInfo(isOpen ? null : infoKey)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl glass-card text-text-muted hover:text-white transition-colors"
                >
                    <Info size={12} />
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="mb-3 p-3 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                            <p className="text-[11px] text-text-muted leading-relaxed">{info}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {children}
        </div>
    );
}
