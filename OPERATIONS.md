# LibbieAI Store Operations (liljarv.dev)

## Current Architecture
- Source branch: `main`
- Publish branch: `gh-pages` (auto-deployed by GitHub Action)
- Hosting: GitHub Pages + custom domain `liljarv.dev`
- Storefront: static HTML + `products.json`
- Checkout links: per-product `checkout_url` field in `products.json`

## Day-1 Launch Checklist
1. Add real checkout URLs in `products.json` (`checkout_url`).
2. In GitHub repo settings -> Pages, enforce HTTPS.
3. Push to `main` and confirm action `Deploy static site to GitHub Pages` succeeds.
4. Verify live pages:
   - /
   - /privacy.html
   - /terms.html
   - /refunds.html

## Editing products
- Edit only `products.json` in `main`.
- Keep SKU stable once public.
- Commit + push; deploy is automatic.

## Weekly operating loop
- Review sales + support requests.
- Improve top-performing offer copy.
- Add one new product or upsell variant.
- Keep legal pages current.

## Security notes
- Never commit secrets.
- Use GitHub secrets for any provider tokens.
- Rotate credentials if exposed in chat/logs.
