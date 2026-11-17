import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/socket.io": {
        target: "http://127.0.0.1:9208",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:9208",
        changeOrigin: true,
      },
    },
  },
});
