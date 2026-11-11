// Gera css/tailwind.css (o visual do site). Rode depois de mudar classes no HTML/JS:
//   npx tailwindcss@3.4.19 -c tailwind.config.js -i css/tailwind-entrada.css -o css/tailwind.css --minify
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#000B2B', 900: '#00174F', 800: '#011F63', 700: '#022B80', 600: '#023FA0' },
        brand: { red: '#EB1F3B', redDark: '#C8102E', redSoft: '#FDE8EB' },
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 20px 60px -15px rgba(235, 31, 59, 0.55)',
        card: '0 30px 80px -20px rgba(0, 11, 43, 0.35)',
      },
    },
  },
};
