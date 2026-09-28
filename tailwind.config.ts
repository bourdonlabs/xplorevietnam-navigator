import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Theme mirrors the StartAbroad Navigator build (shadcn/ui on Tailwind 3),
// with their brand colours swapped for XploreVietnam's:
//   #003046 navy   -> #090825 (brand.navy)
//   #E07501 orange -> #F82935 (brand.red)
//   #1F6FB8 blue   -> #0042C3 (primary / brand.royal)
//   #004E7B text   -> #2E3A55 (brand.ink2)
//   #EEF7FB tint   -> #EEF3FD (brand.tint)
//   #8ECAE4 accent -> #90C4FF (brand.sky)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "#FFFFFF", foreground: "#090825" },
        primary: { DEFAULT: "#0042C3", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#EEF3FD", foreground: "#090825" },
        muted: { DEFAULT: "#E3E6EC", foreground: "#434651" },
        accent: { DEFAULT: "#DCE8FF", foreground: "#090825" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "#FFFFFF" },
        brand: {
          navy: "#090825",
          red: "#F82935",
          "red-hover": "#DE1E2A",
          royal: "#0042C3",
          sky: "#90C4FF",
          ink2: "#2E3A55",
          tint: "#EEF3FD",
          "tint-line": "#D6E2F8",
          canvas: "#F5F7FA",
          steel: "#6E8591",
          gold: "#E8B21A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['"Figtree Variable"', "Arial", "Helvetica", "sans-serif"],
      },
      fontSize: {
        caption: ["14px", { lineHeight: "1.4", fontWeight: "300" }],
      },
    },
  },
  plugins: [animate],
};

export default config;
