import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'naty-green': '#6BBF4E',
        'naty-blue': '#3AABCE',
        'naty-sky': '#5BC8E8',
        'naty-dark': '#1A1A2E',
        'naty-white': '#FFFFFF',
        'naty-gray': '#F4F6F8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fadeIn': 'fade-in 0.4s ease-out forwards',
        'slideInLeft': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulseSoft': 'pulse-soft 2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};

export default config;
