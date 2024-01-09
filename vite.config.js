import { defineConfig } from 'vite'
import { resolve } from "path";
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // popup: resolve(__dirname, "popup.html"),
        sidepanel: resolve(__dirname, "sidepanel.html"),
        options: resolve(__dirname, "options.html"),
        service_worker: resolve(__dirname, "src/service_worker.js"),
        // content_script: resolve(__dirname, "src/content_script.js"),
      },
      output: {
        chunkFileNames: "[name].[hash].js",
        assetFileNames: "[name].[hash].[ext]",
        entryFileNames: "[name].js",
        dir: "dist",
      },
    },
  },
  envDir:"env"
});
