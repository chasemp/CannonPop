#!/bin/bash

# Emergency Deployment Script for CannonPop
# This script manually deploys to GitHub Pages to fix the blank screen issue

echo "🚨 Emergency Deployment to GitHub Pages..."

# Build the project
echo "📦 Building project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Copy CNAME to dist
echo "📋 Copying CNAME file..."
cp CNAME dist/

# Initialize git in dist directory
cd dist
git init
git add .
git commit -m "Emergency deploy: Fix blank screen issue $(date)"

# Add remote and push to gh-pages branch
git branch -M gh-pages
git remote add origin https://github.com/chasemp/CannonPop.git
git push -f origin gh-pages

echo "✅ Emergency deployment complete!"
echo "🌐 Site should be available at: https://cannonpop.523.life/"
echo "⏳ Please wait 2-3 minutes for GitHub Pages to update..."
