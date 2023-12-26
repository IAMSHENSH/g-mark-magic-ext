/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4592f7",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

