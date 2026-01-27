import { useState } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { Play, ChevronRight, ClipboardList, LayoutGrid, FileEdit, Flag } from 'lucide-react';
import { clsx } from 'clsx';

export function Training() {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Verify date generation
    const dates = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

    return (
        <div className="pt-2 pb-20 bg-background min-h-screen">

            {/* Scrollable Content Container */}
            <div className="px-4 space-y-6">

                {/* Header - "Votre programme" logic from Screenshot 4 */}
                <div className="bg-surface rounded-3xl p-6 border border-white/5 relative overflow-hidden mt-4">

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-xl font-black leading-tight mb-2">Wizz Air Milano Marathon Plan</h1>
                            <div className="text-xs text-text-muted font-medium">Votre course : <span className="text-white font-bold">12 AVR. 2026</span></div>
                        </div>
                        <div className="w-12 h-14 bg-red-600 rounded-b-full rounded-t-lg shadow-lg shadow-red-900/20 flex flex-col items-center justify-center border-t border-red-500">
                            <div className="text-[10px] font-bold text-white/80">42km</div>
                            <div className="text-white font-black text-xs">Run</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex gap-1 mb-2">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/10'}`} />
                        ))}
                    </div>

                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <div className="text-xs text-text-muted mb-0.5">Semaines terminées</div>
                            <div className="text-2xl font-black">1/15</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-text-muted mb-0.5">Distance</div>
                            <div className="text-2xl font-black">990.3 <span className="text-sm font-normal text-text-muted">km</span></div>
                        </div>
                    </div>

                    <button className="w-full py-3 flex items-center justify-between text-sm font-bold border-t border-white/5 pt-4 hover:opacity-80">
                        <span className="flex items-center gap-2"><Flag size={16} /> Wizz Air Milano Marathon 12 avr. 2026</span>
                        <ChevronRight size={16} className="text-text-muted" />
                    </button>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <button className="bg-surface p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-3 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full border border-text-muted/30 flex items-center justify-center">
                            <ClipboardList size={20} className="text-text-muted" />
                        </div>
                        <span className="text-[10px] font-bold text-center leading-tight">Vue d'ensemble du programme</span>
                    </button>
                    <button className="bg-surface p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-3 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full border border-text-muted/30 flex items-center justify-center">
                            <LayoutGrid size={20} className="text-text-muted" />
                        </div>
                        <span className="text-[10px] font-bold text-center leading-tight">Applications connectées</span>
                    </button>
                    <button className="bg-surface p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-3 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full border border-text-muted/30 flex items-center justify-center">
                            <FileEdit size={20} className="text-text-muted" />
                        </div>
                        <span className="text-[10px] font-bold text-center leading-tight">Gérer le programme</span>
                    </button>
                </div>

                {/* Pace Info */}
                <div className="bg-surface rounded-3xl p-6 border border-white/5">
                    <h3 className="text-xs font-bold text-text-muted uppercase mb-2">Informations sur l'allure</h3>
                    <p className="text-sm mb-4">Nous ferons le suivi de vos séances de vitesse afin de maintenir votre entraînement sur la bonne voie.</p>
                    <button className="px-6 py-3 bg-white text-black font-black text-xs uppercase tracking-wide rounded-lg hover:bg-white/90">
                        C'est parti
                    </button>
                </div>

                {/* Calendar Strip (Legacy kept for daily view if needed below) */}
                <div className="pt-4 border-t border-white/5">
                    <h3 className="text-lg font-bold mb-4">Semaine en cours</h3>
                    <div className="flex overflow-x-auto no-scrollbar gap-3 pb-4">
                        {dates.map((date, i) => {
                            const isSelected = isSameDay(date, selectedDate);
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={clsx(
                                        "flex flex-col items-center min-w-[3.5rem] py-3 rounded-2xl border transition-all duration-300",
                                        isSelected
                                            ? "bg-primary text-background border-primary"
                                            : "bg-surface border-white/5 text-text-muted hover:bg-white/5"
                                    )}
                                >
                                    <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                                    <span className="text-lg font-bold mt-1">{format(date, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Workout Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2"
                    >
                        <div className="bg-gradient-to-br from-surface to-surface/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-75" />

                            <div className="flex justify-between items-start mb-6">
                                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                                    Aujourd'hui
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold mb-1">Long Run Intervals</h2>
                            <p className="text-text-muted text-sm mb-6">Course facile en endurance fondamentale.</p>

                            <div className="flex gap-6 mb-6">
                                <div>
                                    <div className="text-xl font-bold">45 min</div>
                                    <div className="text-[10px] text-text-muted uppercase font-bold">Durée</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold">8.5 km</div>
                                    <div className="text-[10px] text-text-muted uppercase font-bold">Distance</div>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-transform active:scale-[0.98]">
                                <Play size={18} fill="currentColor" />
                                Démarrer la séance
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
