/**
 * Production server with compression and proper caching headers
 * Usage: node server.js
 *
 * For development, use: npm run dev (Vite dev server)
 * For production preview: npm run preview
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 8080;
const DIST_DIR = process.env.DIST_DIR || 'dist';

// MIME types for common file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// File extensions that should be compressed
const COMPRESSIBLE = ['.html', '.css', '.js', '.json', '.svg'];

// Cache settings (in seconds)
const CACHE_SETTINGS = {
    // HTML files - no cache (always fresh)
    '.html': 'no-cache',
    // Hashed assets - immutable, 1 year
    'hashed': 'public, max-age=31536000, immutable',
    // Other assets - 1 week
    'default': 'public, max-age=604800'
};

function getCacheControl(filePath) {
    const ext = path.extname(filePath);

    // HTML files should not be cached
    if (ext === '.html') {
        return CACHE_SETTINGS['.html'];
    }

    // Files with hash in name get long-term caching
    if (/-[a-f0-9]{8,}\./i.test(filePath)) {
        return CACHE_SETTINGS['hashed'];
    }

    return CACHE_SETTINGS['default'];
}

function shouldCompress(filePath, acceptEncoding) {
    const ext = path.extname(filePath);
    return COMPRESSIBLE.includes(ext) && acceptEncoding && acceptEncoding.includes('gzip');
}

const server = http.createServer((req, res) => {
    // Parse URL and remove query string
    let urlPath = req.url.split('?')[0];

    // Default to index.html for root
    if (urlPath === '/') {
        urlPath = '/index.html';
    }

    // Handle SPA routing - serve index.html for non-file paths
    const filePath = path.join(__dirname, DIST_DIR, urlPath);
    const ext = path.extname(filePath);

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Try adding .html extension
            const htmlPath = filePath + '.html';
            fs.stat(htmlPath, (htmlErr, htmlStats) => {
                if (!htmlErr && htmlStats.isFile()) {
                    serveFile(htmlPath, req, res);
                } else {
                    // 404 Not Found
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                }
            });
            return;
        }

        serveFile(filePath, req, res);
    });
});

function serveFile(filePath, req, res) {
    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    const headers = {
        'Content-Type': mimeType,
        'Cache-Control': getCacheControl(filePath),
        'X-Content-Type-Options': 'nosniff'
    };

    if (shouldCompress(filePath, acceptEncoding)) {
        headers['Content-Encoding'] = 'gzip';
        res.writeHead(200, headers);

        const fileStream = fs.createReadStream(filePath);
        const gzip = zlib.createGzip();
        fileStream.pipe(gzip).pipe(res);
    } else {
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
    }
}

server.listen(PORT, () => {
    console.log(`Production server running at http://localhost:${PORT}`);
    console.log(`Serving files from: ${path.join(__dirname, DIST_DIR)}`);
    console.log('');
    console.log('Features enabled:');
    console.log('  ✓ Gzip compression for text files');
    console.log('  ✓ Long-term caching for hashed assets');
    console.log('  ✓ No-cache for HTML files');
});
