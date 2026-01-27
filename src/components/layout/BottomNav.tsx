import { Calendar, Users, User, Activity } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const navItems = [
    { path: '/', icon: Calendar, label: 'Plan' },
    { path: '/activities', icon: Activity, label: 'Activities' },
    { path: '/community', icon: Users, label: 'Community' },
    { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
    const location = useLocation();

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg border-t border-white/5 pb-safe pt-2 px-4 z-50">
            <nav className="flex justify-between items-center max-w-md mx-auto relative">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex flex-col items-center justify-center w-full py-2 relative group"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-bg"
                                    className="absolute inset-0 top-0 bg-white/5 rounded-xl -z-10 mx-2"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <div className={clsx("relative p-1.5 transition-colors duration-200", isActive ? "text-primary" : "text-text-muted group-hover:text-text")}>
                                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={clsx("text-[10px] font-medium mt-0.5 transition-colors duration-200", isActive ? "text-primary" : "text-text-muted group-hover:text-text")}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
            {/* Safe area padding for iPhone home indicator if needed, handled by pb-safe usually or padding-bottom */}
            <div className="h-6 w-full" />
        </div>
    );
}
