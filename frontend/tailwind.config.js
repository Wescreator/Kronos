/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        kronos: {
          bg:      '#050816',
          sidebar: '#081024',
          card:    '#0D152B',
          hover:   '#131D37',
          primary: '#7C5CFC',
          glow:    '#A78BFA',
          success: '#34D399',
          danger:  '#FB7185',
          info:    '#38BDF8',
          warning: '#FBBF24',
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'soft':   '0 10px 30px rgba(0,0,0,0.35)',
        'medium': '0 20px 40px rgba(0,0,0,0.45)',
        'large':  '0 25px 60px rgba(0,0,0,0.55)',
        'purple': '0 0 40px rgba(124,92,252,0.18)',
        'blue':   '0 0 40px rgba(56,189,248,0.15)',
        'green':  '0 0 40px rgba(52,211,153,0.15)',
      },
      animation: {
        'fade-in': 'fadeInUp 0.4s ease forwards',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
      }
    }
  },
  plugins: []
}