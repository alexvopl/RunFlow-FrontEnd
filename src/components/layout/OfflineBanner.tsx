import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineBanner() {
    const isOnline = useNetworkStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    key="offline-banner"
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed top-0 inset-x-0 z-50 flex justify-center pt-safe pointer-events-none"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
                >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/95 border border-slate-700/60 backdrop-blur-md shadow-xl">
                        <WifiOff size={13} className="text-amber-400 flex-shrink-0" />
                        <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                            Hors ligne
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
