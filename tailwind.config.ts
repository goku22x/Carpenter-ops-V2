import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        carpenter: { red: "#ef1b00", black: "#0b0f16" },
        phase: {
          earthwork: "#ffd21f",
          storm: "#f58220",
          sewer: "#8fd14f",
          water: "#5b9bd5"
        }
      }
    }
  },
  plugins: []
};

export default config;
