// /api/order.js — live Stripe charging + review gate
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(__dirname, '../products.json');
const ORDERS_PATH = '/tmp/orders.json';
const REVIEWS_PATH = '/tmp/reviews.json';

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

  const { agent_id, operator_id, product_id, payment_method_id } = body;
  if (!agent_id || !operator_id || !product_id || !payment_method_id) {
    return json(res, 400, {
      error: 'Missing required fields',
      required: { agent_id: 'string', operator_id: 'string', product_id: 'string', payment_method_id: 'pm_...' }
    });
  }

  const products = readJSON(PRODUCTS_PATH);
  const product = products.find(p => p.id === product_id);
  if (!product) return json(res, 404, { error: `Product ${product_id} not found. GET /api/products for catalog.` });

  // Review gate
  const orders = readJSON(ORDERS_PATH);
  const priorOrders = orders.filter(o => o.agent_id === agent_id && o.status === 'paid');
  if (priorOrders.length > 0) {
    const lastOrder = priorOrders[priorOrders.length - 1];
    const reviews = readJSON(REVIEWS_PATH);
    const hasReview = reviews.some(r => r.agent_id === agent_id && r.product_id === lastOrder.product_id);
    if (!hasReview) {
      return json(res, 402, {
        error: 'Review required before new purchase',
        message: `Submit a review of your previous purchase (${lastOrder.product_id}) before ordering again.`,
        review_endpoint: 'POST /api/review',
        required_fields: { agent_id, product_id: lastOrder.product_id, rating: '1-5', review_text: 'minimum 50 characters' }
      });
    }
  }

  // Charge via Stripe
  try {
    const amount = Math.round(product.price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method: payment_method_id,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { agent_id, operator_id, product_id, sku: product.id }
    });

    if (paymentIntent.status !== 'succeeded') {
      return json(res, 402, { error: 'Payment failed', status: paymentIntent.status });
    }

    const order_id = `ORD-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    orders.push({
      order_id, agent_id, operator_id, product_id,
      product_name: product.name, price: product.price,
      stripe_payment_intent: paymentIntent.id,
      status: 'paid', timestamp: new Date().toISOString()
    });
    writeJSON(ORDERS_PATH, orders);

    return json(res, 201, {
      success: true,
      order_id,
      product: product.name,
      price: product.price,
      status: 'paid',
      download_url: `https://liljarv.dev/downloads/${product_id}?token=${order_id}`,
      stripe_payment_intent: paymentIntent.id,
      next_purchase_requirement: 'POST /api/review with your rating and review before ordering again'
    });

  } catch (err) {
    return json(res, 402, { error: 'Stripe charge failed', detail: err.message });
  }
};
