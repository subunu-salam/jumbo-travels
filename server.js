// Jumbo Travel — website + admin CMS server (zero dependencies, Node 18+)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'content.json');
const SEED_FILE = path.join(ROOT, 'data', 'seed.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const MAX_UPLOAD = 8 * 1024 * 1024;

for (const d of [DATA_DIR, UPLOAD_DIR]) fs.mkdirSync(d, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.copyFileSync(SEED_FILE, DATA_FILE);
if (!process.env.ADMIN_PASSWORD) console.warn('⚠  ADMIN_PASSWORD not set — using default "change-me". Set it before deploying.');

// ---------- data store ----------
const load = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
function save(data) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
const slugify = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
const id = () => crypto.randomBytes(6).toString('hex');

// Only these fields can be edited from the admin portal.
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0; };
const list = (v, max = 30) => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => str(x, 200)).filter(Boolean).slice(0, max);
const img = v => { const s = str(v, 300); return /^\/(img|uploads)\/[\w\-./]+$/.test(s) && !s.includes('..') ? s : ''; };

const clean = {
  package: (b) => ({
    title: str(b.title, 120), destination: str(b.destination, 80), duration: str(b.duration, 60),
    price: num(b.price), oldPrice: num(b.oldPrice), badge: str(b.badge, 40),
    summary: str(b.summary, 240), description: str(b.description, 5000),
    inclusions: list(b.inclusions), images: (Array.isArray(b.images) ? b.images : []).map(img).filter(Boolean).slice(0, 12),
    featured: !!b.featured, active: b.active !== false,
  }),
  deal: (b) => ({
    type: b.type === 'hotel' ? 'hotel' : 'flight', title: str(b.title, 120), location: str(b.location, 80),
    price: num(b.price), note: str(b.note, 60), image: img(b.image), active: b.active !== false,
  }),
  slide: (b) => ({ image: img(b.image), title: str(b.title, 120), subtitle: str(b.subtitle, 200), active: b.active !== false }),
  site: (b, cur) => ({
    ...cur,
    heroTitle: str(b.heroTitle, 120), heroHighlight: str(b.heroHighlight, 80), heroSubtitle: str(b.heroSubtitle, 240),
    phone: str(b.phone, 40), email: str(b.email, 80), whatsapp: str(b.whatsapp, 40), address: str(b.address, 200),
    currency: str(b.currency, 5) || 'KWD', aboutText: str(b.aboutText, 600),
    social: { facebook: str(b.social?.facebook), instagram: str(b.social?.instagram), x: str(b.social?.x) },
  }),
};
const COLLECTIONS = { packages: 'package', deals: 'deal', slides: 'slide' };

// ---------- auth ----------
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
function makeToken(user) { const p = `${user}.${Date.now() + 12 * 3600e3}`; return `${p}.${sign(p)}`; }
function checkToken(t) {
  if (!t) return false;
  const i = t.lastIndexOf('.'); const p = t.slice(0, i), s = t.slice(i + 1);
  const exp = Number(p.split('.').pop());
  const good = sign(p);
  return s.length === good.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good)) && exp > Date.now();
}
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=').map(decodeURIComponent)).filter(c => c[0]));
const safeEq = (a, b) => { const x = sign(String(a)), y = sign(String(b)); return crypto.timingSafeEqual(Buffer.from(x), Buffer.from(y)); };
const attempts = new Map();

// ---------- helpers ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function body(req, limit = MAX_UPLOAD * 1.4) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('Payload too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
function serveFile(res, file, cache = 'public, max-age=3600', code = 200) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return code === 404 ? send(res, 404, 'Not found', 'text/plain') : notFound(res);
    res.writeHead(code, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}
function notFound(res) { serveFile(res, path.join(ROOT, 'public', '404.html'), 'no-cache', 404); }
function safeJoin(base, p) { const f = path.normalize(path.join(base, p)); return f.startsWith(base) ? f : null; }
const publicView = d => ({
  site: d.site,
  slides: d.slides.filter(s => s.active),
  packages: d.packages.filter(p => p.active),
  deals: d.deals.filter(x => x.active),
});

