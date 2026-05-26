// /api/products.js
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf8'));
    res.writeHead(200);
    res.end(JSON.stringify({ products, api_version: '1.0', order_endpoint: '/api/order', review_endpoint: '/api/review' }));
  } catch {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Could not load catalog' }));
  }
};
