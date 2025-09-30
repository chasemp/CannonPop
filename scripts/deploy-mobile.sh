#!/bin/bash

# CannonPop - Mobile-Optimized GitHub Pages Deployment Script
# Optimized for custom domain: cannonpop.523.life

echo "🚀 Deploying CannonPop to GitHub Pages (Mobile-Optimized)..."

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in CannonPop directory!"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository!"
    exit 1
fi

# Verify custom domain configuration
if [ ! -f "CNAME" ]; then
    echo "❌ CNAME file missing! Creating for cannonpop.523.life..."
    echo "cannonpop.523.life" > CNAME
fi

# Build the project with mobile optimizations
echo "📦 Building project with mobile optimizations..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Verify critical files exist
echo "🔍 Verifying critical files..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ dist/index.html missing!"
    exit 1
fi

if [ ! -f "dist/game.html" ]; then
    echo "❌ dist/game.html missing!"
    exit 1
fi

if [ ! -f "dist/manifest.json" ]; then
    echo "❌ dist/manifest.json missing!"
    exit 1
fi

if [ ! -f "dist/sw.js" ]; then
    echo "❌ dist/sw.js missing!"
    exit 1
fi

echo "✅ All critical files present!"

# Check mobile optimization files
echo "📱 Checking mobile optimizations..."
if [ ! -d "dist/public/icons" ]; then
    echo "⚠️  Warning: PWA icons missing!"
fi

if [ ! -d "dist/public/screenshots" ]; then
    echo "⚠️  Warning: PWA screenshots missing!"
fi

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Check for changes
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "Deploy: Mobile-optimized CannonPop PWA $(date)

    - Custom domain: cannonpop.523.life
    - Mobile-first optimizations
    - PWA features enabled
    - Analytics integration
    - Special bubble mechanics
    - Enhanced audio system"
    
    # Push to main branch
    echo "🚀 Pushing to GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment initiated successfully!"
        echo ""
        echo "🌐 Your mobile-optimized PWA will be available at:"
        echo "   https://cannonpop.523.life/"
        echo ""
        echo "📱 Mobile Testing Checklist:"
        echo "   ✓ Open on mobile device"
        echo "   ✓ Test touch interactions"
        echo "   ✓ Try 'Add to Home Screen'"
        echo "   ✓ Test offline functionality"
        echo "   ✓ Check PWA installation"
        echo "   ✓ Verify analytics tracking"
        echo ""
        echo "🔧 GitHub Pages Settings:"
        echo "   - Custom domain: cannonpop.523.life"
        echo "   - HTTPS: Enabled"
        echo "   - Source: GitHub Actions"
        echo "   - Branch: main"
    else
        echo "❌ Push failed!"
        exit 1
    fi
fi

echo "🎉 Deployment process complete!"
