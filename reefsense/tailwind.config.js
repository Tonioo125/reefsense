import animate from "tailwindcss-animate";
import { PALETTE, RESILIENCE } from "./src/lib/palette.ts";
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1240px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
          strong: "rgb(var(--primary-strong) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
          strong: "rgb(var(--muted-strong) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          foreground: "rgb(var(--brand-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        // The hero's own colours: used on the photo only.
        ocean: {
          abyss: PALETTE.abyss,
          foam: PALETTE.foam,
          surf: PALETTE.surf,
          blue: PALETTE.ocean,
          aqua: PALETTE.surf,
        },
        ink: PALETTE.ink,
        coral: {
          DEFAULT: PALETTE.coral,
          soft: PALETTE.coralSoft,
          text: PALETTE.coralText,
        },
        resilience: {
          high: RESILIENCE.High.base,
          medium: RESILIENCE.Medium.base,
          low: RESILIENCE.Low.base,
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(10, 37, 64, 0.04), 0 10px 30px -18px rgba(10, 37, 64, 0.2)",
        panel: "-16px 0 40px -32px rgba(10, 37, 64, 0.25)",
        float: "0 2px 6px rgba(10, 37, 64, 0.05), 0 16px 36px -22px rgba(10, 37, 64, 0.3)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        // The frame opens like an aperture while the photo settles from depth.
        "frame-open": {
          from: { clipPath: "inset(7% 9% 7% 9% round 48px)" },
          to: { clipPath: "inset(0% 0% 0% 0% round 0px)" },
        },
        "hero-settle": {
          from: { transform: "scale(1.22)", filter: "blur(10px) saturate(0.6) brightness(0.7)" },
          to: { transform: "scale(1)", filter: "blur(0) saturate(1) brightness(1)" },
        },
        "word-rise": {
          from: { transform: "translate3d(0, 115%, 0) rotate(6deg)", opacity: "0" },
          to: { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: "1" },
        },
        "blur-in": {
          from: { opacity: "0", filter: "blur(12px)", transform: "translate3d(0, 14px, 0)" },
          to: { opacity: "1", filter: "blur(0)", transform: "translate3d(0, 0, 0)" },
        },
        "drop-in": {
          from: { opacity: "0", transform: "translate3d(0, -14px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        sheen: {
          from: { transform: "translateX(-120%) skewX(-18deg)" },
          to: { transform: "translateX(220%) skewX(-18deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out both",
        "slide-up": "slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "frame-open": "frame-open 1.6s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "hero-settle": "hero-settle 2.8s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "word-rise": "word-rise 1.15s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "blur-in": "blur-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "drop-in": "drop-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) backwards",
        sheen: "sheen 1.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [animate],
};
