// Vercel serverless function — handles every /api/* request (see vercel.json)
const { handle } = require('../lib/api');
module.exports = (req, res) => handle(req, res);
