import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        const message = `[ErrorBoundary] ${error.message}\n${info.componentStack}`;
        console.error(message);

        // POST to local dev log endpoint if available
        if (import.meta.env.DEV) {
            fetch('/__dev/log-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: error.message, stack: error.stack, componentStack: info.componentStack }),
            }).catch(() => {/* dev endpoint not available, ignore */});
        }
    }

    reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        return (
            <div className="px-5 pt-10 pb-28 flex flex-col gap-4">
                <div
                    className="rounded-[20px] p-5 border"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.22)' }}
                >
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">Erreur de rendu</p>
                    <p className="text-sm font-bold text-white mb-1">{error.message}</p>
                    {import.meta.env.DEV && (
                        <pre className="text-[10px] text-white/40 mt-3 overflow-x-auto whitespace-pre-wrap break-all">
                            {error.stack?.split('\n').slice(0, 6).join('\n')}
                        </pre>
                    )}
                </div>
                <button
                    onClick={this.reset}
                    className="btn-primary py-3 text-sm font-black"
                >
                    Réessayer
                </button>
            </div>
        );
    }
}
