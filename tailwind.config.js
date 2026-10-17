/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                pixel: ['Cinzel', 'Georgia', 'serif'],
                sans: ['Figtree', 'system-ui', 'sans-serif']
            },
            colors: {
                ink: { DEFAULT: '#f3ead8', muted: '#b5ab97', dim: '#7d7566' },
                amber: { glow: '#f4b740' },
                health: '#e5584f',
                food: '#f0a43a',
                water: '#4fb3e8',
                grow: '#b88cf0'
            }
        },
    },
    plugins: [],
}
