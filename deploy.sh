#!/bin/bash
# Deploy JarvStore to liljarv.dev

echo "🚀 Deploying JarvStore to liljarv.dev..."

# Step 1: Push to GitHub
echo "1. Pushing to GitHub Pages..."
cd /home/ziggibot/Desktop/experimentAllLocal/business-store
git init
git add .
git commit -m "Initial JarvStore deployment"

echo "2. Create liljarv.dev repo on GitHub and push..."
echo "   - Go to https://github.com/new"
echo "   - Owner: liljarv"
echo "   - Repo name: liljarv.dev"
echo "   - Visibility: public"
echo "   - Branch: main"

echo ""
echo "✅ Store structure ready!"
echo "   - Products upload via: POST /api/products"
echo "   - Checkout enabled via Gumroad links"
echo "   - Hosting: GitHub Pages / Vercel"

cat deploy.md
