import viteReact from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000
  },
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    TanStackRouterVite(),
    tanstackStart({
      prerender: {
        enabled: true
      },
      pages: [
        { path: "/" },
        { path: "/knowledge" },
        { path: "/campus" },
        { path: "/campus/maps" },
        { path: "/campus/beds" },
        { path: "/patients" },
        { path: "/prescriptions" },
        { path: "/reports" },
        { path: "/robots" }
      ]
    }),
    viteReact()
  ]
});
