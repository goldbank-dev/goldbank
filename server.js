/**
 * Static file server para servir o build do Vite no Cloud Run.
 * Buildpack detecta este arquivo e usa: node server.js
 */
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '8080', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.mp4':  'video/mp4',
};

createServer((req, res) => {
  // Remove query string
  const urlPath = req.url.split('?')[0];
  let filePath = join(DIST, urlPath);

  // Serve index.html for SPA routing (se arquivo não existe)
  if (!existsSync(filePath) || urlPath === '/') {
    filePath = join(DIST, 'index.html');
  }

  try {
    const data = readFileSync(filePath);
    const ext  = extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const isAsset = urlPath.startsWith('/assets/');

    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(data);
  } catch {
    // Fallback to index.html (SPA)
    try {
      const html = readFileSync(join(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch {
      res.writeHead(500);
      res.end('Server error');
    }
  }
}).listen(PORT, () => console.log(`GoldBank Web servindo na porta ${PORT}`));
