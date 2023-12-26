import { defineConfig } from 'vite'
import { resolve } from "path";
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
        service_worker: resolve(__dirname, "src/service_worker.js"),
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
