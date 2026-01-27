import { motion } from 'framer-motion';
import { Swords, Timer, ShieldAlert } from 'lucide-react';

export function Wars() {

    return (
        <div className="pt-6 px-4">
            <header className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-widest border border-red-500/20 mb-4">
                    <ShieldAlert size={12} />
                    War Active
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">Clan War</h1>
                <div className="flex items-center justify-center gap-2 text-text-muted mt-2">
                    <Timer size={16} />
                    <span className="font-mono">12:45:30 Remaining</span>
                </div>
            </header>

            {/* VS Card */}
            <div className="relative mb-12">
                <div className="flex justify-between items-center px-2 z-10 relative">
                    {/* Your Clan */}
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-primary rounded-2xl rotate-45 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(190,242,100,0.4)]">
                            <span className="text-black font-black -rotate-45 text-2xl">NR</span>
                        </div>
                        <div className="font-bold text-lg">Night Runners</div>
                        <div className="text-sm text-primary font-mono">1,245 XP</div>
                    </div>

                    <div className="font-black text-4xl italic text-text-muted/20 absolute left-1/2 -translate-x-1/2">VS</div>

                    {/* Enemy Clan */}
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-red-500 rounded-2xl rotate-12 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                            <span className="text-white font-black -rotate-12 text-2xl">DS</span>
                        </div>
                        <div className="font-bold text-lg">Dawn Striders</div>
                        <div className="text-sm text-red-500 font-mono">980 XP</div>
                    </div>
                </div>

                {/* Progress Bars */}
                <div className="mt-8 space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-bold uppercase mb-1">
                            <span className="text-primary">Us</span>
                            <span>78%</span>
                        </div>
                        <div className="h-4 bg-surface rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "78%" }}
                                className="h-full bg-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold uppercase mb-1">
                            <span className="text-red-500">Them</span>
                            <span>62%</span>
                        </div>
                        <div className="h-4 bg-surface rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "62%" }}
                                className="h-full bg-red-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Battle Log */}
            <div className="bg-surface/50 rounded-3xl p-6 border border-white/5">
                <h3 className="text-sm font-bold uppercase text-text-muted mb-4">Latest Battles</h3>
                <div className="space-y-4">
                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="mt-1">
                                <Swords size={16} className={i === 0 ? "text-primary" : "text-text-muted"} />
                            </div>
                            <div>
                                <div className="text-sm">
                                    <span className="font-bold text-white">Alex R.</span> just ran <span className="text-primary font-bold">10km</span>
                                </div>
                                <div className="text-xs text-text-muted mt-1">+15 War Points</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
