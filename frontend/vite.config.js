import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
    // React plugin only transforms .jsx/.tsx files — every existing vanilla
    // HTML/JS page is untouched by this.
    plugins: [react()],
    // sockjs-client (used by the admin Messages module's STOMP client)
    // references the Node global `global` at module scope, which doesn't
    // exist in a browser ESM bundle — this is the standard, well-known fix.
    define: {
        global: 'globalThis',
    },
    resolve: {
        alias: {
            // Scoped to the new React admin tree only (shadcn's generated
            // imports use "@/..."). Nothing outside src/admin resolves through
            // this alias, so it can't affect any other page.
            '@': resolve(__dirname, 'src/admin'),
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login.html'),
                register: resolve(__dirname, 'register.html'),
                properties: resolve(__dirname, 'properties.html'),
                agents: resolve(__dirname, 'agents.html'),
                about: resolve(__dirname, 'about.html'),
                view_property: resolve(__dirname, 'view-property.html'),
                admin_dashboard: resolve(__dirname, 'admin-dashboard.html'),
                user_dashboard: resolve(__dirname, 'user-dashboard.html'),
                contact: resolve(__dirname, 'contact.html'),
                // Temporary Phase-0 scratch entry for the new React admin app.
                // Deliberately NOT admin-dashboard.html — the old dashboard stays
                // untouched and reachable until its replacement is verified
                // (see Phase 1 of the migration plan).
                admin_react_preview: resolve(__dirname, 'admin-react-preview.html'),
            },
        },
    },
});
