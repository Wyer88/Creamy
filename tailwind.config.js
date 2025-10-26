/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#05060d',
        creamyRose: '#ffd7e0',
        creamyGold: '#f7e1a0',
      },
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        creamy: '0 30px 70px rgba(9, 10, 20, 0.55)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        caption: 'caption 1.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(-2px, 4px, 0)' },
        },
        caption: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '20%': { opacity: 1, transform: 'translateY(0)' },
          '80%': { opacity: 1, transform: 'translateY(0)' },
          '100%': { opacity: 0, transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
