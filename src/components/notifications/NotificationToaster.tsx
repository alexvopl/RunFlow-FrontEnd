import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { usePolling } from '../../hooks/usePolling';
import { notifyInvalidation } from '../../services/queryInvalidation';
import {
    type Notification,
    getTypeCfg,
    resolveDeepLink,
    normalizeNotification,
} from '../../services/notifications';

const WATERMARK_KEY = 'runflow_notif_toast_watermark';
const POLL_INTERVAL_MS = 30_000;
const AUTO_DISMISS_MS = 6_000;
const MAX_VISIBLE = 3;

function readWatermark(): number {
    try {
        const raw = localStorage.getItem(WATERMARK_KEY);
        const parsed = raw ? Number(raw) : NaN;
        if (Number.isFinite(parsed)) return parsed;
    } catch {
        /* localStorage indisponible → on repart de maintenant */
    }
    // Première exécution : on ignore l'historique déjà présent (pas de flood).
    const now = Date.now();
    try { localStorage.setItem(WATERMARK_KEY, String(now)); } catch { /* ignore */ }
    return now;
}

function writeWatermark(ms: number) {
    try { localStorage.setItem(WATERMARK_KEY, String(ms)); } catch { /* ignore */ }
}

/**
 * Affiche les nouvelles notifications entrantes sous forme de bandeaux en haut
 * de l'écran (défis, guerres, clans…). Poll `/notifications`, ne montre que les
 * notifs non lues plus récentes que le dernier repère vu (localStorage), et
 * réutilise la config de types + les deep links de la page Notifications.
 *
 * Complète les push natives : celles-ci gèrent l'app en arrière-plan, ce
 * toaster gère l'app au premier plan.
 */
export function NotificationToaster() {
    const navigate = useNavigate();
    const [toasts, setToasts] = useState<Notification[]>([]);
    const watermarkRef = useRef<number>(readWatermark());
    const seenRef = useRef<Set<string>>(new Set());

    const poll = useCallback(async () => {
        try {
            const res = await api.get('/notifications', { params: { limit: 10 } });
            const raw = res.data?.notifications ?? res.data;
            const list: Notification[] = Array.isArray(raw) ? raw.map(normalizeNotification) : [];

            const fresh = list.filter((n) => {
                if (!n.id || n.isRead || seenRef.current.has(n.id)) return false;
                const t = Date.parse(n.createdAt);
                return Number.isFinite(t) && t > watermarkRef.current;
            });
            if (fresh.length === 0) return;

            fresh.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
            const newest = Date.parse(fresh[fresh.length - 1].createdAt);
            watermarkRef.current = newest;
            writeWatermark(newest);
            fresh.forEach((n) => seenRef.current.add(n.id));

            setToasts((prev) => [...prev, ...fresh].slice(-MAX_VISIBLE));
            // Garde le badge de non-lus (bottom nav) synchronisé.
            notifyInvalidation(['notifications']);
        } catch {
            /* silencieux : le prochain poll réessaiera */
        }
    }, []);

    usePolling(poll, { intervalMs: POLL_INTERVAL_MS, refetchOnFocus: true });

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const open = useCallback((n: Notification) => {
        dismiss(n.id);
        api.put(`/notifications/${n.id}/read`)
            .then(() => notifyInvalidation(['notifications']))
            .catch(() => {/* le badge se resynchronisera au prochain fetch */});
        const link = resolveDeepLink(n.type, n.data);
        if (link) navigate(link);
    }, [dismiss, navigate]);

    return (
        <div
            className="fixed inset-x-0 top-0 z-[70] px-3 pointer-events-none"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
        >
            <div className="mx-auto flex max-w-md flex-col gap-2">
                <AnimatePresence initial={false}>
                    {toasts.map((n) => (
                        <ToastCard key={n.id} notif={n} onOpen={open} onDismiss={dismiss} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function ToastCard({ notif, onOpen, onDismiss }: {
    notif: Notification;
    onOpen: (n: Notification) => void;
    onDismiss: (id: string) => void;
}) {
    const { icon: Icon, accent } = getTypeCfg(notif.type);

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(notif.id), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [notif.id, onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="pointer-events-auto"
        >
            <div
                onClick={() => onOpen(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpen(notif); }}
                className="glass-hero flex items-start gap-3 rounded-2xl border border-white/10 p-3.5 shadow-xl cursor-pointer transition-transform active:scale-[0.98]"
            >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${accent}`}>
                    <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white leading-tight truncate">{notif.title}</p>
                    <p className="text-xs text-text-muted leading-snug mt-0.5 line-clamp-2">{notif.body}</p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(notif.id); }}
                    className="flex-shrink-0 -m-1 p-1 text-text-muted/60 transition-colors hover:text-white"
                    aria-label="Fermer"
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
}
