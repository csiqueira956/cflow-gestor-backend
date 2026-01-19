/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Azul principal CFlow - C Notch Gradient
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0a4ee4', // Azul principal Brand Kit
          600: '#0842c0',
          700: '#06369c',
          800: '#052a78',
          900: '#001647', // Secondary do Brand Kit
        },
        // Roxo para gradientes
        purple: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7c3aed', // Roxo Brand Kit
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
        },
        // Cinza sofisticado
        accent: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', // Gray do Brand Kit
          600: '#475569',
          700: '#334155',
          800: '#1e293b', // Text do Brand Kit
          900: '#0f172a',
        },
        // Verde para sucesso
        success: {
          500: '#10b981', // Green do Brand Kit
          600: '#059669',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Poppins', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-cflow': 'linear-gradient(135deg, #0a4ee4 0%, #7c3aed 100%)',
        'gradient-cflow-dark': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      },
      boxShadow: {
        'cflow': '0 4px 20px rgba(0,0,0,0.08)',
        'cflow-lg': '0 12px 24px rgba(0,0,0,0.1)',
        'cflow-btn': '0 8px 20px rgba(10,78,228,0.4)',
      },
      borderRadius: {
        'cflow': '14px',
        'cflow-lg': '20px',
      },
    },
  },
  plugins: [],
}
