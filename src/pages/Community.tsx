import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Trophy, MessageCircle, Star, Zap, X, Send, Plus, Search, UserMinus } from 'lucide-react';

export function Community() {
    const [showChat, setShowChat] = useState(false);
    const [isInClan, setIsInClan] = useState(true); // Toggle this to test "No Clan" state

    return (
        <div className="pt-6 px-4 relative min-h-screen pb-20">
            <AnimatePresence>
                {showChat && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowChat(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: "10%" }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 top-0 bg-secondary rounded-t-3xl z-50 flex flex-col border-t border-white/10"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface/50 rounded-t-3xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <MessageCircle size={16} className="text-primary" />
                                    </div>
                                    <span className="font-bold">Chat de Clan</span>
                                </div>
                                <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex-shrink-0" />
                                    <div className="bg-surface p-3 rounded-2xl rounded-tl-sm border border-white/5">
                                        <div className="text-xs text-blue-400 font-bold mb-1">Sarah K.</div>
                                        <p className="text-sm">Super course tout le monde ! On continue pour la guerre !</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0" />
                                    <div className="bg-primary/10 p-3 rounded-2xl rounded-tr-sm">
                                        <p className="text-sm text-primary">Je fais mon 10k ce soir. Let's go!</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-surface border-t border-white/5 mb-safe pb-8">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Message..."
                                        className="flex-1 bg-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                    <button className="p-3 bg-primary text-black rounded-xl font-bold">
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {!isInClan ? (
                <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
                    <div className="w-24 h-24 bg-surface rounded-3xl flex items-center justify-center mb-4 border border-white/10">
                        <Users size={40} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase mb-2">Rejoignez un Clan</h1>
                        <p className="text-text-muted px-8">Courez ensemble, progressez ensemble et participez aux guerres de clans.</p>
                    </div>

                    <div className="w-full space-y-3">
                        <button
                            onClick={() => setIsInClan(true)} // Mock join
                            className="w-full py-4 bg-primary text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90"
                        >
                            <Search size={20} />
                            Trouver un clan
                        </button>
                        <button className="w-full py-4 bg-surface border border-white/10 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5">
                            <Plus size={20} />
                            Créer mon clan
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Clan Header / Banner */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-b from-secondary to-surface rounded-3xl p-6 border border-white/10 text-center relative overflow-hidden group"
                    >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => { if (confirm('Quitter le clan ?')) setIsInClan(false); }}
                                className="p-2 bg-black/20 hover:bg-red-500/20 text-text-muted hover:text-red-500 rounded-full transition-colors"
                                title="Quitter le clan"
                            >
                                <UserMinus size={16} />
                            </button>
                        </div>

                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-emerald-600 rounded-2xl rotate-45 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(190,242,100,0.2)] border-4 border-surface z-10 relative">
                            <div className="-rotate-45">
                                <Shield size={40} className="text-black" fill="currentColor" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-black uppercase tracking-wide mb-1">Night Runners</h1>
                        <p className="text-primary text-sm font-bold tracking-widest uppercase mb-4">Niveau 12</p>

                        {/* Clan Stats */}
                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                            <div className="text-center">
                                <div className="text-xs text-text-muted uppercase font-bold mb-1">Membres</div>
                                <div className="font-bold flex items-center justify-center gap-1">
                                    <Users size={14} className="text-primary" />
                                    24/50
                                </div>
                            </div>
                            <div className="text-center border-l border-white/5">
                                <div className="text-xs text-text-muted uppercase font-bold mb-1">Guerres</div>
                                <div className="font-bold flex items-center justify-center gap-1">
                                    <Trophy size={14} className="text-yellow-500" />
                                    15V
                                </div>
                            </div>
                            <div className="text-center border-l border-white/5">
                                <div className="text-xs text-text-muted uppercase font-bold mb-1">Score</div>
                                <div className="font-bold">12,450</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                            onClick={() => setShowChat(true)}
                            className="bg-surface p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors active:scale-95"
                        >
                            <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                                <MessageCircle size={24} />
                            </div>
                            <span className="font-bold text-sm">Chat de Clan</span>
                        </button>
                        <button className="bg-surface p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors active:scale-95">
                            <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-400">
                                <Star size={24} />
                            </div>
                            <span className="font-bold text-sm">Dons</span>
                        </button>
                    </div>

                    {/* Member List (Top 3) */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Zap size={18} className="text-primary" /> Top Contributeurs
                        </h3>
                        <div className="space-y-3">
                            {[
                                { name: "Alex R.", role: "Chef", km: 154, color: "text-primary" },
                                { name: "Sarah K.", role: "Aîné", km: 142, color: "text-blue-400" },
                                { name: "Mike T.", role: "Membre", km: 120, color: "text-text-muted" },
                            ].map((member, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="font-black text-text-muted/50 w-6">{i + 1}</div>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 bg-cover bg-center" />
                                        <div>
                                            <div className={`font-bold ${member.color} text-sm`}>{member.name}</div>
                                            <div className="text-xs text-text-muted">{member.role}</div>
                                        </div>
                                    </div>
                                    <div className="font-mono font-bold text-lg">{member.km} <span className="text-xs text-text-muted">km</span></div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
