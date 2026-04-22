import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type CallbackStatus = 'loading' | 'success' | 'error';

function parseAuthHash(hash: string) {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    return {
        accessToken: params.get('access_token') ?? undefined,
        refreshToken: params.get('refresh_token') ?? undefined,
        type: params.get('type') ?? undefined,
        errorCode: params.get('error_code') ?? undefined,
        errorDescription: params.get('error_description') ?? undefined,
    };
}

export function AuthCallback() {
    const location = useLocation();
    const navigate = useNavigate();
    const { completeSession } = useAuth();
    const [status, setStatus] = useState<CallbackStatus>('loading');
    const [message, setMessage] = useState('Validation de votre session...');

    const authParams = useMemo(() => parseAuthHash(location.hash), [location.hash]);

    useEffect(() => {
        const applyRedirectSession = async () => {
            if (authParams.errorCode) {
                setStatus('error');
                setMessage(authParams.errorDescription ?? 'Le lien de confirmation a échoué.');
                return;
            }

            if (!authParams.accessToken) {
                setStatus('error');
                setMessage('Aucun token de session n’a été trouvé dans le lien reçu.');
                return;
            }

            if (authParams.type === 'recovery') {
                navigate({
                    pathname: '/reset-password',
                    hash: location.hash,
                }, { replace: true });
                return;
            }

            try {
                await completeSession(authParams.accessToken, authParams.refreshToken);
                setStatus('success');
                setMessage(authParams.type === 'signup'
                    ? 'Adresse email confirmée. Redirection vers votre espace...'
                    : 'Connexion validée. Redirection vers votre espace...');
                window.setTimeout(() => {
                    navigate('/', { replace: true });
                }, 1200);
            } catch (error) {
                console.error('Failed to complete auth redirect', error);
                setStatus('error');
                setMessage('Impossible de restaurer la session depuis ce lien.');
            }
        };

        void applyRedirectSession();
    }, [authParams.accessToken, authParams.errorCode, authParams.errorDescription, authParams.refreshToken, authParams.type, completeSession, location.hash, navigate]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                        <h1 className="text-2xl font-bold">Finalisation de la connexion</h1>
                        <p className="text-text-muted">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
                        <h1 className="text-2xl font-bold">Succès</h1>
                        <p className="text-green-400">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="w-14 h-14 text-red-400 mx-auto" />
                        <h1 className="text-2xl font-bold">Lien invalide</h1>
                        <p className="text-red-400">{message}</p>
                        <button
                            type="button"
                            onClick={() => navigate('/login', { replace: true })}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                        >
                            Retour à la connexion
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
