import { defineConfig } from 'vite';

// The Jehol model lab, built as one self-contained page (see scripts/inline-lab.mjs)
export default defineConfig({
    base: './',
    build: {
        outDir: 'dist-lab',
        emptyOutDir: true,
        modulePreload: false,
        assetsInlineLimit: 100000000,
        rollupOptions: { input: 'models.html' }
    }
});
