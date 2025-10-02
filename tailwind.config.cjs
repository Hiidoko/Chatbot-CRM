const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/**/*.{html,js,cjs}',
    './public/js/**/*.{js,cjs}',
    './validators/**/*.{js,cjs}',
    './controllers/**/*.js',
    './routes/**/*.js',
    './models/**/*.js',
    './views/**/*.{html,ejs}',
    './index.js',
    './server.js'
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          bg: '#050714',
          surface: 'rgba(15,23,42,0.82)',
          surfaceAlt: 'rgba(45,58,90,0.55)',
          border: 'rgba(148,163,184,0.22)',
          borderSoft: 'rgba(148,163,184,0.35)',
          text: '#e2e8f0',
          textSoft: '#94a3b8',
          primary: '#6366f1',
          primaryAccent: '#a855f7',
          primaryHover: '#c084fc',
          focus: 'rgba(129,140,248,0.45)',
          success: '#34d399',
          danger: '#f87171',
          warning: '#fbbf24',
          info: '#38bdf8',
          sidebar: 'rgba(6,12,26,0.88)'
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95'
        },
        status: {
          novoBg: 'rgba(96,165,250,0.2)',
          novoFg: '#bfdbfe',
          andamentoBg: 'rgba(244,114,182,0.18)',
          andamentoFg: '#fbcfe8',
          contatadoBg: 'rgba(165,180,252,0.18)',
          contatadoFg: '#e0e7ff',
          convertidoBg: 'rgba(34,197,94,0.18)',
          convertidoFg: '#bbf7d0',
          perdidoBg: 'rgba(248,113,113,0.18)',
          perdidoFg: '#fecaca'
        }
      },
      fontFamily: {
        sans: ['"Poppins"', 'Inter', '"Segoe UI"', 'system-ui', ...defaultTheme.fontFamily.sans]
      },
      boxShadow: {
        'crm-sm': '0 1px 3px rgba(14, 21, 37, 0.35)',
        'crm-md': '0 12px 30px -12px rgba(129,140,248,0.65)',
        'crm-lg': '0 24px 60px -24px rgba(168,85,247,0.65)',
        'crm-sidebar': '0 30px 80px -30px rgba(14,21,37,0.95)',
        'crm-menu': '0 24px 48px -20px rgba(129,140,248,0.55),0 10px 24px -16px rgba(8,47,73,0.65)',
        'crm-toast': '0 12px 40px -18px rgba(14,21,37,0.85)',
        'crm-chatbot': '0 24px 50px -20px rgba(59,130,246,0.45),0 10px 22px -12px rgba(8,47,73,0.55)'
      },
      borderRadius: {
        'crm-xs': '4px',
        'crm-sm': '6px',
        'crm-md': '8px',
        'crm-lg': '12px'
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '11.5': '2.875rem',
        '15': '3.75rem'
      },
      transitionTimingFunction: {
        crm: 'cubic-bezier(.16,.84,.44,1)'
      },
      zIndex: {
        header: '1000',
        sidebar: '1250',
        'sidebar-overlay': '1220',
        modal: '2000',
        chatbot: '1900',
        toast: '2100',
        confirm: '2200'
      }
    }
  },
  plugins: []
};
