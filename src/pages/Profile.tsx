import { useState, useEffect } from 'react';
import { Settings, Gift, ChevronRight, Footprints, ShoppingBag, Heart, Bell, Crown, LogOut, Smartphone, ShieldCheck, Check, AlertCircle, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { SocialModal } from '../components/profile/SocialModal';
import { TrophyCompareModal } from '../components/profile/TrophyCompareModal';
import { api } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'loading';

interface Toast {
    type: ToastType;
    message: string;
}

export function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [socialModal, setSocialModal] = useState<{ isOpen: boolean; title: string } | null>(null);
    const [isTrophyModalOpen, setIsTrophyModalOpen] = useState(false);
    const [stravaStatus, setStravaStatus] = useState<{ connected: boolean; athlete?: any } | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [stravaLoading, setStravaLoading] = useState<'connect' | 'sync' | 'disconnect' | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (type: ToastType, message: string, duration = 3500) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), duration);
        }
    };

    const fetchData = async () => {
        try {
            const [statusRes, countRes] = await Promise.all([
                api.get('/strava/status'),
                api.get('/notifications/unread-count')
            ]);
            setStravaStatus(statusRes.data);
            setUnreadCount(countRes.data.count);
        } catch (error) {
            console.error('Failed to fetch profile data', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStravaConnect = async () => {
        setStravaLoading('connect');
        try {
            const response = await api.get('/strava/auth-url');
            window.location.href = response.data.url;
        } catch (error: any) {
            setStravaLoading(null);
            if (error.response?.status === 500) {
                showToast('error', 'Configuration Strava manquante côté serveur. Contactez le support.');
            } else {
                showToast('error', 'Impossible de se connecter à Strava. Réessayez.');
            }
        }
    };

    const handleStravaSync = async () => {
        setStravaLoading('sync');
        showToast('loading', 'Synchronisation en cours…');
        try {
            await api.post('/strava/sync');
            setStravaLoading(null);
            showToast('success', 'Activités Strava synchronisées !');
        } catch {
            setStravaLoading(null);
            showToast('error', 'Échec de la synchronisation Strava.');
        }
    };

    const handleStravaDisconnect = async () => {
        setStravaLoading('disconnect');
        try {
            await api.delete('/strava/disconnect');
            setStravaStatus({ connected: false });
            setStravaLoading(null);
            showToast('success', 'Compte Strava déconnecté.');
        } catch (error: any) {
            if (error?.response?.status === 404 || error?.response?.status === 204) {
                setStravaStatus({ connected: false });
                setStravaLoading(null);
                showToast('success', 'Compte Strava déconnecté.');
                return;
            }
            console.error('[Strava] disconnect error:', error?.response?.status, error?.response?.data);
            setStravaLoading(null);
            showToast('error', `Échec de la déconnexion (${error?.response?.status ?? 'réseau'})`);
        }
    };

    const displayName = user?.name || user?.email?.split('@')[0] || 'Utilisateur';
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen pb-36 runna-screen">

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 inset-x-4 z-[100] max-w-sm mx-auto pointer-events-none"
                    >
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${
                            toast.type === 'success' ? 'bg-green-500/15 border-green-500/25 text-green-400' :
                            toast.type === 'error' ? 'bg-red-500/15 border-red-500/25 text-red-400' :
                            'bg-white/8 border-white/10 text-white'
                        }`}>
                            {toast.type === 'success' && <Check size={15} className="flex-shrink-0" />}
                            {toast.type === 'error' && <AlertCircle size={15} className="flex-shrink-0" />}
                            {toast.type === 'loading' && <Loader2 size={15} className="animate-spin flex-shrink-0" />}
                            <span className="text-sm font-bold">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />

            <div className="px-4 pt-6 space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-black tracking-tight text-white">Profil</h1>
                    <div className="flex gap-1.5">
                        <Link to="/notifications" className="relative w-10 h-10 flex items-center justify-center bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 transition-colors">
                            <Bell size={18} className="text-text-muted" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 transition-colors"
                        >
                            <Settings size={18} className="text-text-muted" />
                        </button>
                    </div>
                </div>

                {/* Avatar + Identity */}
                <div className="plan-hero-card rounded-[28px] p-6 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className="w-20 h-20 rounded-[22px] bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <span className="text-2xl font-black text-gradient">{initials}</span>
                        </div>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-surface border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <Settings size={12} className="text-text-muted" />
                        </button>
                    </div>

                    <h2 className="text-xl font-black tracking-tight mb-0.5">{displayName}</h2>
                    <p className="text-text-muted text-xs font-medium mb-5">{user?.email}</p>

                    <div className="flex items-center gap-8 mb-5">
                        <button onClick={() => setSocialModal({ isOpen: true, title: 'Abonnés' })} className="flex flex-col items-center gap-0.5 group">
                            <span className="text-xl font-black group-hover:text-primary transition-colors">{user?.followersCount || 0}</span>
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Abonnés</span>
                        </button>
                        <div className="w-px h-8 bg-white/8" />
                        <button onClick={() => setSocialModal({ isOpen: true, title: 'Abonnements' })} className="flex flex-col items-center gap-0.5 group">
                            <span className="text-xl font-black group-hover:text-primary transition-colors">{user?.followingCount || 0}</span>
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Abonnements</span>
                        </button>
                        <div className="w-px h-8 bg-white/8" />
                        <button onClick={() => setIsTrophyModalOpen(true)} className="flex flex-col items-center gap-0.5 group">
                            <span className="text-xl font-black text-amber-400 group-hover:text-amber-300 transition-colors">{user?.trophies || 0}</span>
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Trophées</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="btn-ghost px-5 py-2.5 text-xs"
                    >
                        Modifier le profil
                    </button>
                </div>

                {/* Strava */}
                <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Connexions</h3>
                    <div className={`runna-card rounded-[22px] border overflow-hidden transition-all ${stravaStatus?.connected ? 'border-orange-500/20' : 'border-white/6'}`}>
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${stravaStatus?.connected ? 'bg-orange-500' : 'bg-white/6 border border-white/8'}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill={stravaStatus?.connected ? 'white' : '#71717a'}>
                                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-sm">Strava</span>
                                        {stravaStatus?.connected && (
                                            <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[8px] font-black rounded uppercase tracking-wide">Connecté</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                        {stravaStatus?.connected
                                            ? `${stravaStatus.athlete?.firstname || ''} ${stravaStatus.athlete?.lastname || ''}`.trim() || 'Compte associé'
                                            : 'Synchronise tes activités automatiquement'}
                                    </p>
                                </div>
                                {stravaStatus?.connected ? (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={handleStravaSync}
                                            disabled={!!stravaLoading}
                                            className="w-9 h-9 flex items-center justify-center bg-orange-500/10 text-orange-400 rounded-xl hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                                        >
                                            {stravaLoading === 'sync' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                                        </button>
                                        <button
                                            onClick={handleStravaDisconnect}
                                            disabled={!!stravaLoading}
                                            className="w-9 h-9 flex items-center justify-center bg-white/5 text-text-muted rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                                        >
                                            {stravaLoading === 'disconnect' ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleStravaConnect}
                                        disabled={!!stravaLoading}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 active:scale-[0.97] transition-all disabled:opacity-50"
                                    >
                                        {stravaLoading === 'connect' ? <Loader2 size={13} className="animate-spin" /> : null}
                                        Connecter
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Premium Banner */}
                <div className="plan-hero-card rounded-[28px] p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="rf-tag mb-3">Premium</div>
                            <h3 className="font-black text-base tracking-tight mb-1.5">Passe au niveau supérieur</h3>
                            <p className="text-xs text-text-muted leading-relaxed mb-4">Plans illimités, coaching IA avancé, analytics détaillés.</p>
                            <button
                                onClick={() => showToast('success', 'Fonctionnalité Premium bientôt disponible 🚀')}
                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all"
                            >
                                S'abonner
                            </button>
                        </div>
                        <Crown size={40} className="text-primary/20 flex-shrink-0 mt-1" />
                    </div>
                </div>

                {/* Settings */}
                <div className="space-y-5">
                    <div>
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Mon compte</h3>
                        <div className="bg-surface rounded-[22px] border border-white/6 overflow-hidden divide-y divide-white/5">
                            {[
                                { icon: Footprints, label: 'Mon équipement' },
                                { icon: ShoppingBag, label: 'Mes offres' },
                                { icon: Gift, label: 'Programme de parrainage' },
                            ].map((item, i) => (
                                <div key={i} className="w-full p-4 flex items-center gap-3 opacity-40 cursor-not-allowed">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-text-muted">
                                        <item.icon size={16} />
                                    </div>
                                    <span className="flex-1 text-sm font-bold">{item.label}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-text-muted border border-white/10 rounded px-1.5 py-0.5">Bientôt</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Préférences</h3>
                        <div className="bg-surface rounded-[22px] border border-white/6 overflow-hidden divide-y divide-white/5">
                            {[
                                { icon: Heart, label: 'Zones cardiaques', path: null },
                                { icon: Smartphone, label: 'Apparence', path: null },
                                { icon: Bell, label: 'Notifications', path: '/notifications' },
                                { icon: ShieldCheck, label: 'Confidentialité', path: null },
                            ].map((item, i) => (
                                item.path ? (
                                    <button
                                        key={i}
                                        onClick={() => navigate(item.path!)}
                                        className="w-full p-4 flex items-center gap-3 hover:bg-white/4 transition-colors group text-left"
                                    >
                                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-text-muted group-hover:text-white group-hover:bg-white/10 transition-colors">
                                            <item.icon size={16} />
                                        </div>
                                        <span className="flex-1 text-sm font-bold">{item.label}</span>
                                        <ChevronRight size={14} className="text-text-muted/30 group-hover:text-text-muted transition-colors" />
                                    </button>
                                ) : (
                                    <div key={i} className="w-full p-4 flex items-center gap-3 opacity-40 cursor-not-allowed">
                                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-text-muted">
                                            <item.icon size={16} />
                                        </div>
                                        <span className="flex-1 text-sm font-bold">{item.label}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-text-muted border border-white/10 rounded px-1.5 py-0.5">Bientôt</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full py-3.5 bg-red-500/6 text-red-400 border border-red-500/10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98]"
                    >
                        <LogOut size={15} />
                        Se déconnecter
                    </button>

                    <p className="text-center text-[9px] font-bold text-text-muted/25 uppercase tracking-widest pb-4">RunFlow v1.1.0</p>
                </div>
            </div>

            <SocialModal
                isOpen={!!socialModal?.isOpen}
                onClose={() => setSocialModal(null)}
                title={socialModal?.title || ''}
            />

            <TrophyCompareModal
                isOpen={isTrophyModalOpen}
                onClose={() => setIsTrophyModalOpen(false)}
                userTrophies={user?.trophies || 0}
            />
        </div>
    );
}
