import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    // the build is served from GitHub Pages at slahuddeen.github.io/big-al/
    base: command === 'build' ? '/big-al/' : '/',
    plugins: [react()],
    server: {
        port: 3000,
        open: true
    },
    build: {
        rollupOptions: {
            // keep three.js in its own cacheable chunk
            output: { manualChunks: { three: ['three'] } }
        },
        chunkSizeWarningLimit: 700
    }
}))
