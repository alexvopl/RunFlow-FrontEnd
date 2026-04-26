import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, Check, MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!acceptTerms) {
            setError('Tu dois accepter les conditions d\'utilisation pour continuer.');
            return;
        }

        setLoading(true);
        try {
            const result = await signup(email, password, acceptTerms);

            if (result.status === 'authenticated') {
                navigate('/');
                return;
            }

            setPendingConfirmationEmail(result.email);
        } catch (err: unknown) {
            console.error(err);
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || 'Impossible de créer le compte. Réessaie.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-5">

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-[2.6rem] font-black italic tracking-tighter text-white leading-none">
                        Run<span className="text-primary">Flow</span>
                    </h1>
                    <p className="text-text-muted text-sm mt-2">Crée ton compte gratuitement 🚀</p>
                </div>

                {/* Card */}
                <div className="glass-hero rounded-[28px] p-6">

                    {pendingConfirmationEmail ? (
                        /* ---- Success state ---- */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4 text-center py-4"
                        >
                            <div className="w-16 h-16 rounded-[20px] glass-card flex items-center justify-center">
                                <MailCheck size={28} className="text-primary" />
                            </div>
                            <div>
                                <p className="font-black text-white text-lg mb-1">Vérifie ta boîte mail !</p>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    Un lien de confirmation a été envoyé à{' '}
                                    <span className="font-bold text-white">{pendingConfirmationEmail}</span>.
                                    Clique dessus pour activer ton compte.
                                </p>
                            </div>
                            <Link
                                to="/login"
                                className="mt-2 btn-primary px-8 py-3 text-sm font-black"
                            >
                                Retour à la connexion
                            </Link>
                        </motion.div>
                    ) : (
                        /* ---- Form ---- */
                        <form onSubmit={handleSubmit} className="space-y-3.5">

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm"
                                >
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            {/* Email */}
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
                                <input
                                    type="password"
                                    placeholder="Mot de passe"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                    required
                                    minLength={8}
                                />
                            </div>

                            {/* Terms checkbox */}
                            <button
                                type="button"
                                onClick={() => setAcceptTerms(!acceptTerms)}
                                className="flex items-center gap-3 w-full p-1 group"
                            >
                                <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                                        acceptTerms
                                            ? 'bg-primary shadow-[0_0_10px_rgba(90,178,255,0.4)]'
                                            : 'glass-card border border-white/10'
                                    }`}
                                >
                                    {acceptTerms && <Check size={12} className="text-black font-black" strokeWidth={3} />}
                                </div>
                                <span className="text-sm text-text-muted text-left group-hover:text-white transition-colors select-none">
                                    J'accepte les{' '}
                                    <span className="text-primary underline">Conditions d'utilisation</span>
                                </span>
                            </button>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3.5 text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Créer mon compte'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Login link */}
                {!pendingConfirmationEmail && (
                    <p className="text-center text-sm text-text-muted mt-6">
                        Déjà un compte ?{' '}
                        <Link to="/login" className="text-primary font-black hover:underline">
                            Se connecter
                        </Link>
                    </p>
                )}
            </motion.div>
        </div>
    );
}
