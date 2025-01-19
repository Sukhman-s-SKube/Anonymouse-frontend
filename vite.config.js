import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"

export default () => {
  return defineConfig({
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/ui"),
      },
    },
    build: {
        outDir: 'dist-react',
    },
    server: {
        port: 3000,
    }
 })
}