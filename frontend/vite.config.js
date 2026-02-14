import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
            },
        },
    },
});
