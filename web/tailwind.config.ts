import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stage: '#f7f7f9',
        ink: '#0a0a0a',
        muted: '#7a7e85',
        lime: { DEFAULT: '#d4f55a', deep: '#3c5a12' },
        blush: { DEFAULT: '#ff5c9a', soft: '#ffd1e3' },
        line: 'rgba(10,10,10,0.07)',
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        glass: '30px',
        pill: '9999px',
      },
      boxShadow: {
        glass: '0 12px 40px -10px rgba(10,10,10,0.07)',
        float: '0 24px 60px -22px rgba(10,10,10,0.22)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { rise: 'rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both' },
    },
  },
  plugins: [],
} satisfies Config;
