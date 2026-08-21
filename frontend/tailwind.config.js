// Lets Tailwind generate opacity-modified utilities (e.g. bg-primary/10,
// used throughout the HTML, and @apply ...-primary/50 in this file) from a
// CSS custom property — a plain var() string can't supply the alpha channel
// Tailwind normally extracts from a hex/rgb value, so without this the whole
// stylesheet fails to compile wherever an opacity modifier is used.
// For the no-modifier case Tailwind passes opacityValue as a CSS-variable
// reference (e.g. "var(--tw-text-opacity)"), not undefined — parseFloat
// distinguishes that from a real "/50"-style modifier's numeric string.
const withOpacity = (varName) => ({ opacityValue }) => {
    const pct = parseFloat(opacityValue);
    return Number.isFinite(pct)
        ? `color-mix(in srgb, var(${varName}) ${pct * 100}%, transparent)`
        : `var(${varName})`;
};

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
                // Theme-aware tokens — actual values come from src/theme.css
                // (data-theme="spring"/"ocean"), so these keep working
                // whichever theme is active. See main.js's initThemeSwitcher.
                primary: withOpacity('--color-primary'),
                secondary: withOpacity('--color-surface'), // Dark background
                // accent kept as a DEFAULT/foreground pair (not a plain function) so
                // shadcn/ui components can also use `accent-foreground` — bg-accent /
                // border-accent / text-accent resolve to the same value as before via
                // DEFAULT, so existing usage (agent-profile.html, profileagent.html) is
                // unaffected.
                accent: {
                    DEFAULT: withOpacity('--color-primary'),
                    foreground: withOpacity('--color-accent-foreground'),
                },
                surface: withOpacity('--color-background'), // Page background
                'dark-card': withOpacity('--color-card'),
                'dark-border': withOpacity('--color-border'),
                glass: 'rgba(30, 30, 30, 0.8)',

                // shadcn/ui tokens (React admin app only, see src/theme.css) — all
                // new keys, no existing token above is renamed or removed.
                background: withOpacity('--color-background'),
                foreground: withOpacity('--color-foreground'),
                card: {
                    DEFAULT: withOpacity('--color-card'),
                    foreground: withOpacity('--color-foreground'),
                },
                popover: {
                    DEFAULT: withOpacity('--color-popover'),
                    foreground: withOpacity('--color-popover-foreground'),
                },
                'primary-foreground': withOpacity('--color-primary-foreground'),
                'secondary-foreground': withOpacity('--color-secondary-foreground'),
                muted: {
                    DEFAULT: withOpacity('--color-muted'),
                    foreground: withOpacity('--color-muted-foreground'),
                },
                destructive: {
                    DEFAULT: withOpacity('--color-destructive'),
                    foreground: withOpacity('--color-destructive-foreground'),
                },
                border: withOpacity('--color-border'),
                input: withOpacity('--color-input'),
                ring: withOpacity('--color-ring'),
                sidebar: {
                    DEFAULT: withOpacity('--color-sidebar'),
                    foreground: withOpacity('--color-sidebar-foreground'),
                    primary: withOpacity('--color-sidebar-primary'),
                    'primary-foreground': withOpacity('--color-sidebar-primary-foreground'),
                    accent: withOpacity('--color-sidebar-accent'),
                    'accent-foreground': withOpacity('--color-sidebar-accent-foreground'),
                    border: withOpacity('--color-sidebar-border'),
                    ring: withOpacity('--color-sidebar-ring'),
                },
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
            },
            // shadcn/ui radius scale (React admin app only) — see --radius in
            // src/theme.css. New keys, no existing borderRadius config existed.
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
}
