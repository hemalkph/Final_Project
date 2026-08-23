import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
    // React plugin only transforms .jsx/.tsx files — every existing vanilla
    // HTML/JS page is untouched by this.
    plugins: [
        react(),
        {
            // Dev-only mirror of server.js's SPA-fallback route: a hard
            // refresh on an admin sub-path (e.g. /admin-dashboard.html/agents)
            // would otherwise 404 in `vite dev`, since only the production
            // Express server has the rewrite. Never affects the built output.
            name: 'admin-spa-fallback',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url?.startsWith('/admin-dashboard.html/')) {
                        req.url = '/admin-dashboard.html';
                    }
                    next();
                });
            },
        },
    ],
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
                // Phase-0 scratch entry for the React admin app, kept as a
                // safety net after the Phase 6 cutover (admin-dashboard.html
                // now serves this same app for real) until Phase 7 removes it.
                admin_react_preview: resolve(__dirname, 'admin-react-preview.html'),
            },
        },
    },
});
