/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        secondary: '#FFD700',
        accent: '#FFFFFF',
      },
      keyframes: {
        scan: {
          '0%, 100%': { top: '10%' },
          '50%': { top: '90%' },
        },
      },
      animation: {
        scan: 'scan 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
