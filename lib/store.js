// Storage adapters.
// Vercel: content → Upstash Redis (REST), images → Vercel Blob.
// Local:  content → data/content.json, images → uploads/.
const fs = require('fs');
const path = require('path');
const seed = require('../data/seed.json');

const ROOT = path.join(__dirname, '..');
// Find env vars even when Vercel's integration added a custom prefix (e.g. STORAGE_KV_REST_API_URL).
const envBySuffix = (...suffixes) => {
  for (const sfx of suffixes) {
    if (process.env[sfx]) return process.env[sfx];
    const k = Object.keys(process.env).find(k => k.endsWith('_' + sfx) && process.env[k]);
    if (k) return process.env[k];
  }
};
const REDIS_URL = envBySuffix('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = envBySuffix('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
const BLOB_TOKEN = envBySuffix('BLOB_READ_WRITE_TOKEN');
const BLOB_CONTENT_PATH = 'jumbo/content.json';
const KEY = process.env.CONTENT_KEY || 'jumbo:content';
const DATA_FILE = path.join(process.env.DATA_DIR || path.join(ROOT, 'data'), 'content.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');

const useRedis = !!(REDIS_URL && REDIS_TOKEN);
const useBlob = !!BLOB_TOKEN;
const clone = o => JSON.parse(JSON.stringify(o));

async function redis(cmd) {
  const r = await fetch(REDIS_URL, { method: 'POST', headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error('Storage error: ' + (j.error || r.status));
  return j.result;
}

async function load() {
  if (useRedis) {
    const v = await redis(['GET', KEY]);
    if (v) return JSON.parse(v);
    const s = clone(seed); await redis(['SET', KEY, JSON.stringify(s)]); return s;
  }
  if (useBlob) {
    // Fallback: keep content as a JSON file in Vercel Blob when Redis isn't connected.
    const { head } = await import('@vercel/blob');
    try {
      const meta = await head(BLOB_CONTENT_PATH, { token: BLOB_TOKEN });
      const r = await fetch(`${meta.url}?v=${new Date(meta.uploadedAt).getTime()}`, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch (e) { if (!/not.?found/i.test(e.name + e.message)) throw e; }
    return clone(seed);
  }
  if (process.env.VERCEL) return clone(seed); // read-only until storage is connected
  if (!fs.existsSync(DATA_FILE)) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2)); }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

async function save(data) {
  if (useRedis) return redis(['SET', KEY, JSON.stringify(data)]);
  if (useBlob) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_CONTENT_PATH, JSON.stringify(data), { access: 'public', contentType: 'application/json', token: BLOB_TOKEN, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
    return;
  }
  if (process.env.VERCEL) throw new Error('Storage is not connected. In Vercel → Storage, connect Upstash Redis (or Vercel Blob), then redeploy.');
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, DATA_FILE);
}

async function saveImage(name, buf, contentType) {
  if (useBlob) {
    const { put } = await import('@vercel/blob');
    const b = await put(`jumbo/${name}`, buf, { access: 'public', contentType, token: BLOB_TOKEN, addRandomSuffix: true });
    return b.url;
  }
  if (process.env.VERCEL) throw new Error('Image storage is not connected. Add Vercel Blob in Vercel → Storage.');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}

module.exports = { load, save, saveImage, UPLOAD_DIR, mode: { redis: useRedis, blob: useBlob } };
