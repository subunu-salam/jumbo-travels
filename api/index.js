// Vercel function entry (used when Vercel runs api/ as functions)
const { handle } = require('../lib/api');
module.exports = (req, res) => handle(req, res);
