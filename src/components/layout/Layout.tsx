import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function Layout() {
    return (
        <div className="min-h-screen bg-background text-text font-sans antialiased overflow-x-hidden selection:bg-primary/20">
            <main className="pb-28">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}
