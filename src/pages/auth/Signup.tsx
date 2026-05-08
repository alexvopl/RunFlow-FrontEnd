import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, Check, MailCheck, ArrowRight } from 'lucide-react';
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
            setError("Tu dois accepter les conditions d'utilisation pour continuer.");
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
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || 'Impossible de créer le compte. Réessaie.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden">

            {/* Atmospheric orbs */}
            <div className="absolute pointer-events-none"
                style={{ top: '10%', left: '50%', transform: 'translateX(-50%)', width: 320, height: 320,
                    background: 'radial-gradient(circle, rgba(90, 178, 255, 0.12) 0%, transparent 70%)', filter: 'blur(48px)' }}
            />
            <div className="absolute pointer-events-none"
                style={{ bottom: '15%', right: '8%', width: 180, height: 180,
                    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.09) 0%, transparent 70%)', filter: 'blur(36px)' }}
            />
            <div className="absolute pointer-events-none"
                style={{ top: '55%', left: '5%', width: 140, height: 140,
                    background: 'radial-gradient(circle, rgba(192, 132, 252, 0.07) 0%, transparent 70%)', filter: 'blur(32px)' }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-sm relative z-10"
            >
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
                        Crée ton compte gratuitement
                    </motion.p>
                </div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-hero rounded-[28px] p-6"
                >
                    {pendingConfirmationEmail ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4 text-center py-4"
                        >
                            <div className="w-16 h-16 rounded-[20px] glass-card flex items-center justify-center">
                                <MailCheck size={28} className="text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg mb-1 font-display">Vérifie ta boîte mail !</p>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    Un lien a été envoyé à{' '}
                                    <span className="font-semibold text-white">{pendingConfirmationEmail}</span>.
                                    Clique dessus pour activer ton compte.
                                </p>
                            </div>
                            <Link to="/login" className="btn-primary px-8 py-3 text-sm mt-2">
                                Retour à la connexion
                            </Link>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">
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

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="password"
                                    placeholder="Mot de passe (8 caractères min.)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setAcceptTerms(!acceptTerms)}
                                className="flex items-center gap-3 w-full p-1 group"
                            >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                                    acceptTerms
                                        ? 'bg-primary shadow-[0_0_10px_rgba(90,178,255,0.4)]'
                                        : 'glass-card border border-white/10'
                                }`}>
                                    {acceptTerms && <Check size={12} className="text-black" strokeWidth={3} />}
                                </div>
                                <span className="text-sm text-text-muted text-left group-hover:text-white transition-colors select-none">
                                    J'accepte les{' '}
                                    <span className="text-primary underline">Conditions d'utilisation</span>
                                </span>
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        Créer mon compte
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </motion.div>

                {!pendingConfirmationEmail && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="text-center text-sm text-text-muted mt-6"
                    >
                        Déjà un compte ?{' '}
                        <Link to="/login" className="text-primary font-semibold hover:underline">
                            Se connecter
                        </Link>
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
}
