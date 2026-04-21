import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface LeaderboardTabsProps {
    activeTab: 'players' | 'clans' | 'wars';
    onChange: (tab: 'players' | 'clans' | 'wars') => void;
}

export function LeaderboardTabs({ activeTab, onChange }: LeaderboardTabsProps) {
    const tabs = [
        { id: 'players', label: 'Joueurs' },
        { id: 'clans', label: 'Clans' },
        { id: 'wars', label: 'Guerres' },
    ] as const;

    return (
        <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-white/5 mb-6">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={clsx(
                        "flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all relative",
                        activeTab === tab.id ? "text-white" : "text-text-muted hover:text-white/80"
                    )}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="active-tab-bg"
                            className="absolute inset-0 bg-white/10 rounded-xl border border-white/10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
