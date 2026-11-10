// Paleta e fontes da marca English Smart (extraídas da logo)
tailwind.config = {
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#000B2B',
          900: '#00174F',
          800: '#011F63',
          700: '#022B80',
          600: '#023FA0',
        },
        brand: {
          red: '#EB1F3B',
          redDark: '#C8102E',
          redSoft: '#FDE8EB',
        },
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
