import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronLeft, Loader2, Lock, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

function parseRecoveryHash(hash: string) {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    return {
        accessToken: params.get('access_token') ?? undefined,
        refreshToken: params.get('refresh_token') ?? undefined,
        type: params.get('type') ?? undefined,
        errorDescription: params.get('error_description') ?? undefined,
    };
}

export function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();
    const { completeSession } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const [success, setSuccess] = useState(false);

    const recoveryParams = useMemo(() => parseRecoveryHash(location.hash), [location.hash]);

    useEffect(() => {
        if (recoveryParams.errorDescription) {
            setError(recoveryParams.errorDescription);
            return;
        }
        if (!recoveryParams.accessToken || recoveryParams.type !== 'recovery') {
            setError('Ce lien de réinitialisation est invalide ou expiré.');
            return;
        }
        setReady(true);
    }, [recoveryParams.accessToken, recoveryParams.errorDescription, recoveryParams.type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!recoveryParams.accessToken) {
            setError('Le token de réinitialisation est manquant.');
            return;
        }
        if (password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                access_token: recoveryParams.accessToken,
                password,
            });
            await completeSession(recoveryParams.accessToken, recoveryParams.refreshToken);
            setSuccess(true);
            window.setTimeout(() => navigate('/', { replace: true }), 1200);
        } catch (err: unknown) {
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || 'Impossible de mettre à jour le mot de passe.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden">

            {/* Atmospheric orbs */}
            <div className="absolute pointer-events-none"
                style={{ top: '10%', left: '50%', transform: 'translateX(-50%)', width: 300, height: 300,
                    background: 'radial-gradient(circle, rgba(90, 178, 255, 0.12) 0%, transparent 70%)', filter: 'blur(48px)' }}
            />
            <div className="absolute pointer-events-none"
                style={{ bottom: '20%', right: '8%', width: 160, height: 160,
                    background: 'radial-gradient(circle, rgba(192, 132, 252, 0.08) 0%, transparent 70%)', filter: 'blur(32px)' }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-sm relative z-10"
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-text-muted hover:text-white transition-colors text-sm font-medium mb-7"
                >
                    <ChevronLeft size={16} />
                    Retour
                </Link>

                {/* Logo */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h1 className="font-display font-bold tracking-tight text-white leading-none"
                            style={{ fontSize: '3rem' }}>
                            Run<span className="text-primary">Flow</span>
                        </h1>
                        <div className="mt-2 mx-auto"
                            style={{ height: 1, width: 56, background: 'linear-gradient(90deg, transparent, rgba(90,178,255,0.55), transparent)' }}
                        />
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="text-text-muted text-sm mt-3 font-medium"
                    >
                        Choisis ton nouveau mot de passe
                    </motion.p>
                </div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-hero rounded-[28px] p-6"
                >
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4 text-center py-4"
                        >
                            <div className="w-16 h-16 rounded-[20px] glass-card flex items-center justify-center">
                                <CheckCircle2 size={28} className="text-success" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg mb-1 font-display">Mot de passe mis à jour !</p>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    Ta session est prête. Redirection…
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <p className="text-sm text-text-muted leading-relaxed">
                                Choisis un nouveau mot de passe pour ton compte.
                            </p>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm"
                                >
                                    <AlertCircle size={15} className="shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            {!ready && !error ? (
                                <div className="glass-card rounded-[22px] p-6 flex flex-col items-center gap-3 text-center">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    <p className="text-sm text-text-muted">Vérification du lien…</p>
                                </div>
                            ) : ready ? (
                                <>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                        <input
                                            type="password"
                                            placeholder="Nouveau mot de passe"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                        <input
                                            type="password"
                                            placeholder="Confirmer le mot de passe"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                                    >
                                        {loading ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <>
                                                Mettre à jour
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : null}
                        </form>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
}
