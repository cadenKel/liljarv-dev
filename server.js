const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    if (req.url.startsWith('/api/products')) {
        // Product API endpoint
        if (req.method === 'GET') {
            const productsPath = path.join(__dirname, 'products.json');
            fs.readFile(productsPath, 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Error reading products' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(content);
                }
            });
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const product = JSON.parse(body);
                    const productsPath = path.join(__dirname, 'products.json');
                    let products = [];
                    fs.readFile(productsPath, 'utf8', (err, content) => {
                        if (!err) products = JSON.parse(content);
                    });
                    
                    const newProduct = {
                        id: String(products.length + 1),
                        name: product.name || 'New Product',
                        price: product.price || 0,
                        sku: product.sku || `PROD-${products.length + 1}`,
                        description: product.description || '',
                        image: product.image || ''
                    };
                    
                    products.push(newProduct);
                    fs.writeFile(productsPath, JSON.stringify(products, null, 2), 'utf8', (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Error saving product' }));
                        } else {
                            res.writeHead(201, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Product created', product: newProduct }));
                        }
                    });
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
        }
    } else {
        // Serve static files
        const filePath = path.join(__dirname, 'www', req.url === '/' ? 'index.html' : req.url.slice(1));
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    }
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
