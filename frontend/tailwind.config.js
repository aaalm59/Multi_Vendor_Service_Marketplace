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
    },
  },
  plugins: [],
}
