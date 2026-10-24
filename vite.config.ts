import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    react(),
    {
      name: "api-target",
      transformIndexHtml: (html) =>
        html.replace(
          "__API_TARGET__",
          mode === "preview" ? "__PORT_8787__" : "",
        ),
    },
  ],
  build: { outDir: "dist" },
}));
