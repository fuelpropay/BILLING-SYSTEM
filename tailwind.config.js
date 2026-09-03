/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefaff',
          100: '#d9f3ff',
          200: '#bcecff',
          300: '#8ee1ff',
          400: '#59ccff',
          500: '#32b0ff',
          600: '#1b92f5',
          700: '#1478e1',
          800: '#1861b6',
          900: '#1a538f',
          950: '#153457',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
