/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#0F172A',
          950: '#0A0F1D',
        },
        'deep-indigo': '#1E1B4B',
      },
      boxShadow: {
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(34, 211, 238, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.4)',
      },
    },
  },
  plugins: [],
}
