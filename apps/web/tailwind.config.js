/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#111111',
          900: '#1a1a1a',
          700: '#3a3a3a',
          500: '#6b6b6b',
          400: '#9a9a9a',
          300: '#c8c8c8',
          200: '#e4e4e4',
          100: '#efefef',
          50: '#f6f6f6',
        },
        paper: {
          DEFAULT: '#FAFAF7',
          50: '#FDFDFB',
          100: '#FAFAF7',
          200: '#F2F1ED',
        },
      },
      letterSpacing: {
        widest: '0.18em',
        wider: '0.12em',
        wide: '0.06em',
        tight: '-0.015em',
        tighter: '-0.025em',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        display: ['clamp(2.5rem, 7vw, 6rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        hero: ['clamp(2rem, 5vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
