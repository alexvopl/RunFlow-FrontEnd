import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Send, Loader2, AlertTriangle, RefreshCw, ChevronUp, MessageCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { timeAgo } from '../../utils/format';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMsg {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
    _pending?: boolean;
    _failed?: boolean;
}

interface MyUser {
    id: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string | null;
}

interface Props {
    clanId: string;
    clanName: string;
    myUser: MyUser;
    isOpen: boolean;
    onClose: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const MAX_CHARS = 500;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function msgName(msg: ChatMsg): string {
    return msg.displayName || msg.username || 'Inconnu';
}

function initial(name: string): string {
    return name.charAt(0).toUpperCase();
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MsgBubble({
    msg, isMine, grouped,
    onRetry,
}: {
    msg: ChatMsg;
    isMine: boolean;
    grouped: boolean;
    onRetry: (msg: ChatMsg) => void;
}) {
    const name = msgName(msg);
    return (
        <div className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'}`}>

            {/* Avatar */}
            {!grouped ? (
                <div
                    className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black self-end mb-0.5"
                    style={isMine
                        ? { background: 'rgba(90,178,255,0.18)', color: '#5ab2ff', border: '1px solid rgba(90,178,255,0.25)' }
                        : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
                    }
                >
                    {initial(name)}
                </div>
            ) : (
                <div className="w-7 flex-shrink-0" />
            )}

            <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Sender + time: only on first of group */}
                {!grouped && (
                    <div className="flex items-baseline gap-2 mb-0.5 px-1">
                        {!isMine && (
                            <span className="text-[9px] font-black text-white/40">{name}</span>
                        )}
                        <span className="text-[8px] text-white/20 font-mono">{timeAgo(msg.createdAt)}</span>
                    </div>
                )}

                {/* Bubble */}
                <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                    style={isMine
                        ? {
                            background: msg._pending ? 'rgba(90,178,255,0.08)' : 'rgba(90,178,255,0.16)',
                            border: msg._pending ? '1px solid rgba(90,178,255,0.14)' : '1px solid rgba(90,178,255,0.26)',
                            color: msg._failed ? 'rgba(255,255,255,0.4)' : '#e2f0ff',
                            opacity: msg._failed ? 0.7 : 1,
                        }
                        : {
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.85)',
                        }
                    }
                >
                    {msg.content}
                </div>

                {/* Sending indicator */}
                {msg._pending && (
                    <div className="flex items-center gap-1 mt-1 px-1">
                        <Loader2 size={8} className="animate-spin text-white/20" />
                        <span className="text-[8px] text-white/20 font-mono">Envoi…</span>
                    </div>
                )}

                {/* Failed + retry */}
                {msg._failed && (
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                        <AlertTriangle size={9} className="text-red-400" />
                        <span className="text-[8px] text-red-400 font-bold">Échec</span>
                        <button
                            onClick={() => onRetry(msg)}
                            className="flex items-center gap-0.5 text-[8px] text-primary font-black hover:text-primary/70 transition-colors"
                        >
                            <RefreshCw size={7} /> Réessayer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── ClanChat ──────────────────────────────────────────────────────────────────

export function ClanChat({ clanId, clanName, myUser, isOpen, onClose }: Props) {
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const tempCounter = useRef(0);
    // Used by useLayoutEffect to restore scroll after prepend
    const savedScrollHeight = useRef(0);
    const isOlderLoad = useRef(false);

    // ── Fetch ────────────────────────────────────────────────────────────────

    const fetchPage = useCallback(async (before?: string): Promise<ChatMsg[] | null> => {
        try {
            const params: Record<string, string> = { limit: String(PAGE_SIZE) };
            if (before) params.before = before;
            const res = await api.get(`/clans/${clanId}/messages`, { params });
            const raw: ChatMsg[] = Array.isArray(res.data?.messages) ? res.data.messages : [];
            // API returns newest-first; reverse for chronological display
            return raw.reverse();
        } catch {
            return null;
        }
    }, [clanId]);

    // ── Initial load ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen) return;
        setInitLoading(true);
        setMsgs([]);
        fetchPage().then(data => {
            if (data) {
                setMsgs(data);
                setHasMore(data.length >= PAGE_SIZE);
            }
            setInitLoading(false);
        });
    }, [isOpen, fetchPage]);

    // ── Scroll management ────────────────────────────────────────────────────

    // After msgs update: scroll to bottom (new message) or restore position (older load)
    useLayoutEffect(() => {
        if (!scrollRef.current) return;
        if (isOlderLoad.current) {
            // Restore relative scroll position so content doesn't jump
            const newHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = newHeight - savedScrollHeight.current;
            isOlderLoad.current = false;
        } else if (!initLoading) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [msgs, initLoading]);

    // ── Load older ───────────────────────────────────────────────────────────

    const handleLoadOlder = async () => {
        if (!msgs.length || loadingOlder) return;
        savedScrollHeight.current = scrollRef.current?.scrollHeight ?? 0;
        isOlderLoad.current = true;
        setLoadingOlder(true);
        const data = await fetchPage(msgs[0].createdAt);
        if (data) {
            setMsgs(prev => [...data, ...prev]);
            setHasMore(data.length >= PAGE_SIZE);
        } else {
            isOlderLoad.current = false;
        }
        setLoadingOlder(false);
    };

    // ── Send logic ───────────────────────────────────────────────────────────

    const doSend = useCallback(async (content: string, tempId: string) => {
        try {
            const res = await api.post(`/clans/${clanId}/messages`, { content });
            // After camelCase normalization: { id, clanId, userId, content, createdAt }
            const raw = res.data?.message ?? {};
            setMsgs(prev => prev.map(m =>
                m.id === tempId
                    ? { ...m, id: raw.id ?? m.id, createdAt: raw.createdAt ?? m.createdAt, _pending: false }
                    : m
            ));
        } catch {
            setMsgs(prev => prev.map(m =>
                m.id === tempId ? { ...m, _pending: false, _failed: true } : m
            ));
        }
    }, [clanId]);

    const handleSend = () => {
        const content = input.trim();
        if (!content || content.length > MAX_CHARS) return;
        const tempId = `tmp_${++tempCounter.current}`;
        const optimistic: ChatMsg = {
            id: tempId,
            userId: myUser.id,
            content,
            createdAt: new Date().toISOString(),
            displayName: myUser.displayName,
            username: myUser.username,
            avatarUrl: myUser.avatarUrl,
            _pending: true,
        };
        setInput('');
        setMsgs(prev => [...prev, optimistic]);
        void doSend(content, tempId);
    };

    const handleRetry = (msg: ChatMsg) => {
        setMsgs(prev => prev.map(m =>
            m.id === msg.id ? { ...m, _pending: true, _failed: false } : m
        ));
        void doSend(msg.content, msg.id);
    };

    const charsLeft = MAX_CHARS - input.length;
    const showCharCount = input.length > MAX_CHARS * 0.8;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: '8%' }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col max-w-md mx-auto rounded-t-[32px] overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: 'none',
                        }}
                    >
                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgba(90,178,255,0.14)', border: '1px solid rgba(90,178,255,0.22)' }}
                                >
                                    <MessageCircle size={16} className="text-primary" />
                                </div>
                                <div>
                                    <p className="font-black text-white text-sm leading-tight">{clanName}</p>
                                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                                        Chat du clan
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* ── Messages ── */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">

