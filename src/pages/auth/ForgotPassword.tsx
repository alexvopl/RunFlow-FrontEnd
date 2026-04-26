import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, MailCheck, ChevronLeft } from 'lucide-react';
import { api } from '../../services/api';
import { PASSWORD_RESET_URL } from '../../services/app-config';
import { motion } from 'framer-motion';

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
            await api.post('/auth/recover', {
                email,
                redirectTo: PASSWORD_RESET_URL ?? undefined,
            });
            setSuccess(true);
        } catch (err: unknown) {
            const message = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : undefined;
            setError(message || 'Une erreur est survenue. Vérifie ton email.');
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
                {/* Back link */}
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-text-muted hover:text-white transition-colors text-sm font-bold mb-7"
                >
                    <ChevronLeft size={16} />
                    Retour
                </Link>

                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-[2.6rem] font-black italic tracking-tighter text-white leading-none">
                        Run<span className="text-primary">Flow</span>
                    </h1>
                    <p className="text-text-muted text-sm mt-2">Mot de passe oublié 🔑</p>
                </div>

                {/* Card */}
                <div className="glass-hero rounded-[28px] p-6">
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4 text-center py-4"
                        >
                            <div className="w-16 h-16 rounded-[20px] glass-card flex items-center justify-center">
                                <MailCheck size={28} className="text-primary" />
                            </div>
                            <div>
                                <p className="font-black text-white text-lg mb-1">Email envoyé !</p>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.
                                </p>
                            </div>
                            <Link to="/login" className="btn-primary px-8 py-3 text-sm font-black mt-2">
                                Retour à la connexion
                            </Link>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <p className="text-sm text-text-muted leading-relaxed mb-4">
                                    Saisis ton email et on t'envoie un lien pour réinitialiser ton mot de passe.
                                </p>
                            </div>

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

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
                                <input
                                    type="email"
                                    placeholder="Ton email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full glass-card rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3.5 text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Envoyer le lien'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
