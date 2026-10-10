/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // Paleta da fachada pública (app/page.tsx). O gerador não usa estas cores.
      colors: {
        marinho: { DEFAULT: "#161a4f", 700: "#262b6b" },
        roxo: { DEFAULT: "#5b45d6", escuro: "#4a36c4", claro: "#ece8fc" },
        coral: { DEFAULT: "#e0592f", escuro: "#b0401c", claro: "#fde9e1" },
        creme: { DEFAULT: "#faf6ee", escuro: "#f2eadb" },
        verde: { DEFAULT: "#2f8a57", claro: "#e3f2e8", escuro: "#1d6640" },
        tinta: "#474b6e",
      },
    },
  },
  plugins: [],
};