/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "primary-soft": "var(--primary-soft)",
        secondary: "var(--secondary)",
        tertiary: "var(--tertiary)",
        "tertiary-soft": "var(--tertiary-soft)",
        surface: "var(--surface)",
        "surface-low": "var(--surface-low)",
        "surface-high": "var(--surface-high)",
        "surface-highest": "var(--surface-highest)",
        outline: "var(--outline)",
        "outline-variant": "var(--outline-variant)",
        muted: "var(--muted)"
      },
      fontFamily: {
        headline: ["var(--font-newsreader)"],
        body: ["var(--font-manrope)"]
      },
      boxShadow: {
        ambient: "0 20px 50px rgba(78, 69, 60, 0.08)",
        glow: "0 18px 40px rgba(76, 124, 127, 0.18)"
      },
      animation: {
        drift: "drift 14s ease-in-out infinite",
        pulseSlow: "pulseSlow 3s ease-in-out infinite",
        orbit: "orbit 18s linear infinite",
        orbitReverse: "orbitReverse 14s linear infinite"
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(2%, -3%, 0) scale(1.06)" }
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.6" }
        },
        orbit: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        },
        orbitReverse: {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" }
        }
      }
    }
  },
  plugins: []
};
