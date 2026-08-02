import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";

const buildDirectory = process.env.VERCEL ? "public" : "dist";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-site"
};

function copyClassicRuntime() {
  const runtimeFiles = [
    ["physics.js", "physics.js"],
    ["render.js", "render.js"],
    ["main.js", "main.js"],
    ["home-matter-background.js", "home-matter-background.js"],
    ["ganadores-replica/script.js", "ganadores-replica/script.js"],
    ["node_modules/matter-js/build/matter.min.js", "node_modules/matter-js/build/matter.min.js"],
    ["_headers", "_headers"],
    ["vercel.json", "vercel.json"]
  ];
  return {
    name: "copy-classic-runtime",
    async closeBundle() {
      const destination = resolve(import.meta.dirname, buildDirectory);
      await mkdir(destination, { recursive: true });
      await Promise.all(runtimeFiles.map(async ([source, target]) => {
        const output = resolve(destination, target);
        await mkdir(resolve(output, ".."), { recursive: true });
        await copyFile(resolve(import.meta.dirname, source), output);
      }));
    }
  };
}

export default defineConfig({
  plugins: [react(), copyClassicRuntime()],
  publicDir: false,
  server: {
    headers: securityHeaders,
    proxy: { "/api": "http://127.0.0.1:4174" }
  },
  preview: { headers: securityHeaders },
  build: {
    outDir: buildDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        inicio: resolve(import.meta.dirname, "gano-plus-landing.html"),
        comoJugar: resolve(import.meta.dirname, "como-jugar.html"),
        granTombola: resolve(import.meta.dirname, "gran-tombola.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
        matterTest: resolve(import.meta.dirname, "matter-test.html")
      }
    }
  }
});
