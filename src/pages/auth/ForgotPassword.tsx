import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import { api } from '../../services/api';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/recover', { email });
            setSuccess(true);
        } catch (err: unknown) {
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || 'Une erreur est survenue. Vérifiez votre email.');
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
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Mot de passe oublié</h1>
                    <p className="text-text-muted text-sm">Entrez votre email pour recevoir un lien de réinitialisation.</p>
                </div>

                {success ? (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-5 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <CheckCircle size={32} />
                        <div>
                            <p className="font-bold mb-1">Email envoyé !</p>
                            <p className="text-sm text-green-400/70">Vérifiez votre boîte mail et suivez les instructions pour réinitialiser votre mot de passe.</p>
                        </div>
                        <Link
                            to="/login"
                            className="mt-2 px-6 py-2 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors text-white"
                        >
                            Retour à la connexion
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-text-muted" size={20} />
                            <input
                                type="email"
                                placeholder="Votre email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-surface border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Envoyer le lien'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
