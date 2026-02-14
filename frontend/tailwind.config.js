/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./login.html",
        "./register.html",
        "./properties.html",
        "./agents.html",
        "./view-property.html",
        "./user-dashboard.html",
        "./admin-dashboard.html",
        "./sell-property.html",
        "./aboutDev.html",
        "./contact.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Spring Green Color Palette
                primary: '#11d661', // Main spring-green accent
                secondary: '#1A1A1A', // Dark background
                accent: '#11d661', // Spring-green accent
                surface: '#0D0D0D', // Near black
                'dark-card': '#1E1E1E', // Slightly lighter card bg
                'dark-border': '#2A2A2A', // Subtle borders
                glass: 'rgba(30, 30, 30, 0.8)',
                // Full spring-green palette for flexibility
                'spring-green': {
                    '50': '#effef4',
                    '100': '#d9ffe7',
                    '200': '#b5fdd0',
                    '300': '#7bfaad',
                    '400': '#2bec78',
                    '500': '#11d661',
                    '600': '#07b24c',
                    '700': '#0a8b3e',
                    '800': '#0e6d35',
                    '900': '#0d5a2f',
                    '950': '#013217',
                },
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
                display: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            backgroundImage: {
                'hero-pattern': "url('https://images.unsplash.com/photo-1600596542815-27a90b5aff29?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80')",
            }
        },
    },
    plugins: [],
}
