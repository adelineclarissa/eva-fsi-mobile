/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#080810',
        surface: '#12121E',
        card: '#1A1A2E',
        'card-hover': '#20203A',
        border: '#252540',
        'border-light': '#2E2E50',
        'accent-purple': '#7C3AED',
        'accent-purple-light': '#9D6FFF',
        'accent-teal': '#059669',
        'accent-teal-light': '#00D4AA',
        'accent-gold': '#F59E0B',
        'accent-rose': '#F43F5E',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8B8FA8',
        'text-muted': '#4A4E69',
        success: '#00C896',
        error: '#FF4D6D',
        warning: '#FFB347',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
