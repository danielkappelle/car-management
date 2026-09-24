import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use the shared package's TypeScript source directly, no build step needed.
    conditions: ["source"],
  },
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
