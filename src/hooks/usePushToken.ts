import { useEffect } from 'react';
import { api } from '../services/api';

const STORAGE_KEY = 'runflow_push_token_v1';

function vapidToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from([...atob(b64)].map(c => c.charCodeAt(0)));
}

export async function registerPushToken(): Promise<void> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidKey) return;
    if (Notification.permission !== 'granted') return;

    const stored = sessionStorage.getItem(STORAGE_KEY);

    try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidToUint8Array(vapidKey),
        });
        const token = JSON.stringify(sub);
        if (token === stored) return;
        await api.post('/notifications/push-tokens', { token, platform: 'web' });
        sessionStorage.setItem(STORAGE_KEY, token);
    } catch (err) {
        console.error('Failed to register push token:', err);
    }
}

export async function unregisterPushToken(): Promise<void> {
    const token = sessionStorage.getItem(STORAGE_KEY);
    if (!token) return;
    await api.delete('/notifications/push-tokens', { data: { token } }).catch(() => {});
    sessionStorage.removeItem(STORAGE_KEY);
}

export function usePushToken(): void {
    useEffect(() => {
        void registerPushToken();
    }, []);
}
