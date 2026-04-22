import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, Check } from 'lucide-react';

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
            setError('You must accept the terms and conditions');
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
            setError(message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">RunFlow</h1>
                    <p className="text-text-muted">Create your account</p>
                </div>

                {pendingConfirmationEmail ? (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-5 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <Check size={32} />
                        <div>
                            <p className="font-bold mb-1">Account created</p>
                            <p className="text-sm text-green-400/70">
                                Check the inbox for <span className="font-semibold text-green-300">{pendingConfirmationEmail}</span> and confirm your email before signing in.
                            </p>
                        </div>
                        <Link
                            to="/login"
                            className="mt-2 px-6 py-2 bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors text-white"
                        >
                            Back to login
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

                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-text-muted" size={20} />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-surface border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-text-muted" size={20} />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-surface border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-3 p-1 cursor-pointer group">
                                <div
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${acceptTerms ? 'bg-primary border-primary' : 'border-text-muted bg-transparent'}`}
                                    onClick={() => setAcceptTerms(!acceptTerms)}
                                >
                                    {acceptTerms && <Check size={14} className="text-black" />}
                                </div>
                                <span className="text-sm text-text-muted select-none group-hover:text-white transition-colors" onClick={() => setAcceptTerms(!acceptTerms)}>
                                    I accept the <a href="#" className="underline">Terms</a>
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-black font-bold py-4 rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign Up'}
                        </button>
                    </form>
                )}

                <div className="text-center text-sm text-text-muted">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-bold hover:underline">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
