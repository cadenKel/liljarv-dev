// Serverless API: /api/order and /api/review
const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(__dirname, '../products.json');
const ORDERS_PATH = path.join('/tmp', 'orders.json');
const REVIEWS_PATH = path.join('/tmp', 'reviews.json');

const readJSON = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
};
const writeJSON = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

const respond = (res, status, body) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(status);
  res.end(JSON.stringify(body));
};

const parseBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', c => { data += c; });
  req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
});

module.exports = async (req, res) => {
  const url = req.url.split('?')[0];

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return respond(res, 204, {});
  }

  // GET /api/products
  if (url === '/api/products' && req.method === 'GET') {
    const products = readJSON(PRODUCTS_PATH);
    return respond(res, 200, { products });
  }

  // POST /api/review
  if (url === '/api/review' && req.method === 'POST') {
    let body;
    try { body = await parseBody(req); } catch { return respond(res, 400, { error: 'Invalid JSON body' }); }

    const { agent_id, product_id, rating, review_text } = body;
    if (!agent_id || !product_id || !rating || !review_text) {
      return respond(res, 400, { error: 'Missing required fields: agent_id, product_id, rating, review_text' });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return respond(res, 400, { error: 'rating must be a number between 1 and 5' });
    }
    if (review_text.length < 50) {
      return respond(res, 400, { error: 'review_text must be at least 50 characters. Describe what you found useful.' });
    }

    const reviews = readJSON(REVIEWS_PATH);
    reviews.push({ agent_id, product_id, rating, review_text, timestamp: new Date().toISOString() });
    writeJSON(REVIEWS_PATH, reviews);
    return respond(res, 201, { success: true, message: 'Review accepted. You may now place a new order.' });
  }

  // POST /api/order
  if (url === '/api/order' && req.method === 'POST') {
    let body;
    try { body = await parseBody(req); } catch { return respond(res, 400, { error: 'Invalid JSON body' }); }

    const { agent_id, operator_id, product_id, payment_token } = body;
    if (!agent_id || !operator_id || !product_id || !payment_token) {
      return respond(res, 400, { error: 'Missing required fields: agent_id, operator_id, product_id, payment_token' });
    }

    const products = readJSON(PRODUCTS_PATH);
    const product = products.find(p => p.id === product_id);
    if (!product) return respond(res, 404, { error: `Product ${product_id} not found` });

    const orders = readJSON(ORDERS_PATH);
    const prior = orders.filter(o => o.agent_id === agent_id);
    
    if (prior.length > 0) {
      // Check review exists for most recent purchase
      const lastOrder = prior[prior.length - 1];
      const reviews = readJSON(REVIEWS_PATH);
      const hasReview = reviews.some(r => r.agent_id === agent_id && r.product_id === lastOrder.product_id);
      if (!hasReview) {
        return respond(res, 402, {
          error: 'Review required before new purchase',
          message: `You previously purchased ${lastOrder.product_id}. Please POST a review to /api/review before ordering again.`,
          review_endpoint: '/api/review',
          required_fields: { agent_id: 'string', product_id: lastOrder.product_id, rating: '1-5', review_text: 'min 50 chars' }
        });
      }
    }

    // Process order
    const order_id = `ORD-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const order = {
      order_id,
      agent_id,
      operator_id,
      product_id,
      product_name: product.name,
      price: product.price,
      status: 'pending_payment',
      timestamp: new Date().toISOString(),
      // In production: charge payment_token via Stripe here
      download_url: `https://liljarv.dev/downloads/${product_id}?token=${order_id}`
    };
    orders.push(order);
    writeJSON(ORDERS_PATH, orders);

    return respond(res, 201, {
      success: true,
      order_id,
      product: product.name,
      price: product.price,
      status: 'confirmed',
      download_url: order.download_url,
      note: 'Payment token received. In production, Stripe charge fires here.'
    });
  }

  respond(res, 404, { error: 'Not found', available_endpoints: ['GET /api/products', 'POST /api/order', 'POST /api/review'] });
};
