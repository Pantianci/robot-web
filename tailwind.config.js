import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1440px"
      }
    },
    extend: {
      fontFamily: {
        sans: ["'Noto Sans SC'", "'IBM Plex Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        surface: {
          50: "#f5f9ff",
          100: "#ebf3ff",
          200: "#d6e7ff",
          500: "#5b8def",
          700: "#234a8d",
          900: "#0c1f3f"
        }
      },
      borderRadius: {
        xl: "1rem",
        lg: "calc(var(--radius) - 2px)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(12, 31, 63, 0.08)",
        soft: "0 10px 30px rgba(35, 74, 141, 0.08)"
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(90deg, rgba(91,141,239,0.08) 1px, transparent 1px), linear-gradient(rgba(91,141,239,0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: [tailwindcssAnimate]
}
