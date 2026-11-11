// API logic shared by the local server (server.js) and the Vercel function (api/index.js)
const crypto = require('crypto');
const path = require('path');
const store = require('./store');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? '' : 'change-me');
const SECRET = process.env.SESSION_SECRET || (process.env.VERCEL ? '' : 'local-dev-secret');
const MAX_UPLOAD = 3 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies
const slugify = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
const id = () => crypto.randomBytes(6).toString('hex');

// Only these fields can be edited from the admin portal.
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0; };
const list = (v, max = 30) => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => str(x, 200)).filter(Boolean).slice(0, max);
const img = v => { const s = str(v, 400); return (/^\/(img|uploads)\/[\w\-./]+$/.test(s) && !s.includes('..')) || /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[\w\-./%]+$/i.test(s) ? s : ''; };

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
    price: num(b.price), note: str(b.note, 60), image: img(b.image), stars: Math.max(0, Math.min(5, Math.round(num(b.stars)))), active: b.active !== false,
  }),
  slide: (b) => ({ image: img(b.image), title: str(b.title, 120), subtitle: str(b.subtitle, 200), active: b.active !== false }),
  site: (b, cur) => ({
    ...cur,
    heroTitle: str(b.heroTitle, 120), heroHighlight: str(b.heroHighlight, 80), heroSubtitle: str(b.heroSubtitle, 240),
    phone: str(b.phone, 40), email: str(b.email, 80), whatsapp: str(b.whatsapp, 40), address: str(b.address, 200),
    currency: str(b.currency, 5) || 'KWD', aboutText: str(b.aboutText, 600),
    appStore: str(b.appStore, 300), playStore: str(b.playStore, 300), iataNo: str(b.iataNo, 40), dgcaNo: str(b.dgcaNo, 60), tawkId: str(b.tawkId, 80),
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
  if (req.body !== undefined) {
    const b = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return null; } })() : req.body;
    return b ? Promise.resolve(b) : Promise.reject(new Error('Invalid JSON'));
  }
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('Payload too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
const publicView = d => ({
  site: d.site,
  slides: d.slides.filter(s => s.active),
  packages: d.packages.filter(p => p.active),
  deals: d.deals.filter(x => x.active),
});

// ---------- API ----------
async function api(req, res, url) {
  if (!ADMIN_PASSWORD || !SECRET) return send(res, 500, { error: 'Server not configured: set ADMIN_PASSWORD and SESSION_SECRET in Vercel environment variables.' });
  const route = url.pathname.replace(/^\/api/, '');
  const m = req.method;

  if (m === 'GET' && route === '/content') return send(res, 200, publicView((await store.load())));
  if (m === 'GET' && route.startsWith('/packages/')) {
    const p = (await store.load()).packages.find(x => x.slug === route.split('/')[2] && x.active);
    return p ? send(res, 200, p) : send(res, 404, { error: 'Not found' });
  }

  if (m === 'POST' && route === '/subscribe') {
    const b = await body(req, 5e3);
    const email = str(b.email, 120).toLowerCase(), phone = str(b.phone, 30).replace(/[^\d+ ]/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: 'Please enter a valid email address' });
    const d = await store.load(); d.subscribers = d.subscribers || [];
    const ex = d.subscribers.find(s => s.email === email);
    if (ex) { if (phone) ex.phone = phone; } else d.subscribers.unshift({ id: id(), email, phone, source: str(b.source, 30) || 'website', at: new Date().toISOString() });
    if (d.subscribers.length > 20000) d.subscribers.length = 20000;
    await store.save(d); return send(res, 200, { ok: true });
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
  if (m === 'GET' && coll === 'content') return send(res, 200, (await store.load()));

  if (coll === 'ai') {
    const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || req.headers['x-vercel-oidc-token'];
    if (m === 'GET' && parts[2] === 'status') return send(res, 200, { available: !!key });
    if (m === 'POST' && parts[2] === 'write') {
      if (!key) return send(res, 503, { error: 'AI is not enabled yet. In Vercel, open AI Gateway for this project (or add AI_GATEWAY_API_KEY), then redeploy.' });
      const b = await body(req, 20e3);
      const f = { title: str(b.title, 120), destination: str(b.destination, 80), duration: str(b.duration, 60), price: num(b.price), inclusions: list(b.inclusions), notes: str(b.notes, 600), tone: str(b.tone, 30) || 'premium' };
      if (!f.title && !f.destination) return send(res, 400, { error: 'Add a package name or destination first' });
      const prompt = `You write copy for Jumbo Travel, a premium travel agency in Kuwait with 50+ years of history. Write for a holiday package.\nPackage: ${f.title}\nDestination: ${f.destination}\nDuration: ${f.duration}\nPrice: ${f.price} KWD\nKnown inclusions: ${f.inclusions.join('; ') || 'none given'}\nNotes from staff: ${f.notes || 'none'}\nTone: ${f.tone}, warm, refined, no hype, no emojis. Do not invent prices, dates, hotel names or promises not given above.\nReturn ONLY JSON: {"summary": "one sentence, max 110 characters", "description": "2 short paragraphs, max 600 characters total", "inclusions": ["up to 6 short items; keep the known inclusions, you may suggest generic ones like Airport transfers only if none are given"], "badge": "optional 1-2 word badge or empty string"}`;
      const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.AI_MODEL || 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: .7, response_format: { type: 'json_object' } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return send(res, 502, { error: 'AI service error: ' + (j.error?.message || r.status) });
      let out; try { out = JSON.parse(j.choices[0].message.content.replace(/^```json|```$/g, '')); } catch { return send(res, 502, { error: 'AI returned an unexpected answer, please try again' }); }
      return send(res, 200, { summary: str(out.summary, 240), description: str(out.description, 5000), inclusions: list(out.inclusions, 8), badge: str(out.badge, 40) });
    }
  }

  if (coll === 'subscribers' && m === 'DELETE' && parts[2]) {
    const d = await store.load(); d.subscribers = (d.subscribers || []).filter(s => s.id !== parts[2]); await store.save(d); return send(res, 200, { ok: true });
  }
  if (m === 'PUT' && coll === 'site') {
    const d = await store.load(); d.site = clean.site(await body(req, 50e3), d.site); await store.save(d); return send(res, 200, d.site);
  }

  if (m === 'POST' && coll === 'upload') {
    const b = await body(req);
    const match = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(b.data || '');
    if (!match) return send(res, 400, { error: 'Please upload a PNG, JPG, WEBP or GIF image' });
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length > MAX_UPLOAD) return send(res, 413, { error: 'Image is too large (max 3 MB after resizing)' });
    const ext = match[1].replace('jpeg', 'jpg');
    const name = `${Date.now()}-${slugify(path.parse(b.name || 'image').name).slice(0, 40)}.${ext}`;
    const url = await store.saveImage(name, buf, `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}`);
    return send(res, 201, { url });
  }

  if (COLLECTIONS[coll]) {
    const d = (await store.load()); const items = d[coll]; const cleaner = clean[COLLECTIONS[coll]];
    const itemId = parts[2];
    if (m === 'POST' && itemId === 'reorder') {
      const order = (await body(req, 20e3)).ids || [];
      d[coll] = order.map(i => items.find(x => x.id === i)).filter(Boolean).concat(items.filter(x => !order.includes(x.id)));
      await store.save(d); return send(res, 200, { ok: true });
    }
    if (m === 'POST' && !itemId) {
      const item = { id: id(), ...cleaner(await body(req, 100e3)), updatedAt: new Date().toISOString() };
      if (coll === 'packages') item.slug = uniqueSlug(items, item.title);
      items.push(item); await store.save(d); return send(res, 201, item);
    }
    const idx = items.findIndex(x => x.id === itemId);
    if (idx < 0) return send(res, 404, { error: 'Not found' });
    if (m === 'PUT') {
      const next = { ...items[idx], ...cleaner(await body(req, 100e3)), updatedAt: new Date().toISOString() };
      if (coll === 'packages' && next.title !== items[idx].title) next.slug = uniqueSlug(items.filter(x => x.id !== itemId), next.title);
      items[idx] = next; await store.save(d); return send(res, 200, next);
    }
    if (m === 'DELETE') { items.splice(idx, 1); await store.save(d); return send(res, 200, { ok: true }); }
  }
  return send(res, 404, { error: 'Not found' });
}
function uniqueSlug(items, title) {
  const base = slugify(title); let s = base, i = 2;
  while (items.some(x => x.slug === s)) s = `${base}-${i++}`;
  return s;
}


async function handle(req, res) {
  let url = new URL(req.url, 'http://localhost');
  // vercel.json rewrites /api/<path> → /api/index?__path=<path>; restore the original path
  const p = url.searchParams.get('__path');
  if (p !== null) { url.searchParams.delete('__path'); url = new URL(`/api/${p}${url.search}`, 'http://localhost'); }
  if (url.pathname === '/api/index' && req.headers?.['x-matched-path'] === undefined && req.headers?.['x-now-route-matches']) {
    const m = new URLSearchParams(req.headers['x-now-route-matches']).get('1'); if (m) url = new URL(`/api/${m}`, 'http://localhost');
  }
  try { await api(req, res, url); }
  catch (e) { send(res, /large/.test(e.message) ? 413 : /Storage|storage/.test(e.message) ? 503 : 400, { error: e.message || 'Bad request' }); }
}
module.exports = { handle, send };
