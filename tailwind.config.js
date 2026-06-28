/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -5px rgba(0, 0, 0, 0.03), 0 4px 12px -2px rgba(0, 0, 0, 0.02)',
        'premium-hover': '0 20px 40px -5px rgba(99, 102, 241, 0.08), 0 8px 20px -4px rgba(99, 102, 241, 0.04)',
        'premium-dark': '0 15px 35px -5px rgba(0, 0, 0, 0.35), 0 8px 16px -4px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
