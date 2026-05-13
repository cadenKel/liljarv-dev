// Product upload API for liljarv.dev
const fs = require('fs');
const path = require('path');

const products = [];

const bodyParser = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => resolve(JSON.parse(data)));
});

const respond = (status, body, type = 'json') => {
  const headers = { 'Content-Type': type };
  res.writeHead(status, headers);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

module.exports = (req, res) => {
  if (req.method === 'GET') {
    respond(200, products);
  } else if (req.method === 'POST') {
    bodyParser(req).then(product => {
      products.push({
        id: String(products.length + 1),
        ...product
      });
      respond(201, { message: 'Product created', product });
    }).catch(() => respond(400, { error: 'Invalid JSON' }));
  }
};
