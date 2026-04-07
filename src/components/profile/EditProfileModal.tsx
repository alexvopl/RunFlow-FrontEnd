import { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2 } from 'lucide-react';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
    const { user, logout } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/profiles/me', { name });
            window.location.reload();
            onClose();
        } catch (error) {
            console.error('Failed to update profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you absolutely sure you want to delete your account? This action is irreversible.')) return;
        setDeleting(true);
        try {
            await api.delete('/profiles/me');
            logout();
        } catch (error) {
            console.error('Failed to delete account', error);
            alert('Failed to delete account');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-surface border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Edit Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-text-muted uppercase">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                            placeholder="Your name"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || deleting}
                        className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                <Save size={20} />
                                Save Changes
                            </>
                        )}
                    </button>

                    <div className="pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading || deleting}
                            className="w-full py-4 bg-red-500/5 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {deleting ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    <Trash2 size={18} />
                                    Delete Account
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
