/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hazard: {
          bg: '#080c14',
          panel: '#0e1626',
          card: '#131d31',
          border: '#1f2e4d',
          borderLight: '#2b3f68',
          cyan: '#00f0ff',
          blue: '#0284c7',
          electric: '#38bdf8',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#ef4444',
          subtext: '#94a3b8'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)' },
          '50%': { opacity: '0.6', boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
        },
        alarmFlash: {
          '0%, 100%': { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' },
          '50%': { backgroundColor: 'rgba(239, 68, 68, 0.35)', borderColor: '#f87171' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        alarmFlash: 'alarmFlash 1s ease-in-out infinite',
        radarSweep: 'radarSweep 4s linear infinite',
      }
    },
  },
  plugins: [],
}
