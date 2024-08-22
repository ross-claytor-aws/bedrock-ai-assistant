import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import outputs from "./amplify_outputs.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/chat/ai": {
        target: outputs.custom.aiFunctionUrl,
        changeOrigin: true,
      },
      "/chat/langchain": {
        target: outputs.custom.langchainFunctionUrl,
        changeOrigin: true,
      },
    },
  },
});
