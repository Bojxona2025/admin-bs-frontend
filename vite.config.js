import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // host: "192.168.1.112", 
    port: 5173,
    proxy: {
      "/api": {
        target: "https://bsmarket.uz",
        changeOrigin: true,
      },
      "/uploads": {
        target: "https://bsmarket.uz",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "https://bsmarket.uz",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
