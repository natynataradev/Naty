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
    },
  },
  plugins: [],
  darkMode: 'class',
};

export default config;
