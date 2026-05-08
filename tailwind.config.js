/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#060d18",
                surface: "#0d1a2d",
                primary: "#5ab2ff",
                secondary: "#1a2d4a",
                text: "#eef2ff",
                "text-muted": "#7a92b0",
                danger: "#ef4444",
                success: "#22c55e",
                accent: "#00d4ff",
                highlight: "#93c5fd",
                electric: "#c084fc",
            },
            fontFamily: {
                sans: ['Outfit', 'system-ui', 'sans-serif'],
                display: ['Syne', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
                'shimmer': 'shimmer 1.8s infinite linear',
                'xp-shimmer': 'xpShimmer 3s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(16px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.04)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
                xpShimmer: {
                    '0%': { backgroundPosition: '-100% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
            },
            boxShadow: {
                'glow-sm': '0 0 16px rgba(90, 178, 255, 0.22)',
                'glow': '0 0 32px rgba(90, 178, 255, 0.28)',
                'glow-lg': '0 0 64px rgba(90, 178, 255, 0.22)',
                'glow-cyan': '0 0 28px rgba(0, 212, 255, 0.3)',
                'glow-primary': '0 8px 32px rgba(90, 178, 255, 0.42)',
                'card': '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                'nav': '0 -4px 40px rgba(0, 0, 0, 0.35), 0 24px 60px rgba(0, 0, 0, 0.5)',
            },
        },
    },
    plugins: [],
}
