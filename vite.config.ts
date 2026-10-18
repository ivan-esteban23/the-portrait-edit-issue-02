import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({
  base: "/the-portrait-edit-issue-02/",
  publicDir: "docs",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "isolate-manual-chunks",
      outputOptions({ manualChunks, ...output }) {
        if (!manualChunks) return;
        // Vite 8's compatibility layer otherwise absorbs dependencies into each
        // manual chunk. Use Rolldown's explicit grouping to keep packages isolated.
        return {
          ...output,
          codeSplitting: {
            includeDependenciesRecursively: false,
            groups: [
              {
                debugName: "manual-chunks",
                name: (id, context) => manualChunks(id, context),
              },
            ],
          },
        };
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // The router also uses this helper; keeping it in the entry creates a cycle.
          if (id === "\0vite/preload-helper.js") return "vite-preload";
          const moduleId = id.replaceAll("\\", "/");
          if (/\/src\/content\/prompts\/.*\.json(?:\?|$)/.test(moduleId))
            return "content-prompts";
          if (!moduleId.includes("/node_modules/")) return;

          // Match package boundaries so react-router never lands in vendor-react.
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(moduleId))
            return "vendor-react";
          if (
            /\/node_modules\/(react-router|react-router-dom)\//.test(moduleId)
          )
            return "vendor-router";
          if (moduleId.includes("/node_modules/@radix-ui/"))
            return "vendor-radix";
          if (moduleId.includes("/node_modules/zod/")) return "vendor-zod";
          return "vendor";
        },
      },
    },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
