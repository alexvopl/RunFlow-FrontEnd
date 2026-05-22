import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, KeyRound, Eye, EyeOff, LogOut, Loader2,
    CheckCircle2, XCircle, ChevronDown, ChevronUp,
    CalendarRange, Swords, Timer, Gavel, Bug, Flame,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { adminKey, adminCall } from '../services/adminApi';
import { resolveError } from '../services/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActionResult {
    ok: boolean;
    data?: unknown;
    error?: string;
}

// ─── Shared hook ───────────────────────────────────────────────────────────────

function useAction() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ActionResult | null>(null);

    const run = useCallback(async (fn: () => Promise<unknown>) => {
        setLoading(true);
        setResult(null);
        try {
            const data = await fn();
            setResult({ ok: true, data });
        } catch (e) {
            setResult({ ok: false, error: resolveError(e, 'Erreur inattendue.') });
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => setResult(null), []);
    return { loading, result, run, reset };
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function AdminInput({
    label,
    value,
    onChange,
    placeholder,
    mono = false,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    mono?: boolean;
    type?: string;
}) {
    return (
        <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-white/5 border border-white/10 rounded-[12px] px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all ${mono ? 'font-mono' : 'font-bold'}`}
            />
        </div>
    );
}

function ActionBtn({
    label,
    onClick,
    loading,
    variant = 'primary',
    disabled = false,
}: {
    label: string;
    onClick: () => void;
    loading: boolean;
    variant?: 'primary' | 'danger' | 'ghost';
    disabled?: boolean;
}) {
    const styles = {
        primary: 'bg-amber-500/20 border border-amber-500/35 text-amber-300 hover:bg-amber-500/30',
        danger:  'bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30',
        ghost:   'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10',
    };
    return (
        <button
            onClick={onClick}
            disabled={loading || disabled}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 ${styles[variant]}`}
        >
            {loading && <Loader2 size={11} className="animate-spin" />}
            {label}
        </button>
    );
}

function ConfirmBtn({
    label,
    onConfirm,
    loading,
    variant = 'danger',
}: {
    label: string;
    onConfirm: () => void;
    loading: boolean;
    variant?: 'danger' | 'primary';
}) {
    const [confirming, setConfirming] = useState(false);

    if (confirming) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/50">Confirmer ?</span>
                <button
                    onClick={() => { setConfirming(false); onConfirm(); }}
                    className="px-3 py-2 rounded-[10px] bg-red-500/25 border border-red-500/35 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/40 active:scale-95 transition-all"
                >
                    Oui
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    className="px-3 py-2 rounded-[10px] bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                >
                    Non
                </button>
            </div>
        );
    }

    return (
        <ActionBtn
            label={label}
            onClick={() => setConfirming(true)}
            loading={loading}
            variant={variant}
        />
    );
}

function ResultPanel({ result }: { result: ActionResult }) {
    const [expanded, setExpanded] = useState(false);
    const jsonStr = result.data !== undefined
        ? JSON.stringify(result.data, null, 2)
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[14px] p-3 border text-xs ${
                result.ok
                    ? 'bg-emerald-500/8 border-emerald-500/20'
                    : 'bg-red-500/8 border-red-500/20'
            }`}
        >
            <div className="flex items-center gap-2">
                {result.ok
                    ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    : <XCircle size={13} className="text-red-400 flex-shrink-0" />}
                <span className={`font-black text-[10px] uppercase tracking-widest ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.ok ? 'Succès' : 'Erreur'}
                </span>
                {result.error && <span className="text-red-300/80 font-bold text-[10px]">{result.error}</span>}
                {jsonStr && (
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="ml-auto text-white/25 hover:text-white/50 transition-colors"
                    >
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                )}
            </div>
            {expanded && jsonStr && (
                <pre className="mt-2 text-[10px] font-mono text-white/50 overflow-x-auto max-h-40 overflow-y-auto leading-relaxed">
                    {jsonStr.slice(0, 2000)}{jsonStr.length > 2000 ? '\n…' : ''}
                </pre>
            )}
        </motion.div>
    );
}

