import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Gradijenti tema spremaju se u bazu kao Tailwind klase (npr. "from-berry-400 to-brand-300")
  // pa ih skener ne vidi u kodu — generiramo ih unaprijed za brand palete.
  safelist: [
    { pattern: /^(from|via|to)-(brand|berry|sun|sky2|mint|ink)-(50|100|200|300|400|500|600|700|800|900)$/ },
  ],
  theme: {
    extend: {
      colors: {
        // Brand paleta Party Kidzone (vizualni identitet): ljubičasta #6A3DE8,
        // roza #FF4DA6, žuta #FFD93B, cijan #4DD6FF.
        brand: {
          50: "#f4f0ff",
          100: "#e9e1ff",
          200: "#d4c4fd",
          300: "#b79dfa",
          400: "#9170f2",
          500: "#6a3de8", // primarna ljubičasta
          600: "#5a2fd4",
          700: "#4a25ad",
          800: "#3a1e88",
          900: "#2b1a66",
        },
        berry: {
          50: "#fff0f7",
          100: "#ffe0ef",
          200: "#ffc1df",
          300: "#ff94c7",
          400: "#ff6db5",
          500: "#ff4da6", // roza
          600: "#e62e8a",
          700: "#c01d6f",
          800: "#9b195b",
          900: "#7a1f4a",
        },
        sun: {
          50: "#fffbe8",
          100: "#fff5c4",
          200: "#ffee94",
          300: "#ffe462",
          400: "#ffd93b", // žuta
          500: "#f5c400",
          600: "#d4a300",
          700: "#a67c00",
          800: "#7d5d00",
          900: "#5c4400",
        },
        sky2: {
          50: "#ebfbff",
          100: "#d3f5ff",
          200: "#a9ebff",
          300: "#7ce1ff",
          400: "#4dd6ff", // cijan
          500: "#1fc2f0",
          600: "#0ea0cc",
          700: "#0b7ea3",
          800: "#0d6482",
          900: "#0f526a",
        },
        mint: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        // Neutralne sive s blagim ljubičastim tonom da se slažu s paletom.
        ink: {
          50: "#f8f7fc",
          100: "#f1eff8",
          200: "#e3e0ee",
          300: "#cbc6dc",
          400: "#9d97b5",
          500: "#6f6990",
          600: "#544e73",
          700: "#3e3960",
          800: "#2b2650",
          900: "#1d1840",
        },
        paper: "#fcfaff",
      },
      borderRadius: {
        xl2: "1.25rem",
        "3xl": "1.75rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(43,26,102,0.25)",
        pop: "0 6px 0 0 rgba(43,26,102,0.12)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
