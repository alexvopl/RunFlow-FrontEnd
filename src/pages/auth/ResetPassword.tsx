import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronLeft, Loader2, Lock } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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
            window.setTimeout(() => {
                navigate('/', { replace: true });
            }, 1200);
        } catch (err: unknown) {
            console.error(err);
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || 'Impossible de mettre à jour le mot de passe.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8">
                <div>
                    <Link to="/login" className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm font-bold mb-8">
                        <ChevronLeft size={18} />
                        Retour à la connexion
                    </Link>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Nouveau mot de passe</h1>
                    <p className="text-text-muted text-sm">Choisissez un nouveau mot de passe pour votre compte.</p>
                </div>

                {success ? (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-5 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <CheckCircle2 size={32} />
                        <div>
                            <p className="font-bold mb-1">Mot de passe mis à jour</p>
                            <p className="text-sm text-green-400/70">Votre session est prête. Redirection vers l’application...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {!ready ? (
                            <div className="premium-panel p-6 text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                <p className="text-sm text-text-muted">Vérification du lien de réinitialisation...</p>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-text-muted" size={20} />
                                    <input
                                        type="password"
                                        placeholder="Nouveau mot de passe"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-surface border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                                        required
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-text-muted" size={20} />
                                    <input
                                        type="password"
                                        placeholder="Confirmer le mot de passe"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-surface border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Mettre à jour le mot de passe'}
                                </button>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