function AdminSection({
    icon: Icon,
    label,
    accent = '#f59e0b',
    children,
}: {
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
    label: string;
    accent?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="rounded-[20px] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
            <div
                className="flex items-center gap-2.5 px-4 py-3 border-b"
                style={{ background: `${accent}0d`, borderColor: `${accent}22` }}
            >
                <Icon size={14} style={{ color: accent }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
                    {label}
                </span>
            </div>
            <div className="p-4 space-y-4">{children}</div>
        </div>
    );
}

function Row({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

function Divider() {
    return <div className="border-t border-white/[0.06]" />;
}

// ─── Sections ──────────────────────────────────────────────────────────────────

function SeasonSection() {
    const eligibility = useAction();
    const generate    = useAction();
    const divisions   = useAction();
    const [weekIndex, setWeekIndex] = useState('');

    return (
        <AdminSection icon={CalendarRange} label="Saison">
            {/* Eligibilité */}
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Éligibilité clans</p>
                <Row>
                    <ActionBtn
                        label="Vérifier éligibilité"
                        onClick={() => eligibility.run(() => adminCall('post', '/admin/game/clans/check-eligibility'))}
                        loading={eligibility.loading}
                    />
                </Row>
                {eligibility.result && <ResultPanel result={eligibility.result} />}
            </div>

            <Divider />

            {/* Générer saison */}
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Générer saison</p>
                <Row>
                    <div className="w-32">
                        <AdminInput
                            label="Week index (opt.)"
                            value={weekIndex}
                            onChange={setWeekIndex}
                            placeholder="auto"
                            mono
                        />
                    </div>
                    <ConfirmBtn
                        label="Générer"
                        variant="primary"
                        loading={generate.loading}
                        onConfirm={() => generate.run(() => adminCall('post', '/admin/game/seasons/generate',
                            weekIndex ? { weekIndex: Number(weekIndex) } : undefined))}
                    />
                </Row>
                {generate.result && <ResultPanel result={generate.result} />}
            </div>

            <Divider />

            {/* Assigner divisions */}
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Assigner divisions</p>
                <Row>
                    <ConfirmBtn
                        label="Assigner"
                        variant="primary"
                        loading={divisions.loading}
                        onConfirm={() => divisions.run(() => adminCall('post', '/admin/game/seasons/assign-divisions'))}
                    />
                </Row>
                {divisions.result && <ResultPanel result={divisions.result} />}
            </div>
        </AdminSection>
    );
}

function WarsSection() {
    const generate  = useAction();
    const finalize  = useAction();
    const recompute = useAction();
    const backfill  = useAction();
    const [warId, setWarId] = useState('');

    return (
        <AdminSection icon={Swords} label="Guerres & Battles">
            {/* Générer */}
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Génération</p>
                <Row>
                    <ConfirmBtn
                        label="Générer matchmaking + battles"
                        variant="primary"
                        loading={generate.loading}
                        onConfirm={() => generate.run(() => adminCall('post', '/admin/game/wars/generate'))}
                    />
                </Row>
                {generate.result && <ResultPanel result={generate.result} />}
            </div>

            <Divider />

            {/* War-specific actions */}
            <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Actions sur une guerre</p>
                <AdminInput
                    label="War ID"
                    value={warId}
                    onChange={setWarId}
                    placeholder="uuid"
                    mono
                />
                <Row>
                    <ConfirmBtn
                        label="Finaliser"
                        variant="danger"
                        loading={finalize.loading}
                        onConfirm={() => finalize.run(() => adminCall('post', `/admin/game/wars/${warId}/finalize`))}
                    />
                    <ActionBtn
                        label="Recalculer"
                        onClick={() => recompute.run(() => adminCall('post', `/admin/game/wars/${warId}/recompute`))}
                        loading={recompute.loading}
                        disabled={!warId}
                    />
                    <ActionBtn
                        label="Backfill highlights"
                        onClick={() => backfill.run(() => adminCall('post', `/admin/game/wars/${warId}/highlights/backfill`))}
                        loading={backfill.loading}
                        variant="ghost"
                        disabled={!warId}
                    />
                </Row>
                {finalize.result && <ResultPanel result={finalize.result} />}
                {recompute.result && <ResultPanel result={recompute.result} />}
                {backfill.result && <ResultPanel result={backfill.result} />}
            </div>
        </AdminSection>
    );
}

function SchedulerSection() {
    const battles  = useAction();
    const wars     = useAction();
    const autoLock = useAction();

    const trigger = (action: typeof battles, path: string) =>
        () => action.run(() => adminCall('post', path));

    return (
        <AdminSection icon={Timer} label="Scheduler" accent="#10b981">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Déclenchement manuel</p>
            <Row>
                <ActionBtn
                    label="Statuts battles"
                    onClick={trigger(battles, '/admin/game/scheduler/battle-statuses')}
                    loading={battles.loading}
                    variant="ghost"
                />
                <ActionBtn
                    label="Statuts guerres"
                    onClick={trigger(wars, '/admin/game/scheduler/war-statuses')}
                    loading={wars.loading}
                    variant="ghost"
                />
                <ActionBtn
                    label="Auto-lock plans"
                    onClick={trigger(autoLock, '/admin/game/scheduler/auto-lock-plans')}
                    loading={autoLock.loading}
                    variant="ghost"
                />
            </Row>
            {battles.result  && <ResultPanel result={battles.result} />}
            {wars.result     && <ResultPanel result={wars.result} />}
            {autoLock.result && <ResultPanel result={autoLock.result} />}
        </AdminSection>
    );
}

function ModerationSection() {
    const reject = useAction();
    const [participationId, setParticipationId] = useState('');

    return (
        <AdminSection icon={Gavel} label="Modération" accent="#ef4444">
            <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Rejeter participation</p>
                <AdminInput
                    label="Participation ID"
                    value={participationId}
                    onChange={setParticipationId}
                    placeholder="uuid"
                    mono
                />
                <Row>
                    <ConfirmBtn
                        label="Rejeter"
                        variant="danger"
                        loading={reject.loading}
                        onConfirm={() => reject.run(() =>
                            adminCall('put', `/admin/game/participations/${participationId}/reject`)
                        )}
                    />
                </Row>
                {reject.result && <ResultPanel result={reject.result} />}
            </div>
        </AdminSection>
    );
}

function DebugSection() {
    const score = useAction();
    const [userId, setUserId]   = useState('');
    const [battleId, setBattleId] = useState('');

    return (
        <AdminSection icon={Bug} label="Debug scoring" accent="#a855f7">
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <AdminInput label="User ID" value={userId} onChange={setUserId} placeholder="uuid" mono />
                    <AdminInput label="Battle ID" value={battleId} onChange={setBattleId} placeholder="uuid" mono />
                </div>
                <Row>
                    <ActionBtn
                        label="Analyser"
                        onClick={() => score.run(() =>
                            adminCall('get', '/admin/game/debug/scoring', undefined, {
                                ...(userId   ? { userId }   : {}),
                                ...(battleId ? { battleId } : {}),
                            })
                        )}
                        loading={score.loading}
                        disabled={!userId && !battleId}
                    />
                </Row>
                {score.result && <ResultPanel result={score.result} />}
            </div>
        </AdminSection>
    );
}

// ─── AdminGate ─────────────────────────────────────────────────────────────────

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
    const [key, setKey]       = useState('');
    const [show, setShow]     = useState(false);
    const [error, setError]   = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return;
        setLoading(true);
        setError(null);
        try {
            // Validate key with a lightweight admin endpoint
            adminKey.set(key);
            await adminCall('get', '/admin/game/debug/ping');
            onUnlock();
        } catch (err) {
            adminKey.clear();
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401 || status === 403) {
                setError('Clé invalide ou permissions insuffisantes.');
            } else {
                // If /ping doesn't exist (404), accept the key anyway — API will enforce
                if (status === 404) { adminKey.set(key); onUnlock(); }
                else setError(resolveError(err, 'Erreur de connexion.'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-5 py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                <div className="glass-hero rounded-[28px] p-8 space-y-6">
                    {/* Icon */}
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div
                            className="w-16 h-16 rounded-[20px] flex items-center justify-center"
                            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.30)' }}
                        >
                            <ShieldAlert size={28} style={{ color: '#f59e0b' }} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white tracking-tight">Administration</h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">
                                Accès restreint
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-3">
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type={show ? 'text' : 'password'}
                                value={key}
                                onChange={e => { setKey(e.target.value); setError(null); }}
                                placeholder="Clé admin"
                                className="w-full bg-white/5 border border-white/10 rounded-[14px] px-4 py-3.5 pr-12 text-sm font-mono text-white placeholder-white/25 outline-none focus:border-amber-500/50 focus:bg-white/8 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShow(s => !s)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                            >
                                {show ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>

                        {error && (
                            <p className="text-red-400 text-[11px] font-bold text-center">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={!key.trim() || loading}
                            className="w-full py-3.5 rounded-full text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                            style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.40)', color: '#fbbf24' }}
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                            Accéder
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export function Admin() {
    const navigate = useNavigate();
    const [unlocked, setUnlocked] = useState(() => Boolean(adminKey.get()));

    // Role check — soft gate, API is the hard gate
    const [roleOk, setRoleOk] = useState<boolean | null>(null);

    useEffect(() => {
        api.get('/auth/whoami')
            .then(res => {
                const role: string = (res.data as Record<string, unknown>)?.role as string ?? '';
                setRoleOk(['admin', 'super_admin', 'staff'].includes(role));
            })
            .catch(() => setRoleOk(null)); // network error → don't block
    }, []);

    const handleLock = () => {
        adminKey.clear();
        setUnlocked(false);
    };

    // Role clearly denied (not null = network error, not true = ok)
    if (roleOk === false) {
        return (
            <div className="min-h-screen flex items-center justify-center px-5">
                <div className="glass-hero rounded-[28px] p-8 text-center max-w-sm w-full space-y-4">
                    <XCircle size={36} className="text-red-400 mx-auto" />
                    <p className="font-black text-white">Accès refusé</p>
                    <p className="text-text-muted text-sm">Rôle admin requis.</p>
                    <button onClick={() => navigate(-1)} className="btn-primary px-6 py-3 text-sm font-black">
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    if (!unlocked) {
        return <AdminGate onUnlock={() => setUnlocked(true)} />;
    }

    return (
        <div className="min-h-screen pb-16">
            {/* Header */}
            <div
                className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
                style={{ background: 'rgba(7,17,31,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}
            >
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                        style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
                    >
                        <Flame size={14} style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-white leading-none">Admin</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">RunFlow</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Connecté</span>
                    </div>
                    <button
                        onClick={handleLock}
                        className="w-8 h-8 glass-card rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors active:scale-95"
                    >
                        <LogOut size={13} />
                    </button>
                </div>
            </div>

            {/* Sections */}
            <div className="px-5 pt-5 space-y-4 max-w-2xl mx-auto">
                <AnimatePresence>
                    {[
                        <motion.div key="season"     initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.00 }}><SeasonSection /></motion.div>,
                        <motion.div key="wars"       initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}><WarsSection /></motion.div>,
                        <motion.div key="scheduler"  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}><SchedulerSection /></motion.div>,
                        <motion.div key="moderation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}><ModerationSection /></motion.div>,
                        <motion.div key="debug"      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}><DebugSection /></motion.div>,
                    ]}
                </AnimatePresence>

                <div className="text-center pt-4 pb-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/15">
                        X-Admin-Key · Session uniquement
                    </p>
                </div>
            </div>
        </div>
    );
}
