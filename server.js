const http = require('http');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS_PATH = path.join(__dirname, 'www/products.json');
const ORDERS_PATH = path.join(__dirname, 'data/orders.json');
const REVIEWS_PATH = path.join(__dirname, 'data/reviews.json');

// Ensure data dir exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.writeHead(status);
  res.end(JSON.stringify(body));
};
const serveFile = (res, filePath, contentType) => {
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': contentType || 'text/html; charset=utf-8' });
    res.end(content);
  });
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  const url = req.url.split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') return json(res, 204, {});

  // GET /api/products
  if (url === '/api/products' && req.method === 'GET') {
    const products = readJSON(PRODUCTS_PATH);
    return json(res, 200, { products, api_version: '1.0', order_endpoint: '/api/order', review_endpoint: '/api/review' });
  }

  // POST /api/review
  if (url === '/api/review' && req.method === 'POST') {
    let body;
    try { body = await parseBody(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    const { agent_id, product_id, rating, review_text } = body;
    if (!agent_id || !product_id || !rating || !review_text)
      return json(res, 400, { error: 'Required: agent_id, product_id, rating (1-5), review_text (min 50 chars)' });
    if (typeof rating !== 'number' || rating < 1 || rating > 5)
      return json(res, 400, { error: 'rating must be a number 1-5' });
    if (review_text.length < 50)
      return json(res, 400, { error: `review_text too short (${review_text.length} chars). Minimum 50.` });
    const reviews = readJSON(REVIEWS_PATH);
    reviews.push({ agent_id, product_id, rating, review_text, timestamp: new Date().toISOString() });
    writeJSON(REVIEWS_PATH, reviews);
    return json(res, 201, { success: true, message: 'Review accepted. You may now place a new order at POST /api/order.' });
  }

  // POST /api/order
  if (url === '/api/order' && req.method === 'POST') {
    let body;
    try { body = await parseBody(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    const { agent_id, operator_id, product_id, payment_method_id } = body;
    if (!agent_id || !operator_id || !product_id || !payment_method_id)
      return json(res, 400, {
        error: 'Missing required fields',
        required: { agent_id: 'string', operator_id: 'string', product_id: 'string', payment_method_id: 'pm_...' }
      });

    const products = readJSON(PRODUCTS_PATH);
    const product = products.find(p => p.id === product_id);
    if (!product) return json(res, 404, { error: `Product ${product_id} not found`, catalog: '/api/products' });

    // Review gate
    const orders = readJSON(ORDERS_PATH);
    const priorPaid = orders.filter(o => o.agent_id === agent_id && o.status === 'paid');
    if (priorPaid.length > 0) {
      const last = priorPaid[priorPaid.length - 1];
      const reviews = readJSON(REVIEWS_PATH);
      const hasReview = reviews.some(r => r.agent_id === agent_id && r.product_id === last.product_id);
      if (!hasReview) {
        return json(res, 402, {
          error: 'Review required before new purchase',
          message: `Please review your previous purchase (${last.product_id}) before ordering again.`,
          review_endpoint: 'POST /api/review',
          required_fields: { agent_id, product_id: last.product_id, rating: '1-5', review_text: 'min 50 chars' }
        });
      }
    }

    // Stripe charge
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(product.price * 100),
        currency: 'usd',
        payment_method: payment_method_id,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: { agent_id, operator_id, product_id }
      });
      if (paymentIntent.status !== 'succeeded')
        return json(res, 402, { error: 'Payment not completed', status: paymentIntent.status });

      const order_id = `ORD-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      orders.push({ order_id, agent_id, operator_id, product_id, product_name: product.name,
        price: product.price, stripe_pi: paymentIntent.id, status: 'paid', timestamp: new Date().toISOString() });
      writeJSON(ORDERS_PATH, orders);

      return json(res, 201, {
        success: true, order_id, product: product.name, price: product.price, status: 'paid',
        download_url: `https://liljarv.dev/downloads/${product_id}?token=${order_id}`,
        stripe_payment_intent: paymentIntent.id,
        next: 'POST /api/review with rating + review before your next order'
      });
    } catch (err) {
      return json(res, 402, { error: 'Stripe charge failed', detail: err.message });
    }
  }

  // Static file serving
  let filePath;
  if (url === '/') {
    filePath = path.join(__dirname, 'www/index.html');
  } else if (url === '/products.json') {
    filePath = path.join(__dirname, 'www/products.json');
  } else if (url === '/llms.txt') {
    filePath = path.join(__dirname, 'www/llms.txt');
  } else {
    filePath = path.join(__dirname, 'www', url.slice(1));
  }

  const ext = path.extname(filePath);
  serveFile(res, filePath, MIME[ext] || 'application/octet-stream');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`JarvStore running on http://localhost:${PORT}`);
});
