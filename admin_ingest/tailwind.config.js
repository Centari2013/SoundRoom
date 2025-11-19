/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          base: '#0f172a',
          accent: '#1e293b'
        },
        slate: {
          100: '#f1f5f9',
          400: '#94a3b8',
          500: '#64748b',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        emerald: {
          500: '#10b981'
        }
      }
    }
  },
  plugins: []
}
