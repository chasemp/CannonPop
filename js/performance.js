/**
 * CannonPop Performance Optimization System
 * Advanced memory management, FPS monitoring, and performance tuning
 */

class PerformanceManager {
    constructor() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            particles: 0,
            bubbles: 0,
            lastFrameTime: 0,
            frameCount: 0,
            droppedFrames: 0
        };
        
        this.thresholds = {
            targetFPS: 60,
            minFPS: 30,
            maxMemoryMB: 100,
            maxParticles: 200,
            maxBubbles: 500
        };
        
        this.optimizations = {
            adaptiveQuality: true,
            particleCulling: true,
            textureAtlas: true,
            objectPooling: true,
            lazyLoading: true,
            memoryCleanup: true
        };
        
        this.objectPools = {
            particles: [],
            bubbles: [],
            effects: [],
            sounds: []
        };
        
        this.performanceHistory = [];
        this.isMonitoring = false;
        this.rafId = null;
        
        this.init();
    }
    
    init() {
        console.log('⚡ Performance Manager initialized');
        this.startMonitoring();
        this.setupMemoryCleanup();
        this.setupAdaptiveQuality();
    }
    
    // FPS Monitoring
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        
        const monitor = (currentTime) => {
            if (!this.isMonitoring) return;
            
            const deltaTime = currentTime - this.lastFrameTime;
            this.metrics.frameTime = deltaTime;
            this.metrics.fps = 1000 / deltaTime;
            this.metrics.frameCount++;
            
            // Track dropped frames
            if (deltaTime > 1000 / this.thresholds.minFPS) {
                this.metrics.droppedFrames++;
            }
            
            // Update memory usage
            this.updateMemoryUsage();
            
            // Store performance data
            this.performanceHistory.push({
                timestamp: currentTime,
                fps: this.metrics.fps,
                memory: this.metrics.memoryUsage,
                frameTime: this.metrics.frameTime
            });
            
            // Keep only last 100 frames
            if (this.performanceHistory.length > 100) {
                this.performanceHistory.shift();
            }
            
            // Apply adaptive optimizations
            this.applyAdaptiveOptimizations();
            
            this.lastFrameTime = currentTime;
            this.rafId = requestAnimationFrame(monitor);
        };
        
        this.rafId = requestAnimationFrame(monitor);
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    
    // Memory Management
    updateMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
    }
    
    setupMemoryCleanup() {
        // Cleanup every 30 seconds
        setInterval(() => {
            this.performMemoryCleanup();
        }, 30000);
        
        // Cleanup on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.performMemoryCleanup();
            }
        });
    }
    
    performMemoryCleanup() {
        console.log('🧹 Performing memory cleanup...');
        
        // Clear object pools
        this.clearObjectPools();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Clear unused textures
        this.clearUnusedTextures();
        
        // Clear performance history
        if (this.performanceHistory.length > 50) {
            this.performanceHistory = this.performanceHistory.slice(-50);
        }
        
        console.log('✅ Memory cleanup completed');
    }
    
    clearObjectPools() {
        Object.keys(this.objectPools).forEach(key => {
            this.objectPools[key] = [];
        });
    }
    
    clearUnusedTextures() {
        // This would be implemented with Phaser texture management
        if (window.gameInstance && window.gameInstance.textures) {
            // Clear unused textures
            const textures = window.gameInstance.textures.list;
            Object.keys(textures).forEach(key => {
                const texture = textures[key];
                if (texture && texture.lastUsed && Date.now() - texture.lastUsed > 60000) {
                    texture.destroy();
                }
            });
        }
    }
    
    // Object Pooling
    getPooledObject(type, createFn) {
        const pool = this.objectPools[type];
        
        if (pool.length > 0) {
            return pool.pop();
        }
        
        return createFn();
    }
    
    returnPooledObject(type, obj) {
        if (obj && obj.destroy) {
            obj.destroy();
        }
        
        // Reset object state
        if (obj && typeof obj.reset === 'function') {
            obj.reset();
        }
        
        this.objectPools[type].push(obj);
    }
    
    // Adaptive Quality
    setupAdaptiveQuality() {
        if (!this.optimizations.adaptiveQuality) return;
        
        // Adjust quality based on performance
        this.qualityLevels = {
            high: { particles: 200, effects: true, shadows: true, antialiasing: true },
            medium: { particles: 100, effects: true, shadows: false, antialiasing: false },
            low: { particles: 50, effects: false, shadows: false, antialiasing: false }
        };
        
        this.currentQuality = 'high';
    }
    
    applyAdaptiveOptimizations() {
        if (!this.optimizations.adaptiveQuality) return;
        
        const avgFPS = this.getAverageFPS(30); // Last 30 frames
        
        if (avgFPS < this.thresholds.minFPS) {
            this.reduceQuality();
        } else if (avgFPS > this.thresholds.targetFPS && this.currentQuality !== 'high') {
            this.increaseQuality();
        }
        
        // Memory pressure
        if (this.metrics.memoryUsage > this.thresholds.maxMemoryMB) {
            this.performMemoryCleanup();
        }
        
        // Particle culling
        if (this.optimizations.particleCulling) {
            this.cullOffscreenParticles();
        }
    }
    
    reduceQuality() {
        const levels = ['high', 'medium', 'low'];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex < levels.length - 1) {
            this.currentQuality = levels[currentIndex + 1];
            this.applyQualitySettings();
            console.log(`📉 Quality reduced to: ${this.currentQuality}`);
        }
    }
    
    increaseQuality() {
        const levels = ['high', 'medium', 'low'];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex > 0) {
            this.currentQuality = levels[currentIndex - 1];
            this.applyQualitySettings();
            console.log(`📈 Quality increased to: ${this.currentQuality}`);
        }
    }
    
    applyQualitySettings() {
        const settings = this.qualityLevels[this.currentQuality];
        
        // Apply to game instance
        if (window.gameInstance) {
            // Update particle limits
            if (window.gameState) {
                window.gameState.maxParticles = settings.particles;
            }
            
            // Update effects
            if (window.gameState) {
                window.gameState.effectsEnabled = settings.effects;
            }
        }
    }
    
    cullOffscreenParticles() {
        // This would be implemented with Phaser particle systems
        if (window.gameInstance && window.gameInstance.children) {
            window.gameInstance.children.list.forEach(child => {
                if (child.isParticle && child.active) {
                    const bounds = window.gameInstance.cameras.main.worldView;
                    if (!Phaser.Geom.Rectangle.Overlaps(child.getBounds(), bounds)) {
                        child.setActive(false);
                    }
                }
            });
        }
    }
    
    // Performance Metrics
    getAverageFPS(frames = 10) {
        const recentFrames = this.performanceHistory.slice(-frames);
        if (recentFrames.length === 0) return 0;
        
        const totalFPS = recentFrames.reduce((sum, frame) => sum + frame.fps, 0);
        return totalFPS / recentFrames.length;
    }
    
    getPerformanceScore() {
        const avgFPS = this.getAverageFPS(60);
        const memoryScore = Math.max(0, 100 - (this.metrics.memoryUsage / this.thresholds.maxMemoryMB) * 100);
        const stabilityScore = Math.max(0, 100 - (this.metrics.droppedFrames / this.metrics.frameCount) * 100);
        
        return {
            fps: Math.round(avgFPS),
            memory: Math.round(memoryScore),
            stability: Math.round(stabilityScore),
            overall: Math.round((avgFPS + memoryScore + stabilityScore) / 3)
        };
    }
    
    // Resource Management
    preloadCriticalResources() {
        const criticalResources = [
            'bubble-textures',
            'particle-effects',
            'sound-effects',
            'ui-elements'
        ];
        
        criticalResources.forEach(resource => {
            this.preloadResource(resource);
        });
    }
    
    preloadResource(resource) {
        // Implement resource preloading
        console.log(`📦 Preloading: ${resource}`);
    }
    
    // Performance Profiling
    startProfile(name) {
        console.time(name);
        return performance.now();
    }
    
    endProfile(name, startTime) {
        const duration = performance.now() - startTime;
        console.timeEnd(name);
        
        if (duration > 16) { // More than one frame
            console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
        }
        
        return duration;
    }
    
    // Performance Alerts
    checkPerformanceAlerts() {
        const score = this.getPerformanceScore();
        
        if (score.overall < 50) {
            this.showPerformanceAlert('Low performance detected. Consider reducing quality settings.');
        }
        
        if (this.metrics.memoryUsage > this.thresholds.maxMemoryMB) {
            this.showPerformanceAlert('High memory usage detected. Cleaning up resources...');
            this.performMemoryCleanup();
        }
        
        if (this.metrics.droppedFrames > this.metrics.frameCount * 0.1) {
            this.showPerformanceAlert('Frame drops detected. Optimizing rendering...');
            this.optimizeRendering();
        }
    }
    
    showPerformanceAlert(message) {
        console.warn(`⚠️ Performance Alert: ${message}`);
        
        // Show user notification
        if (window.socialManager) {
            window.socialManager.showShareNotification(message);
        }
    }
    
    optimizeRendering() {
        // Reduce particle count
        if (window.gameState) {
            window.gameState.maxParticles = Math.max(10, window.gameState.maxParticles * 0.8);
        }
        
        // Disable non-essential effects
        if (window.gameState) {
            window.gameState.effectsEnabled = false;
        }
        
        // Force garbage collection
        if (window.gc) {
            window.gc();
        }
    }
    
    // Performance Dashboard
    getPerformanceDashboard() {
        const score = this.getPerformanceScore();
        const history = this.performanceHistory.slice(-30);
        
        return {
            current: {
                fps: Math.round(this.metrics.fps),
                memory: Math.round(this.metrics.memoryUsage),
                frameTime: Math.round(this.metrics.frameTime * 100) / 100,
                quality: this.currentQuality
            },
            average: {
                fps: Math.round(this.getAverageFPS(60)),
                memory: Math.round(history.reduce((sum, h) => sum + h.memory, 0) / history.length),
                stability: score.stability
            },
            score: score,
            history: history,
            optimizations: this.optimizations
        };
    }
    
    // Export Performance Data
    exportPerformanceData() {
        const data = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            history: this.performanceHistory,
            score: this.getPerformanceScore(),
            optimizations: this.optimizations,
            thresholds: this.thresholds
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cannonpop-performance-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    // Cleanup
    destroy() {
        this.stopMonitoring();
        this.clearObjectPools();
        this.performanceHistory = [];
    }
}

// Performance utilities
const PerformanceUtils = {
    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Check if device is low-end
    isLowEndDevice() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return true;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            return renderer.includes('Intel') || renderer.includes('Mali');
        }
        
        return navigator.hardwareConcurrency < 4;
    },
    
    // Get device performance tier
    getDeviceTier() {
        const cores = navigator.hardwareConcurrency || 2;
        const memory = navigator.deviceMemory || 4;
        const isLowEnd = this.isLowEndDevice();
        
        if (isLowEnd || cores < 2 || memory < 2) return 'low';
        if (cores >= 4 && memory >= 4) return 'high';
        return 'medium';
    }
};

// Export for global access
window.PerformanceManager = PerformanceManager;
window.PerformanceUtils = PerformanceUtils;