// ---------- API ----------
async function api(req, res, url) {
  const route = url.pathname.replace(/^\/api/, '');
  const m = req.method;

  if (m === 'GET' && route === '/content') return send(res, 200, publicView(load()));
  if (m === 'GET' && route.startsWith('/packages/')) {
    const p = load().packages.find(x => x.slug === route.split('/')[2] && x.active);
    return p ? send(res, 200, p) : send(res, 404, { error: 'Not found' });
  }

  if (m === 'POST' && route === '/admin/login') {
    const ip = req.socket.remoteAddress; const a = attempts.get(ip) || { n: 0, t: Date.now() };
    if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
    if (a.n >= 8) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const b = await body(req, 10e3);
    if (safeEq(b.username, ADMIN_USER) && safeEq(b.password, ADMIN_PASSWORD)) {
      attempts.delete(ip);
      res.setHeader('Set-Cookie', `jt_admin=${makeToken(ADMIN_USER)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
      return send(res, 200, { ok: true });
    }
    a.n++; attempts.set(ip, a);
    return send(res, 401, { error: 'Invalid username or password' });
  }
  if (m === 'POST' && route === '/admin/logout') {
    res.setHeader('Set-Cookie', 'jt_admin=; HttpOnly; Path=/; Max-Age=0');
    return send(res, 200, { ok: true });
  }

  // everything below requires admin
  if (!route.startsWith('/admin/')) return send(res, 404, { error: 'Not found' });
  if (!checkToken(cookies(req).jt_admin)) return send(res, 401, { error: 'Please log in' });
  const parts = route.split('/').filter(Boolean); // ['admin', coll, id?]
  const coll = parts[1];

  if (m === 'GET' && coll === 'me') return send(res, 200, { user: ADMIN_USER });
  if (m === 'GET' && coll === 'content') return send(res, 200, load());

  if (m === 'PUT' && coll === 'site') {
    const d = load(); d.site = clean.site(await body(req, 50e3), d.site); save(d); return send(res, 200, d.site);
  }

  if (m === 'POST' && coll === 'upload') {
    const b = await body(req);
    const match = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(b.data || '');
    if (!match) return send(res, 400, { error: 'Please upload a PNG, JPG, WEBP or GIF image' });
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length > MAX_UPLOAD) return send(res, 413, { error: 'Image must be under 8 MB' });
    const ext = match[1].replace('jpeg', 'jpg');
    const name = `${Date.now()}-${slugify(path.parse(b.name || 'image').name).slice(0, 40)}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return send(res, 201, { url: `/uploads/${name}` });
  }

  if (COLLECTIONS[coll]) {
    const d = load(); const items = d[coll]; const cleaner = clean[COLLECTIONS[coll]];
    const itemId = parts[2];
    if (m === 'POST' && itemId === 'reorder') {
      const order = (await body(req, 20e3)).ids || [];
      d[coll] = order.map(i => items.find(x => x.id === i)).filter(Boolean).concat(items.filter(x => !order.includes(x.id)));
      save(d); return send(res, 200, { ok: true });
    }
    if (m === 'POST' && !itemId) {
      const item = { id: id(), ...cleaner(await body(req, 100e3)), updatedAt: new Date().toISOString() };
      if (coll === 'packages') item.slug = uniqueSlug(items, item.title);
      items.push(item); save(d); return send(res, 201, item);
    }
    const idx = items.findIndex(x => x.id === itemId);
    if (idx < 0) return send(res, 404, { error: 'Not found' });
    if (m === 'PUT') {
      const next = { ...items[idx], ...cleaner(await body(req, 100e3)), updatedAt: new Date().toISOString() };
      if (coll === 'packages' && next.title !== items[idx].title) next.slug = uniqueSlug(items.filter(x => x.id !== itemId), next.title);
      items[idx] = next; save(d); return send(res, 200, next);
    }
    if (m === 'DELETE') { items.splice(idx, 1); save(d); return send(res, 200, { ok: true }); }
  }
  return send(res, 404, { error: 'Not found' });
}
function uniqueSlug(items, title) {
  const base = slugify(title); let s = base, i = 2;
  while (items.some(x => x.slug === s)) s = `${base}-${i++}`;
  return s;
}

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (url.pathname.startsWith('/uploads/')) {
      const f = safeJoin(UPLOAD_DIR, decodeURIComponent(url.pathname.slice(9)));
      return f ? serveFile(res, f, 'public, max-age=31536000, immutable') : notFound(res);
    }
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      const rel = url.pathname.replace(/^\/admin\/?/, '') || 'index.html';
      const f = safeJoin(path.join(ROOT, 'admin'), rel);
      return f && fs.existsSync(f) ? serveFile(res, f, 'no-cache') : serveFile(res, path.join(ROOT, 'admin', 'index.html'), 'no-cache');
    }
    // pretty URLs: /packages, /packages/:slug
    if (url.pathname === '/packages') return serveFile(res, path.join(ROOT, 'public', 'packages.html'), 'no-cache');
    if (/^\/packages\/[\w-]+\/?$/.test(url.pathname)) return serveFile(res, path.join(ROOT, 'public', 'package.html'), 'no-cache');
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname);
    const f = safeJoin(path.join(ROOT, 'public'), rel);
    return f ? serveFile(res, f, rel.endsWith('.html') ? 'no-cache' : undefined) : notFound(res);
  } catch (e) {
    send(res, /large/.test(e.message) ? 413 : 400, { error: e.message || 'Bad request' });
  }
});
server.listen(PORT, () => console.log(`Jumbo Travel running → http://localhost:${PORT}  (admin: /admin)`));
