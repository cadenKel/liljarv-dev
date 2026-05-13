#!/bin/bash
# Auto-deploy to GitHub Pages

set -e

REPO_OWNER="cadenKel"
REPO_NAME="liljarv.dev"
BRANCH="main"

# Create repo if it doesn't exist
cd /home/ziggibot/Desktop/experimentAllLocal/business-store/www

# Clone existing repo or initialize new
if [ -d ".git" ]; then
    echo "Updating existing repository..."
else
    echo "Creating new GitHub Pages repository..."
    git init
fi

# Add/Update remote
if ! git remote get-url origin 2>/dev/null | grep -q "$REPO_OWNER/$REPO_NAME"; then
    echo "Setting up GitHub Pages remote..."
    git remote add origin "https://$REPO_OWNER:$GITHUB_TOKEN@github.com/$REPO_OWNER/$REPO_NAME.git" || \
    git remote set-url origin "https://$REPO_OWNER:$GITHUB_TOKEN@github.com/$REPO_OWNER/$REPO_NAME.git"
fi

git add .
git commit -m "Deploy products" || true
git push -u origin "$BRANCH"

echo "✅ Deployed to https://$REPO_OWNER.github.io/$REPO_NAME/"
