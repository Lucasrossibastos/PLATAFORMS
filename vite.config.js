import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build:teste` gera um único HTML (dist-teste/index.html) para o ambiente de teste.
export default defineConfig(({ mode }) => ({
  plugins: mode === "singlefile" ? [react(), viteSingleFile()] : [react()],
  build: mode === "singlefile" ? { outDir: "dist-teste" } : {},
}));
