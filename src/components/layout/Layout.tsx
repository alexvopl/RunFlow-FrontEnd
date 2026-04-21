import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './BottomNav';

export function Layout() {
    const location = useLocation();
    const isWorkout = location.pathname === '/workout';

    return (
        <div className="app-shell min-h-screen bg-background text-text font-sans antialiased overflow-x-hidden selection:bg-primary/20">
            <AnimatePresence mode="wait">
                <motion.main
                    key={location.pathname}
                    initial={{ opacity: 0, y: isWorkout ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: isWorkout ? 0 : -8 }}
                    transition={{ duration: isWorkout ? 0.15 : 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
                    className={isWorkout ? 'app-main' : 'app-main pb-32 pt-safe'}
                >
                    <Outlet />
                </motion.main>
            </AnimatePresence>
            {!isWorkout && <BottomNav />}
        </div>
    );
}
