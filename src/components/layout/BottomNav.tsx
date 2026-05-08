import { Calendar, Users, User, Activity, Swords } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useUnreadCount } from '../../hooks/useUnreadCount';

const navItems = [
    { path: '/', icon: Calendar, label: 'Plan' },
    { path: '/activities', icon: Activity, label: 'Activités' },
    { path: '/community', icon: Users, label: 'Clan' },
    { path: '/challenges', icon: Swords, label: 'Défis' },
    { path: '/profile', icon: User, label: 'Profil' },
];

export function BottomNav() {
    const location = useLocation();
    const unreadCount = useUnreadCount();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
            <div className="safe-bottom max-w-md mx-auto pointer-events-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <nav className="floating-nav-shell flex justify-around items-center h-[74px] px-2 rounded-[28px]">
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
                                        className="absolute inset-x-1 top-1.5 bottom-1.5 rounded-[20px] -z-10"
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(90,178,255,0.18), rgba(59,130,246,0.09))',
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px rgba(90,178,255,0.18)',
                                        }}
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <div className={clsx(
                                    'relative transition-all duration-200',
                                    isActive ? 'text-primary' : 'text-slate-400'
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
                                    {item.path === '/profile' && unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center px-0.5">
                                            <span className="text-[8px] font-black text-white leading-none">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className={clsx(
                                    'text-[9px] font-bold mt-1.5 tracking-wider uppercase transition-all duration-200',
                                    isActive ? 'text-primary opacity-100' : 'text-slate-400 opacity-70'
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