                            {/* Load older button */}
                            {hasMore && !initLoading && (
                                <div className="flex justify-center mb-4">
                                    <button
                                        onClick={handleLoadOlder}
                                        disabled={loadingOlder}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.09)',
                                            color: 'rgba(255,255,255,0.35)',
                                        }}
                                    >
                                        {loadingOlder
                                            ? <Loader2 size={10} className="animate-spin" />
                                            : <ChevronUp size={10} />
                                        }
                                        {loadingOlder ? 'Chargement…' : 'Messages précédents'}
                                    </button>
                                </div>
                            )}

                            {/* Skeletons */}
                            {initLoading && (
                                <div className="space-y-4 pt-2">
                                    {[38, 56, 44, 62, 36].map((w, i) => {
                                        const mine = i % 2 === 0;
                                        return (
                                            <div key={i} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                                                <div className="skeleton w-7 h-7 rounded-xl flex-shrink-0" />
                                                <div
                                                    className="skeleton h-9 rounded-2xl"
                                                    style={{ width: `${w}%` }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Empty */}
                            {!initLoading && msgs.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-44 text-center">
                                    <div
                                        className="w-12 h-12 rounded-[16px] flex items-center justify-center mb-3"
                                        style={{ background: 'rgba(90,178,255,0.08)', border: '1px solid rgba(90,178,255,0.14)' }}
                                    >
                                        <MessageCircle size={20} className="text-primary/40" />
                                    </div>
                                    <p className="text-[11px] text-white/30 font-black">Aucun message pour l'instant.</p>
                                    <p className="text-[10px] text-white/20 mt-1">Lance la conversation !</p>
                                </div>
                            )}

                            {/* Messages */}
                            {!initLoading && msgs.map((msg, i) => {
                                const isMine = msg.userId === myUser.id;
                                const prev = msgs[i - 1];
                                const grouped = !!prev && prev.userId === msg.userId
                                    && (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000);
                                return (
                                    <MsgBubble
                                        key={msg.id}
                                        msg={msg}
                                        isMine={isMine}
                                        grouped={grouped}
                                        onRetry={handleRetry}
                                    />
                                );
                            })}

                            {/* Bottom padding for input clearance */}
                            <div className="h-2" />
                        </div>

                        {/* ── Input ── */}
                        <div
                            className="px-4 pt-3 pb-8 border-t border-white/[0.06] flex-shrink-0"
                            style={{ background: 'rgba(7,17,31,0.98)' }}
                        >
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 relative">
                                    <textarea
                                        rows={1}
                                        placeholder="Écrire un message…"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        maxLength={MAX_CHARS}
                                        className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none transition-all resize-none"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.09)',
                                            minHeight: 46,
                                            maxHeight: 120,
                                        }}
                                    />
                                    {showCharCount && (
                                        <span
                                            className="absolute right-3 bottom-3 text-[9px] font-mono font-black pointer-events-none"
                                            style={{ color: charsLeft <= 0 ? '#ef4444' : charsLeft < 50 ? '#f59e0b' : 'rgba(255,255,255,0.25)' }}
                                        >
                                            {charsLeft}
                                        </span>
                                    )}
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.92 }}
                                    onClick={handleSend}
                                    disabled={!input.trim() || input.length > MAX_CHARS}
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-30 flex-shrink-0 transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        boxShadow: (input.trim() && input.length <= MAX_CHARS)
                                            ? '0 4px 14px rgba(59,130,246,0.35)'
                                            : 'none',
                                    }}
                                >
                                    <Send size={18} />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
