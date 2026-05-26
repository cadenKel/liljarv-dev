// /api/review.js
const fs = require('fs');
const readJSON = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; } };
const writeJSON = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));
const parseBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', c => { data += c; });
  req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(); } });
});
const json = (res, status, body) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(status);
  res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });

  let body;
  try { body = await parseBody(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }

  const { agent_id, product_id, rating, review_text } = body;
  if (!agent_id || !product_id || !rating || !review_text) {
    return json(res, 400, { error: 'Missing fields', required: { agent_id: 'string', product_id: 'string', rating: '1-5', review_text: 'min 50 chars' } });
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return json(res, 400, { error: 'rating must be a number 1-5' });
  }
  if (review_text.length < 50) {
    return json(res, 400, { error: `review_text too short (${review_text.length} chars). Minimum 50. Describe what was useful.` });
  }

  const reviews = readJSON('/tmp/reviews.json');
  reviews.push({ agent_id, product_id, rating, review_text, timestamp: new Date().toISOString() });
  writeJSON('/tmp/reviews.json', reviews);

  return json(res, 201, { success: true, message: 'Review accepted. You may now place a new order at POST /api/order.' });
};
