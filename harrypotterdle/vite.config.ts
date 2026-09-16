import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set BASE_PATH at build time when deploying under a sub-path, e.g.
//   BASE_PATH=/my-repo/wizardle/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/",
  build: { target: ["es2020", "safari14"] },
});
