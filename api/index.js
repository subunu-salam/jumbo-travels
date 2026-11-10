// Vercel serverless function — handles every /api/* request (see vercel.json rewrite)
const { handle } = require('../lib/api');
module.exports = (req, res) => {
  // vercel.json rewrites /api/<path> → /api/index?__path=<path>; restore the original URL
  const u = new URL(req.url, 'http://localhost');
  const p = u.searchParams.get('__path');
  if (p !== null) { u.searchParams.delete('__path'); req.url = `/api/${p}${u.search}`; }
  return handle(req, res);
};
