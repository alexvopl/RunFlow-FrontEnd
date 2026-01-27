import { Settings, Gift, ChevronRight, LayoutGrid, Footprints, ShoppingBag, Scan, Dumbbell, Smartphone, Ruler, Heart, Bell, Globe, Paintbrush, ShieldCheck, Sun, Crown, LogOut } from 'lucide-react';

export function Profile() {
    return (
        <div className="pt-6 px-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-xl font-bold">Mon Profil</h1>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-full">
                        <Settings size={22} />
                    </button>
                    <button className="p-2 hover:bg-white/5 rounded-full">
                        <Gift size={22} />
                    </button>
                </div>
            </div>

            {/* Profile Card */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-3">
                    <span className="text-3xl font-bold text-black">A</span>
                </div>
                <h2 className="text-xl font-bold">Alex</h2>
                <p className="text-xs text-text-muted mb-4">Utilisateur depuis déc. 2025</p>
                <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold tracking-wide uppercase hover:bg-white/10 transition-colors">
                    Modifier le profil
                </button>
            </div>

            {/* Premium Banner */}
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-2xl p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Crown size={80} />
                </div>
                <h3 className="font-bold text-lg mb-1">Alex, rejoignez RunFlow Premium</h3>
                <p className="text-xs text-emerald-100 mb-4 max-w-[80%]">Abonnez-vous pour débloquer le reste de vos semaines et atteindre votre plein potentiel.</p>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                    <span>S'abonner</span>
                    <span className="text-white/50">Restaurer</span>
                </div>
            </div>

            {/* Referral Banner */}
            <div className="bg-surface border border-white/5 rounded-2xl p-4 mb-6 relative overflow-hidden shadow-lg shadow-purple-500/5">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-purple-500" />
                <div className="flex gap-4 items-center">
                    <div className="p-3 bg-white/5 rounded-xl">
                        <Gift size={20} className="text-yellow-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm">Parrainez un(e) ami(e)</h3>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                            Chaque ami(e) parrainé(e) vous permet de gagner un bon d'achat. Invitez tous vos camarades de course !
                        </p>
                    </div>
                    <ChevronRight size={16} className="text-text-muted" />
                </div>
            </div>

            <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden mb-6">
                <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="text-sm font-medium">Code de parrainage</span>
                    <ChevronRight size={16} className="text-text-muted" />
                </div>
            </div>

            <div className="space-y-6">
                {/* Section Mes Infos */}
                <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase mb-3 pl-2">Mes Infos</h3>
                    <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                        {[
                            { icon: LayoutGrid, label: "Applications et appareils connectés" },
                            { icon: Footprints, label: "Chaussures" },
                            { icon: ShoppingBag, label: "Offres" },
                            { icon: Scan, label: "Code-barres parkrun" },
                        ].map((item, i) => (
                            <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
                                <item.icon size={20} className="text-text-muted" />
                                <span className="flex-1 text-sm font-medium">{item.label}</span>
                                {item.icon === LayoutGrid && <span className="text-[10px] bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded mr-2 font-bold">STRAVA</span>}
                                <ChevronRight size={16} className="text-text-muted" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section Mes Préférences */}
                <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase mb-3 pl-2">Mes Préférences</h3>
                    <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                        {[
                            { icon: Dumbbell, label: "Séances d'entraînement" },
                            { icon: Smartphone, label: "Enregistrement par téléphone" },
                            { icon: Ruler, label: "Unités" },
                            { icon: Heart, label: "Les zones de fréquence cardiaque" },
                            { icon: Bell, label: "Notifications" },
                            { icon: Globe, label: "Langue" },
                            { icon: Paintbrush, label: "Icône de l'application" },
                            { icon: Sun, label: "Thème" },
                            { icon: ShieldCheck, label: "Confidentialité" },
                        ].map((item, i) => (
                            <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
                                <item.icon size={20} className="text-text-muted" />
                                <span className="flex-1 text-sm font-medium">{item.label}</span>
                                <ChevronRight size={16} className="text-text-muted" />
                            </div>
                        ))}
                    </div>
                </div>

                <button className="w-full py-4 bg-surface text-white border border-white/5 rounded-2xl font-bold flex items-center justify-center gap-2 mb-4 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-colors">
                    <LogOut size={18} />
                    Se déconnecter
                </button>

                <div className="text-center pb-8 p-4">
                    <span className="text-xs text-text-muted/50">Version 1.0.2 (Build 45)</span>
                </div>
            </div>
        </div>
    );
}
