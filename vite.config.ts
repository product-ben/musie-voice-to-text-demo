import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` must match the GitHub Pages sub-path: https://<user>.github.io/<repo>/
export default defineConfig({
  base: "/musie-voice-to-text-demo/",
  plugins: [react()],
});
