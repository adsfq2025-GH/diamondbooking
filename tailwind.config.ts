import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "DM Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        /* Brand tokens */
        primary: {
          DEFAULT: "#1a1f36",
          foreground: "#ffffff",
          50: "#f0f1f8",
          100: "#d9dcef",
          200: "#b3b9df",
          300: "#8d96cf",
          400: "#6773bf",
          500: "#4150af",
          600: "#2d3a8c",
          700: "#1a1f36",
          800: "#141830",
          900: "#0e1122",
        },
        accent: {
          DEFAULT: "#d4a843",
          foreground: "#1a1f36",
          50: "#fdf8ec",
          100: "#faefd0",
          200: "#f5dda1",
          300: "#efcb72",
          400: "#d4a843",
          500: "#b88a2a",
          600: "#8f6b1f",
          700: "#664d15",
          800: "#3d2e0c",
          900: "#140f04",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Admin specific */
        admin: {
          bg: "#0f1117",
          surface: "#1e2231",
          border: "#2a2f3a",
          text: "#f0f0f0",
          muted: "#8892a4",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200px 0" },
          to: { backgroundPosition: "calc(200px + 100%) 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        shimmer: "shimmer 2s infinite",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
        admin: "0 1px 3px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
