import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Explicit route for About Us
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'about.html'));
});

// Admin SPA sub-paths (e.g. /admin-dashboard.html/properties) need to
// resolve back to the admin shell on a hard refresh or direct link —
// express.static only matches exact files, and the catch-all below would
// otherwise fall through to the public site's index.html.
app.get(/^\/admin-dashboard\.html(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'admin-dashboard.html'));
});

// Catch-all route for SPA (client-side routing).
// Express 5's router (path-to-regexp v8) dropped support for a bare '*'
// string pattern — it now requires a named wildcard or a RegExp. Using a
// RegExp here for the widest compatibility and to match the admin route above.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
});
