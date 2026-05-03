/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0B1A',
        surface: '#13111F',
        'surface-2': '#1A1728',
        border: 'rgba(139, 92, 246, 0.15)',
        primary: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          lighter: '#A78BFA'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        purple: '0 0 40px rgba(139, 92, 246, 0.25)',
        'purple-sm': '0 0 20px rgba(139, 92, 246, 0.2)',
        'purple-lg': '0 0 80px rgba(139, 92, 246, 0.3)'
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7C3AED, #9333EA)',
        'gradient-surface': 'linear-gradient(135deg, #13111F, #1A1728)'
      }
    }
  },
  plugins: []
}
