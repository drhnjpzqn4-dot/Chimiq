/** Tailwind v4 — picked up by @tailwindcss/vite from the package root. */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', '"Iowan Old Style"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
};
