import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from './OfflineBanner';
import { ErrorBoundary } from './ErrorBoundary';

export function Layout() {
    const location = useLocation();
    const isWorkout = location.pathname === '/workout';

    return (
        <div className="app-shell min-h-screen bg-background text-text font-sans antialiased overflow-x-hidden selection:bg-primary/20">
            <OfflineBanner />
            <AnimatePresence mode="wait">
                <motion.main
                    key={location.pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: isWorkout ? 0.15 : 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
                    className={isWorkout ? 'app-main' : 'app-main pb-32 pt-safe'}
                >
                    <Suspense fallback={<PageFallback />}>
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </Suspense>
                </motion.main>
            </AnimatePresence>
            {!isWorkout && <BottomNav />}
        </div>
    );
}

function PageFallback() {
    return (
        <div className="px-5 pt-7 pb-28 space-y-5">
            <div className="skeleton h-8 w-40 rounded-xl" />
            <div className="skeleton h-56 rounded-[28px]" />
            <div className="skeleton h-32 rounded-[28px]" />
            <div className="space-y-3">
                <div className="skeleton h-16 rounded-[20px]" />
                <div className="skeleton h-16 rounded-[20px]" />
                <div className="skeleton h-16 rounded-[20px]" />
            </div>
        </div>
    );
}
