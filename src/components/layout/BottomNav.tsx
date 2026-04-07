import { Calendar, Users, User, Activity, Swords } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const navItems = [
    { path: '/', icon: Calendar, label: 'Plan' },
    { path: '/activities', icon: Activity, label: 'Activités' },
    { path: '/community', icon: Users, label: 'Clan' },
    { path: '/challenges', icon: Swords, label: 'Défis' },
    { path: '/profile', icon: User, label: 'Profil' },
];

export function BottomNav() {
    const location = useLocation();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 nav-backdrop border-t border-white/[0.06]">
            <div className="safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <nav className="flex justify-around items-center max-w-md mx-auto h-16 px-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex flex-col items-center justify-center flex-1 py-1 relative press-effect"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill"
                                        className="absolute inset-x-1 top-0 bottom-0 bg-white/6 rounded-2xl -z-10"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <div className={clsx(
                                    'relative transition-all duration-200',
                                    isActive ? 'text-primary' : 'text-zinc-500'
                                )}>
                                    <item.icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                        className="transition-all duration-200"
                                    />
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-dot"
                                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </div>
                                <span className={clsx(
                                    'text-[9px] font-bold mt-1.5 tracking-wider uppercase transition-all duration-200',
                                    isActive ? 'text-primary opacity-100' : 'text-zinc-600 opacity-80'
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
