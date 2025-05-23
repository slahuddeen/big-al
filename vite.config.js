import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    css: {
        postcss: null // Disable PostCSS processing
    },
    base: '/big-al/'
})