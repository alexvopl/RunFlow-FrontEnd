import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedLayout() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="app-shell min-h-screen bg-background flex items-center justify-center p-6">
                <div className="premium-panel w-full max-w-sm p-8 text-center">
                    <div className="icon-badge mx-auto mb-4">
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                    <p className="page-eyebrow mb-2">RunFlow</p>
                    <p className="text-sm font-semibold text-white">Chargement de votre espace</p>
                    <p className="text-xs text-text-muted mt-2">Préparation du plan, des stats et de la navigation.</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
