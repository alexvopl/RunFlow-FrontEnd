import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionExpired = searchParams.get('reason') === 'session-expired';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: unknown) {
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || 'Identifiants incorrects. Réessaie.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden">

            {/* Atmospheric orbs */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: '15%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 360,
                    height: 360,
                    background: 'radial-gradient(circle, rgba(90, 178, 255, 0.13) 0%, transparent 70%)',
                    filter: 'blur(48px)',
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    bottom: '20%',
                    right: '10%',
                    width: 200,
                    height: 200,
                    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.09) 0%, transparent 70%)',
                    filter: 'blur(36px)',
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    top: '60%',
                    left: '5%',
                    width: 160,
                    height: 160,
                    background: 'radial-gradient(circle, rgba(192, 132, 252, 0.07) 0%, transparent 70%)',
                    filter: 'blur(32px)',
                }}
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
                        <div
                            className="mt-2 mx-auto"
                            style={{
                                height: 1,
                                width: 56,
                                background: 'linear-gradient(90deg, transparent, rgba(90,178,255,0.55), transparent)',
                            }}
                        />
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="text-text-muted text-sm mt-3 font-medium"
                    >
                        Connecte-toi pour continuer
                    </motion.p>
                </div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-hero rounded-[28px] p-6 space-y-5"
                >
                    <AnimatePresence>
                        {sessionExpired && (
                            <motion.div
                                key="session-expired"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm"
                            >
                                <Clock size={15} className="shrink-0" />
                                Session expirée — reconnecte-toi pour continuer.
                            </motion.div>
                        )}
                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm"
                            >
                                <AlertCircle size={15} className="shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-3">
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
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                required
                            />
                        </div>

                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-xs font-medium text-text-muted hover:text-primary transition-colors"
                            >
                                Mot de passe oublié ?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>
                                    Se connecter
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-center text-sm text-text-muted mt-6"
                >
                    Pas encore de compte ?{' '}
                    <Link to="/signup" className="text-primary font-semibold hover:underline">
                        S'inscrire
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
}
