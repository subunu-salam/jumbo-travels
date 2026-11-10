// Storage adapters.
// Vercel: content → Upstash Redis (REST), images → Vercel Blob.
// Local:  content → data/content.json, images → uploads/.
const fs = require('fs');
const path = require('path');
const seed = require('../data/seed.json');

const ROOT = path.join(__dirname, '..');
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
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
  if (!fs.existsSync(DATA_FILE)) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2)); }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

async function save(data) {
  if (useRedis) return redis(['SET', KEY, JSON.stringify(data)]);
  if (process.env.VERCEL) throw new Error('Storage is not connected. Add Upstash Redis in Vercel → Storage.');
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
