/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sakura: {
          50: '#fff5f7',
          100: '#ffeef2',
          200: '#ffd6e1',
          300: '#ffb3c7',
          400: '#ff7fa3',
          500: '#f43f75',
          600: '#e11d58',
          700: '#be1244',
          800: '#9f123c',
          900: '#881337',
        },
        cyber: {
          dark: '#0a0b10',
          card: '#12141d',
          border: '#232738',
          cyan: '#00f0ff',
          purple: '#b026ff',
          pink: '#ff2a85',
        }
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 5px rgba(244, 63, 117, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 15px rgba(244, 63, 117, 0.8))' },
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Vazirmatn', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        vazir: ['Vazirmatn', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};
