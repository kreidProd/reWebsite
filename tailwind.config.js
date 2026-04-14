/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#0C0414',
          900: '#130A24',
          800: '#1E1038',
          700: '#2D1854',
          600: '#3B1578',
        },
        accent: {
          DEFAULT: '#7C3AED',
          light: '#A78BFA',
          muted: '#C4B5FD',
          dark: '#5B21B6',
          bg: '#F5F0FF',
        },
        success: '#27A244',
        danger: '#C0392B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
