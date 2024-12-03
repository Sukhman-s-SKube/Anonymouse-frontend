import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default () => {
  return defineConfig({
    base: './',
    plugins: [react()],
    build: {
        outDir: 'dist-react',
    },
    server: {
        port: 3000,
    }
 })
}