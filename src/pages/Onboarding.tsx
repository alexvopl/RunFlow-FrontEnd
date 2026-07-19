import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, MapPin, Target, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type RunnerLevel = 'beginner' | 'intermediate' | 'advanced';

const LEVELS: Array<{ value: RunnerLevel; label: string; detail: string }> = [
    { value: 'beginner', label: 'Débutant', detail: 'Je commence ou je reprends' },
    { value: 'intermediate', label: 'Régulier', detail: 'Je cours déjà chaque semaine' },
    { value: 'advanced', label: 'Confirmé', detail: 'Je prépare des objectifs exigeants' },
];

const GOALS = [
    ['consistency', 'Courir régulièrement'],
    ['wellbeing', 'Forme et bien-être'],
    ['5k', 'Préparer un 5 km'],
    ['10k', 'Préparer un 10 km'],
    ['half_marathon', 'Préparer un semi'],
    ['marathon', 'Préparer un marathon'],
] as const;

const CITIES = ['Paris', 'Lyon', 'Marseille', 'Nantes', 'Bordeaux', 'Lille', 'Toulouse', 'Nice', 'Montpellier', 'Rennes', 'Strasbourg', 'Grenoble'];

export function Onboarding() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.name ?? '');
    const [city, setCity] = useState(user?.city ?? '');
    const [runnerLevel, setRunnerLevel] = useState<RunnerLevel>(user?.runnerLevel ?? 'beginner');
    const [runningGoal, setRunningGoal] = useState(user?.runningGoal ?? 'consistency');
    const [preferences, setPreferences] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        void api.get('/profiles/me').then((response) => {
            const profile = response.data?.profile ?? response.data;
            const current = profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
            setPreferences(current);
            if (profile?.display_name) setName(profile.display_name);
            if (typeof current.city === 'string') setCity(current.city);
            if (['beginner', 'intermediate', 'advanced'].includes(String(current.runnerLevel))) {
                setRunnerLevel(current.runnerLevel as RunnerLevel);
            }
            if (typeof current.runningGoal === 'string') setRunningGoal(current.runningGoal);
        }).catch(() => undefined);
    }, []);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const normalizedName = name.trim();
        const normalizedCity = city.trim();
        if (normalizedName.length < 2 || normalizedCity.length < 2) {
            setError('Indique ton prénom et ta ville pour personnaliser RunFlow.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await Promise.all([
                api.put('/profiles/me', {
                    display_name: normalizedName,
                    preferences: {
                        ...preferences,
                        city: normalizedCity,
                        runnerLevel,
                        runningGoal,
                        onboardingCompleted: true,
                        onboardingCompletedAt: new Date().toISOString(),
                    },
                }),
                api.put('/training/zones', { level: runnerLevel }).catch(() => null),
            ]);
            await refreshUser();
            navigate('/community', { replace: true });
        } catch (submitError) {
            console.error('Onboarding failed', submitError);
            setError('Impossible d’enregistrer ton profil. Réessaie dans un instant.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background px-5 py-8 flex items-center justify-center">
            <motion.form
                onSubmit={submit}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg space-y-5"
            >
                <header className="text-center mb-7">
                    <p className="page-eyebrow mb-2">Bienvenue dans RunFlow</p>
                    <h1 className="text-3xl font-black text-white">Créons ton terrain de jeu</h1>
                    <p className="text-sm text-text-muted mt-2">Trois informations suffisent pour te proposer les bons coureurs, clans et défis.</p>
                </header>

                <section className="glass-hero rounded-[28px] p-5 space-y-4">
                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2 mb-2"><UserRound size={13} /> Ton prénom</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="Benjamin" className="w-full glass-card rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-primary/50" />
                    </label>
                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2 mb-2"><MapPin size={13} /> Ta ville</span>
                        <input list="runflow-cities" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Paris" autoComplete="address-level2" className="w-full glass-card rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-primary/50" />
                        <datalist id="runflow-cities">{CITIES.map((item) => <option key={item} value={item} />)}</datalist>
                        <p className="text-[10px] text-text-muted mt-2">Utilisée uniquement pour les clans, défis et classements locaux.</p>
                    </label>
                </section>

                <section className="glass-hero rounded-[28px] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">Ton niveau</p>
                    <div className="space-y-2">
                        {LEVELS.map((level) => (
                            <button key={level.value} type="button" onClick={() => setRunnerLevel(level.value)} className={`w-full rounded-2xl p-3.5 text-left flex items-center gap-3 border transition-all ${runnerLevel === level.value ? 'bg-primary/12 border-primary/40' : 'glass-card border-white/5'}`}>
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center ${runnerLevel === level.value ? 'bg-primary text-black' : 'bg-white/5 text-transparent'}`}><Check size={15} strokeWidth={3} /></span>
                                <span><span className="font-black text-sm text-white block">{level.label}</span><span className="text-[11px] text-text-muted">{level.detail}</span></span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="glass-hero rounded-[28px] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2 mb-3"><Target size={13} /> Ton objectif principal</p>
                    <div className="grid grid-cols-2 gap-2">
                        {GOALS.map(([value, label]) => (
                            <button key={value} type="button" onClick={() => setRunningGoal(value)} className={`rounded-2xl p-3 text-xs font-bold text-left border transition-all ${runningGoal === value ? 'bg-primary/12 border-primary/40 text-white' : 'glass-card border-white/5 text-text-muted'}`}>{label}</button>
                        ))}
                    </div>
                </section>

                {error && <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 font-black disabled:opacity-50">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Découvrir ma communauté'}
                </button>
            </motion.form>
        </main>
    );
}
