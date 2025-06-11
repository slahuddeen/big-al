/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                stone: {
                    800: '#292524',
                }
            },
            animation: {
                'bounce': 'bounce 1s infinite',
            }
        },
    },
    plugins: [],
}