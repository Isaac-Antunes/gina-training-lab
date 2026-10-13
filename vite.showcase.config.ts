import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vitrine pública: só as demonstrações, sem servidor, sem chaves e sem a pasta
 * public/ (onde fica o ZIP com o código-fonte). Gera dist-showcase/.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pasta pública só da vitrine (imagem de prévia e poses da Gina). Nunca public/, onde fica o ZIP.
  publicDir: 'showcase-public',
  build: {
    outDir: 'dist-showcase',
    emptyOutDir: true,
    // Uma página por língua: o LinkedIn lê só as metatags do HTML, não o JavaScript.
    rollupOptions: { input: { pt: 'showcase.html', en: 'en.html' } },
  },
});
