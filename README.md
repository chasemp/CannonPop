# 🎮 CannonPop - Mobile-First Bubble Shooter PWA

A modern, mobile-first Progressive Web App implementation of the classic Bust-a-Move bubble shooter game, built with advanced PWA patterns learned from real-world production deployments.

## 🚀 **Live Demo**
[Play CannonPop](https://chasemp.github.io/CannonPop/) - Mobile-optimized PWA

**📱 Mobile-First Design**: Optimized for touch interactions and mobile screens
**🎮 Play on Any Device**: Works on phones, tablets, and desktop
**⚡ Offline Capable**: Play anywhere, even without internet

## ✨ **Features**

### 🎯 **Core Game Features**
- **Hexagonal Grid System**: Precise bubble placement with perfect coordinate conversion
- **Physics-Based Shooting**: Realistic trajectory with wall bouncing
- **Cluster Detection**: Advanced graph-based matching algorithm (BFS/DFS)
- **Floating Bubble Detection**: Smart removal of disconnected bubbles
- **Exponential Scoring**: Rewarding strategic play with bonus multipliers

### 📱 **PWA Features**
- **Mobile-First Design**: Optimized for touch interactions and small screens
- **Offline Capability**: Play anywhere with service worker caching
- **Installable**: Add to home screen on mobile and desktop
- **Responsive Canvas**: Adaptive sizing for all screen sizes
- **Touch Optimized**: Dual event handling (click + touchstart) for all platforms

### 🏗️ **Advanced Architecture**
- **Static PWA Sweet Spot**: Modular files without build complexity
- **Iframe Architecture**: Clean separation between UI shell and game engine
- **PostMessage Communication**: Reliable cross-frame messaging
- **Navigation Stack**: Systematic state management for complex flows
- **Demo Data Lifecycle**: localStorage-first with proper flag management
- **Cache-Busting System**: Automated version management for reliable updates

## 🛠️ **Technology Stack**

- **UI Framework**: Svelte (minimal bundle size, no runtime overhead)
- **Game Engine**: Phaser 3 (comprehensive 2D game development)
- **Build Tool**: Vite (fast development, optimized production builds)
- **Deployment**: GitHub Pages (ultra-simple static hosting)
- **PWA**: Service Worker + Web App Manifest
- **Styling**: Mobile-first CSS with custom properties

## 🏁 **Quick Start**

### **Development**
```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev:server

# Alternative: Standard Vite dev server
npm run dev

# Clear cache and restart fresh
npm run restart
```

### **Production**
```bash
# Update cache-busting versions
npm run version:update

# Build for production
npm run build

# Deploy with cache busting
npm run deploy:bust
```

### **Testing**
```bash
# Quick milestone validation
npm run validate:milestone

# Static server testing
npm run serve:static

# Timeout-protected tests
npm run test:timeout
```

## 📋 **Development Workflow**

### **The Milestone Validation Pyramid**
1. **Level 1**: `file://` protocol - Fastest validation, core functionality
2. **Level 2**: `http://localhost` - Proper protocols, full JavaScript
3. **Level 3**: `https://` (GitHub Pages) - Complete PWA features

### **Cache-Busting Strategy**
```bash
# Automatic timestamp versioning (YYYY.MM.DD.HHMM)
npm run version:update

# Updates all asset references:
# styles.css?v=2025.09.26.2311
# game.js?v=2025.09.26.2311
```

### **Mobile-First Development**
- Start with mobile styles (320px base)
- Add tablet styles (`@media (min-width: 768px)`)
- Add desktop styles (`@media (min-width: 1024px)`)
- Test on actual devices, not just emulation

## 🎯 **Game Architecture**

### **Hexagonal Grid System**
```javascript
// Critical coordinate conversion functions
function gridToWorld(col, row) {
  const offsetX = (row % 2) * BUBBLE_RADIUS; // Hexagonal offset
  const x = 50 + (col * BUBBLE_RADIUS * 2) + offsetX;
  const y = 50 + (row * BUBBLE_RADIUS * 1.7);
  return { x, y };
}

function worldToGrid(x, y) {
  const row = Math.round((y - 50) / (BUBBLE_RADIUS * 1.7));
  const offsetX = (row % 2) * BUBBLE_RADIUS;
  const col = Math.round((x - 50 - offsetX) / (BUBBLE_RADIUS * 2));
  return { col, row };
}
```

### **Cluster Detection Algorithm**
- **Match Detection**: BFS traversal to find connected same-colored bubbles
- **Minimum Cluster Size**: 3+ bubbles required for removal
- **Floating Detection**: Separate traversal from ceiling to find disconnected bubbles
- **Scoring**: 10 points per matched bubble, exponential bonus for floaters (20, 40, 80...)

### **PostMessage Communication**
```javascript
// Svelte App → Game
gameIframe.contentWindow.postMessage({ action: 'pause' }, '*');

// Game → Svelte App  
window.parent.postMessage({ event: 'scoreUpdate', score: 1500 }, '*');
```

## 🔧 **PWA Implementation**

### **Service Worker Strategy**
- **Cache-First**: Static assets served from cache
- **Network-First**: API calls with offline fallback
- **Precaching**: Essential files cached on install
- **Background Sync**: Offline score synchronization

### **Manifest Configuration**
- **Standalone Display**: Full-screen app experience
- **Portrait Orientation**: Optimized for mobile play
- **Multiple Icons**: Complete icon set (72px to 512px)
- **Shortcuts**: Quick access to game and scores

## 📊 **Performance Optimizations**

### **Bundle Size**
- **Svelte**: ~10KB compiled (no runtime)
- **Phaser**: ~700KB (loaded from CDN)
- **Total PWA Shell**: <50KB (excluding game engine)

### **Loading Strategy**
- **Critical CSS**: Inlined for instant rendering
- **Game Engine**: CDN loading for reliability
- **Progressive Enhancement**: Core functionality works without JavaScript

### **Mobile Optimizations**
- **Touch Targets**: 44px minimum (Apple HIG compliance)
- **Viewport Optimization**: `user-scalable=no` for game control
- **Canvas Sizing**: Responsive with `object-fit: contain`

## 🧪 **Testing Strategy**

### **Multi-Environment Testing**
- **File Protocol**: Core functionality validation
- **HTTP Server**: Full JavaScript features
- **HTTPS Production**: Complete PWA capabilities

### **Mobile Testing Checklist**
- [ ] Touch events work on all interactive elements
- [ ] Canvas responds correctly to gestures
- [ ] PWA installs successfully on mobile
- [ ] Offline functionality works as expected
- [ ] Performance is smooth on low-end devices

## 📚 **Lessons Learned Implementation**

This project implements battle-tested patterns from production PWA development:

### **Static PWA Sweet Spot**
- ✅ Modular files for maintainability
- ✅ No build complexity for reliable deployment
- ✅ GitHub Pages as primary test environment
- ✅ CDN dependencies for external libraries

### **Mobile-First PWA Patterns**
- ✅ Touch event handling (`click` + `touchstart`)
- ✅ Pages over modals for complex content
- ✅ 44px minimum touch targets
- ✅ CSS custom properties for theming

### **Advanced State Management**
- ✅ localStorage as authoritative data source
- ✅ Demo data lifecycle with flag system
- ✅ Navigation stack for complex flows
- ✅ PostMessage API for clean component communication

## 🚀 **Deployment**

### **GitHub Pages Setup (Mobile-Optimized)**
1. **Enable GitHub Pages**: Go to repository Settings → Pages
2. **Set Source**: "GitHub Actions" (automatic deployment)
3. **Push to Main**: Triggers automatic mobile-optimized build
4. **Access URL**: `https://chasemp.github.io/CannonPop/`

### **Mobile Testing Checklist**
- [ ] **Touch Events**: Tap and drag to aim works smoothly
- [ ] **Responsive Design**: Scales properly on all screen sizes
- [ ] **PWA Installation**: "Add to Home Screen" works on mobile
- [ ] **Offline Mode**: Game works without internet connection
- [ ] **Performance**: Smooth 60fps gameplay on mobile devices

### **Custom Domain (Optional)**
1. Add `CNAME` file with your domain
2. Configure DNS CNAME record  
3. Enable HTTPS in GitHub Pages settings
4. Test mobile performance on custom domain

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Implement changes following the established patterns
4. Test on multiple devices and browsers
5. Update cache-busting versions (`npm run version:update`)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Phaser Community**: Excellent 2D game engine
- **Svelte Team**: Revolutionary compile-time framework
- **PWA Community**: Progressive Web App best practices
- **Bubble Shooter Genre**: Classic game mechanics that inspired this implementation

---

**Built with ❤️ for the mobile-first web**

*This project demonstrates advanced PWA patterns learned from real-world production deployments, focusing on mobile-first design, offline capabilities, and maintainable architecture.*