import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site at /<repo-name>/, so the base path must match.
// If the repo is ever renamed or deployed elsewhere, change `base` accordingly.
export default defineConfig({
  plugins: [react()],
  base: "/Jet-lag-the-game-hide-and-seek-app/",
});
