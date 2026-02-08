/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors for Stellar theme
      colors: {
        stellar: {
          blue: '#3E1BDB',
          purple: '#7B61FF',
          dark: '#0D0B21',
          darker: '#070510',
        }
      }
    },
  },
  plugins: [],
}
