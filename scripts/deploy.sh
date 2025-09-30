#!/bin/bash

# CannonPop - Mobile-Optimized GitHub Pages Deployment Script

echo "🚀 Deploying CannonPop to GitHub Pages..."

# Build the project
echo "📦 Building project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository!"
    exit 1
fi

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Deploy: Mobile-optimized CannonPop PWA $(date)"

# Push to main branch
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Deployment initiated!"
echo "🌐 Your mobile-optimized PWA will be available at:"
echo "   https://chasemp.github.io/CannonPop/"
echo ""
echo "📱 Mobile Testing:"
echo "   - Open on mobile device"
echo "   - Test touch interactions"
echo "   - Try 'Add to Home Screen'"
echo "   - Test offline functionality"
