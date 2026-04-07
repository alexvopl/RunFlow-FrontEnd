import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';

export function StravaCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const connectStrava = async () => {
            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                setStatus('error');
                setErrorMsg(error || 'Accès refusé par Strava');
                return;
            }

            if (!code) {
                setStatus('error');
                setErrorMsg('Aucun code d\'autorisation reçu');
                return;
            }

            try {
                await api.post('/strava/connect', { code });
                setStatus('success');
                // Success! Redirect to profile after a short delay
                setTimeout(() => {
                    navigate('/profile', { state: { stravaConnected: true } });
                }, 2000);
            } catch (err: any) {
                console.error('Failed to connect Strava', err);
                setStatus('error');
                setErrorMsg(err.response?.data?.message || 'Erreur lors de la connexion à Strava');
            }
        };

        connectStrava();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm space-y-6">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                        <h1 className="text-2xl font-bold">Connexion à Strava...</h1>
                        <p className="text-text-muted">Nous finalisons votre connexion avec Strava.</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">✕</span>
                        </div>
                        <h1 className="text-2xl font-bold">Erreur</h1>
                        <p className="text-red-400 mb-6">{errorMsg}</p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                        >
                            Retour au Profil
                        </button>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">✓</span>
                        </div>
                        <h1 className="text-2xl font-bold">Succès !</h1>
                        <p className="text-green-400">Votre compte Strava est maintenant connecté.</p>
                        <p className="text-text-muted mt-2 text-sm italic">Redirection dans quelques secondes...</p>
                    </>
                )}
            </div>
        </div>
    );
}
