# GitHub Pages Deployment

## Setup Steps

1. Create GitHub repo (name: `liljarv-dev` or similar)
2. Push store code to GitHub
3. Enable GitHub Pages in repo settings
4. Update domain DNS at Porkbun

## Files Ready to Deploy

- `products.json` - Product catalog
- `server.js` - Node.js API (may need to use static build for GitHub Pages)
- `www/index.html` - Store frontend
- `.env` - Environment config (Stripe keys)

**Note:** GitHub Pages works best with static sites. If server.js is required, we may need to build a static version or use a different approach.
