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
        }
      }
    }
  },
  plugins: []
}
