/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#fdf4ec',100:'#fae6d3',200:'#f4c9a3',300:'#eda96f',400:'#e58744',500:'#dd6f27',600:'#c25a1e',700:'#9a4518',800:'#7c3a18',900:'#643216' },
        ink: { 900:'#1c1917', 700:'#44403c', 500:'#78716c' }
      },
      fontFamily: { sans: ['Inter','system-ui','Segoe UI','Roboto','sans-serif'] }
    }
  },
  plugins: []
};
