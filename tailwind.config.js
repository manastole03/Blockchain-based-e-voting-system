/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#111111",
        primary: "#6B38FB",
        "primary-glow": "rgba(107, 56, 251, 0.5)",
        secondary: "#FF3366",
        accent: "#00E5FF",
        muted: "#888888",
        border: "#222222",
        error: "#FF1A1A",
        success: "#00E676",
        purple: "#6c5ce7",
        "light-purple": "#a59afc",
        black: "#000000",
        white: "#ffffff",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(to right bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 20px rgba(107, 56, 251, 0.5)',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '10px',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
