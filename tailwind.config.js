/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ---- Typography -----------------------------------------------------
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        heading: [
          "var(--font-poppins)",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "var(--font-plex-mono)",
          "IBM Plex Mono",
          "Courier New",
          "monospace",
        ],
      },

      // ---- Colour ---------------------------------------------------------
      colors: {
        brand: {
          orange: "#F58120",
          "orange-dark": "#D96A0F",
          "orange-light": "#FF9D4D",
          charcoal: "#1F1F1F",
        },
        // Neutral ramp — warm-tinted greys that sit well against the orange.
        ink: {
          50: "#F7F7F6",
          100: "#EFEFED",
          200: "#E2E2DF",
          300: "#CBCBC7",
          400: "#9C9C97",
          500: "#71716C",
          600: "#54544F",
          700: "#3D3D39",
          800: "#2A2A27",
          900: "#1A1A18",
          950: "#111110",
        },
        success: { light: "#E8F6EE", DEFAULT: "#12855A", dark: "#0B6544" },
        warning: { light: "#FEF3E2", DEFAULT: "#B87514", dark: "#8A5710" },
        danger: { light: "#FDECEC", DEFAULT: "#C43C3C", dark: "#992D2D" },
        info: { light: "#E9F1FB", DEFAULT: "#2A6BB5", dark: "#1E5290" },
      },

      // ---- Depth & shape --------------------------------------------------
      borderRadius: {
        card: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,17,16,0.05), 0 1px 3px rgba(17,17,16,0.04)",
        "card-hover":
          "0 4px 12px rgba(17,17,16,0.07), 0 2px 4px rgba(17,17,16,0.04)",
        rail: "1px 0 0 rgba(255,255,255,0.06)",
        pop: "0 12px 32px rgba(17,17,16,0.14)",
      },

      // ---- Layout ---------------------------------------------------------
      spacing: {
        rail: "16rem",
        "rail-sm": "4.5rem",
        "bottom-nav": "4.25rem",
      },

      // ---- Motion ---------------------------------------------------------
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.28s ease-out both",
        "fade-in": "fade-in 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
