// Local development server. On Vercel, public/ is served statically and /api/* runs api/index.js.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle, send } = require('./lib/api');
const { UPLOAD_DIR, mode } = require('./lib/store');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const safeJoin = (base, p) => { const f = path.normalize(path.join(base, p)); return f.startsWith(base) ? f : null; };

function serve(res, file, code = 200) {
  fs.stat(file || '', (err, st) => {
    if (err || !st.isFile()) return code === 404 ? send(res, 404, 'Not found', 'text/plain') : serve(res, path.join(PUB, '404.html'), 404);
    res.writeHead(code, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

// mirror of the rewrites in vercel.json
function route(p) {
  if (p === '/packages') return '/packages.html';
  if (/^\/packages\/[\w-]+\/?$/.test(p)) return '/package.html';
  if (p === '/admin' || p === '/admin/') return '/admin/index.html';
  if (p === '/manage-booking') return '/manage-booking.html';
  if (p === '/') return '/index.html';
  return p;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return handle(req, res);
  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (url.pathname.startsWith('/uploads/')) return serve(res, safeJoin(UPLOAD_DIR, decodeURIComponent(url.pathname.slice(9))));
  serve(res, safeJoin(PUB, decodeURIComponent(route(url.pathname))));
}).listen(PORT, () => console.log(`Jumbo Travel → http://localhost:${PORT}  (admin: /admin)  storage: ${mode.redis ? 'Upstash Redis' : 'local file'}, images: ${mode.blob ? 'Vercel Blob' : 'local folder'}`));
