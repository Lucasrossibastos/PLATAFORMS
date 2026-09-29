import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// base relativa + HashRouter: o build em docs/ funciona no GitHub Pages
// (https://<usuario>.github.io/<repo>/) sem configurar reescrita de rotas.
export default defineConfig({
  base: "./",
  // Tailwind só na tela de Desempenho (ver src/screens/desempenho/desempenho.css)
  plugins: [react(), tailwind()],
  build: {
    outDir: "docs", emptyOutDir: true,
    // o worker do pdf.js vem como .mjs; publicado como .js, qualquer servidor o entrega como JavaScript
    rolldownOptions: { output: { assetFileNames: (a) => (/\.mjs$/.test(a.names?.[0] || a.name || "") ? "assets/[name]-[hash].js" : "assets/[name]-[hash][extname]") } },
  },
  // *.emu.test.js rodam contra os emuladores do Firebase: npm run test:emuladores
  test: { exclude: [...configDefaults.exclude, "**/*.emu.test.js"] },
});
