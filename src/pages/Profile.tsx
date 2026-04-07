import { useState, useEffect } from 'react';
import { Settings, Gift, ChevronRight, Footprints, ShoppingBag, Heart, Bell, Crown, LogOut, Smartphone, ShieldCheck, Check, AlertCircle, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { SocialModal } from '../components/profile/SocialModal';
import { TrophyCompareModal } from '../components/profile/TrophyCompareModal';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'loading';

interface Toast {
    type: ToastType;
    message: string;
}

export function Profile() {
    const { user, logout } = useAuth();
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
        } catch (error) {
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
            // 404 means already disconnected — treat as success
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
        <div className="min-h-screen pb-36">
            {/* === Toast notification === */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -60 }}
                        className="fixed top-4 inset-x-4 z-[100] max-w-sm mx-auto pointer-events-none"
                    >
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-lg ${toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                            toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                                'bg-white/10 border-white/10 text-white'
                            }`}>
                            {toast.type === 'success' && <Check size={16} className="flex-shrink-0" />}
                            {toast.type === 'error' && <AlertCircle size={16} className="flex-shrink-0" />}
                            {toast.type === 'loading' && <Loader2 size={16} className="animate-spin flex-shrink-0" />}
                            <span className="text-sm font-bold">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />

            <div className="px-4">
                {/* === Header === */}
                <div className="flex justify-between items-center pt-4 mb-8">
                    <h1 className="text-xl font-black uppercase tracking-tight">Profil</h1>
                    <div className="flex gap-1">
                        <Link to="/notifications" className="relative p-2.5 hover:bg-white/5 rounded-xl transition-colors">
                            <Bell size={20} className="text-text-muted" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-black text-[9px] font-black rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                        <button className="p-2.5 hover:bg-white/5 rounded-xl transition-colors">
                            <Settings size={20} className="text-text-muted" />
                        </button>
                    </div>
                </div>

                {/* === Avatar + Identity === */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
                            <span className="text-3xl font-black text-gradient">{initials}</span>
                        </div>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="absolute -bottom-2 -right-2 w-8 h-8 bg-surface border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg"
                        >
                            <Settings size={14} className="text-text-muted" />
                        </button>
                    </div>

                    <h2 className="text-2xl font-black uppercase tracking-tight mb-0.5">{displayName}</h2>
                    <p className="text-text-muted text-xs font-medium mb-4">{user?.email}</p>

                    {/* Social stats */}
                    <div className="flex items-center gap-8 mb-5">
                        <button onClick={() => setSocialModal({ isOpen: true, title: 'Abonnés' })} className="flex flex-col items-center group">
                            <span className="text-xl font-black leading-none group-hover:text-primary transition-colors">{user?.followersCount || 0}</span>
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Abonnés</span>
                        </button>
                        <div className="w-px h-8 bg-white/[0.08]" />
                        <button onClick={() => setSocialModal({ isOpen: true, title: 'Abonnements' })} className="flex flex-col items-center group">
                            <span className="text-xl font-black leading-none group-hover:text-primary transition-colors">{user?.followingCount || 0}</span>
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Abonnements</span>
                        </button>
                        <div className="w-px h-8 bg-white/[0.08]" />
                        <button onClick={() => setIsTrophyModalOpen(true)} className="flex flex-col items-center group">
                            <span className="text-xl font-black leading-none text-amber-400 group-hover:text-amber-300 transition-colors">{user?.trophies || 0}</span>
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Trophées</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase hover:bg-white/10 transition-colors"
                    >
                        Modifier le profil
                    </button>
                </div>

                {/* === Strava Connection Card === */}
                <div className="mb-6">
                    <h3 className="section-label">Connexions</h3>
                    <div className={`bg-surface rounded-3xl border overflow-hidden shadow-xl transition-all ${stravaStatus?.connected ? 'border-orange-500/20' : 'border-white/5'}`}>
                        <div className="p-5">
                            <div className="flex items-center gap-4">
                                {/* Strava orange logo-like icon */}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${stravaStatus?.connected ? 'bg-orange-500' : 'bg-white/5'}`}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill={stravaStatus?.connected ? 'white' : '#a1a1aa'}>
                                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-sm uppercase tracking-tight">Strava</span>
                                        {stravaStatus?.connected && (
                                            <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-500 text-[9px] font-black rounded-md uppercase tracking-wider">Connecté</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                        {stravaStatus?.connected
                                            ? `Compte : ${stravaStatus.athlete?.firstname || ''} ${stravaStatus.athlete?.lastname || ''}`.trim() || 'Compte associé'
                                            : 'Synchronise tes activités automatiquement'}
                                    </p>
                                </div>

                                {stravaStatus?.connected ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleStravaSync}
                                            disabled={!!stravaLoading}
                                            className="w-9 h-9 flex items-center justify-center bg-orange-500/10 text-orange-500 rounded-xl hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                                        >
                                            {stravaLoading === 'sync' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                        </button>
                                        <button
                                            onClick={handleStravaDisconnect}
                                            disabled={!!stravaLoading}
                                            className="w-9 h-9 flex items-center justify-center bg-white/5 text-text-muted rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
                                        >
                                            {stravaLoading === 'disconnect' ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleStravaConnect}
                                        disabled={!!stravaLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 active:scale-[0.97] transition-all disabled:opacity-50"
                                    >
                                        {stravaLoading === 'connect' ? <Loader2 size={14} className="animate-spin" /> : null}
                                        Connecter
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* === Premium Banner === */}
                <div className="bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-primary/15 rounded-3xl p-6 mb-6 relative overflow-hidden shadow-2xl">
                    <Crown size={80} className="absolute -bottom-3 -right-3 text-primary/6 rotate-12" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 rounded-lg mb-3">
                            <Crown size={12} className="text-primary" fill="currentColor" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Premium</span>
                        </div>
                        <h3 className="font-black text-lg uppercase tracking-tight mb-2">Passez au niveau supérieur</h3>
                        <p className="text-xs text-text-muted mb-4 leading-relaxed font-medium max-w-xs">
                            Plans illimités, coaching IA avancé, analytics détaillés.
                        </p>
                        <button className="px-5 py-2.5 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all shadow-lg shadow-primary/20">
                            S'abonner
                        </button>
                    </div>
                </div>

                {/* === Settings Sections === */}
                <div className="space-y-5">
                    <div>
                        <h3 className="section-label">Mon compte</h3>
                        <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden divide-y divide-white/5 shadow-lg">
                            {[
                                { icon: Footprints, label: 'Mon équipement' },
                                { icon: ShoppingBag, label: 'Mes offres' },
                                { icon: Gift, label: 'Programme de parrainage' },
                            ].map((item, i) => (
                                <button key={i} className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group text-left">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-text-muted group-hover:text-white group-hover:bg-white/10 transition-colors">
                                        <item.icon size={18} />
                                    </div>
                                    <span className="flex-1 text-sm font-bold">{item.label}</span>
                                    <ChevronRight size={16} className="text-text-muted/30 group-hover:text-text-muted transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="section-label">Préférences</h3>
                        <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden divide-y divide-white/5 shadow-lg">
                            {[
                                { icon: Heart, label: 'Zones cardiaques' },
                                { icon: Smartphone, label: 'Apparence' },
                                { icon: Bell, label: 'Notifications', path: '/notifications' },
                                { icon: ShieldCheck, label: 'Confidentialité' },
                            ].map((item, i) => (
                                <button key={i} className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group text-left">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-text-muted group-hover:text-white group-hover:bg-white/10 transition-colors">
                                        <item.icon size={18} />
                                    </div>
                                    <span className="flex-1 text-sm font-bold">{item.label}</span>
                                    <ChevronRight size={16} className="text-text-muted/30 group-hover:text-text-muted transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full py-4 bg-red-500/5 text-red-500 border border-red-500/10 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] duration-200"
                    >
                        <LogOut size={16} />
                        Se déconnecter
                    </button>

                    <div className="text-center py-4 opacity-25">
                        <span className="text-[9px] font-black uppercase tracking-widest">RunFlow v1.1.0 · Build 89</span>
                    </div>
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
